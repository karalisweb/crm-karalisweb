/**
 * Un turno di lavoro della squadra. Lo sveglia l'orologio (crontab del VPS →
 * POST /api/cron/squadra) oppure Alessio dalla pagina Squadra.
 *
 * Ripetibile senza danni: ogni lavoro è una riga in agent_runs, un lavoro
 * interrotto viene chiuso come fallito al turno dopo e il regista non rifà
 * ciò che ha già un referto valido.
 */
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { scaricaPagina } from "./pagina";
import { AGENTI_ESEGUIBILI } from "./registro";
import {
  agentiDaEseguire,
  valutaFascicolo,
  LAVORO_BLOCCATO_MINUTI,
  PAUSA_DOPO_FALLIMENTO_ORE,
  type StatoAgenteSuAzienda,
} from "./regista";
import type { ContestoAgente, Leva, PaginaScaricata } from "./tipi";

export const KIND_FASCICOLO_BASE = "FASCICOLO_BASE";

/** Stadi in cui un'azienda non va più analizzata. */
const STADI_ESCLUSI = ["NON_TARGET", "SENZA_SITO", "CLIENTE", "PERSO", "ARCHIVIATO"] as const;

/** Le aziende su cui la squadra lavora. */
export const BASE_AZIENDE: Prisma.LeadWhereInput = {
  website: { not: null },
  NOT: [{ website: "" }],
  pipelineStage: { notIn: [...STADI_ESCLUSI] },
  unsubscribed: false,
};

const SELEZIONE = { id: true, name: true, website: true, category: true } as const;
type Azienda = { id: string; name: string; website: string | null; category: string | null };

export interface RiepilogoTurno {
  aziende: number;
  lavoriFatti: number;
  lavoriFalliti: number;
  nuoviInCassetta: number;
  sbloccati: number;
  durataMs: number;
}

/** Chiude come falliti i lavori rimasti "in corso" (es. riavvio del server a metà). */
export async function sbloccaLavori(oggi = new Date()): Promise<number> {
  const limite = new Date(oggi.getTime() - LAVORO_BLOCCATO_MINUTI * 60_000);
  const r = await db.agentRun.updateMany({
    where: { status: "IN_CORSO", startedAt: { lt: limite } },
    data: { status: "FALLITO", finishedAt: oggi, error: "Interrotto (lavoro rimasto in corso oltre 30 minuti)" },
  });
  return r.count;
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

/**
 * Sceglie su quali aziende lavorare: prima quelle mai viste (le più promettenti
 * per il vecchio punteggio), poi quelle con referti scaduti o da riprovare.
 */
export async function scegliAziende(limit: number, oggi = new Date()): Promise<{ azienda: Azienda; piano: string[] }[]> {
  const scelte: { azienda: Azienda; piano: string[] }[] = [];

  const mai = await db.lead.findMany({
    where: { ...BASE_AZIENDE, agentRuns: { none: {} } },
    orderBy: [{ opportunityScore: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    take: limit,
    select: SELEZIONE,
  });
  for (const a of mai) scelte.push({ azienda: a, piano: agentiDaEseguire([], oggi) });
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
  for (const a of daRivedere) {
    if (scelte.length >= limit) break;
    const piano = agentiDaEseguire(await statoAzienda(a.id), oggi);
    if (piano.length) scelte.push({ azienda: a, piano });
  }
  return scelte;
}

function messaggioErrore(err: unknown): string {
  const m = err instanceof Error ? err.message : String(err);
  return m.slice(0, 500);
}

/** Fa lavorare gli agenti del piano su un'azienda, poi valuta se va in cassetta. */
export async function lavoraSuAzienda(
  azienda: Azienda,
  piano: string[],
  oggi = new Date()
): Promise<{ fatti: number; falliti: number; inCassetta: boolean }> {
  if (!azienda.website) return { fatti: 0, falliti: 0, inCassetta: false };
  const website = azienda.website;

  const runs = await Promise.all(
    piano.map((agent) =>
      db.agentRun.create({
        data: { leadId: azienda.id, agent, status: "IN_CORSO", attempts: 1, startedAt: new Date() },
        select: { id: true, agent: true },
      })
    )
  );

  // La homepage si scarica una volta sola per tutti gli agenti.
  let pagina: Promise<PaginaScaricata> | null = null;
  const ctx: ContestoAgente = {
    lead: { id: azienda.id, name: azienda.name, website, category: azienda.category },
    pagina: () => (pagina ??= scaricaPagina(website)),
    oggi,
  };

  let fatti = 0;
  let falliti = 0;
  for (const run of runs) {
    const agente = AGENTI_ESEGUIBILI[run.agent];
    try {
      if (!agente) throw new Error(`Agente "${run.agent}" non eseguibile`);
      const r = await agente.esegui(ctx);
      const validUntil = new Date(oggi.getTime() + agente.validitaGiorni * 86400_000);
      await db.$transaction([
        db.agentReport.create({
          data: {
            leadId: azienda.id,
            agent: run.agent,
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
    }
  }

  return { fatti, falliti, inCassetta: await proponiInCassetta(azienda, oggi) };
}

/** Se il fascicolo base è completo e ha abbastanza leve, lo mette in cassetta (una volta sola). */
export async function proponiInCassetta(azienda: Azienda, oggi = new Date()): Promise<boolean> {
  const referti = await db.agentReport.findMany({
    where: { leadId: azienda.id, validUntil: { gt: oggi } },
    select: { agent: true, summary: true, levers: true, validUntil: true },
  });
  const esito = valutaFascicolo(
    referti.map((r) => ({ ...r, levers: r.levers as unknown as Leva[] })),
    oggi
  );
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

/** Un turno completo: sblocca, sceglie, fa lavorare in parallelo (poche aziende per volta). */
export async function eseguiTurno({ limit = 20, concorrenza = 4 } = {}): Promise<RiepilogoTurno> {
  const inizio = Date.now();
  const oggi = new Date();
  const sbloccati = await sbloccaLavori(oggi);
  const scelte = await scegliAziende(limit, oggi);

  const riepilogo: RiepilogoTurno = { aziende: scelte.length, lavoriFatti: 0, lavoriFalliti: 0, nuoviInCassetta: 0, sbloccati, durataMs: 0 };
  let prossimo = 0;
  async function operaio() {
    while (prossimo < scelte.length) {
      const { azienda, piano } = scelte[prossimo++];
      const e = await lavoraSuAzienda(azienda, piano, oggi);
      riepilogo.lavoriFatti += e.fatti;
      riepilogo.lavoriFalliti += e.falliti;
      if (e.inCassetta) riepilogo.nuoviInCassetta++;
    }
  }
  await Promise.all(Array.from({ length: Math.min(concorrenza, scelte.length) }, operaio));
  riepilogo.durataMs = Date.now() - inizio;
  return riepilogo;
}
