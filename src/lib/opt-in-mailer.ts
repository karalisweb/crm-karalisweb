import { db } from "@/lib/db";
import { sendOutreachEmail } from "@/lib/email";
import { generateOutreachEmail } from "@/lib/gemini-outreach-email";
import { pickSubjectVariant } from "@/lib/workflow-templates";
import { parsePausedSegments } from "@/lib/segments";
import { PipelineStage, Prisma } from "@prisma/client";

/**
 * Sequenza fredda verso il QUESTIONARIO — follow-up unico + uscita rapida.
 *
 *  T1 mail 1 (gancio di dolore + questionario). Auto solo se gate approvazione OFF;
 *     altrimenti la manda la schermata di approvazione (/approve-outreach).
 *  T2 follow-up unico (email, +FOLLOWUP_DAYS da optInSentAt)
 *  T-exit break-up (email, +BREAKUP_DAYS da optInFollowupAt) → stato NURTURING
 *     (totale FOLLOWUP_DAYS+BREAKUP_DAYS giorni da optInSentAt, default 4+3=7gg)
 *  T-call ultimo tentativo telefonico (TASK, +CALL_DAYS da coldBreakupAt, SOLO
 *     lead che erano HOT — score ≥80 — perché a questo punto sono già in
 *     NURTURING e lo stage da solo non basterebbe più a distinguerli) — non
 *     consuma budget email
 *
 * La sequenza si ferma su respondedAt / unsubscribed (gestito altrove: la risposta
 * positiva promuove a CALDO_REATTIVO, quella esplicitamente negativa va a PERSO).
 * Protezioni: tetto giornaliero + warmup + jitter.
 */

const DEFAULT_SUBJECTS = [
  "Una cosa che ho notato su {azienda}",
  "{azienda}: una domanda veloce",
  "Ho guardato il sito di {azienda}",
  "Due minuti per {azienda}?",
  "Un'osservazione su {azienda}",
];

// Tetto per singola esecuzione (sicurezza anti-burst): col drip ogni ~10' basta poco.
const PER_RUN_CAP = Math.max(0, parseInt(process.env.OPTIN_PER_RUN_CAP || "2", 10) || 0);
// Finestra oraria (ora di Roma) su cui spalmare il tetto giornaliero.
const WINDOW_START_H = Math.max(0, Math.min(23, parseInt(process.env.OPTIN_WINDOW_START || "7", 10) || 7));
const WINDOW_END_H = Math.max(1, Math.min(24, parseInt(process.env.OPTIN_WINDOW_END || "19", 10) || 19));
const FOLLOWUP_DAYS = Math.max(1, parseInt(process.env.OPTIN_FOLLOWUP_DAYS || "4", 10) || 4); // T2, da optInSentAt
const BREAKUP_DAYS = Math.max(1, parseInt(process.env.OPTIN_BREAKUP_DAYS || "3", 10) || 3);   // T-exit, da optInFollowupAt
const CALL_DAYS = Math.max(1, parseInt(process.env.OPTIN_CALL_DAYS || "1", 10) || 1);          // T-call, da coldBreakupAt
// Frazione del tetto giornaliero RISERVATA alle prime mail (T1). Break-up e follow-up
// girano PRIMA del T1 sullo stesso budget: senza riserva il drenaggio dei lead vecchi
// satura il tetto e i nuovi contatti restano a 0. Con 0.5 metà tetto è garantita ai nuovi.
const NEW_RESERVE_FRAC = Math.min(1, Math.max(0, parseFloat(process.env.OPTIN_NEW_RESERVE_FRAC || "0.5") || 0.5));

export interface OptInResult {
  firstSent: number;
  followupsSent: number;
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

/** Ora corrente di Roma in formato decimale (es. 14.5 = 14:30), robusto al TZ del server. */
function romeHourDecimal(): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return (h % 24) + m / 60;
}

/**
 * Pacing: quante email "dovremmo" aver già inviato fin qui per spalmare uniformemente
 * `dailyCap` sulla finestra [WINDOW_START_H, WINDOW_END_H]. Evita il front-loading al
 * mattino: ogni run può colmare solo il divario rispetto al ritmo ideale.
 */
function pacedAllowance(dailyCap: number): number {
  if (dailyCap <= 0) return 0;
  const now = romeHourDecimal();
  if (now < WINDOW_START_H) return 0;
  if (now >= WINDOW_END_H) return dailyCap;
  const frac = (now - WINDOW_START_H) / (WINDOW_END_H - WINDOW_START_H);
  return Math.ceil(dailyCap * frac);
}

export async function runOptInMailer(): Promise<OptInResult> {
  const res: OptInResult = {
    firstSent: 0, followupsSent: 0, callTasks: 0, breakups: 0,
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
      pausedSegments: true,
    },
  });
  const configuredCap = settings?.emailDailyCap ?? 20;
  // Settori in pausa ("non contattare ora"): esclusi da TUTTI i tocchi finché restano in pausa.
  const pausedKeys = parsePausedSegments(settings?.pausedSegments);
  const segmentFilter: Prisma.LeadWhereInput =
    pausedKeys.length > 0 ? { segment: { notIn: pausedKeys } } : {};
  const firma = settings?.signatureAlessio || "Alessio Loi\nKaralisweb";
  const questionnaireUrl = (settings?.questionnaireUrl || "").trim();
  // MASTER PAUSE: se attivo, il drip non manda NULLA (né prime mail né follow-up).
  // (Riusa il vecchio flag outreachRequireApproval, ora interpretato come "pausa totale".)
  const autoSendPaused = settings?.outreachRequireApproval ?? true;
  if (autoSendPaused) {
    console.log("[opt-in] invii automatici in PAUSA (master). Nessun invio.");
    return res;
  }
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
  // Budget del run = quanto siamo "indietro" rispetto al ritmo ideale (pacing), con
  // tetto per-run di sicurezza. Così gli invii si spalmano su 07–19 invece di partire
  // tutti al mattino fino a saturare il tetto.
  const allowedByNow = pacedAllowance(dailyCap);
  let budget = Math.max(0, Math.min(PER_RUN_CAP, allowedByNow - sentToday, dailyCap - sentToday));

  // ── QUOTA RISERVATA AI NUOVI CONTATTI (T1) ───────────────────────────────────
  // Break-up + follow-up (manutenzione dei lead già toccati) girano PRIMA del T1 e
  // condividono lo stesso `budget`. Per evitare che il drenaggio dei vecchi saturi il
  // tetto lasciando 0 ai nuovi, plafoniamo la manutenzione a `maintDailyCap` al giorno,
  // così `newReserve` slot/giorno restano sempre al T1. La riserva non supera i nuovi
  // lead realmente in coda: se non ci sono nuovi da contattare, la manutenzione riprende
  // tutto il tetto (nessuno spreco di deliverability).
  const newSentToday = await db.activity.count({
    where: { type: "EMAIL_OUTREACH", notes: { startsWith: "[Opt-in]" }, createdAt: { gte: startOfDay } },
  });
  const maintSentToday = Math.max(0, sentToday - newSentToday);
  const pendingNew = await db.lead.count({
    where: {
      email: { not: null },
      optInSentAt: null,
      unsubscribed: false,
      respondedAt: null,
      ...segmentFilter,
      OR: [
        { pipelineStage: PipelineStage.HOT_LEAD, outreachApprovedAt: { not: null } },
        { pipelineStage: PipelineStage.WARM_LEAD },
      ],
    },
  });
  const newReserve = Math.min(Math.ceil(dailyCap * NEW_RESERVE_FRAC), pendingNew);
  const maintDailyCap = Math.max(0, dailyCap - newReserve);
  // Budget di manutenzione per QUESTO run: limitato dal budget complessivo del run E da
  // quanto manca al tetto giornaliero di manutenzione (accumulo su tutti i run del giorno).
  let maintBudget = Math.max(0, Math.min(budget, maintDailyCap - maintSentToday));
  console.log(
    `[opt-in] budget=${budget} maintBudget=${maintBudget} (maintDailyCap=${maintDailyCap}, maintSentToday=${maintSentToday}) ` +
      `newReserve=${newReserve} pendingNew=${pendingNew} dailyCap=${dailyCap} sentToday=${sentToday}`,
  );

  // ── T-exit — BREAK-UP (email) → NURTURING ───────────────────────────────────
  if (maintBudget > 0) {
    const breakupLeads = await db.lead.findMany({
      where: {
        pipelineStage: { in: inSequence },
        optInFollowupAt: { not: null, lte: daysAgo(BREAKUP_DAYS) },
        coldBreakupAt: null,
        respondedAt: null,
        unsubscribed: false,
        email: { not: null },
        ...segmentFilter,
      },
      select: { id: true, name: true, email: true },
      take: maintBudget * 3,
    });
    for (const lead of shuffle(breakupLeads)) {
      if (maintBudget <= 0 || budget <= 0) break;
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
        maintBudget--;
        if (budget > 0) await jitter();
      } catch (err) {
        console.error(`[opt-in] break-up errore ${lead.id}:`, err);
        res.skipped++;
      }
    }
  }

  // ── T-call — ULTIMO TENTATIVO TELEFONICO (task, solo ex-HOT): dopo l'uscita in
  // NURTURING, non consuma budget email. Gate su score (non più su pipelineStage,
  // perché a questo punto il lead è già NURTURING) ───────────────────────────
  const callLeads = await db.lead.findMany({
    where: {
      pipelineStage: PipelineStage.NURTURING,
      opportunityScore: { gte: 80 },
      coldBreakupAt: { not: null, lte: daysAgo(CALL_DAYS) },
      coldCallTaskAt: null,
      respondedAt: null,
      unsubscribed: false,
      ...segmentFilter,
    },
    select: { id: true, name: true, phone: true, outreachMailSent: true },
    take: 100,
  });
  for (const lead of callLeads) {
    try {
      const hook = (lead.outreachMailSent as { hook?: string } | null)?.hook || "";
      const desc =
        `Ultimo tentativo — ${lead.name} era un lead HOT, non ha risposto a mail + follow-up.\n` +
        (hook ? `Gancio: ${hook}\n` : "") +
        `Chiama${lead.phone ? ` (${lead.phone})` : ""} prima di archiviarlo definitivamente.` +
        `\nSe mostra interesse, segna "Ha risposto" (torna CALDO).`;
      await db.$transaction([
        db.task.create({ data: { leadId: lead.id, title: `📞 Ultimo tentativo — ${lead.name}`, description: desc, dueAt: new Date() } }),
        db.lead.update({ where: { id: lead.id }, data: { coldCallTaskAt: new Date() } }),
        db.activity.create({ data: { leadId: lead.id, type: "EMAIL_OUTREACH", notes: `[Cold-CALL] ultimo tentativo telefonico creato` } }),
      ]);
      res.callTasks++;
    } catch (err) {
      console.error(`[opt-in] call-task errore ${lead.id}:`, err);
      res.skipped++;
    }
  }

  // ── T2 — FOLLOW-UP unico (email) ────────────────────────────────────────────
  if (maintBudget > 0) {
    const fu1Leads = await db.lead.findMany({
      where: {
        pipelineStage: { in: inSequence },
        optInSentAt: { not: null, lte: daysAgo(FOLLOWUP_DAYS) },
        optInFollowupAt: null,
        respondedAt: null,
        unsubscribed: false,
        email: { not: null },
        ...segmentFilter,
      },
      select: { id: true, name: true, email: true, outreachMailSent: true },
      take: maintBudget * 3,
    });
    for (const lead of shuffle(fu1Leads)) {
      if (maintBudget <= 0 || budget <= 0) break;
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
        maintBudget--;
        if (budget > 0) await jitter();
      } catch (err) {
        console.error(`[opt-in] follow-up errore ${lead.id}:`, err);
        res.skipped++;
      }
    }
  }

  // ── T1 — PRIME mail (drip): WARM in autonomia + HOT solo se APPROVATI da Alessio ─
  // La temperatura decide il comportamento: gli HOT (score≥80) li sblocca l'approvazione
  // (usano la bozza approvata); i WARM (50-79) partono da soli con mail generata al volo.
  if (budget > 0 && !questionnaireUrl) {
    console.warn("[opt-in] Link questionario non configurato: salto le prime mail.");
  }
  if (budget > 0 && questionnaireUrl) {
    const common: Prisma.LeadWhereInput = {
      email: { not: null },
      optInSentAt: null,
      unsubscribed: false,
      respondedAt: null,
      ...segmentFilter,
    };
    const selectFields = { id: true, name: true, email: true, pipelineStage: true, outreachDraft: true } as const;

    // PRIORITÀ: prima gli HOT che HAI approvato tu (FIFO, chi è in coda da più tempo),
    // poi i WARM in autonomia riempiono il budget rimasto. Così il tuo lavoro di
    // selezione parte sempre prima dell'invio automatico.
    const hotApproved = await db.lead.findMany({
      where: { ...common, pipelineStage: PipelineStage.HOT_LEAD, outreachApprovedAt: { not: null } },
      select: selectFields,
      orderBy: { outreachApprovedAt: "asc" },
      take: budget,
    });
    // Ordinati dal più vecchio: senza orderBy la selezione non ha garanzia di
    // avanzare cronologicamente nell'arretrato (rischio che alcuni lead restino
    // in coda a tempo indeterminato). Lo shuffle sotto resta per variare l'ordine
    // di invio all'interno del lotto selezionato (deliverability).
    const warm = await db.lead.findMany({
      where: { ...common, pipelineStage: PipelineStage.WARM_LEAD },
      select: selectFields,
      orderBy: { createdAt: "asc" },
      take: budget * 3,
    });
    const ordered = [...hotApproved, ...shuffle(warm)];

    for (const lead of ordered) {
      if (budget <= 0) { res.capReached = true; break; }
      if (!lead.email) continue;
      try {
        let subject: string;
        let body: string;
        let hook = "";
        const approved = lead.outreachDraft as { subject?: string; body?: string } | null;

        if (lead.pipelineStage === PipelineStage.HOT_LEAD && approved?.subject && approved?.body) {
          // HOT approvato → usa ESATTAMENTE la mail che Alessio ha approvato (firma inclusa).
          subject = approved.subject;
          body = approved.body;
        } else {
          // WARM (o HOT senza bozza valida) → genera la mail al volo + oggetto a rotazione + firma.
          const draft = await generateOutreachEmail(lead.id);
          const subjectTpl = pickSubjectVariant(subjectsField, sentToday + res.firstSent + res.followupsSent);
          subject = subjectTpl.replace(/\{azienda\}/g, lead.name);
          body = `${draft.body}\n\n${firma}`;
          hook = draft.hook || "";
        }

        const ok = await sendOutreachEmail(lead.email, subject, body, lead.id);
        if (!ok) { res.skipped++; continue; }
        const sentRecord: Prisma.InputJsonValue = {
          subject, body, hook, generatedAt: new Date().toISOString(),
        };
        await db.$transaction([
          db.lead.update({
            where: { id: lead.id },
            data: { outreachMailSent: sentRecord, outreachDraft: Prisma.DbNull, optInSentAt: new Date(), lastContactedAt: new Date() },
          }),
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
