import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

/**
 * POST /api/cron/check-recontact
 *
 * Endpoint cron: controlla i lead ARCHIVIATO con recontactAt scaduto
 * e li riporta a DA_ANALIZZARE.
 * Chiamato da crontab VPS ogni giorno alle 8:00: 0 8 * * *
 * Protetto da CRON_SECRET.
 */
export async function POST(request: NextRequest) {
  // Verifica autenticazione cron
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.CRON_SECRET;

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Trova lead pronti per il recontact
    const leadsToRecontact = await db.lead.findMany({
      where: {
        pipelineStage: "ARCHIVIATO",
        recontactAt: {
          lte: new Date(),
        },
      },
      select: {
        id: true,
        name: true,
        recontactAt: true,
      },
    });

    if (leadsToRecontact.length === 0) {
      return NextResponse.json({ moved: 0, message: "Nessun lead da ricontattare" });
    }

    // Sposta ogni lead a DA_ANALIZZARE
    let count = 0;
    for (const lead of leadsToRecontact) {
      await db.lead.update({
        where: { id: lead.id },
        data: {
          pipelineStage: "DA_ANALIZZARE",
          recontactAt: null,
          videoSentAt: null,
          videoViewedAt: null,
          letterSentAt: null,
          linkedinSentAt: null,
          respondedAt: null,
          respondedVia: null,
          videoScriptData: Prisma.DbNull,
        },
      });

      await db.activity.create({
        data: {
          leadId: lead.id,
          type: "STAGE_CHANGE",
          notes: `Ritornato in pipeline dopo periodo di attesa 6 mesi. Pronto per nuova qualificazione.`,
        },
      });

      count++;
    }

    console.log(
      `[RECONTACT] Spostati ${count} lead a DA_ANALIZZARE:`,
      leadsToRecontact.map((l) => l.name)
    );

    return NextResponse.json({
      moved: count,
      leads: leadsToRecontact.map((l) => l.name),
    });
  } catch (error) {
    console.error("[CRON] Errore check recontact:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore interno" },
      { status: 500 }
    );
  }
}
