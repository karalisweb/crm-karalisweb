/**
 * Flusso clienti — il turno di ricerca (Esploratore guidato dalle chiavi).
 *
 * Obiettivo: 5 aziende nuove al giorno. Le chiavi dei casi studio (e quelle nate dalle reti dei
 * membri BNI) dicono cosa cercare prima; senza chiavi si torna alla rotazione categoria × città.
 *
 *   SETTORE / AZIENDA → Google Maps e Google (server, DataForSEO) e Facebook/Instagram (browser)
 *   PERSONA / RETE_MEMBRO → LinkedIn (browser, max 2 lavori al giorno)
 *
 * Qui ci sono anche le importazioni dei lavori di browser (Meta, LinkedIn, rete del membro).
 */
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { detectFranchise } from "@/lib/franchise-brands";
import { detectSegment } from "@/lib/segments";
import { isRealWebsite } from "@/lib/url-utils";
import { budgetDisponibile } from "@/lib/agents/costi";
import { chiamaDataForSeo, dataForSeoConfigurato, dominio, LOCATION_ITALIA } from "@/lib/agents/dataforseo";
import { eNonAzienda, esplora, nomeDaTitolo } from "@/lib/agents/esploratore";
import { mezzanotteRoma, norm } from "@/lib/agents/bni-regole";
import { scadenzeCasi } from "./casi-studio";
import { filtraSimili } from "./filtro";
import {
  AZIENDE_AL_GIORNO, LAVORI_LINKEDIN_AL_GIORNO, MESI_VALIDITA_RETE, RICERCHE_PER_TURNO, ZONE_SARDEGNA,
  nellaZona, nomeConfrontabile, normalizzaLinkedin, passoRicerca, prioritaChiave, prossimaChiave, stessoNome, terminiDi, type TipoChiave,
} from "./regole";

type Canale = "google" | "maps" | "facebook" | "instagram" | "linkedin";

// ─── Salvataggio di un'azienda trovata ──────────────────────────────────────

export interface AziendaTrovata {
  nome: string;
  sito?: string | null;
  telefono?: string | null;
  indirizzo?: string | null;
  categoria?: string | null;
  placeId?: string | null;
  mapsUrl?: string | null;
  rating?: number | null;
  recensioni?: number | null;
  social?: string | null;
}

export type EsitoAzienda = { esito: "nuova" | "esistente" | "scartata"; leadId: string | null };

/** Cerca la stessa azienda nel CRM: place_id, poi dominio, poi pagina social, poi nome + città. */
async function aziendaEsistente(a: AziendaTrovata): Promise<string | null> {
  if (a.placeId) {
    const x = await db.lead.findUnique({ where: { placeId: a.placeId }, select: { id: true } });
    if (x) return x.id;
  }
  if (a.sito && isRealWebsite(a.sito).isReal) {
    const d = dominio(a.sito);
    const x = await db.lead.findFirst({ where: { website: { contains: d, mode: "insensitive" } }, select: { id: true, website: true } });
    if (x && x.website && dominio(x.website) === d) return x.id;
  }
  if (a.social) {
    const x = await db.lead.findFirst({ where: { socialUrl: { equals: a.social, mode: "insensitive" } }, select: { id: true } });
    if (x) return x.id;
  }
  const primaParola = norm(a.nome).split(/[^a-z0-9]+/).find((p) => p.length >= 3);
  if (primaParola) {
    const simili = await db.lead.findMany({ where: { name: { contains: primaParola, mode: "insensitive" } }, select: { id: true, name: true, address: true }, take: 50 });
    const citta = norm(a.indirizzo);
    const x = simili.find((l) => stessoNome(l.name, a.nome) && (!citta || !l.address || norm(l.address).includes(citta) || citta.includes(norm(l.address))));
    if (x) return x.id;
  }
  return null;
}

export async function salvaAzienda(a: AziendaTrovata, chiaveId: string | null, canale: Canale, fonte: string): Promise<EsitoAzienda> {
  const nome = a.nome.trim().slice(0, 200);
  if (!nome) return { esito: "scartata", leadId: null };
  const sito = a.sito && isRealWebsite(a.sito).isReal && !eNonAzienda(dominio(a.sito)) ? `https://${dominio(a.sito)}` : null;
  let leadId = await aziendaEsistente({ ...a, sito });
  let esito: EsitoAzienda["esito"] = "esistente";
  if (!leadId) {
    const catena = detectFranchise(nome, sito);
    const lead = await db.lead.create({
      data: {
        name: nome,
        website: sito,
        phone: a.telefono?.slice(0, 50) ?? null,
        address: a.indirizzo?.slice(0, 300) ?? null,
        category: a.categoria?.slice(0, 100) ?? null,
        segment: detectSegment(a.categoria ?? null),
        placeId: a.placeId ?? null,
        googleMapsUrl: a.mapsUrl ?? null,
        googleRating: a.rating != null ? Math.round(a.rating * 10) / 10 : null,
        googleReviewsCount: a.recensioni ?? null,
        socialUrl: a.social ?? null,
        source: fonte,
        ...(catena && { pipelineStage: "NON_TARGET", notes: `Franchising rilevato (${catena}) — fuori target, scartato in automatico.` }),
      },
    });
    leadId = lead.id;
    esito = catena ? "scartata" : "nuova";
  }
  if (chiaveId) {
    const gia = await db.ritrovamento.findFirst({ where: { chiaveId, leadId }, select: { id: true } });
    if (!gia) await db.ritrovamento.create({ data: { chiaveId, leadId, canale } });
  }
  return { esito, leadId };
}

// ─── Salvataggio di una persona trovata (LinkedIn) ──────────────────────────

export interface PersonaTrovata {
  nome: string;
  ruolo?: string | null;
  azienda?: string | null;
  sitoAzienda?: string | null;
  profilo?: string | null;
  localita?: string | null;
  contattoInComune?: string | null;
  perche?: string | null;
}

/** Un membro BNI con lo stesso profilo LinkedIn, o con lo stesso nome (e azienda, se si sa). */
async function membroBniDi(p: PersonaTrovata, url: string | null): Promise<string | null> {
  if (url) {
    const x = await db.bniMembro.findFirst({ where: { linkedinUrl: url }, select: { id: true } });
    if (x) return x.id;
  }
  const parole = norm(p.nome).split(/[^a-z]+/).filter((w) => w.length >= 3);
  if (parole.length < 2) return null;
  const candidati = await db.bniMembro.findMany({ where: { name: { contains: parole[parole.length - 1], mode: "insensitive" } }, select: { id: true, name: true, company: true } });
  // Stesso nome e cognome basta; se si conoscono entrambe le aziende devono avere almeno una parola in comune.
  const paroleAzienda = (t: string) => new Set(nomeConfrontabile(t).split(" ").filter((w) => w.length >= 3));
  const aziendeCompatibili = (a: string | null, b: string | null) => !a || !b || [...paroleAzienda(a)].some((w) => paroleAzienda(b).has(w));
  const x = candidati.find((m) => stessoNome(m.name, p.nome) && aziendeCompatibili(m.company, p.azienda ?? null));
  return x?.id ?? null;
}

export async function salvaPersona(
  p: PersonaTrovata,
  o: { chiaveId: string | null; fonte: "linkedin" | "rete_membro"; categoria?: string | null }
): Promise<{ personaId: string; nuova: boolean; bni: boolean; leadId: string | null } | null> {
  const nome = p.nome?.trim().slice(0, 120);
  if (!nome) return null;
  const url = normalizzaLinkedin(p.profilo);
  const gia = url ? await db.persona.findUnique({ where: { linkedinUrl: url } }) : null;
  if (gia) {
    if (o.chiaveId) {
      const r = await db.ritrovamento.findFirst({ where: { chiaveId: o.chiaveId, personaId: gia.id }, select: { id: true } });
      if (!r) await db.ritrovamento.create({ data: { chiaveId: o.chiaveId, personaId: gia.id, leadId: gia.leadId, canale: "linkedin" } });
    }
    return { personaId: gia.id, nuova: false, bni: !!gia.bniMembroId, leadId: gia.leadId };
  }

  const bniMembroId = await membroBniDi(p, url);
  // L'azienda della persona: si collega se c'è; se non c'è si crea (non per i membri BNI: con
  // loro si costruisce una relazione, non si vende).
  let leadId: string | null = null;
  if (p.azienda?.trim()) {
    if (bniMembroId) {
      leadId = (await db.bniMembro.findUnique({ where: { id: bniMembroId }, select: { leadId: true } }))?.leadId ?? null;
    } else {
      const a = await salvaAzienda({ nome: p.azienda, sito: p.sitoAzienda, indirizzo: p.localita, categoria: o.categoria ?? null }, null, "linkedin", "linkedin");
      leadId = a.leadId;
    }
  }
  const persona = await db.persona.create({
    data: {
      nome,
      ruolo: p.ruolo?.slice(0, 160) ?? null,
      aziendaNome: p.azienda?.slice(0, 200) ?? null,
      linkedinUrl: url,
      localita: p.localita?.slice(0, 120) ?? null,
      leadId,
      bniMembroId,
      contattoInComune: p.contattoInComune?.slice(0, 200) ?? null,
      chiaveId: o.chiaveId,
      fonte: o.fonte,
      note: p.perche?.slice(0, 500) ?? null,
    },
  });
  if (o.chiaveId) await db.ritrovamento.create({ data: { chiaveId: o.chiaveId, personaId: persona.id, leadId, canale: "linkedin" } });
  return { personaId: persona.id, nuova: true, bni: !!bniMembroId, leadId };
}

// ─── Le ricerche di server: Google Maps e Google ────────────────────────────

interface ItemMaps {
  type: string;
  title?: string;
  domain?: string;
  url?: string;
  phone?: string;
  address?: string;
  place_id?: string;
  category?: string;
  rating?: { value?: number; votes_count?: number } | null;
}

interface ItemSerp {
  type: string;
  domain?: string;
  url?: string;
  title?: string;
}

export interface EsitoPasso {
  ricerca: string;
  canale: Canale;
  trovati: number;
  /** Scartati dal filtro dei simili (altro mestiere: piscine comunali, palestre…). */
  diversi: number;
  nuove: number;
  esistenti: number;
  scartate: number;
  /** Simili nuovi non salvati perché la quota del giorno era piena: si riprendono al giro dopo. */
  rimandati: number;
  costCents: number;
}

/**
 * Salva i candidati già filtrati, i migliori prima (con sito, poi con più recensioni), fino alla
 * quota di aziende nuove. Quelli già nel CRM si collegano comunque alla chiave.
 */
async function salvaFinoAQuota(
  candidati: AziendaTrovata[], quota: number, chiaveId: string, canale: Canale, fonte: string, e: EsitoPasso
): Promise<void> {
  const ordinati = [...candidati].sort((a, b) => Number(!!b.sito) - Number(!!a.sito) || (b.recensioni ?? 0) - (a.recensioni ?? 0));
  for (const a of ordinati) {
    if (e.nuove >= quota) {
      // Quota piena: si collega solo chi è già nel CRM, gli altri restano per il prossimo giro.
      const gia = await aziendaEsistente(a);
      if (gia) {
        const r = await db.ritrovamento.findFirst({ where: { chiaveId, leadId: gia }, select: { id: true } });
        if (!r) await db.ritrovamento.create({ data: { chiaveId, leadId: gia, canale } });
        e.esistenti++;
      } else e.rimandati++;
      continue;
    }
    const r = await salvaAzienda(a, chiaveId, canale, fonte);
    if (r.esito === "nuova") e.nuove++;
    else if (r.esito === "esistente") e.esistenti++;
    else e.scartate++;
  }
}

async function cercaSuMaps(termine: string, zona: string, chiaveId: string, contesto: string, quota: number, escluse: string[] = []): Promise<EsitoPasso> {
  const ricerca = `${termine} ${zona}`;
  const { result, costCents } = await chiamaDataForSeo<{ items?: ItemMaps[] }>("/serp/google/maps/live/advanced", {
    keyword: ricerca, location_code: LOCATION_ITALIA, language_code: "it", depth: 20,
  });
  const items = (result?.items ?? []).filter((i) => i.type === "maps_search" && i.title);
  const candidati: AziendaTrovata[] = items.map((i) => ({
    nome: i.title!, sito: i.url ?? (i.domain ? `https://${i.domain}` : null), telefono: i.phone, indirizzo: i.address,
    categoria: i.category ?? termine, placeId: i.place_id, rating: i.rating?.value ?? null, recensioni: i.rating?.votes_count ?? null,
    mapsUrl: i.place_id ? `https://www.google.com/maps/place/?q=place_id:${i.place_id}` : null,
  }));
  const filtro = await filtraSimili(contesto, candidati);
  const simili = candidati.filter((c, i) => filtro.tenere.has(i) && nellaZona(c.indirizzo, zona, escluse));
  const e: EsitoPasso = { ricerca, canale: "maps", trovati: items.length, diversi: candidati.length - simili.length, nuove: 0, esistenti: 0, scartate: 0, rimandati: 0, costCents: costCents + filtro.costCents };
  await salvaFinoAQuota(simili, quota, chiaveId, "maps", "google_maps", e);
  return e;
}

async function cercaSuGoogle(termine: string, zona: string, chiaveId: string, contesto: string, quota: number): Promise<EsitoPasso> {
  const ricerca = `${termine} ${zona}`;
  const { result, costCents } = await chiamaDataForSeo<{ items?: ItemSerp[] }>("/serp/google/organic/live/advanced", {
    keyword: ricerca, location_code: LOCATION_ITALIA, language_code: "it", depth: 30,
  });
  const organici = (result?.items ?? []).filter((i) => i.type === "organic" && i.domain && i.url);
  const visti = new Set<string>();
  const candidati: AziendaTrovata[] = [];
  let scartate = 0;
  for (const i of organici) {
    const d = dominio(i.domain!);
    if (visti.has(d)) continue;
    visti.add(d);
    if (eNonAzienda(d) || !isRealWebsite(i.url!).isReal) {
      scartate++;
      continue;
    }
    candidati.push({ nome: nomeDaTitolo(i.title ?? d, d), sito: `https://${d}`, indirizzo: zona, categoria: termine });
  }
  const filtro = await filtraSimili(contesto, candidati.map((c, i) => ({ ...c, categoria: organici[i]?.title ?? c.categoria })));
  const simili = candidati.filter((_, i) => filtro.tenere.has(i));
  const e: EsitoPasso = { ricerca, canale: "google", trovati: organici.length, diversi: candidati.length - simili.length, nuove: 0, esistenti: 0, scartate, rimandati: 0, costCents: costCents + filtro.costCents };
  await salvaFinoAQuota(simili, quota, chiaveId, "google", "google_search", e);
  return e;
}

// ─── Il turno ──────────────────────────────────────────────────────────────

export interface RiepilogoRicerca {
  casiScaduti: number;
  nuoveOggiPrima: number;
  passi: EsitoPasso[];
  nuove: number;
  costCents: number;
  lavoriMeta: number;
  lavoriLinkedin: number;
  esploratoreClassico: boolean;
  motivo?: string;
}

const TIPI_AZIENDE: TipoChiave[] = ["SETTORE", "AZIENDA"];
const TIPI_PERSONE: TipoChiave[] = ["PERSONA", "RETE_MEMBRO"];

function terminiChiave(k: { tipo: string; valore: string; termini: Prisma.JsonValue }): string[] {
  // AZIENDA è la nicchia: il valore è il nome del cliente, si cercano solo i termini dei "simili".
  // SETTORE: il settore e le sue ricerche più larghe.
  return k.tipo === "AZIENDA" ? terminiDi("", k.termini) : terminiDi(k.valore, k.termini);
}

/** Chi è il cliente del caso studio: serve al filtro dei simili. */
async function contestoChiave(k: { valore: string; casoStudioId: string | null }): Promise<string> {
  if (!k.casoStudioId) return k.valore;
  const c = await db.casoStudio.findUnique({ where: { id: k.casoStudioId }, select: { aziendaNome: true, settore: true, storia: true } });
  if (!c) return k.valore;
  return [c.aziendaNome, c.settore && `settore: ${c.settore}`, c.storia?.split("\n")[0]].filter(Boolean).join(" · ");
}

/** Aziende nuove trovate oggi dalle chiavi (canali di aziende, non LinkedIn). */
async function nuoveDiOggi(oggi: Date): Promise<number> {
  const da = mezzanotteRoma(oggi);
  return db.ritrovamento.count({ where: { createdAt: { gte: da }, canale: { not: "linkedin" }, lead: { createdAt: { gte: da } } } });
}

export async function eseguiTurnoRicerca(oggi = new Date()): Promise<RiepilogoRicerca> {
  const r: RiepilogoRicerca = {
    casiScaduti: await scadenzeCasi(oggi), nuoveOggiPrima: await nuoveDiOggi(oggi), passi: [], nuove: 0, costCents: 0,
    lavoriMeta: 0, lavoriLinkedin: 0, esploratoreClassico: false,
  };
  const chiavi = await db.chiaveRicerca.findMany({ where: { attiva: true } });
  // La nicchia non si cerca nella provincia del cliente del caso: sarebbero suoi concorrenti diretti.
  const province = new Map(
    (await db.casoStudio.findMany({ where: { provincia: { not: null } }, select: { id: true, provincia: true } })).map((c) => [c.id, c.provincia!])
  );
  const escluseDi = (k: (typeof chiavi)[number]): string[] => {
    const p = k.tipo === "AZIENDA" && k.casoStudioId ? province.get(k.casoStudioId) : undefined;
    return p ? [p] : [];
  };
  const passoDi = (k: (typeof chiavi)[number], indice = k.zonaIndice) => passoRicerca(terminiChiave(k), indice, escluseDi(k));
  const priorita = (k: (typeof chiavi)[number]) => prioritaChiave(k.tipo, passoDi(k)?.zona ?? null);

  // 1) Server: Google Maps, e Google se Maps porta poco.
  if (!dataForSeoConfigurato()) r.motivo = "DataForSEO non configurato";
  for (let i = 0; i < RICERCHE_PER_TURNO && !r.motivo && r.nuoveOggiPrima + r.nuove < AZIENDE_AL_GIORNO; i++) {
    if (!(await budgetDisponibile(oggi)).ok) {
      r.motivo = "Tetto di spesa del mese raggiunto";
      break;
    }
    const k = prossimaChiave(chiavi, TIPI_AZIENDE, oggi, priorita);
    if (!k) {
      // Nessuna chiave attiva: l'Esploratore di prima (categoria × città).
      const e = await esplora(oggi);
      r.esploratoreClassico = true;
      r.nuove += e.nuove;
      r.costCents += e.costCents;
      break;
    }
    const passo = passoDi(k);
    k.ultimoUsoAt = oggi;
    if (!passo) {
      await db.chiaveRicerca.update({ where: { id: k.id }, data: { esauritaAt: oggi, ultimoUsoAt: oggi } });
      k.esauritaAt = oggi;
      continue;
    }
    const contesto = await contestoChiave(k);
    const run = await db.agentRun.create({ data: { agent: "esploratore", status: "IN_CORSO", attempts: 1, startedAt: new Date(), input: { chiaveId: k.id, ...passo } } });
    try {
      const quota = () => AZIENDE_AL_GIORNO - r.nuoveOggiPrima - r.nuove;
      const esiti = [await cercaSuMaps(passo.termine, passo.zona, k.id, contesto, quota(), escluseDi(k))];
      r.nuove += esiti[0].nuove;
      if (esiti[0].nuove < 3 && quota() > 0) {
        esiti.push(await cercaSuGoogle(passo.termine, passo.zona, k.id, contesto, quota()));
        r.nuove += esiti[1].nuove;
      }
      const nuove = esiti.reduce((n, e) => n + e.nuove, 0);
      const costo = esiti.reduce((n, e) => n + e.costCents, 0);
      // Se sono rimasti simili non salvati (quota piena) la zona si ripete al prossimo giro.
      const avanza = esiti.every((e) => e.rimandati === 0);
      r.passi.push(...esiti);
      r.costCents += costo;
      await db.$transaction([
        db.chiaveRicerca.update({ where: { id: k.id }, data: { ...(avanza ? { zonaIndice: { increment: 1 } } : {}), usi: { increment: 1 }, trovati: { increment: nuove }, ultimoUsoAt: oggi } }),
        db.agentReport.create({
          data: {
            agent: "esploratore",
            runId: run.id,
            summary: `"${passo.termine} ${passo.zona}": ${nuove} aziende nuove`,
            // `ricerca` serve anche all'Esploratore classico per non ripetere le stesse ricerche.
            findings: { ricerca: `${passo.termine} ${passo.zona}`.toLowerCase(), chiaveId: k.id, esiti } as unknown as Prisma.InputJsonValue,
            confidence: "ALTA",
            collectedAt: oggi,
            validUntil: new Date(oggi.getTime() + 60 * 86400_000),
          },
        }),
        db.agentRun.update({ where: { id: run.id }, data: { status: "FATTO", finishedAt: new Date(), costCents: costo } }),
      ]);
      if (avanza) k.zonaIndice++;
    } catch (err) {
      await db.agentRun.update({ where: { id: run.id }, data: { status: "FALLITO", finishedAt: new Date(), error: (err instanceof Error ? err.message : String(err)).slice(0, 500) } });
      r.motivo = `Ricerca fallita: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  // 2) Browser: Facebook e Instagram, un lavoro al giorno.
  const daOggi = mezzanotteRoma(oggi);
  const metaOggi = await db.agentRun.count({ where: { agent: "cerca_meta", queuedAt: { gte: daOggi } } });
  const kMeta = metaOggi ? null : prossimaChiave(chiavi.filter((c) => !c.esauritaAt), TIPI_AZIENDE, oggi, priorita);
  if (kMeta) {
    const termini = terminiChiave(kMeta);
    const passo = passoDi(kMeta, Math.max(0, kMeta.zonaIndice - 1));
    if (passo) {
      await db.agentRun.create({ data: { agent: "cerca_meta", status: "IN_CODA", input: { chiaveId: kMeta.id, termine: passo.termine, zona: passo.zona, altriTermini: termini, provinceEscluse: escluseDi(kMeta) } } });
      r.lavoriMeta++;
    }
  }

  // 3) Browser: LinkedIn, al massimo 2 lavori al giorno (contano anche le reti dei membri BNI).
  const linkedinOggi = await db.agentRun.count({ where: { agent: { in: ["cerca_linkedin", "rete_membro"] }, queuedAt: { gte: daOggi } } });
  if (linkedinOggi < LAVORI_LINKEDIN_AL_GIORNO) {
    const k = prossimaChiave(chiavi, TIPI_PERSONE, oggi);
    if (k) {
      const [caso, membro] = await Promise.all([
        k.casoStudioId ? db.casoStudio.findUnique({ where: { id: k.casoStudioId }, select: { settore: true, personaNome: true, personaRuolo: true, personaLinkedin: true, aziendaNome: true } }) : null,
        k.bniMembroId ? db.bniMembro.findUnique({ where: { id: k.bniMembroId }, select: { name: true, linkedinUrl: true, company: true } }) : null,
      ]);
      const settori = (await db.casoStudio.findMany({ where: { stato: "ATTIVO" }, select: { settore: true } })).map((c) => c.settore).filter(Boolean);
      await db.agentRun.create({
        data: {
          agent: "cerca_linkedin",
          status: "IN_CODA",
          input: {
            chiaveId: k.id,
            tipo: k.tipo,
            zona: k.usi < ZONE_SARDEGNA / 3 ? "Sardegna" : "Italia",
            ...(caso ? { persona: { nome: caso.personaNome, ruolo: caso.personaRuolo, linkedin: caso.personaLinkedin, azienda: caso.aziendaNome }, settore: caso.settore } : {}),
            ...(membro ? { membro: { nome: membro.name, linkedin: membro.linkedinUrl, azienda: membro.company }, settoriCasiStudio: settori } : {}),
            giaVisti: k.usi,
          },
        },
      });
      await db.chiaveRicerca.update({ where: { id: k.id }, data: { usi: { increment: 1 }, ultimoUsoAt: oggi } });
      r.lavoriLinkedin++;
    }
  }
  return r;
}

// ─── Importazione dei lavori di browser ────────────────────────────────────

const str = (v: unknown, max = 300): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

export interface EsitoImport {
  nuove: number;
  esistenti: number;
  scartate: number;
  bni?: number;
  presentazioni?: number;
}

export async function importaAziendeMeta(input: unknown, findings: Record<string, unknown>): Promise<EsitoImport> {
  const chiaveId = str((input as { chiaveId?: unknown } | null)?.chiaveId, 60);
  const termine = str((input as { termine?: unknown } | null)?.termine, 100);
  const aziende = Array.isArray(findings.aziende) ? findings.aziende.slice(0, 30) : [];
  const e: EsitoImport = { nuove: 0, esistenti: 0, scartate: 0 };
  for (const a of aziende as Record<string, unknown>[]) {
    const nome = str(a.nome, 200);
    if (!nome) continue;
    const piattaforma = norm(str(a.piattaforma, 20)) === "instagram" ? "instagram" : "facebook";
    const r = await salvaAzienda(
      { nome, sito: str(a.sito), telefono: str(a.telefono, 50), indirizzo: str(a.citta, 120), categoria: str(a.categoria, 100) ?? termine, social: str(a.pagina, 500) },
      chiaveId, piattaforma, "meta"
    );
    e[r.esito === "nuova" ? "nuove" : r.esito === "esistente" ? "esistenti" : "scartate"]++;
  }
  return e;
}

function persone(findings: Record<string, unknown>): PersonaTrovata[] {
  const lista = Array.isArray(findings.persone) ? findings.persone.slice(0, 30) : [];
  return (lista as Record<string, unknown>[])
    .map((p) => ({
      nome: str(p.nome, 120) ?? "",
      ruolo: str(p.ruolo, 160),
      azienda: str(p.azienda, 200),
      sitoAzienda: str(p.sitoAzienda, 300),
      profilo: str(p.profilo, 300),
      localita: str(p.localita, 120),
      contattoInComune: str(p.contattoInComune, 200),
      perche: str(p.perche, 300),
    }))
    .filter((p) => p.nome);
}

export async function importaPersoneLinkedin(input: unknown, findings: Record<string, unknown>): Promise<EsitoImport> {
  const chiaveId = str((input as { chiaveId?: unknown } | null)?.chiaveId, 60);
  const settore = str((input as { settore?: unknown } | null)?.settore, 100);
  const e: EsitoImport = { nuove: 0, esistenti: 0, scartate: 0, bni: 0 };
  for (const p of persone(findings)) {
    const r = await salvaPersona(p, { chiaveId, fonte: "linkedin", categoria: settore });
    if (!r) e.scartate++;
    else {
      e[r.nuova ? "nuove" : "esistenti"]++;
      if (r.bni) e.bni!++;
    }
  }
  return e;
}

/**
 * La rete LinkedIn di un membro BNI: il suo profilo, 3-5 persone da farsi presentare e una chiave
 * RETE_MEMBRO per continuare a cercare nella sua rete.
 */
export async function importaReteMembro(membroId: string | null, findings: Record<string, unknown>, oggi = new Date()): Promise<EsitoImport> {
  const e: EsitoImport = { nuove: 0, esistenti: 0, scartate: 0, bni: 0, presentazioni: 0 };
  if (!membroId) return e;
  const membro = await db.bniMembro.findUnique({ where: { id: membroId }, select: { id: true, name: true, linkedinUrl: true } });
  if (!membro) return e;
  const profilo = normalizzaLinkedin(str(findings.profiloMembro, 300));

  let chiave = await db.chiaveRicerca.findFirst({ where: { tipo: "RETE_MEMBRO", bniMembroId: membroId } });
  if (!chiave) {
    chiave = await db.chiaveRicerca.create({
      data: { tipo: "RETE_MEMBRO", valore: membro.name, bniMembroId: membroId, scadeAt: new Date(oggi.getTime() + MESI_VALIDITA_RETE * 30 * 86400_000) },
    });
  }
  await db.bniMembro.update({ where: { id: membroId }, data: { reteLettaAt: oggi, ...(profilo && !membro.linkedinUrl ? { linkedinUrl: profilo } : {}) } });

  const gia = new Set((await db.bniPresentazione.findMany({ where: { membroId }, select: { nome: true } })).map((p) => norm(p.nome)));
  let presentazioni = 0;
  for (const p of persone(findings)) {
    const r = await salvaPersona({ ...p, contattoInComune: p.contattoInComune ?? membro.name }, { chiaveId: chiave.id, fonte: "rete_membro" });
    if (!r) {
      e.scartate++;
      continue;
    }
    e[r.nuova ? "nuove" : "esistenti"]++;
    if (r.bni) {
      e.bni!++;
      continue; // un altro membro BNI non si "fa presentare": lo si incontra con un 121
    }
    if (presentazioni < 5 && !gia.has(norm(p.nome))) {
      await db.bniPresentazione.create({
        data: { membroId, personaId: r.personaId, nome: p.nome, ruolo: [p.ruolo, p.azienda].filter(Boolean).join(" · ") || null, linkedinUrl: normalizzaLinkedin(p.profilo), perche: p.perche, stato: "DA_CHIEDERE" },
      });
      presentazioni++;
    }
  }
  await db.chiaveRicerca.update({ where: { id: chiave.id }, data: { usi: { increment: 1 }, trovati: { increment: e.nuove }, ultimoUsoAt: oggi } });
  e.presentazioni = presentazioni;
  return e;
}

