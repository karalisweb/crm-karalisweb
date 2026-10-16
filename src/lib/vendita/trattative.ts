/**
 * Pipeline di vendita — la parte che lavora sul database: creare una trattativa, cambiarle
 * stadio (con il diario), far lavorare gli agenti V1-V4 e applicare le decisioni prese
 * in cassetta.
 *
 * La scheda Lead resta allineata in tre punti soltanto: call fissata → CALL_FISSATA,
 * incarico → CLIENTE, exit → PERSO (con il motivo). Così le pagine storiche (Clienti, Persi)
 * continuano a dire il vero.
 */
import type { LostReason, Prisma, Trattativa } from "@prisma/client";
import { db } from "@/lib/db";
import { budgetDisponibile } from "@/lib/agents/costi";
import { refertiValidi } from "@/lib/agents/turno";
import {
  agenteDaFare,
  DOPO_CALL_A_STADIO,
  prossimaDataDefault,
  puoPassare,
  PASSO_DEFAULT,
  RECALL_MASSIMI,
  STADI,
  type AgenteVendita,
  type Origine,
  type Stadio,
} from "./regole";
import { conoscenzaDaReferti, dopoCall, preparaCall, preparaNurturing, preparaRecall, type ContestoVendita, type DopoCall } from "./agenti";

export const KIND = {
  PREPARAZIONE_CALL: "PREPARAZIONE_CALL",
  DOPO_CALL: "DOPO_CALL",
  RECALL: "RECALL",
  NURTURING_PROPOSTO: "NURTURING_PROPOSTO",
  MESSAGGIO_NURTURING: "MESSAGGIO_NURTURING",
} as const;
export const KIND_VENDITA = Object.values(KIND) as string[];

export class ErroreTrattativa extends Error {
  constructor(public stato: number, messaggio: string) {
    super(messaggio);
  }
}

const MOTIVO_A_LOST_REASON: Record<string, LostReason> = {
  "Non interessato": "NO_INTERESSE",
  "Nessun budget": "NO_BUDGET",
  "Non si è presentato alla call": "GHOST_CALL",
  "Sparito dopo la lettera": "GHOST_OFFERTA",
  "Ha scelto un altro": "COMPETITOR",
  "Non è il momento": "TEMPISTICA",
};

// ─── Creare e muovere ──────────────────────────────────────────────────────

export interface NuovaTrattativa {
  nome?: string;
  origine: Origine;
  leadId?: string;
  bniMembroId?: string;
  opportunitaId?: string;
  callAt?: Date | null;
  referente?: string | null;
  telefono?: string | null;
  email?: string | null;
}

export async function creaTrattativa(n: NuovaTrattativa, userId?: string): Promise<Trattativa> {
  const [lead, membro, opp] = await Promise.all([
    n.leadId ? db.lead.findUnique({ where: { id: n.leadId }, select: { id: true, name: true, phone: true, email: true } }) : null,
    n.bniMembroId ? db.bniMembro.findUnique({ where: { id: n.bniMembroId }, select: { id: true, name: true, company: true, phone: true, email: true } }) : null,
    n.opportunitaId ? db.opportunita.findUnique({ where: { id: n.opportunitaId }, select: { id: true, name: true, phone: true, email: true } }) : null,
  ]);
  if (n.leadId && !lead) throw new ErroreTrattativa(404, "Azienda non trovata");
  if (n.bniMembroId && !membro) throw new ErroreTrattativa(404, "Membro BNI non trovato");
  if (n.opportunitaId && !opp) throw new ErroreTrattativa(404, "Opportunità non trovata");

  // Una sola trattativa aperta per azienda/persona: se c'è già, si usa quella.
  const aperta = await db.trattativa.findFirst({
    where: {
      stadio: { notIn: ["INCARICO", "EXIT"] },
      OR: [
        ...(lead ? [{ leadId: lead.id }] : []),
        ...(membro ? [{ bniMembroId: membro.id }] : []),
        ...(opp ? [{ opportunitaId: opp.id }] : []),
      ],
    },
  });
  if (aperta && (lead || membro || opp)) return aperta;

  const nome = n.nome?.trim() || lead?.name || (membro ? membro.company || membro.name : null) || opp?.name;
  if (!nome) throw new ErroreTrattativa(400, "Serve un nome");

  const t = await db.trattativa.create({
    data: {
      nome,
      origine: n.origine,
      leadId: lead?.id,
      bniMembroId: membro?.id,
      opportunitaId: opp?.id,
      callAt: n.callAt ?? null,
      prossimaData: n.callAt ?? null,
      prossimoPasso: n.callAt ? "Call di vendita" : null,
      referente: n.referente ?? (membro ? membro.name : null),
      telefono: n.telefono ?? lead?.phone ?? membro?.phone ?? opp?.phone ?? null,
      email: n.email ?? lead?.email ?? membro?.email ?? opp?.email ?? null,
      eventi: { create: { tipo: "STADIO", a: "CALL_FISSATA", testo: n.callAt ? `Call fissata per il ${n.callAt.toLocaleString("it-IT", { timeZone: "Europe/Rome" })}` : "Trattativa aperta", createdBy: userId } },
    },
  });
  if (lead) {
    await db.lead.update({ where: { id: lead.id }, data: { pipelineStage: "CALL_FISSATA", ...(n.callAt ? { appointmentAt: n.callAt } : {}) } });
  }
  return t;
}

export interface CambioStadio {
  a: Stadio;
  motivo?: string | null;
  prossimaData?: Date | null;
  prossimoPasso?: string | null;
  nota?: string | null;
}

export async function cambiaStadio(id: string, c: CambioStadio, userId?: string, oggi = new Date()): Promise<Trattativa> {
  const t = await db.trattativa.findUnique({ where: { id } });
  if (!t) throw new ErroreTrattativa(404, "Trattativa non trovata");
  if (t.stadio === c.a) throw new ErroreTrattativa(409, `È già in "${STADI[c.a].label}"`);
  if (!puoPassare(t.stadio, c.a)) throw new ErroreTrattativa(409, `Da "${STADI[t.stadio].label}" non si va a "${STADI[c.a].label}"`);
  if (c.a === "EXIT" && !c.motivo) throw new ErroreTrattativa(400, "Per l'exit serve il motivo");

  const chiusa = c.a === "INCARICO" || c.a === "EXIT";
  const prossimaData = chiusa ? null : c.prossimaData ?? (c.a === "CALL_FISSATA" ? t.callAt : prossimaDataDefault(c.a, oggi));
  const aggiornata = await db.trattativa.update({
    where: { id },
    data: {
      stadio: c.a,
      prossimaData,
      prossimoPasso: chiusa ? null : c.prossimoPasso ?? PASSO_DEFAULT[c.a] ?? null,
      motivoUscita: c.a === "EXIT" || c.a === "NURTURING" ? c.motivo ?? t.motivoUscita : t.motivoUscita,
      chiusaAt: chiusa ? oggi : null,
      ...(c.a === "NURTURING" ? { ultimoNurturingAt: null } : {}),
      ...(c.a === "CALL_FISSATA" ? { recallFatti: 0 } : {}),
      eventi: {
        create: {
          tipo: "STADIO",
          da: t.stadio,
          a: c.a,
          testo: [c.motivo ? `Motivo: ${c.motivo}` : null, c.nota].filter(Boolean).join(" — ") || null,
          createdBy: userId,
        },
      },
    },
  });

  // Le voci di cassetta superate dal nuovo stadio si chiudono da sole (non restano da decidere).
  const superate = chiusa
    ? KIND_VENDITA
    : [
        ...(t.stadio === "CALL_FISSATA" ? [KIND.PREPARAZIONE_CALL] : []),
        ...(t.stadio === "CALL_FATTA" ? [KIND.DOPO_CALL] : []),
        ...(t.stadio === "NURTURING" ? [KIND.MESSAGGIO_NURTURING] : []),
        ...(c.a === "NURTURING" || c.a === "CALL_FISSATA" ? [KIND.RECALL, KIND.NURTURING_PROPOSTO] : []),
      ];
  if (superate.length) {
    await db.approvalItem.updateMany({
      where: { trattativaId: id, status: "IN_ATTESA", kind: { in: superate } },
      data: { status: "SCARTATO", decidedAt: oggi, decidedBy: userId, note: `Superata: la trattativa è passata a ${STADI[c.a].label}` },
    });
  }

  if (t.leadId && (c.a === "INCARICO" || c.a === "EXIT")) {
    await db.lead.update({
      where: { id: t.leadId },
      data:
        c.a === "INCARICO"
          ? { pipelineStage: "CLIENTE" }
          : { pipelineStage: "PERSO", lostReason: MOTIVO_A_LOST_REASON[c.motivo ?? ""] ?? "ALTRO", lostReasonNotes: c.motivo ?? null },
    });
  }
  return aggiornata;
}

export async function aggiungiEvento(id: string, tipo: string, testo: string, userId?: string) {
  await db.trattativaEvento.create({ data: { trattativaId: id, tipo, testo, createdBy: userId } });
}

// ─── Il contesto per gli agenti ────────────────────────────────────────────

async function contesto(t: Trattativa): Promise<ContestoVendita> {
  const [eventi, precedenti, membro, opp] = await Promise.all([
    db.trattativaEvento.findMany({ where: { trattativaId: t.id }, orderBy: { createdAt: "asc" }, take: 50 }),
    db.agentReport.findMany({ where: { trattativaId: t.id }, orderBy: { collectedAt: "asc" }, take: 10 }),
    t.bniMembroId ? db.bniMembro.findUnique({ where: { id: t.bniMembroId } }) : null,
    t.opportunitaId ? db.opportunita.findUnique({ where: { id: t.opportunitaId } }) : null,
  ]);

  const parti: string[] = [];
  if (t.leadId) parti.push(conoscenzaDaReferti(await refertiValidi(t.leadId)));
  if (membro) {
    parti.push(
      [`Membro BNI: ${membro.name}`, membro.company, membro.profession, membro.chapter ? `capitolo ${membro.chapter}` : null, membro.seeking ? `cerca: ${membro.seeking}` : null, membro.notes]
        .filter(Boolean)
        .join(" · ")
    );
  }
  if (opp) parti.push([`Opportunità: ${opp.name}`, opp.sourceDetail, opp.about, opp.notes].filter(Boolean).join(" · "));

  return {
    nome: t.nome,
    origine: t.origine,
    stadio: t.stadio,
    referente: t.referente,
    callAt: t.callAt,
    trascrizione: t.trascrizione,
    conoscenza: parti.filter(Boolean).join("\n\n"),
    diario: eventi
      .map((e) => `${e.createdAt.toISOString().slice(0, 10)} ${e.tipo}${e.a ? ` → ${STADI[e.a as Stadio]?.label ?? e.a}` : ""}${e.testo ? `: ${e.testo}` : ""}`)
      .join("\n"),
    precedenti: precedenti
      .map((r) => {
        const f = r.findings as Record<string, unknown>;
        const testo = (f.lettera ?? f.messaggio ?? "") as string;
        return `[${r.agent} del ${r.collectedAt.toISOString().slice(0, 10)}] ${r.summary}${testo ? `\n${testo.slice(0, 1500)}` : ""}`;
      })
      .join("\n\n"),
  };
}

// ─── Far lavorare un agente ────────────────────────────────────────────────

const TITOLI: Record<AgenteVendita, string> = {
  preparazione_call: "preparazione della call",
  dopo_call: "dopo la call",
  recall: "richiamo",
  nurturing: "messaggio di nurturing",
};

async function salva(
  t: Trattativa,
  agent: AgenteVendita,
  r: { summary: string; findings: unknown; costCents: number },
  voce: { kind: string; title: string } | null,
  oggi: Date
) {
  const run = await db.agentRun.create({
    data: { trattativaId: t.id, leadId: t.leadId, agent, status: "FATTO", attempts: 1, startedAt: oggi, finishedAt: new Date(), costCents: r.costCents },
  });
  await db.agentReport.create({
    data: {
      trattativaId: t.id,
      leadId: t.leadId,
      agent,
      runId: run.id,
      summary: r.summary,
      findings: r.findings as Prisma.InputJsonValue,
      confidence: "MEDIA",
      collectedAt: oggi,
      validUntil: new Date(oggi.getTime() + 60 * 86400_000),
    },
  });
  if (voce) {
    await db.approvalItem.create({
      data: { trattativaId: t.id, leadId: t.leadId, kind: voce.kind, agent, title: voce.title, payload: r.findings as Prisma.InputJsonValue },
    });
  }
}

/** Fa lavorare subito un agente di vendita su una trattativa. */
export async function eseguiAgenteVendita(id: string, agent: AgenteVendita, oggi = new Date()): Promise<{ ok: true; voce: string | null }> {
  const t = await db.trattativa.findUnique({ where: { id } });
  if (!t) throw new ErroreTrattativa(404, "Trattativa non trovata");

  // Dopo troppi recall senza risposta non si richiama ancora: si propone il nurturing (niente AI).
  if (agent === "recall" && t.recallFatti >= RECALL_MASSIMI) {
    await salva(
      t,
      "recall",
      { summary: `Nessuna risposta dopo ${t.recallFatti} recall: proposta di passare al nurturing`, findings: { proposta: "NURTURING", recallFatti: t.recallFatti }, costCents: 0 },
      { kind: KIND.NURTURING_PROPOSTO, title: `${t.nome}: nessuna risposta dopo ${t.recallFatti} recall` },
      oggi
    );
    return { ok: true, voce: KIND.NURTURING_PROPOSTO };
  }

  if (!(await budgetDisponibile(oggi)).ok) throw new ErroreTrattativa(429, "Tetto di spesa del mese raggiunto");
  const c = await contesto(t);
  const titolo = `${t.nome}: ${TITOLI[agent]}`;

  try {
    if (agent === "preparazione_call") {
      const ai = await preparaCall(c);
      await salva(t, agent, { summary: ai.dati.obiettivo_call, findings: { ...ai.dati, motoreAI: `${ai.motore} ${ai.modello}` }, costCents: ai.costCents }, { kind: KIND.PREPARAZIONE_CALL, title: titolo }, oggi);
      return { ok: true, voce: KIND.PREPARAZIONE_CALL };
    }
    if (agent === "dopo_call") {
      const ai = await dopoCall(c);
      const d: DopoCall = ai.dati;
      await salva(
        t,
        agent,
        {
          summary: `${d.temperatura}: ${d.raccomandazione.toLowerCase().replace("_", " ")} — ${d.sintesi.slice(0, 200)}`,
          findings: { ...d, citazioniScartate: ai.citazioniScartate, motoreAI: `${ai.motore} ${ai.modello}` },
          costCents: ai.costCents,
        },
        { kind: KIND.DOPO_CALL, title: titolo },
        oggi
      );
      return { ok: true, voce: KIND.DOPO_CALL };
    }
    if (agent === "recall") {
      const ai = await preparaRecall(c, t.recallFatti + 1);
      await salva(t, agent, { summary: `Recall ${t.recallFatti + 1} via ${ai.dati.canale}`, findings: { ...ai.dati, numero: t.recallFatti + 1, motoreAI: `${ai.motore} ${ai.modello}` }, costCents: ai.costCents }, { kind: KIND.RECALL, title: titolo }, oggi);
      return { ok: true, voce: KIND.RECALL };
    }
    const ai = await preparaNurturing(c);
    await salva(t, "nurturing", { summary: `Nurturing: ${ai.dati.oggetto}`, findings: { ...ai.dati, motoreAI: `${ai.motore} ${ai.modello}` }, costCents: ai.costCents }, { kind: KIND.MESSAGGIO_NURTURING, title: titolo }, oggi);
    return { ok: true, voce: KIND.MESSAGGIO_NURTURING };
  } catch (err) {
    if (err instanceof ErroreTrattativa) throw err;
    await db.agentRun.create({
      data: { trattativaId: t.id, leadId: t.leadId, agent, status: "FALLITO", attempts: 1, startedAt: oggi, finishedAt: new Date(), error: (err instanceof Error ? err.message : String(err)).slice(0, 500) },
    });
    throw new ErroreTrattativa(502, `L'agente non è riuscito: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ─── Il turno di vendita (orologio) ────────────────────────────────────────

/** Cosa hanno già fatto (o hanno in cassetta) gli agenti per lo stadio attuale. */
async function giaFatto(t: Trattativa): Promise<Set<AgenteVendita>> {
  const [ultimoStadio, ultimaTrascrizione, referti, aperte] = await Promise.all([
    db.trattativaEvento.findFirst({ where: { trattativaId: t.id, tipo: "STADIO" }, orderBy: { createdAt: "desc" } }),
    db.trattativaEvento.findFirst({ where: { trattativaId: t.id, tipo: "TRASCRIZIONE" }, orderBy: { createdAt: "desc" } }),
    db.agentReport.findMany({ where: { trattativaId: t.id }, select: { agent: true, collectedAt: true } }),
    db.approvalItem.findMany({ where: { trattativaId: t.id, status: "IN_ATTESA" }, select: { agent: true } }),
  ]);
  const s = new Set<AgenteVendita>(aperte.map((a) => a.agent as AgenteVendita));
  const dopo = (agent: string, data: Date | null | undefined) => !!data && referti.some((r) => r.agent === agent && r.collectedAt >= data);
  if (t.callAt && dopo("preparazione_call", new Date(t.callAt.getTime() - 48 * 3600_000))) s.add("preparazione_call");
  if (dopo("dopo_call", ultimaTrascrizione?.createdAt ?? ultimoStadio?.createdAt)) s.add("dopo_call");
  return s;
}

export interface RiepilogoVendita {
  trattativeAperte: number;
  lavoriFatti: number;
  lavoriFalliti: number;
  errori: string[];
}

export async function eseguiTurnoVendita(oggi = new Date()): Promise<RiepilogoVendita> {
  const aperte = await db.trattativa.findMany({ where: { stadio: { notIn: ["INCARICO", "EXIT"] } } });
  const r: RiepilogoVendita = { trattativeAperte: aperte.length, lavoriFatti: 0, lavoriFalliti: 0, errori: [] };
  for (const t of aperte) {
    const ultimo = await db.trattativaEvento.findFirst({ where: { trattativaId: t.id, tipo: "STADIO" }, orderBy: { createdAt: "desc" } });
    const agente = agenteDaFare(
      {
        stadio: t.stadio,
        callAt: t.callAt,
        trascrizione: t.trascrizione,
        prossimaData: t.prossimaData,
        recallFatti: t.recallFatti,
        ultimoNurturingAt: t.ultimoNurturingAt,
        stadioDal: ultimo?.createdAt ?? t.createdAt,
        giaFatto: await giaFatto(t),
      },
      oggi
    );
    if (!agente) continue;
    try {
      await eseguiAgenteVendita(t.id, agente, oggi);
      r.lavoriFatti++;
    } catch (err) {
      r.lavoriFalliti++;
      r.errori.push(`${t.nome}: ${err instanceof Error ? err.message : String(err)}`.slice(0, 200));
      if (err instanceof ErroreTrattativa && err.stato === 429) break; // budget finito: inutile continuare
    }
  }
  return r;
}

// ─── Le decisioni in cassetta ──────────────────────────────────────────────

/**
 * Cosa succede quando Alessio decide su una voce di vendita.
 * Approvare vuol dire "l'ho mandato / lo faccio": la trattativa avanza.
 * Scartare un recall o un nurturing lo rimanda al giro dopo (non lo ripropone subito).
 */
export async function applicaDecisioneVendita(
  voce: { kind: string; trattativaId: string | null; payload: unknown },
  decisione: "APPROVATO" | "SCARTATO",
  userId?: string,
  oggi = new Date()
): Promise<void> {
  if (!voce.trattativaId || !KIND_VENDITA.includes(voce.kind)) return;
  const t = await db.trattativa.findUnique({ where: { id: voce.trattativaId } });
  if (!t) return;
  const p = (voce.payload ?? {}) as Record<string, unknown>;
  const fra = (giorni: number) => new Date(oggi.getTime() + giorni * 86400_000);

  if (decisione === "SCARTATO") {
    if (voce.kind === KIND.RECALL || voce.kind === KIND.NURTURING_PROPOSTO) {
      await db.trattativa.update({ where: { id: t.id }, data: { prossimaData: fra(7) } });
      await aggiungiEvento(t.id, "NOTA", "Proposta di richiamo scartata: rimandata di 7 giorni", userId);
    } else if (voce.kind === KIND.MESSAGGIO_NURTURING) {
      await db.trattativa.update({ where: { id: t.id }, data: { ultimoNurturingAt: oggi } });
    }
    return;
  }

  switch (voce.kind) {
    case KIND.DOPO_CALL: {
      const a = DOPO_CALL_A_STADIO[String(p.raccomandazione)] ?? "LETTERA_INVIATA";
      const giorni = Number(p.giorni_al_prossimo_passo) || undefined;
      if (puoPassare(t.stadio, a)) {
        await cambiaStadio(
          t.id,
          {
            a,
            motivo: a === "EXIT" || a === "NURTURING" ? String(p.motivo_uscita || p.perche || "Dopo la call") : null,
            prossimaData: giorni ? fra(giorni) : null,
            prossimoPasso: typeof p.prossimo_passo === "string" ? p.prossimo_passo : null,
            nota: a === "LETTERA_INVIATA" ? `Lettera strategica inviata: ${String(p.lettera_titolo ?? "")}` : null,
          },
          userId,
          oggi
        );
      }
      return;
    }
    case KIND.RECALL: {
      await db.trattativa.update({
        where: { id: t.id },
        data: {
          stadio: puoPassare(t.stadio, "RECALL") || t.stadio === "RECALL" ? "RECALL" : t.stadio,
          recallFatti: { increment: 1 },
          prossimaData: fra(7),
          prossimoPasso: PASSO_DEFAULT.RECALL,
          eventi: { create: { tipo: "MESSAGGIO", da: t.stadio, a: "RECALL", testo: `Recall ${t.recallFatti + 1} fatto (${String(p.canale ?? "")})`, createdBy: userId } },
        },
      });
      return;
    }
    case KIND.NURTURING_PROPOSTO:
      if (puoPassare(t.stadio, "NURTURING")) {
        await cambiaStadio(t.id, { a: "NURTURING", motivo: `Nessuna risposta dopo ${t.recallFatti} recall` }, userId, oggi);
      }
      return;
    case KIND.MESSAGGIO_NURTURING:
      await db.trattativa.update({
        where: { id: t.id },
        data: { ultimoNurturingAt: oggi, prossimaData: fra(45), prossimoPasso: PASSO_DEFAULT.NURTURING, eventi: { create: { tipo: "MESSAGGIO", testo: `Nurturing inviato: ${String(p.oggetto ?? "")}`, createdBy: userId } } },
      });
      return;
    default:
      return; // PREPARAZIONE_CALL: approvare vuol dire solo "letta"
  }
}
