/**
 * Agente 1 — L'Esploratore (parte Google Search).
 *
 * Prende una coppia categoria × città dalle impostazioni delle Ricerche (le stesse del
 * Google Maps), cerca su Google (via DataForSEO) e crea le aziende nuove: scarta portali,
 * directory, social, marketplace, catene e chi è già nel CRM. Le aziende nuove entrano poi
 * da sole nella raccolta base della squadra.
 *
 * Google Maps resta nelle Ricerche (Apify). LinkedIn non si usa per trovare aziende.
 */
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { detectFranchise } from "@/lib/franchise-brands";
import { detectSegment } from "@/lib/segments";
import { isRealWebsite } from "@/lib/url-utils";
import { budgetDisponibile } from "./costi";
import { chiamaDataForSeo, dataForSeoConfigurato, dominio, LOCATION_ITALIA } from "./dataforseo";

/** Portali, directory e marketplace: compaiono ovunque ma non sono aziende da contattare. */
const NON_AZIENDE = [
  "paginegialle.it", "paginebianche.it", "tripadvisor.", "facebook.com", "instagram.com", "youtube.com", "linkedin.com",
  "wikipedia.org", "amazon.", "ebay.", "subito.it", "idealista.it", "immobiliare.it", "booking.com", "houzz.",
  "prontopro.it", "habitissimo.it", "cylex", "infobel", "misterimprese.it", "virgilio.it", "yelp.", "google.",
  "starofservice", "kijiji", "trovaprezzi", "leroymerlin", "ikea.", "manomano", "instapro.it", "edilportale.com",
  "tuttocitta.it", "europages", "kompass", "reteimprese.it", "trustpilot", "groupon", "thefork", "airbnb",
  "casa.it", "edilnet.it", "guidaedilizia", "infojobs", "indeed", "glassdoor", "tiktok.com", "pinterest.",
  "comune.", "regione.", ".gov.it", "aranzulla", "salvatore aranzulla", "wikihow", "quora.com", "reddit.com",
];

export function eNonAzienda(d: string): boolean {
  return NON_AZIENDE.some((p) => d.includes(p));
}

/**
 * Il nome dell'azienda. I titoli dei risultati sono spesso slogan ("Finestre in PVC a Parma!"):
 * si tiene un pezzo del titolo solo se contiene il nome del dominio, altrimenti si usa il
 * dominio stesso ("moskito.it" → "Moskito").
 */
export function nomeDaTitolo(titolo: string, d: string): string {
  const radice = d.split(".")[0].toLowerCase();
  const compatta = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, "");
  const pezzi = titolo.split(/\s*[|\-–—:•]\s*/).map((p) => p.trim()).filter(Boolean);
  const buoni = pezzi.filter((p) => p.length <= 35 && compatta(p).includes(compatta(radice)));
  if (buoni.length) return buoni.sort((a, b) => a.length - b.length)[0];
  const dalDominio = radice.replace(/-/g, " ");
  return dalDominio.charAt(0).toUpperCase() + dalDominio.slice(1);
}

interface ItemSerp {
  type: string;
  domain?: string;
  url?: string;
  title?: string;
  description?: string;
}

export interface EsitoEsplorazione {
  ricerca: string | null;
  trovati: number;
  nuove: number;
  giaPresenti: number;
  scartati: number;
  costCents: number;
  motivo?: string;
}

const GIORNI_TRA_RICERCHE_UGUALI = 60;

/** Sceglie la prossima coppia categoria × città non cercata negli ultimi 60 giorni. */
async function prossimaRicerca(oggi: Date): Promise<{ categoria: string; citta: string } | null> {
  const [categorie, citta, recenti] = await Promise.all([
    db.searchCategory.findMany({ where: { active: true }, orderBy: [{ priority: "asc" }, { order: "asc" }] }),
    db.searchLocation.findMany({ where: { active: true }, orderBy: [{ wave: "asc" }, { order: "asc" }] }),
    db.agentReport.findMany({
      where: { agent: "esploratore", collectedAt: { gt: new Date(oggi.getTime() - GIORNI_TRA_RICERCHE_UGUALI * 86400_000) } },
      select: { findings: true },
    }),
  ]);
  const fatte = new Set(recenti.map((r) => String((r.findings as { ricerca?: string } | null)?.ricerca ?? "").toLowerCase()));
  for (const c of citta) {
    for (const k of categorie) {
      const ricerca = `${k.label} ${c.name}`.toLowerCase();
      if (!fatte.has(ricerca)) return { categoria: k.label, citta: c.name };
    }
  }
  return null;
}

export async function esplora(oggi = new Date()): Promise<EsitoEsplorazione> {
  const vuoto: EsitoEsplorazione = { ricerca: null, trovati: 0, nuove: 0, giaPresenti: 0, scartati: 0, costCents: 0 };
  if (!dataForSeoConfigurato()) return { ...vuoto, motivo: "DataForSEO non configurato" };
  if (!(await budgetDisponibile(oggi)).ok) return { ...vuoto, motivo: "Tetto di spesa del mese raggiunto" };
  const scelta = await prossimaRicerca(oggi);
  if (!scelta) return { ...vuoto, motivo: "Tutte le combinazioni categoria × città sono state cercate negli ultimi 60 giorni" };

  const ricerca = `${scelta.categoria} ${scelta.citta}`;
  const run = await db.agentRun.create({ data: { agent: "esploratore", status: "IN_CORSO", attempts: 1, startedAt: new Date(), input: scelta } });
  try {
    const { result, costCents } = await chiamaDataForSeo<{ items?: ItemSerp[] }>("/serp/google/organic/live/advanced", {
      keyword: ricerca,
      location_code: LOCATION_ITALIA,
      language_code: "it",
      depth: 30,
    });
    const organici = (result?.items ?? []).filter((i) => i.type === "organic" && i.domain && i.url);

    // Domini già nel CRM (il confronto si fa sul dominio, non sull'indirizzo esatto).
    const esistenti = new Set(
      (await db.lead.findMany({ where: { website: { not: null } }, select: { website: true } })).map((l) => dominio(l.website!))
    );

    const esito: EsitoEsplorazione = { ricerca, trovati: organici.length, nuove: 0, giaPresenti: 0, scartati: 0, costCents };
    const nuove: string[] = [];
    const visti = new Set<string>();
    for (const i of organici) {
      const d = dominio(i.domain!);
      if (visti.has(d)) continue;
      visti.add(d);
      if (eNonAzienda(d) || !isRealWebsite(i.url!).isReal) {
        esito.scartati++;
        continue;
      }
      if (esistenti.has(d)) {
        esito.giaPresenti++;
        continue;
      }
      const nome = nomeDaTitolo(i.title ?? d, d);
      const catena = detectFranchise(nome, i.url);
      await db.lead.create({
        data: {
          name: nome,
          website: `https://${d}`,
          category: scelta.categoria,
          segment: detectSegment(scelta.categoria),
          address: scelta.citta,
          source: "google_search",
          ...(catena && { pipelineStage: "NON_TARGET", notes: `Franchising rilevato (${catena}) — fuori target, scartato in automatico.` }),
        },
      });
      esistenti.add(d);
      if (catena) esito.scartati++;
      else {
        esito.nuove++;
        nuove.push(`${nome} (${d})`);
      }
    }

    await db.$transaction([
      db.agentReport.create({
        data: {
          agent: "esploratore",
          runId: run.id,
          summary: `"${ricerca}": ${esito.nuove} aziende nuove, ${esito.giaPresenti} già nel CRM, ${esito.scartati} scartate`,
          findings: { ...esito, aziendeNuove: nuove } as unknown as Prisma.InputJsonValue,
          evidence: nuove.slice(0, 20).map((n) => ({ cosa: n, fonte: `Google: ${ricerca}` })) as Prisma.InputJsonValue,
          confidence: "ALTA",
          collectedAt: oggi,
          validUntil: new Date(oggi.getTime() + GIORNI_TRA_RICERCHE_UGUALI * 86400_000),
        },
      }),
      db.agentRun.update({ where: { id: run.id }, data: { status: "FATTO", finishedAt: new Date(), costCents } }),
    ]);
    return esito;
  } catch (err) {
    await db.agentRun.update({
      where: { id: run.id },
      data: { status: "FALLITO", finishedAt: new Date(), error: (err instanceof Error ? err.message : String(err)).slice(0, 500) },
    });
    throw err;
  }
}
