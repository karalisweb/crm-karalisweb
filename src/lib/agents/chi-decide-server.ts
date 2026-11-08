/**
 * v3.122 (Alessio, 2026-11-08: "in 30-40 minuti il CRM prenda un'azienda, cerchi il decision maker e me la porti in da
 * contattare"): chi decide lo cerca il SERVER, dal sito e da Google. Niente Chrome, niente permessi, niente account
 * LinkedIn di Alessio. Il Chrome del Mac resta per ciò che parte dal suo account: collegamento e commenti.
 */
import * as cheerio from "cheerio";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { chiediJSON, REGOLE_COMUNI, type Schema } from "./ai";
import { budgetDisponibile } from "./costi";
import { chiamaDataForSeo, dataForSeoConfigurato, LOCATION_ITALIA } from "./dataforseo";
import { scaricaPagina, scaricaTesto } from "./pagina";
import { KIND_FASCICOLO_BASE } from "./turno";
import { aggiungiProfili, contattiDaRisultati, nomePulito, personeVerificate, type Candidato, type Fonte } from "./chi-decide-regole";

export const AGENTE_SERVER = "chi_decide_server";
export const AGENTE_CONTATTI = "contatti_server";
const STADI_FUORI = ["NON_TARGET", "CLIENTE", "PERSO", "ARCHIVIATO"];
const GIORNI_VALIDITA = 90;
const PAGINE = /contatt|chi-?siamo|about|team|staff|azienda|titolare|fondator|storia/i;
const inCorso = new Set<string>();

interface ItemSerp { type: string; url?: string; title?: string; description?: string }

async function cerca(keyword: string): Promise<{ fonti: Fonte[]; costo: number }> {
  const { result, costCents } = await chiamaDataForSeo<{ items?: ItemSerp[] }>("/serp/google/organic/live/advanced", { keyword, location_code: LOCATION_ITALIA, language_code: "it", depth: 10 });
  const fonti = (result?.items ?? []).filter((i) => i.type === "organic" && i.url).map((i) => ({ url: i.url!, titolo: i.title ?? "", testo: i.description ?? "", delSito: false }));
  return { fonti, costo: costCents };
}

const testoDi = (html: string) => {
  const $ = cheerio.load(html);
  $("script,style,noscript,svg").remove();
  return $("body").text().replace(/\s+/g, " ").trim().slice(0, 6000);
};

async function paginaDelSito(website: string | null): Promise<Fonte[]> {
  if (!website) return [];
  try {
    const home = await scaricaPagina(website);
    const fonti: Fonte[] = [{ url: home.url, titolo: "Sito: home", testo: testoDi(home.html), delSito: true }];
    const $ = cheerio.load(home.html);
    const link = new Set<string>();
    $("a[href]").each((_, el) => {
      const h = $(el).attr("href") ?? "";
      if (!PAGINE.test(h)) return;
      try {
        const u = new URL(h, home.url);
        if (u.hostname === new URL(home.url).hostname) link.add(u.toString().split("#")[0]);
      } catch { /* link rotto */ }
    });
    for (const u of [...link].slice(0, 3)) {
      const html = await scaricaTesto(u);
      if (html) fonti.push({ url: u, titolo: "Sito", testo: testoDi(html), delSito: true });
    }
    return fonti;
  } catch {
    return [];
  }
}

const SISTEMA = `${REGOLE_COMUNI}

Trova CHI DECIDE in un'azienda italiana: titolare, amministratore, fondatore, socio, legale rappresentante, CEO. Mai un dipendente, un commerciale, un ex.
Usa SOLO le fonti. Per ogni persona riporta nome e cognome, il ruolo e la citazione esatta, copiata parola per parola dalla fonte, che contiene il suo cognome e il ruolo. Se il nome della persona è già nel nome dell'azienda ("Studio Mario Rossi"), è il titolare e la citazione è il nome dell'azienda. Al massimo 2 persone, prima la più importante. Se non sei sicuro: elenco vuoto.`;
const SCHEMA: Schema = {
  type: "object", required: ["persone"],
  properties: { persone: { type: "array", items: { type: "object", required: ["nome", "ruolo", "citazione"], properties: { nome: { type: "string" }, ruolo: { type: "string" }, citazione: { type: "string" } } } } },
};

export interface EsitoRicerca { trovate: number; fatto: boolean; motivo?: string }

/** Cerca chi decide e porta avanti l'azienda. `forza` rifà la ricerca anche con un referto; se non trova non lo cancella. */
export async function cercaChiDecideServer(leadId: string, oggi = new Date(), opz: { forza?: boolean; relazioneDiretta?: boolean } = {}): Promise<EsitoRicerca> {
  if (inCorso.has(leadId)) return { trovate: 0, fatto: false, motivo: "già in corso" };
  if (!dataForSeoConfigurato()) return { trovate: 0, fatto: false, motivo: "DataForSEO non configurato" };
  if (!(await budgetDisponibile(oggi)).ok) return { trovate: 0, fatto: false, motivo: "tetto di spesa raggiunto" };
  if (!opz.forza && (await db.agentReport.findFirst({ where: { leadId, agent: "decision_maker" }, select: { id: true } }))) return { trovate: 0, fatto: false, motivo: "già fatto" };
  const l = await db.lead.findUnique({ where: { id: leadId }, select: { name: true, website: true, address: true } });
  if (!l) return { trovate: 0, fatto: false, motivo: "azienda non trovata" };

  inCorso.add(leadId);
  const run = await db.agentRun.create({ data: { leadId, agent: AGENTE_SERVER, status: "IN_CORSO", attempts: 1, startedAt: new Date(), input: { relazioneDiretta: !!opz.relazioneDiretta } } });
  try {
    const nome = nomePulito(l.name);
    const zona = (l.address ?? "").split(",").slice(-2).join(" ").replace(/\d{5}/g, " ").replace(/\s+/g, " ").trim();
    const [a, b, sito] = await Promise.all([
      cerca(`"${nome}" ${zona} titolare OR amministratore OR fondatore`),
      cerca(`site:linkedin.com/in "${nome}"`),
      paginaDelSito(l.website),
    ]);
    const fonti = [...sito, ...a.fonti, ...b.fonti];
    let costo = a.costo + b.costo;
    let persone: ReturnType<typeof personeVerificate> = [];
    if (fonti.length) {
      const ai = await chiediJSON<{ persone: Candidato[] }>({
        sistema: SISTEMA,
        testo: `AZIENDA: ${l.name}\nINDIRIZZO: ${l.address ?? "non noto"}\n\nFONTI:\n${fonti.map((f, i) => `[${i + 1}] ${f.url}\n${f.titolo}\n${f.testo}`).join("\n\n")}`,
        schema: SCHEMA,
      });
      costo += ai.costCents;
      persone = personeVerificate(ai.dati.persone ?? [], fonti, l.name);
    }
    // La persona si sa ma manca un profilo: una ricerca sul suo nome.
    if (persone[0] && (!persone[0].profilo || !persone[0].profiloInstagram)) {
      const c = await cerca(`"${persone[0].nome}" ${nome} (site:linkedin.com/in OR site:instagram.com)`);
      costo += c.costo;
      persone = [aggiungiProfili(persone[0], l.name, c.fonti), ...persone.slice(1)];
    }

    if (opz.forza && !persone.length) {
      await db.agentRun.update({ where: { id: run.id }, data: { status: "FATTO", finishedAt: new Date(), costCents: costo } });
      return { trovate: 0, fatto: true };
    }
    const findings = { fonte: "server", persone: persone.map((p) => ({ nome: p.nome, ruolo: p.ruolo, profilo: p.profilo, profiloInstagram: p.profiloInstagram, fonte: p.fonte, grado: null, contattiInComune: [] })) };
    const { importaDecisionMaker } = await import("@/lib/ricerca/cercatore");
    const importazione = await importaDecisionMaker(leadId, findings);
    await db.$transaction([
      db.agentRun.updateMany({ where: { leadId, agent: "decision_maker", status: "IN_CODA" }, data: { status: "FALLITO", finishedAt: new Date(), error: "Annullato: chi decide lo cerca il server (v3.122)" } }),
      db.agentRun.update({ where: { id: run.id }, data: { status: "FATTO", finishedAt: new Date(), costCents: costo } }),
      db.agentReport.create({
        data: {
          leadId, agent: "decision_maker",
          summary: persone.length ? `Chi decide: ${persone.map((p) => `${p.nome} (${p.ruolo})`).join(", ")}` : "Chi decide non trovato sul sito né su Google",
          findings: { ...findings, importazione } as unknown as Prisma.InputJsonValue,
          levers: [] as Prisma.InputJsonValue,
          evidence: persone.map((p) => ({ cosa: `${p.nome}: ${p.ruolo}`, fonte: p.fonte, citazione: p.citazione })) as Prisma.InputJsonValue,
          confidence: persone.length ? "MEDIA" : "BASSA",
          collectedAt: oggi,
          validUntil: new Date(oggi.getTime() + GIORNI_VALIDITA * 86400_000),
        },
      }),
    ]);
    const [{ dopoCollegamento }, { entraSubito }] = await Promise.all([import("./motore"), import("./rete")]);
    await dopoCollegamento(leadId);
    await entraSubito(leadId, oggi);
    return { trovate: persone.length, fatto: true };
  } catch (e) {
    const errore = e instanceof Error ? e.message : String(e);
    await db.agentRun.update({ where: { id: run.id }, data: { status: "FALLITO", finishedAt: new Date(), error: errore.slice(0, 500) } });
    return { trovate: 0, fatto: false, motivo: errore };
  } finally {
    inCorso.delete(leadId);
  }
}

/** Le aziende del passo 1 ancora senza chi decide, le più vecchie prima. Un tentativo ogni 6 ore. */
export async function daCercare(limit: number, oggi = new Date()): Promise<string[]> {
  const ls = await db.lead.findMany({
    where: {
      ritrovamenti: { some: {} },
      pipelineStage: { notIn: STADI_FUORI as never },
      lavorazione: null,
      agentReports: { none: { agent: "decision_maker" } },
      agentRuns: { none: { agent: AGENTE_SERVER, queuedAt: { gte: new Date(oggi.getTime() - 6 * 3600_000) } } },
      NOT: { approvalItems: { some: { kind: KIND_FASCICOLO_BASE, status: "SCARTATO" } } },
      OR: [{ website: { not: null } }, { agentReports: { some: { agent: "trova_sito" } } }],
    },
    orderBy: { createdAt: "asc" },
    select: { id: true },
    take: limit,
  });
  return ls.map((l) => l.id);
}

/** Più ricerche insieme, senza esagerare. */
export async function cercaInParallelo(ids: string[], oggi = new Date(), insieme = 3): Promise<{ fatte: number; trovate: number }> {
  const coda = [...ids];
  const r = { fatte: 0, trovate: 0 };
  await Promise.all(Array.from({ length: Math.min(insieme, coda.length) }, async () => {
    for (let id = coda.shift(); id; id = coda.shift()) {
      const e = await cercaChiDecideServer(id, oggi).catch(() => ({ trovate: 0, fatto: false }));
      if (e.fatto) r.fatte++;
      r.trovate += e.trovate;
    }
  }));
  return r;
}

/** Chi aspetta sul Chrome e non ha né telefono né mail: una ricerca su Google, una volta sola. */
export async function cercaContattiMancanti(limit: number, oggi = new Date()): Promise<string[]> {
  if (!dataForSeoConfigurato() || !(await budgetDisponibile(oggi)).ok) return [];
  const lav = await db.lavorazione.findMany({
    where: { fase: "MAPPATA", strada: { in: ["COLLEGARE", "SCALDARE"] }, lead: { phone: null, email: null, agentRuns: { none: { agent: AGENTE_CONTATTI } } } },
    select: { id: true, leadId: true, lead: { select: { name: true, address: true } } },
    take: limit,
  });
  const trovate: string[] = [];
  for (const l of lav) {
    const run = await db.agentRun.create({ data: { leadId: l.leadId, agent: AGENTE_CONTATTI, status: "IN_CORSO", attempts: 1, startedAt: new Date() } });
    try {
      const zona = (l.lead.address ?? "").split(",").slice(-2).join(" ").replace(/\d{5}/g, " ").trim();
      const { fonti, costo } = await cerca(`"${nomePulito(l.lead.name)}" ${zona} telefono email`);
      const c = contattiDaRisultati(fonti, l.lead.name);
      if (c.telefono || c.email) {
        await db.lead.update({ where: { id: l.leadId }, data: { ...(c.telefono ? { phone: c.telefono } : {}), ...(c.email ? { email: c.email } : {}) } });
        trovate.push(l.id);
      }
      await db.agentRun.update({ where: { id: run.id }, data: { status: "FATTO", finishedAt: new Date(), costCents: costo } });
    } catch (e) {
      await db.agentRun.update({ where: { id: run.id }, data: { status: "FALLITO", finishedAt: new Date(), error: (e instanceof Error ? e.message : String(e)).slice(0, 500) } });
    }
  }
  return trovate;
}
