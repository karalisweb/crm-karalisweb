import { db } from "@/lib/db";
import { sendInternalEmail } from "@/lib/email";
import { PipelineStage } from "@prisma/client";

/**
 * Report giornaliero (idea 6): la mattina manda un riepilogo di ieri agli
 * indirizzi in Settings.notificationEmails. Così Alessio sa cosa è successo
 * senza aprire il CRM.
 */
export async function sendDailyReport(): Promise<{ sent: boolean; stats: Record<string, number> }> {
  // Finestra: il giorno solare precedente (UTC).
  const startToday = new Date();
  startToday.setUTCHours(0, 0, 0, 0);
  const startYesterday = new Date(startToday.getTime() - 86_400_000);
  const window = { gte: startYesterday, lt: startToday };

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
      // HOT ancora da approvare: il collo di bottiglia è la tua revisione manuale.
      db.lead.count({
        where: {
          pipelineStage: PipelineStage.HOT_LEAD,
          outreachApprovedAt: null,
          email: { not: null },
          unsubscribed: false,
        },
      }),
      // WARM pronti, con email, mai contattati: arretrato che il drip deve smaltire.
      db.lead.count({
        where: {
          pipelineStage: PipelineStage.WARM_LEAD,
          optInSentAt: null,
          email: { not: null },
          unsubscribed: false,
        },
      }),
    ]);

  const backlogTotal = hotWaitingApproval + warmBacklog;
  const stats = {
    optIn, followups, replied, videoViews, newLeads, caldi, hotWaitingApproval, warmBacklog, backlogTotal,
  };
  const crmUrl = process.env.NEXTAUTH_URL || "https://crm.karalisdemo.it";
  const text =
    `Report di ieri — Sales CRM\n\n` +
    `📧 Mail opt-in inviate: ${optIn}\n` +
    `🔁 Follow-up inviati: ${followups}\n` +
    `✅ Hanno risposto: ${replied}\n` +
    `👀 Hanno visto il video: ${videoViews}\n` +
    `🆕 Nuovi lead trovati: ${newLeads}\n\n` +
    `📦 Arretrato mai contattato: ${backlogTotal} (${warmBacklog} warm pronti da inviare, ${hotWaitingApproval} hot da approvare tu)\n\n` +
    `🔥 Caldi da sentire adesso: ${caldi}\n` +
    `Apri il CRM: ${crmUrl}\n`;

  const sent = await sendInternalEmail("☀️ Report Sales CRM — ieri", text);
  return { sent, stats };
}
