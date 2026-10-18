/**
 * La coda dei lavori di browser.
 *
 * L'app accoda i lavori (agent_runs IN_CODA) per gli agenti di browser; Claude sul Mac di
 * Alessio li prende (GET /api/agenti/browser/lavori), li esegue con il browser e consegna
 * il referto (POST /api/agenti/browser/referto). Qui: presa in carico, validazione del
 * referto ricevuto e salvataggio. Un referto che non rispetta lo schema viene rifiutato.
 */
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { CHIAVI_BROWSER, schedaDi } from "./registro";
import { SERVIZI } from "./tipi";
import { importaMappaBni, importaProfiliMembri, type EsitoMappa } from "./bni";
import { importaAziendeLinkedin, importaAziendeMeta, importaDecisionMaker, importaPersoneLinkedin, importaReteMembro, type EsitoImport } from "@/lib/ricerca/cercatore";

/** Quanto vale un referto di browser prima di essere rifatto. */
export const VALIDITA_BROWSER_GIORNI: Record<string, number> = {
  social: 30,
  meta_ads: 30,
  linkedin_azienda: 60,
  decision_maker: 180,
  cartografo_bni: 30,
  rete_membro: 180,
  linkedin_membri: 90,
  cerca_meta: 60,
  cerca_linkedin: 60,
};

/** I lavori BNI passano davanti: i 121 vengono prima di tutto. */
const BROWSER_BNI = ["cartografo_bni", "rete_membro", "linkedin_membri"];

export interface LavoroBrowser {
  runId: string;
  agente: string;
  nome: string;
  istruzioni: string;
  /** Su cosa lavorare: un'azienda, oppure (Cartografo) una regione. */
  azienda?: {
    nome: string;
    sito: string | null;
    categoria: string | null;
    indirizzo: string | null;
    telefono: string | null;
    linkNoti: Record<string, string>;
    paginaLinkedin?: string | null;
  };
  input?: unknown;
  consegnaEntroOre: number;
}

function linkSocialNoti(auditData: unknown, socialUrl: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  const social = (auditData as { social?: Record<string, { url?: string | null }> } | null)?.social;
  for (const [k, v] of Object.entries(social ?? {})) if (v?.url) out[k] = v.url;
  if (socialUrl && !Object.values(out).includes(socialUrl)) out.altro = socialUrl;
  return out;
}

/** La pagina LinkedIn dell'azienda, se la ricerca o un lavoro precedente l'ha già trovata. */
async function paginaLinkedinNota(leadId: string): Promise<string | null> {
  const r = await db.agentReport.findFirst({ where: { leadId, agent: "linkedin_azienda" }, orderBy: { collectedAt: "desc" }, select: { findings: true } });
  const url = (r?.findings as { url?: unknown } | null)?.url;
  return typeof url === "string" ? url : null;
}

/** Prende in carico fino a `limit` lavori, i più vecchi per primi. */
export async function prendiLavori(limit: number): Promise<LavoroBrowser[]> {
  const prima = await db.agentRun.findMany({
    where: { status: "IN_CODA", agent: { in: BROWSER_BNI } },
    orderBy: { queuedAt: "asc" },
    take: limit,
    select: { id: true },
  });
  const dopo = prima.length >= limit ? [] : await db.agentRun.findMany({
    where: { status: "IN_CODA", agent: { in: CHIAVI_BROWSER.filter((k) => !BROWSER_BNI.includes(k)) } },
    orderBy: { queuedAt: "asc" },
    take: limit - prima.length,
    select: { id: true },
  });
  const candidati = [...prima, ...dopo];
  const presi: LavoroBrowser[] = [];
  for (const c of candidati) {
    // Presa atomica: se due Mac chiedono insieme, il lavoro va a uno solo.
    const r = await db.agentRun.updateMany({
      where: { id: c.id, status: "IN_CODA" },
      data: { status: "IN_CORSO", startedAt: new Date(), attempts: { increment: 1 } },
    });
    if (r.count === 0) continue;
    const run = await db.agentRun.findUnique({
      where: { id: c.id },
      include: { lead: { select: { name: true, website: true, category: true, address: true, phone: true, auditData: true, socialUrl: true } } },
    });
    if (!run) continue;
    const scheda = schedaDi(run.agent);
    presi.push({
      runId: run.id,
      agente: run.agent,
      nome: scheda ? `${scheda.numero} ${scheda.nome}` : run.agent,
      istruzioni: scheda?.istruzioni ?? "",
      azienda: run.lead
        ? {
            nome: run.lead.name,
            sito: run.lead.website,
            categoria: run.lead.category,
            indirizzo: run.lead.address,
            telefono: run.lead.phone,
            linkNoti: linkSocialNoti(run.lead.auditData, run.lead.socialUrl),
            paginaLinkedin: run.leadId ? await paginaLinkedinNota(run.leadId) : null,
          }
        : undefined,
      input: run.input ?? undefined,
      consegnaEntroOre: 3,
    });
  }
  return presi;
}

const servizi = Object.keys(SERVIZI) as [string, ...string[]];

export const SchemaReferto = z.object({
  summary: z.string().min(3).max(500),
  findings: z.record(z.string(), z.unknown()),
  levers: z
    .array(z.object({ servizio: z.enum(servizi), testo: z.string().min(3).max(400), prova: z.string().min(3).max(600) }))
    .max(10)
    .default([]),
  evidence: z
    .array(z.object({ cosa: z.string().min(2).max(400), fonte: z.string().min(2).max(600), citazione: z.string().max(600).optional() }))
    .max(30)
    .default([]),
  confidence: z.enum(["ALTA", "MEDIA", "BASSA"]),
});

export const SchemaChiusura = z.discriminatedUnion("esito", [
  z.object({ runId: z.string().uuid(), esito: z.literal("FATTO"), referto: SchemaReferto }),
  z.object({ runId: z.string().uuid(), esito: z.literal("FALLITO"), errore: z.string().min(3).max(500) }),
]);

export type Chiusura = z.infer<typeof SchemaChiusura>;

export class ErroreLavoro extends Error {
  constructor(public stato: number, messaggio: string) {
    super(messaggio);
  }
}

/** Chiude un lavoro di browser con il referto (o con il motivo del fallimento). */
export async function chiudiLavoro(c: Chiusura): Promise<{ ok: true; mappa?: EsitoMappa; importazione?: EsitoImport }> {
  const run = await db.agentRun.findUnique({ where: { id: c.runId } });
  if (!run || !CHIAVI_BROWSER.includes(run.agent)) throw new ErroreLavoro(404, "Lavoro non trovato");
  if (run.status !== "IN_CORSO") throw new ErroreLavoro(409, `Lavoro non in corso (stato ${run.status})`);

  if (c.esito === "FALLITO") {
    await db.agentRun.update({ where: { id: run.id }, data: { status: "FALLITO", finishedAt: new Date(), error: c.errore } });
    return { ok: true };
  }

  const oggi = new Date();
  const giorni = VALIDITA_BROWSER_GIORNI[run.agent] ?? 30;
  let mappa: EsitoMappa | undefined;
  let importazione: EsitoImport | undefined;
  if (run.agent === "cartografo_bni") mappa = await importaMappaBni(c.referto.findings, oggi);
  if (run.agent === "cerca_meta") importazione = await importaAziendeMeta(run.input, c.referto.findings);
  if (run.agent === "cerca_linkedin") {
    importazione = Array.isArray(c.referto.findings.aziende)
      ? await importaAziendeLinkedin(run.input, c.referto.findings, oggi)
      : await importaPersoneLinkedin(run.input, c.referto.findings);
  }
  if (run.agent === "rete_membro") importazione = await importaReteMembro(run.bniMembroId, c.referto.findings, oggi);
  if (run.agent === "linkedin_membri") importazione = await importaProfiliMembri(c.referto.findings, oggi);
  if (run.agent === "decision_maker") importazione = await importaDecisionMaker(run.leadId, c.referto.findings);

  await db.$transaction([
    db.agentReport.create({
      data: {
        leadId: run.leadId,
        bniChapterId: run.bniChapterId,
        bniMembroId: run.bniMembroId,
        agent: run.agent,
        runId: run.id,
        summary: c.referto.summary,
        findings: { ...c.referto.findings, ...(mappa ? { importazione: mappa } : {}), ...(importazione ? { importazione } : {}) } as Prisma.InputJsonValue,
        levers: c.referto.levers as Prisma.InputJsonValue,
        evidence: c.referto.evidence as Prisma.InputJsonValue,
        confidence: c.referto.confidence,
        collectedAt: oggi,
        validUntil: new Date(oggi.getTime() + giorni * 86400_000),
      },
    }),
    db.agentRun.update({ where: { id: run.id }, data: { status: "FATTO", finishedAt: new Date() } }),
  ]);
  return { ok: true, mappa, importazione };
}
