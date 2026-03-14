import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

const MAX_FARE_VIDEO = 5;

/**
 * POST /api/dashboard/regenerate
 *
 * Auto-rigenerazione: riempie FARE_VIDEO fino a 5
 * pescando dai HOT_LEAD prima, poi WARM_LEAD.
 */
export async function POST() {
  try {
    const currentCount = await db.lead.count({
      where: { pipelineStage: "FARE_VIDEO" },
    });

    const slotsToFill = MAX_FARE_VIDEO - currentCount;

    if (slotsToFill <= 0) {
      return NextResponse.json({
        moved: 0,
        message: `La lista è già piena (${currentCount}/${MAX_FARE_VIDEO})`,
      });
    }

    // Prima prova HOT_LEAD
    const hotCandidates = await db.lead.findMany({
      where: {
        pipelineStage: "HOT_LEAD",
        geminiAnalysis: { not: Prisma.DbNull },
      },
      orderBy: { opportunityScore: "desc" },
      take: slotsToFill,
      select: { id: true, name: true, opportunityScore: true },
    });

    let moved = 0;
    const allMoved: typeof hotCandidates = [];

    if (hotCandidates.length > 0) {
      const ids = hotCandidates.map((c) => c.id);
      await db.lead.updateMany({
        where: { id: { in: ids } },
        data: { pipelineStage: "FARE_VIDEO" },
      });
      for (const c of hotCandidates) {
        await db.activity.create({
          data: {
            leadId: c.id,
            type: "STAGE_CHANGE",
            notes: `Auto-promosso a FARE_VIDEO (score: ${c.opportunityScore})`,
          },
        });
      }
      moved += hotCandidates.length;
      allMoved.push(...hotCandidates);
    }

    // Se ancora slot disponibili, prova WARM_LEAD
    const remainingSlots = slotsToFill - hotCandidates.length;
    if (remainingSlots > 0) {
      const warmCandidates = await db.lead.findMany({
        where: {
          pipelineStage: "WARM_LEAD",
          geminiAnalysis: { not: Prisma.DbNull },
        },
        orderBy: { opportunityScore: "desc" },
        take: remainingSlots,
        select: { id: true, name: true, opportunityScore: true },
      });

      if (warmCandidates.length > 0) {
        const ids = warmCandidates.map((c) => c.id);
        await db.lead.updateMany({
          where: { id: { in: ids } },
          data: { pipelineStage: "FARE_VIDEO" },
        });
        for (const c of warmCandidates) {
          await db.activity.create({
            data: {
              leadId: c.id,
              type: "STAGE_CHANGE",
              notes: `Auto-promosso a FARE_VIDEO (score: ${c.opportunityScore})`,
            },
          });
        }
        moved += warmCandidates.length;
        allMoved.push(...warmCandidates);
      }
    }

    if (moved === 0) {
      return NextResponse.json({
        moved: 0,
        message: "Nessun lead Hot/Warm disponibile da promuovere",
      });
    }

    console.log(
      `[REGENERATE] Promossi ${moved} lead a FARE_VIDEO:`,
      allMoved.map((c) => `${c.name} (${c.opportunityScore})`)
    );

    return NextResponse.json({
      moved,
      leads: allMoved,
    });
  } catch (error) {
    console.error("[API] regenerate error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore interno" },
      { status: 500 }
    );
  }
}
