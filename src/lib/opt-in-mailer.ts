import { db } from "@/lib/db";
import { sendOutreachEmail } from "@/lib/email";
import { generateOutreachEmail } from "@/lib/gemini-outreach-email";
import { pickSubjectVariant } from "@/lib/workflow-templates";
import { PipelineStage, Prisma } from "@prisma/client";

/**
 * Sequenza fredda verso il QUESTIONARIO — 5 tocchi.
 *
 *  T1 mail 1 (gancio di dolore + questionario). Auto solo se gate approvazione OFF;
 *     altrimenti la manda la schermata di approvazione (/approve-outreach).
 *  T2 follow-up 1 (email, +FOLLOWUP_DAYS)
 *  T3 follow-up 2 (email, +FOLLOWUP2_DAYS, angolo diverso)
 *  T4 telefonata (TASK, +CALL_DAYS, solo lead HOT) — non consuma budget email
 *  T5 break-up (email, +BREAKUP_DAYS) → stato NURTURING (stop solleciti)
 *
 * La sequenza si ferma su respondedAt / unsubscribed (gestito altrove: la risposta
 * promuove a CALDO_REATTIVO). Protezioni: tetto giornaliero + warmup + jitter.
 */

const DEFAULT_SUBJECTS = [
  "Una cosa che ho notato su {azienda}",
  "{azienda}: una domanda veloce",
  "Ho guardato il sito di {azienda}",
  "Due minuti per {azienda}?",
  "Un'osservazione su {azienda}",
];

const PER_RUN_CAP = Math.max(0, parseInt(process.env.OPTIN_PER_RUN_CAP || "4", 10) || 0);
const FOLLOWUP_DAYS = Math.max(1, parseInt(process.env.OPTIN_FOLLOWUP_DAYS || "3", 10) || 3);   // T2
const FOLLOWUP2_DAYS = Math.max(1, parseInt(process.env.OPTIN_FOLLOWUP2_DAYS || "4", 10) || 4); // T3 (da T2)
const CALL_DAYS = Math.max(1, parseInt(process.env.OPTIN_CALL_DAYS || "3", 10) || 3);           // T4 (da T3)
const BREAKUP_DAYS = Math.max(1, parseInt(process.env.OPTIN_BREAKUP_DAYS || "7", 10) || 7);     // T5 (da T3)

export interface OptInResult {
  firstSent: number;
  followupsSent: number;
  followup2Sent: number;
  callTasks: number;
  breakups: number;
  skipped: number;
  capReached: boolean;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
async function jitter(): Promise<void> {
  await sleep(4000 + Math.floor(Math.random() * 16000));
}

/** Partenza morbida del dominio: alza il tetto gradualmente nei primi giorni. */
export function warmupCap(configuredCap: number, firstSentAt: Date | null): number {
  if (!firstSentAt) return Math.min(configuredCap, 5);
  const days = Math.floor((Date.now() - firstSentAt.getTime()) / 86_400_000);
  let ramp: number;
  if (days < 3) ramp = 5;
  else if (days < 7) ramp = 10;
  else if (days < 14) ramp = 20;
  else return configuredCap;
  return Math.min(configuredCap, ramp);
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}

export async function runOptInMailer(): Promise<OptInResult> {
  const res: OptInResult = {
    firstSent: 0, followupsSent: 0, followup2Sent: 0, callTasks: 0, breakups: 0,
    skipped: 0, capReached: false,
  };

  const settings = await db.settings.findUnique({
    where: { id: "default" },
    select: {
      emailDailyCap: true,
      optInSubjects: true,
      signatureAlessio: true,
      questionnaireUrl: true,
      outreachRequireApproval: true,
    },
  });
  const configuredCap = settings?.emailDailyCap ?? 20;
  const firma = settings?.signatureAlessio || "Alessio Loi\nKaralisweb";
  const questionnaireUrl = (settings?.questionnaireUrl || "").trim();
  const requireApproval = settings?.outreachRequireApproval ?? true;
  const subjectsField =
    settings?.optInSubjects && settings.optInSubjects.trim()
      ? settings.optInSubjects
      : DEFAULT_SUBJECTS.join("\n");

  const inSequence = [PipelineStage.HOT_LEAD, PipelineStage.WARM_LEAD];

  // Budget email del run (tetto giornaliero - già inviate oggi, con warmup).
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const sentToday = await db.activity.count({
    where: { type: "EMAIL_OUTREACH", notes: { startsWith: "[Opt-in" }, createdAt: { gte: startOfDay } },
  });
  const firstAgg = await db.lead.aggregate({
    _min: { optInSentAt: true },
    where: { optInSentAt: { not: null } },
  });
  const dailyCap = warmupCap(configuredCap, firstAgg._min.optInSentAt);
  let budget = Math.max(0, Math.min(PER_RUN_CAP, dailyCap - sentToday));

  // ── T4 — TELEFONATA (task, solo lead HOT): non consuma budget email ──────────
  const callLeads = await db.lead.findMany({
    where: {
      pipelineStage: PipelineStage.HOT_LEAD,
      optInFollowup2At: { not: null, lte: daysAgo(CALL_DAYS) },
      coldCallTaskAt: null,
      respondedAt: null,
      unsubscribed: false,
    },
    select: { id: true, name: true, phone: true, outreachMailSent: true },
    take: 100,
  });
  for (const lead of callLeads) {
    try {
      const hook = (lead.outreachMailSent as { hook?: string } | null)?.hook || "";
      const desc =
        `Chiama ${lead.name}${lead.phone ? ` (${lead.phone})` : ""}.\n` +
        (hook ? `Gancio: ${hook}\n` : "") +
        `Obiettivo: sbloccare via voce ("ti ho scritto, forse è finita in spam") e portarlo al questionario` +
        (questionnaireUrl ? `: ${questionnaireUrl}` : ".") +
        `\nSe mostra interesse, segna "Ha risposto" (diventa CALDO).`;
      await db.$transaction([
        db.task.create({ data: { leadId: lead.id, title: `📞 Chiama — ${lead.name}`, description: desc, dueAt: new Date() } }),
        db.lead.update({ where: { id: lead.id }, data: { coldCallTaskAt: new Date() } }),
        db.activity.create({ data: { leadId: lead.id, type: "EMAIL_OUTREACH", notes: `[Cold-CALL] task telefonata creato` } }),
      ]);
      res.callTasks++;
    } catch (err) {
      console.error(`[opt-in] call-task errore ${lead.id}:`, err);
      res.skipped++;
    }
  }

  // ── T5 — BREAK-UP (email) → NURTURING ───────────────────────────────────────
  if (budget > 0) {
    const breakupLeads = await db.lead.findMany({
      where: {
        pipelineStage: { in: inSequence },
        optInFollowup2At: { not: null, lte: daysAgo(BREAKUP_DAYS) },
        coldBreakupAt: null,
        respondedAt: null,
        unsubscribed: false,
        email: { not: null },
      },
      select: { id: true, name: true, email: true },
      take: budget * 3,
    });
    for (const lead of shuffle(breakupLeads)) {
      if (budget <= 0) break;
      if (!lead.email) continue;
      const subject = `Chiudo il cerchio, ${lead.name}`;
      const body = questionnaireUrl
        ? `Ciao,\n\nnon avendo avuto un tuo riscontro smetto di scriverti: non voglio disturbare.\n` +
          `Se in futuro vuoi capire dove sta ${lead.name}, le domande restano qui: ${questionnaireUrl}\n\nIn bocca al lupo,\n${firma}`
        : `Ciao,\n\nnon avendo avuto un tuo riscontro smetto di scriverti: non voglio disturbare.\n` +
          `Se cambi idea, rispondi pure a questa mail.\n\nIn bocca al lupo,\n${firma}`;
      try {
        const ok = await sendOutreachEmail(lead.email, subject, body, lead.id);
        if (!ok) { res.skipped++; continue; }
        await db.$transaction([
          db.lead.update({
            where: { id: lead.id },
            data: { coldBreakupAt: new Date(), lastContactedAt: new Date(), pipelineStage: PipelineStage.NURTURING },
          }),
          db.activity.create({ data: { leadId: lead.id, type: "EMAIL_OUTREACH", notes: `[Opt-in-BREAKUP] break-up → NURTURING (${lead.email})` } }),
        ]);
        res.breakups++;
        budget--;
        if (budget > 0) await jitter();
      } catch (err) {
        console.error(`[opt-in] break-up errore ${lead.id}:`, err);
        res.skipped++;
      }
    }
  }

  // ── T2 — FOLLOW-UP 1 (email) ────────────────────────────────────────────────
  if (budget > 0) {
    const fu1Leads = await db.lead.findMany({
      where: {
        pipelineStage: { in: inSequence },
        optInSentAt: { not: null, lte: daysAgo(FOLLOWUP_DAYS) },
        optInFollowupAt: null,
        respondedAt: null,
        unsubscribed: false,
        email: { not: null },
      },
      select: { id: true, name: true, email: true, outreachMailSent: true },
      take: budget * 3,
    });
    for (const lead of shuffle(fu1Leads)) {
      if (budget <= 0) break;
      if (!lead.email) continue;
      const prev = lead.outreachMailSent as { subject?: string } | null;
      const subject = prev?.subject ? `Re: ${prev.subject}` : `Re: ${lead.name}`;
      const body = questionnaireUrl
        ? `Ciao,\n\nqualche giorno fa ti ho scritto a proposito di ${lead.name} — ti era arrivata?\n` +
          `Sono le poche domande che ti dicevo: cinque minuti, e in base alle tue risposte ti registro un video di 2-3 minuti con le cose concrete che ho notato su ${lead.name}. Lo trovi qui: ${questionnaireUrl}\n\nUn saluto,\n${firma}`
        : `Ciao,\n\nqualche giorno fa ti ho scritto a proposito di ${lead.name} — ti era arrivata?\n` +
          `Se ti va, rispondi pure a questa mail.\n\nUn saluto,\n${firma}`;
      try {
        const ok = await sendOutreachEmail(lead.email, subject, body, lead.id);
        if (!ok) { res.skipped++; continue; }
        await db.$transaction([
          db.lead.update({ where: { id: lead.id }, data: { optInFollowupAt: new Date(), lastContactedAt: new Date() } }),
          db.activity.create({ data: { leadId: lead.id, type: "EMAIL_OUTREACH", notes: `[Opt-in-FU] follow-up 1 → ${lead.email}` } }),
        ]);
        res.followupsSent++;
        budget--;
        if (budget > 0) await jitter();
      } catch (err) {
        console.error(`[opt-in] follow-up errore ${lead.id}:`, err);
        res.skipped++;
      }
    }
  }

  // ── T3 — FOLLOW-UP 2 (email, angolo "visibilità") ───────────────────────────
  if (budget > 0) {
    const fu2Leads = await db.lead.findMany({
      where: {
        pipelineStage: { in: inSequence },
        optInFollowupAt: { not: null, lte: daysAgo(FOLLOWUP2_DAYS) },
        optInFollowup2At: null,
        respondedAt: null,
        unsubscribed: false,
        email: { not: null },
      },
      select: { id: true, name: true, email: true },
      take: budget * 3,
    });
    for (const lead of shuffle(fu2Leads)) {
      if (budget <= 0) break;
      if (!lead.email) continue;
      const subject = `Ultima cosa su ${lead.name}`;
      const body = questionnaireUrl
        ? `Ciao,\n\nultima cosa e poi ti lascio in pace: prova a cercare su Google (o a chiederlo a ChatGPT) un'attività come la vostra nella vostra zona, e guarda chi compare per primo.\n` +
          `Le poche domande che ti ho mandato servono proprio a capire dove si trova ${lead.name} rispetto a questo — e in cambio ti registro il video di 2-3 minuti di cui ti parlavo: ${questionnaireUrl}\n\nUn saluto,\n${firma}`
        : `Ciao,\n\nultima cosa e poi ti lascio in pace: se ti va di capire dove si trova ${lead.name} rispetto ai concorrenti online, rispondi pure a questa mail.\n\nUn saluto,\n${firma}`;
      try {
        const ok = await sendOutreachEmail(lead.email, subject, body, lead.id);
        if (!ok) { res.skipped++; continue; }
        await db.$transaction([
          db.lead.update({ where: { id: lead.id }, data: { optInFollowup2At: new Date(), lastContactedAt: new Date() } }),
          db.activity.create({ data: { leadId: lead.id, type: "EMAIL_OUTREACH", notes: `[Opt-in-FU2] follow-up 2 → ${lead.email}` } }),
        ]);
        res.followup2Sent++;
        budget--;
        if (budget > 0) await jitter();
      } catch (err) {
        console.error(`[opt-in] follow-up2 errore ${lead.id}:`, err);
        res.skipped++;
      }
    }
  }

  // ── T1 — PRIME mail (solo se gate approvazione OFF) ─────────────────────────
  if (budget > 0 && requireApproval) {
    console.log("[opt-in] gate approvazione attivo: prime mail gestite dalla coda di approvazione, non in automatico.");
  } else if (budget > 0 && !questionnaireUrl) {
    console.warn("[opt-in] Link questionario non configurato: salto le prime mail.");
  }
  if (budget > 0 && questionnaireUrl && !requireApproval) {
    const newLeads = await db.lead.findMany({
      where: {
        pipelineStage: { in: inSequence },
        email: { not: null },
        optInSentAt: null,
        unsubscribed: false,
        respondedAt: null,
      },
      select: { id: true, name: true, email: true },
      take: budget * 3,
    });
    for (const lead of shuffle(newLeads)) {
      if (budget <= 0) { res.capReached = true; break; }
      if (!lead.email) continue;
      try {
        const draft = await generateOutreachEmail(lead.id);
        const subjectTpl = pickSubjectVariant(subjectsField, sentToday + res.firstSent + res.followupsSent);
        const subject = subjectTpl.replace(/\{azienda\}/g, lead.name);
        const body = `${draft.body}\n\n${firma}`;
        const ok = await sendOutreachEmail(lead.email, subject, body, lead.id);
        if (!ok) { res.skipped++; continue; }
        const sentRecord: Prisma.InputJsonValue = {
          subject, body, hook: draft.hook || "", generatedAt: new Date().toISOString(),
        };
        await db.$transaction([
          db.lead.update({ where: { id: lead.id }, data: { outreachMailSent: sentRecord, optInSentAt: new Date(), lastContactedAt: new Date() } }),
          db.activity.create({ data: { leadId: lead.id, type: "EMAIL_OUTREACH", notes: `[Opt-in] mail inviata → ${lead.email}` } }),
        ]);
        res.firstSent++;
        budget--;
        if (budget > 0) await jitter();
      } catch (err) {
        console.error(`[opt-in] invio errore ${lead.id}:`, err);
        res.skipped++;
      }
    }
  }

  if (budget <= 0) res.capReached = true;
  return res;
}
