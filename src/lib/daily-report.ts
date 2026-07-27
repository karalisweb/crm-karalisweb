import { db } from "@/lib/db";
import { sendInternalEmail } from "@/lib/email";
import { parsePausedSegments } from "@/lib/segments";
import { PipelineStage, Prisma } from "@prisma/client";

/**
 * Report giornaliero (idea 6): la mattina manda un riepilogo di ieri agli
 * indirizzi in Settings.notificationEmails. Così Alessio sa cosa è successo
 * senza aprire il CRM.
 *
 * I conteggi dell'arretrato usano gli STESSI filtri di `runOptInMailer`
 * (src/lib/opt-in-mailer.ts): un lead è "pronto da inviare" solo se il drip lo
 * pescherebbe davvero. Se i criteri divergono di nuovo, il report torna a
 * promettere invii che non partiranno.
 */

/** Scostamento ora di Roma ↔ UTC per l'istante dato (gestisce l'ora legale). */
function romeOffsetMs(at: Date): number {
  const asRome = new Date(at.toLocaleString("en-US", { timeZone: "Europe/Rome" }));
  const asUtc = new Date(at.toLocaleString("en-US", { timeZone: "UTC" }));
  return asRome.getTime() - asUtc.getTime();
}

/** Mezzanotte di Roma (in UTC) del giorno che contiene `at`. */
function romeDayStartUtc(at: Date): Date {
  const offset = romeOffsetMs(at);
  const wallClock = new Date(at.getTime() + offset);
  wallClock.setUTCHours(0, 0, 0, 0);
  return new Date(wallClock.getTime() - offset);
}

export async function sendDailyReport(): Promise<{ sent: boolean; stats: Record<string, number> }> {
  // Finestra: il giorno solare precedente in ORA ITALIANA (non UTC, altrimenti le
  // attività tra mezzanotte e le 02:00 finiscono nel giorno sbagliato).
  const startToday = romeDayStartUtc(new Date());
  const startYesterday = romeDayStartUtc(new Date(startToday.getTime() - 3_600_000));
  const window = { gte: startYesterday, lt: startToday };

  // Gate che possono bloccare il drip: senza questi il report annuncia "N pronti
  // da inviare" mentre in realtà non parte nulla.
  const settings = await db.settings.findUnique({
    where: { id: "default" },
    select: { outreachRequireApproval: true, questionnaireUrl: true, pausedSegments: true },
  });
  const autoSendPaused = settings?.outreachRequireApproval ?? true;
  const questionnaireUrl = (settings?.questionnaireUrl || "").trim();
  const pausedKeys = parsePausedSegments(settings?.pausedSegments);
  const segmentFilter: Prisma.LeadWhereInput =
    pausedKeys.length > 0 ? { segment: { notIn: pausedKeys } } : {};

  // Requisiti comuni a tutte le prime mail (cfr. `common` in opt-in-mailer).
  const sendable: Prisma.LeadWhereInput = {
    email: { not: null },
    optInSentAt: null,
    unsubscribed: false,
    respondedAt: null,
    ...segmentFilter,
  };

  const [optIn, followups, replied, videoViews, newLeads, caldi, hotWaitingApproval, warmBacklog] =
    await Promise.all([
      db.activity.count({
        where: { type: "EMAIL_OUTREACH", notes: { startsWith: "[Opt-in]" }, createdAt: window },
      }),
      db.activity.count({
        where: { type: "EMAIL_OUTREACH", notes: { startsWith: "[Opt-in-FU]" }, createdAt: window },
      }),
      db.lead.count({ where: { respondedAt: window } }),
      db.lead.count({ where: { videoViewedAt: window } }),
      db.lead.count({ where: { createdAt: window } }),
      db.lead.count({
        where: {
          OR: [{ respondedAt: { not: null } }, { videoViewedAt: { not: null } }],
          pipelineStage: { notIn: [PipelineStage.CLIENTE, PipelineStage.PERSO] },
        },
      }),
      // HOT che aspettano SOLO la tua approvazione: il collo di bottiglia sei tu.
      // (Esclude chi è già stato contattato o ha già risposto: quelli non sono arretrato.)
      db.lead.count({
        where: { ...sendable, pipelineStage: PipelineStage.HOT_LEAD, outreachApprovedAt: null },
      }),
      // WARM che il drip manderebbe da solo, se non fosse bloccato.
      db.lead.count({ where: { ...sendable, pipelineStage: PipelineStage.WARM_LEAD } }),
    ]);

  const backlogTotal = hotWaitingApproval + warmBacklog;
  const stats = {
    optIn, followups, replied, videoViews, newLeads, caldi, hotWaitingApproval, warmBacklog, backlogTotal,
  };

  // Perché la coda non si smaltisce: va detto, altrimenti "804 in coda, 0 inviate"
  // sembra un bug del drip invece che un interruttore da girare.
  const blockers: string[] = [];
  if (autoSendPaused) blockers.push("invii automatici in PAUSA (master) — sbloccali in Impostazioni");
  if (!questionnaireUrl) blockers.push("link questionario non configurato — le prime mail vengono saltate");
  if (pausedKeys.length > 0) blockers.push(`settori in pausa: ${pausedKeys.join(", ")}`);

  const crmUrl = process.env.NEXTAUTH_URL || "https://crm.karalisdemo.it";
  const text =
    `Report di ieri — Sales CRM\n\n` +
    `📧 Mail opt-in inviate: ${optIn}\n` +
    `🔁 Follow-up inviati: ${followups}\n` +
    `✅ Hanno risposto: ${replied}\n` +
    `👀 Hanno visto il video: ${videoViews}\n` +
    `🆕 Nuovi lead trovati: ${newLeads}\n\n` +
    `📦 Arretrato mai contattato: ${backlogTotal} (${warmBacklog} warm pronti da inviare, ${hotWaitingApproval} hot da approvare tu)\n` +
    (blockers.length > 0
      ? `⚠️ Il drip NON sta inviando: ${blockers.join(" · ")}\n`
      : "") +
    `\n🔥 Caldi in attesa di una chiamata (totale, non solo di ieri): ${caldi}\n` +
    `Apri il CRM: ${crmUrl}\n`;

  const sent = await sendInternalEmail("☀️ Report Sales CRM — ieri", text);
  return { sent, stats };
}
