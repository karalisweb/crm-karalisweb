import { db } from "@/lib/db";
import { sendOutreachEmail } from "@/lib/email";
import { generateOutreachEmail } from "@/lib/gemini-outreach-email";
import { pickSubjectVariant } from "@/lib/workflow-templates";
import { PipelineStage, Prisma } from "@prisma/client";

/**
 * Macchina dedicata alla MAIL 1 (opt-in): chiede al prospect se vuole il video.
 *
 * Separata dal workflow engine del video (così non rischia di romperlo). Riusa:
 *  - generateOutreachEmail()  → testo AI con gancio vero
 *  - sendOutreachEmail()      → invio SMTP + footer GDPR/unsubscribe
 *  - pickSubjectVariant()     → oggetto a rotazione (deliverability)
 *
 * Protezioni: tetto giornaliero (settings.emailDailyCap), invii distribuiti
 * (poche mail/run + jitter), niente doppioni / disiscritti / chi ha già risposto.
 */

const DEFAULT_SUBJECTS = [
  "Ho guardato il sito di {azienda}",
  "Una cosa che ho notato su {azienda}",
  "Un'idea veloce per {azienda}",
  "{azienda}: posso mandarvi un video?",
  "Due cose sul vostro sito",
];

const PER_RUN_CAP = Math.max(0, parseInt(process.env.OPTIN_PER_RUN_CAP || "4", 10) || 0);
const FOLLOWUP_DAYS = Math.max(1, parseInt(process.env.OPTIN_FOLLOWUP_DAYS || "4", 10) || 4);

export interface OptInResult {
  firstSent: number;
  followupsSent: number;
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
function warmupCap(configuredCap: number, firstSentAt: Date | null): number {
  if (!firstSentAt) return Math.min(configuredCap, 5);
  const days = Math.floor((Date.now() - firstSentAt.getTime()) / 86_400_000);
  let ramp: number;
  if (days < 3) ramp = 5;
  else if (days < 7) ramp = 10;
  else if (days < 14) ramp = 20;
  else return configuredCap;
  return Math.min(configuredCap, ramp);
}

export async function runOptInMailer(): Promise<OptInResult> {
  const res: OptInResult = { firstSent: 0, followupsSent: 0, skipped: 0, capReached: false };

  const settings = await db.settings.findUnique({
    where: { id: "default" },
    select: { emailDailyCap: true, optInSubjects: true, signatureAlessio: true },
  });
  const configuredCap = settings?.emailDailyCap ?? 20;
  const firma = settings?.signatureAlessio || "Alessio Loi\nKaralisweb";
  const subjectsField =
    settings?.optInSubjects && settings.optInSubjects.trim()
      ? settings.optInSubjects
      : DEFAULT_SUBJECTS.join("\n");

  // Mail opt-in (prime + follow-up) già inviate oggi → quanto budget resta.
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const sentToday = await db.activity.count({
    where: {
      type: "EMAIL_OUTREACH",
      notes: { startsWith: "[Opt-in" },
      createdAt: { gte: startOfDay },
    },
  });

  // Partenza morbida del dominio: i primi giorni si invia poco, poi si sale.
  const firstAgg = await db.lead.aggregate({
    _min: { optInSentAt: true },
    where: { optInSentAt: { not: null } },
  });
  const dailyCap = warmupCap(configuredCap, firstAgg._min.optInSentAt);

  let budget = Math.max(0, Math.min(PER_RUN_CAP, dailyCap - sentToday));
  if (budget <= 0) {
    res.capReached = true;
    return res;
  }

  // 1) FOLLOW-UP gentile a chi non ha risposto dopo FOLLOWUP_DAYS giorni.
  const followupCutoff = new Date(Date.now() - FOLLOWUP_DAYS * 24 * 60 * 60 * 1000);
  const followupLeads = await db.lead.findMany({
    where: {
      optInSentAt: { not: null, lte: followupCutoff },
      optInFollowupAt: null,
      respondedAt: null,
      unsubscribed: false,
      email: { not: null },
    },
    select: { id: true, name: true, email: true, outreachMailSent: true },
    take: budget * 3,
  });

  for (const lead of shuffle(followupLeads)) {
    if (budget <= 0) break;
    if (!lead.email) continue;
    const prev = lead.outreachMailSent as { subject?: string } | null;
    const subject = prev?.subject ? `Re: ${prev.subject}` : `Re: ${lead.name}`;
    const body =
      `Ciao,\n\nqualche giorno fa ti ho scritto a proposito di ${lead.name} — ti era arrivata?\n` +
      `Se ti va, ti mando volentieri quel breve video: rispondi pure "sì".\n\nUn saluto,\n${firma}`;
    try {
      const ok = await sendOutreachEmail(lead.email, subject, body, lead.id);
      if (!ok) {
        res.skipped++;
        continue;
      }
      await db.$transaction([
        db.lead.update({
          where: { id: lead.id },
          data: { optInFollowupAt: new Date(), lastContactedAt: new Date() },
        }),
        db.activity.create({
          data: { leadId: lead.id, type: "EMAIL_OUTREACH", notes: `[Opt-in-FU] follow-up → ${lead.email}` },
        }),
      ]);
      res.followupsSent++;
      budget--;
      if (budget > 0) await jitter();
    } catch (err) {
      console.error(`[opt-in] follow-up errore ${lead.id}:`, err);
      res.skipped++;
    }
  }

  // 2) PRIME mail a chi è caldo/tiepido, ha email, e non l'ha ancora ricevuta.
  if (budget > 0) {
    const newLeads = await db.lead.findMany({
      where: {
        pipelineStage: { in: [PipelineStage.HOT_LEAD, PipelineStage.WARM_LEAD] },
        email: { not: null },
        optInSentAt: null,
        unsubscribed: false,
        respondedAt: null,
      },
      select: { id: true, name: true, email: true },
      take: budget * 3,
    });

    for (const lead of shuffle(newLeads)) {
      if (budget <= 0) {
        res.capReached = true;
        break;
      }
      if (!lead.email) continue;
      try {
        const draft = await generateOutreachEmail(lead.id);
        const subjectTpl = pickSubjectVariant(subjectsField, sentToday + res.firstSent + res.followupsSent);
        const subject = subjectTpl.replace(/\{azienda\}/g, lead.name);
        const body = `${draft.body}\n\n${firma}`;

        const ok = await sendOutreachEmail(lead.email, subject, body, lead.id);
        if (!ok) {
          res.skipped++;
          continue;
        }

        const sentRecord: Prisma.InputJsonValue = {
          subject,
          body,
          hook: draft.hook || "",
          generatedAt: new Date().toISOString(),
        };
        await db.$transaction([
          db.lead.update({
            where: { id: lead.id },
            data: { outreachMailSent: sentRecord, optInSentAt: new Date(), lastContactedAt: new Date() },
          }),
          db.activity.create({
            data: { leadId: lead.id, type: "EMAIL_OUTREACH", notes: `[Opt-in] mail inviata → ${lead.email}` },
          }),
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

  return res;
}
