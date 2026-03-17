import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/cron/check-video-followup
 *
 * Controlla i lead in VIDEO_INVIATO che non hanno visto il video
 * dopo N giorni (default 7, da Settings.followUpDaysVideo).
 * Crea un Task di follow-up con messaggio WhatsApp pre-scritto.
 *
 * Chiamato da crontab VPS ogni giorno alle 9:00: 0 9 * * *
 * Protetto da CRON_SECRET.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.CRON_SECRET;

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Leggi configurazione follow-up days
    const settings = await db.settings.findFirst();
    const followUpDays = settings?.followUpDaysVideo ?? 7;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - followUpDays);

    // Trova lead con video inviato ma non visto
    const leads = await db.lead.findMany({
      where: {
        pipelineStage: "VIDEO_INVIATO",
        videoSentAt: {
          lte: cutoffDate,
          not: null,
        },
        videoViewsCount: 0,
      },
      select: {
        id: true,
        name: true,
        videoLandingUrl: true,
        videoSentAt: true,
        tasks: {
          where: {
            title: { startsWith: "Follow-up video:" },
            completedAt: null,
          },
          select: { id: true },
        },
      },
    });

    // Filtra lead che hanno già un task follow-up aperto
    const leadsToFollowUp = leads.filter((l) => l.tasks.length === 0);

    if (leadsToFollowUp.length === 0) {
      return NextResponse.json({
        created: 0,
        message: "Nessun follow-up necessario",
      });
    }

    // Crea task + activity per ogni lead
    const taskData = leadsToFollowUp.map((lead) => {
      const firstName = lead.name.split(" ")[0];
      const landingUrl = lead.videoLandingUrl || "[URL landing page]";
      const message = `Ciao ${firstName}, qualche giorno fa ti avevo inviato un'analisi personalizzata del tuo sito. Magari ti è sfuggita — eccola qui: ${landingUrl}\nFammi sapere se hai 10 minuti per vederla insieme!`;

      return {
        leadId: lead.id,
        title: `Follow-up video: ${lead.name} non ha visto il video`,
        description: message,
        dueAt: new Date(),
      };
    });

    const activityData = leadsToFollowUp.map((lead) => ({
      leadId: lead.id,
      type: "NOTE" as const,
      notes: `Follow-up video suggerito: nessuna visualizzazione dopo ${followUpDays} giorni dall'invio`,
    }));

    await db.$transaction([
      db.task.createMany({ data: taskData }),
      db.activity.createMany({ data: activityData }),
    ]);

    const count = leadsToFollowUp.length;

    console.log(
      `[VIDEO-FOLLOWUP] Creati ${count} task follow-up:`,
      leadsToFollowUp.map((l) => l.name)
    );

    return NextResponse.json({
      created: count,
      leads: leadsToFollowUp.map((l) => l.name),
    });
  } catch (error) {
    console.error("[CRON] Errore check video followup:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore interno" },
      { status: 500 }
    );
  }
}
