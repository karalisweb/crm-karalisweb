import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PipelineStage, Prisma } from "@prisma/client";

/**
 * POST /api/leads/recalculate-stages
 * Ricalcola gli stati dei lead in base ai tag commerciali
 * Lead con analisi Gemini: score >=80 → HOT_LEAD, <80 → WARM_LEAD, no segnale → NON_TARGET
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    // Trova tutti i lead DA_ANALIZZARE con analisi Gemini completata
    const leadsToUpdate = await db.lead.findMany({
      where: {
        pipelineStage: "DA_ANALIZZARE",
        geminiAnalysis: { not: Prisma.DbNull },
        opportunityScore: { not: null },
      },
      select: {
        id: true,
        name: true,
        opportunityScore: true,
        commercialTag: true,
      },
    });

    const results = {
      total: leadsToUpdate.length,
      hotLead: 0,
      warmLead: 0,
      nonTarget: 0,
    };

    for (const lead of leadsToUpdate) {
      let newStage: PipelineStage;

      if (lead.commercialTag === "NON_TARGET") {
        newStage = PipelineStage.NON_TARGET;
        results.nonTarget++;
      } else if ((lead.opportunityScore ?? 0) >= 80) {
        newStage = PipelineStage.HOT_LEAD;
        results.hotLead++;
      } else {
        newStage = PipelineStage.WARM_LEAD;
        results.warmLead++;
      }

      await db.lead.update({
        where: { id: lead.id },
        data: { pipelineStage: newStage },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Ricalcolati ${results.total} lead`,
      results,
    });
  } catch (error) {
    console.error("Error recalculating stages:", error);
    return NextResponse.json(
      { error: "Failed to recalculate stages" },
      { status: 500 }
    );
  }
}
