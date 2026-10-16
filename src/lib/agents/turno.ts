/**
 * Un turno di lavoro della squadra commerciale. Lo sveglia l'orologio (crontab del VPS →
 * POST /api/cron/squadra) oppure Alessio dalla pagina Squadra.
 *
 * Tre fasi, a imbuto:
 *   1. BASE          — agenti economici su tutte le aziende con sito.
 *   2. APPROFONDIMENTO — solo sulle aziende che Alessio ha approvato in cassetta:
 *                      agenti di server a pagamento + lavori accodati per il browser.
 *   3. SINTESI       — quando l'approfondimento ha chiuso: coerenza → video → leve →
 *                      aggancio, poi la scheda contatto va in cassetta.
 *
 * Ripetibile senza danni: ogni lavoro è una riga in agent_runs, un lavoro interrotto viene
 * chiuso come fallito al turno dopo e il regista non rifà ciò che ha già un referto valido.
 */
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { scaricaPagina } from "./pagina";
import { AGENTI_ESEGUIBILI, CHIAVI_BROWSER } from "./registro";
import {
  agentiDaEseguire,
  browserDaAccodare,
  prontoPerSintesi,
  valutaFascicolo,
  AGENTI_APPROFONDIMENTO_SERVER,
  AGENTI_SINTESI,
  LAVORO_BLOCCATO_MINUTI,
  LAVORO_BROWSER_BLOCCATO_ORE,
  PAUSA_DOPO_FALLIMENTO_ORE,
  SCADENZA_BROWSER_GIORNI,
  type StatoAgenteSuAzienda,
} from "./regista";
import { budgetDisponibile } from "./costi";
import type { AziendaContesto, ContestoAgente, Leva, PaginaScaricata, Prova, RefertoLetto } from "./tipi";

export const KIND_FASCICOLO_BASE = "FASCICOLO_BASE";
export const KIND_SCHEDA_CONTATTO = "SCHEDA_CONTATTO";

/** Stadi in cui un'azienda non va più analizzata. */
const STADI_ESCLUSI = ["NON_TARGET", "SENZA_SITO", "CLIENTE", "PERSO", "ARCHIVIATO"] as const;

/** Le aziende su cui la squadra lavora. */
export const BASE_AZIENDE: Prisma.LeadWhereInput = {
  website: { not: null },
  NOT: [{ website: "" }],
  pipelineStage: { notIn: [...STADI_ESCLUSI] },
  unsubscribed: false,
};

const SELEZIONE = {
  id: true,
  name: true,
  website: true,
  category: true,
  address: true,
  phone: true,
  googleRating: true,
  googleReviewsCount: true,
  search: { select: { location: true } },
} satisfies Prisma.LeadSelect;

type LeadScelto = Prisma.LeadGetPayload<{ select: typeof SELEZIONE }>;

/** La città da un indirizzo italiano ("Via Roma 1, 09100 Cagliari CA, Italia" → "Cagliari"). */
export function cittaDaIndirizzo(indirizzo: string | null): string | null {
  if (!indirizzo) return null;
  const m = indirizzo.match(/\b\d{5}\s+([A-Za-zÀ-ÿ' .-]+?)(?:\s+[A-Z]{2})?\s*(?:,|$)/);
  if (m) return m[1].trim();
  // Le aziende trovate dall'Esploratore hanno come "indirizzo" solo la città della ricerca.
  const t = indirizzo.trim();
  return !/[\d,]/.test(t) && t.length <= 40 ? t : null;
}

export function aziendaContesto(l: LeadScelto): AziendaContesto | null {
  if (!l.website) return null;
  return {
    id: l.id,
    name: l.name,
    website: l.website,
    category: l.category,
    address: l.address,
    phone: l.phone,
    googleRating: l.googleRating != null ? Number(l.googleRating) : null,
    googleReviewsCount: l.googleReviewsCount,
    citta: cittaDaIndirizzo(l.address) ?? l.search?.location ?? null,
  };
}

export interface RiepilogoTurno {
  aziende: number;
  lavoriFatti: number;
  lavoriFalliti: number;
  nuoviInCassetta: number;
  accodatiBrowser: number;
  sbloccati: number;
  saltatiPerBudget: number;
  durataMs: number;
}

function riepilogoVuoto(): RiepilogoTurno {
  return { aziende: 0, lavoriFatti: 0, lavoriFalliti: 0, nuoviInCassetta: 0, accodatiBrowser: 0, sbloccati: 0, saltatiPerBudget: 0, durataMs: 0 };
}

/**
 * Chiude come falliti i lavori rimasti appesi: "in corso" da troppo (es. riavvio del server
 * a metà; per il browser, un Mac che si è spento) o accodati per il browser e mai presi.
 */
export async function sbloccaLavori(oggi = new Date()): Promise<number> {
  const agentiBrowser = CHIAVI_BROWSER;

  const [server, inCorsoBrowser, scaduti] = await Promise.all([
    db.agentRun.updateMany({
      where: { status: "IN_CORSO", agent: { notIn: agentiBrowser }, startedAt: { lt: new Date(oggi.getTime() - LAVORO_BLOCCATO_MINUTI * 60_000) } },
      data: { status: "FALLITO", finishedAt: oggi, error: "Interrotto (lavoro rimasto in corso oltre 30 minuti)" },
    }),
    db.agentRun.updateMany({
      where: { status: "IN_CORSO", agent: { in: agentiBrowser }, startedAt: { lt: new Date(oggi.getTime() - LAVORO_BROWSER_BLOCCATO_ORE * 3600_000) } },
      data: { status: "FALLITO", finishedAt: oggi, error: `Il browser l'ha preso ma non l'ha chiuso entro ${LAVORO_BROWSER_BLOCCATO_ORE} ore` },
    }),
    db.agentRun.updateMany({
      where: { status: "IN_CODA", agent: { in: agentiBrowser }, queuedAt: { lt: new Date(oggi.getTime() - SCADENZA_BROWSER_GIORNI * 86400_000) } },
      data: { status: "FALLITO", finishedAt: oggi, error: `Nessun browser l'ha preso entro ${SCADENZA_BROWSER_GIORNI} giorni (il Mac era spento?)` },
    }),
  ]);
  return server.count + inCorsoBrowser.count + scaduti.count;
}

/** Stato di ogni agente su un'azienda, nella forma che il regista capisce. */
export async function statoAzienda(leadId: string): Promise<StatoAgenteSuAzienda[]> {
  const [runs, reports] = await Promise.all([
    db.agentRun.findMany({
      where: { leadId },
      select: { agent: true, status: true, finishedAt: true, queuedAt: true },
      orderBy: { queuedAt: "desc" },
    }),
    db.agentReport.findMany({ where: { leadId }, select: { agent: true, validUntil: true } }),
  ]);
  const agenti = new Set([...runs.map((r) => r.agent), ...reports.map((r) => r.agent)]);
  return [...agenti].map((agente) => {
    const suoi = runs.filter((r) => r.agent === agente); // dal più recente
    let fallimentiDiFila = 0;
    for (const r of suoi) {
      if (r.status === "FALLITO") fallimentiDiFila++;
      else if (r.status === "FATTO") break;
    }
    const ultimoFallito = suoi.find((r) => r.status === "FALLITO");
    const scadenze = reports.filter((r) => r.agent === agente).map((r) => r.validUntil.getTime());
    return {
      agente,
      validoFino: scadenze.length ? new Date(Math.max(...scadenze)) : null,
      fallimentiDiFila,
      ultimoFallimento: ultimoFallito?.finishedAt ?? null,
      inCorso: suoi.some((r) => r.status === "IN_CORSO" || r.status === "IN_CODA"),
    };
  });
}

/** I referti validi su un'azienda, il più recente per agente. */
export async function refertiValidi(leadId: string, oggi = new Date()): Promise<RefertoLetto[]> {
  const righe = await db.agentReport.findMany({
    where: { leadId, validUntil: { gt: oggi } },
    orderBy: { collectedAt: "desc" },
    distinct: ["agent"],
  });
  return righe.map((r) => ({
    agent: r.agent,
    summary: r.summary,
    findings: (r.findings ?? {}) as Record<string, unknown>,
    levers: r.levers as unknown as Leva[],
    evidence: r.evidence as unknown as Prova[],
    confidence: r.confidence,
    collectedAt: r.collectedAt,
  }));
}

function messaggioErrore(err: unknown): string {
  const m = err instanceof Error ? err.message : String(err);
  return m.slice(0, 500);
}

/**
 * Fa lavorare in sequenza gli agenti del piano su un'azienda. Gli agenti a pagamento
 * partono solo se c'è budget: altrimenti si fermano (e lo si conta nel riepilogo).
 * Se `catena` è vero, al primo fallimento ci si ferma (la sintesi è una catena).
 */
export async function eseguiAgenti(
  azienda: AziendaContesto,
  piano: string[],
  oggi = new Date(),
  opzioni: { catena?: boolean } = {}
): Promise<{ fatti: number; falliti: number; saltatiPerBudget: number }> {
  let pagina: Promise<PaginaScaricata> | null = null;
  const ctx: ContestoAgente = {
    lead: azienda,
    pagina: () => (pagina ??= scaricaPagina(azienda.website)),
    referti: () => refertiValidi(azienda.id, oggi),
    oggi,
  };

  let fatti = 0;
  let falliti = 0;
  let saltatiPerBudget = 0;
  for (const chiave of piano) {
    const agente = AGENTI_ESEGUIBILI[chiave];
    if (!agente) continue;
    if (agente.aPagamento && !(await budgetDisponibile(oggi)).ok) {
      saltatiPerBudget++;
      if (opzioni.catena) break;
      continue;
    }
    const run = await db.agentRun.create({
      data: { leadId: azienda.id, agent: chiave, status: "IN_CORSO", attempts: 1, startedAt: new Date() },
      select: { id: true },
    });
    try {
      const r = await agente.esegui(ctx);
      const validUntil = new Date(oggi.getTime() + agente.validitaGiorni * 86400_000);
      await db.$transaction([
        db.agentReport.create({
          data: {
            leadId: azienda.id,
            agent: chiave,
            runId: run.id,
            summary: r.summary,
            findings: r.findings as Prisma.InputJsonValue,
            levers: r.levers as unknown as Prisma.InputJsonValue,
            evidence: r.evidence as unknown as Prisma.InputJsonValue,
            confidence: r.confidence,
            collectedAt: oggi,
            validUntil,
          },
        }),
        db.agentRun.update({
          where: { id: run.id },
          data: { status: "FATTO", finishedAt: new Date(), costCents: r.costCents ?? 0 },
        }),
      ]);
      fatti++;
    } catch (err) {
      falliti++;
      await db.agentRun.update({
        where: { id: run.id },
        data: { status: "FALLITO", finishedAt: new Date(), error: messaggioErrore(err) },
      });
      if (opzioni.catena) break;
    }
  }
  return { fatti, falliti, saltatiPerBudget };
}

// ─── Fase 1: base ──────────────────────────────────────────────────────────

/** Se il fascicolo base è completo e ha abbastanza leve, lo mette in cassetta (una volta sola). */
export async function proponiInCassetta(azienda: AziendaContesto, oggi = new Date()): Promise<boolean> {
  const referti = await db.agentReport.findMany({
    where: { leadId: azienda.id, validUntil: { gt: oggi } },
    select: { agent: true, summary: true, levers: true, validUntil: true },
  });
  const esito = valutaFascicolo(referti.map((r) => ({ ...r, levers: r.levers as unknown as Leva[] })), oggi);
  if (!esito.meritaCassetta) return false;

  // Una proposta per azienda: se Alessio l'ha già vista (anche scartata) non si ripropone.
  const gia = await db.approvalItem.findFirst({ where: { leadId: azienda.id, kind: KIND_FASCICOLO_BASE } });
  if (gia) return false;

  const riepiloghi = Object.fromEntries(referti.map((r) => [r.agent, r.summary]));
  await db.approvalItem.create({
    data: {
      leadId: azienda.id,
      kind: KIND_FASCICOLO_BASE,
      agent: "regista",
      title: `${azienda.name}: ${esito.leve.length} leve trovate`,
      payload: { sito: azienda.website, leve: esito.leve, riepiloghi } as unknown as Prisma.InputJsonValue,
    },
  });
  return true;
}

/**
 * Sceglie su quali aziende fare la raccolta base: prima quelle mai viste (le più
 * promettenti per il vecchio punteggio), poi quelle con referti scaduti o da riprovare.
 */
export async function scegliAziende(limit: number, oggi = new Date()): Promise<{ azienda: AziendaContesto; piano: string[] }[]> {
  const scelte: { azienda: AziendaContesto; piano: string[] }[] = [];
  const aggiungi = (l: LeadScelto, piano: string[]) => {
    const a = aziendaContesto(l);
    if (a && piano.length) scelte.push({ azienda: a, piano });
  };

  const mai = await db.lead.findMany({
    where: { ...BASE_AZIENDE, agentRuns: { none: {} } },
    orderBy: [{ opportunityScore: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    take: limit,
    select: SELEZIONE,
  });
  for (const l of mai) aggiungi(l, agentiDaEseguire([], oggi));
  if (scelte.length >= limit) return scelte;

  const pausa = new Date(oggi.getTime() - PAUSA_DOPO_FALLIMENTO_ORE * 3600_000);
  const daRivedere = await db.lead.findMany({
    where: {
      ...BASE_AZIENDE,
      OR: [
        { agentReports: { some: { validUntil: { lte: oggi } } } },
        { agentRuns: { some: { status: "FALLITO", finishedAt: { lte: pausa } } } },
      ],
    },
    orderBy: { updatedAt: "asc" },
    take: (limit - scelte.length) * 3,
    select: SELEZIONE,
  });
  for (const l of daRivedere) {
    if (scelte.length >= limit) break;
    aggiungi(l, agentiDaEseguire(await statoAzienda(l.id), oggi));
  }
  return scelte;
}

// ─── Fasi 2 e 3: approfondimento e sintesi ──────────────────────────────────

/** Se la sintesi è completa, la scheda contatto va in cassetta (una volta sola per azienda). */
export async function proponiSchedaContatto(azienda: AziendaContesto, oggi = new Date()): Promise<boolean> {
  const referti = await refertiValidi(azienda.id, oggi);
  const per = (a: string) => referti.find((r) => r.agent === a);
  const aggancio = per("aggancio");
  const leve = per("scheda_leve");
  if (!aggancio || !leve) return false;

  const gia = await db.approvalItem.findFirst({ where: { leadId: azienda.id, kind: KIND_SCHEDA_CONTATTO } });
  if (gia) return false;

  await db.approvalItem.create({
    data: {
      leadId: azienda.id,
      kind: KIND_SCHEDA_CONTATTO,
      agent: "aggancio",
      title: `${azienda.name}: scheda pronta per il contatto`,
      payload: {
        sito: azienda.website,
        schedaLeve: leve.findings,
        aggancio: aggancio.findings,
        coerenza: per("coerenza")?.findings ?? null,
        video: per("regista_video")?.findings ?? null,
        decisionMaker: per("decision_maker")?.findings ?? null,
        leve: leve.levers,
      } as unknown as Prisma.InputJsonValue,
    },
  });
  return true;
}

/** Approfondimento e sintesi sulle aziende approvate in cassetta. */
export async function lavoraSuApprovate(limit: number, oggi: Date, riepilogo: RiepilogoTurno): Promise<void> {
  const approvate = await db.lead.findMany({
    where: {
      ...BASE_AZIENDE,
      approvalItems: { some: { kind: KIND_FASCICOLO_BASE, status: "APPROVATO" } },
      // Già arrivate in cassetta con la scheda: il lavoro è finito.
      NOT: [{ approvalItems: { some: { kind: KIND_SCHEDA_CONTATTO } } }, { website: "" }],
    },
    orderBy: { updatedAt: "asc" },
    take: limit,
    select: SELEZIONE,
  });

  for (const l of approvate) {
    const azienda = aziendaContesto(l);
    if (!azienda) continue;
    const stati = await statoAzienda(azienda.id);
    let toccata = false;

    // Lavori per il browser: si accodano, li prende Claude sul Mac di Alessio.
    for (const agent of browserDaAccodare(stati, oggi)) {
      await db.agentRun.create({ data: { leadId: azienda.id, agent, status: "IN_CODA" } });
      riepilogo.accodatiBrowser++;
      toccata = true;
    }

    // Agenti di server dell'approfondimento.
    const piano = agentiDaEseguire(stati, oggi, AGENTI_APPROFONDIMENTO_SERVER);
    if (piano.length) {
      const e = await eseguiAgenti(azienda, piano, oggi);
      riepilogo.lavoriFatti += e.fatti;
      riepilogo.lavoriFalliti += e.falliti;
      riepilogo.saltatiPerBudget += e.saltatiPerBudget;
      toccata = true;
    }

    // Sintesi: quando tutto l'approfondimento ha chiuso. Si riparte dal primo anello
    // mancante della catena, così un errore a metà non rifà (e non ripaga) i precedenti.
    const statiOra = piano.length || toccata ? await statoAzienda(azienda.id) : stati;
    if (prontoPerSintesi(statiOra, oggi)) {
      const mancanti = new Set(agentiDaEseguire(statiOra, oggi, AGENTI_SINTESI));
      const primo = AGENTI_SINTESI.findIndex((a) => mancanti.has(a));
      if (primo >= 0) {
        const e = await eseguiAgenti(azienda, AGENTI_SINTESI.slice(primo), oggi, { catena: true });
        riepilogo.lavoriFatti += e.fatti;
        riepilogo.lavoriFalliti += e.falliti;
        riepilogo.saltatiPerBudget += e.saltatiPerBudget;
        toccata = true;
      }
      if (await proponiSchedaContatto(azienda, oggi)) riepilogo.nuoviInCassetta++;
    }
    if (toccata) riepilogo.aziende++;
  }
}

/** Un turno completo: sblocca, approfondisce le approvate, poi fa la raccolta base. */
export async function eseguiTurno({ limit = 20, concorrenza = 4 } = {}): Promise<RiepilogoTurno> {
  const inizio = Date.now();
  const oggi = new Date();
  const riepilogo = riepilogoVuoto();
  riepilogo.sbloccati = await sbloccaLavori(oggi);

  // Prima le aziende approvate: sono quelle più vicine a una call.
  await lavoraSuApprovate(Math.max(1, Math.ceil(limit / 4)), oggi, riepilogo);

  const scelte = await scegliAziende(limit, oggi);
  riepilogo.aziende += scelte.length;
  let prossimo = 0;
  async function operaio() {
    while (prossimo < scelte.length) {
      const { azienda, piano } = scelte[prossimo++];
      const e = await eseguiAgenti(azienda, piano, oggi);
      riepilogo.lavoriFatti += e.fatti;
      riepilogo.lavoriFalliti += e.falliti;
      if (await proponiInCassetta(azienda, oggi)) riepilogo.nuoviInCassetta++;
    }
  }
  await Promise.all(Array.from({ length: Math.min(concorrenza, scelte.length) }, operaio));
  riepilogo.durataMs = Date.now() - inizio;
  return riepilogo;
}
