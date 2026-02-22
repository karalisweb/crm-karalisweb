import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PipelineStage } from "@prisma/client";

/**
 * POST /api/leads/recalculate-stages
 * Ricalcola gli stati dei lead in base ai tag commerciali
 * Tutti i lead callable vanno a DA_QUALIFICARE (Daniela decide)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    // Trova tutti i lead con audit completato ancora in NUOVO
    const leadsToUpdate = await db.lead.findMany({
      where: {
        auditStatus: "COMPLETED",
        pipelineStage: "NUOVO",
      },
      select: {
        id: true,
        name: true,
        opportunityScore: true,
        commercialTag: true,
        isCallable: true,
      },
    });

    const results = {
      total: leadsToUpdate.length,
      daQualificare: 0,
      nonTarget: 0,
      unchanged: 0,
    };

    for (const lead of leadsToUpdate) {
      let newStage: PipelineStage;

      if (lead.commercialTag === "NON_TARGET") {
        newStage = PipelineStage.NON_TARGET;
        results.nonTarget++;
      } else {
        // Tutti gli altri vanno a DA_QUALIFICARE (Daniela decide)
        newStage = PipelineStage.DA_QUALIFICARE;
        results.daQualificare++;
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
