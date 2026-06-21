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

  const [optIn, followups, replied, videoViews, newLeads, caldi] = await Promise.all([
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
  ]);

  const stats = { optIn, followups, replied, videoViews, newLeads, caldi };
  const crmUrl = process.env.NEXTAUTH_URL || "https://crm.karalisdemo.it";
  const text =
    `Report di ieri — Sales CRM\n\n` +
    `📧 Mail opt-in inviate: ${optIn}\n` +
    `🔁 Follow-up inviati: ${followups}\n` +
    `✅ Hanno risposto: ${replied}\n` +
    `👀 Hanno visto il video: ${videoViews}\n` +
    `🆕 Nuovi lead trovati: ${newLeads}\n\n` +
    `🔥 Caldi da sentire adesso: ${caldi}\n` +
    `Apri il CRM: ${crmUrl}\n`;

  const sent = await sendInternalEmail("☀️ Report Sales CRM — ieri", text);
  return { sent, stats };
}
