import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

const MAX_VIDEO_DA_FARE = 5;

/**
 * POST /api/dashboard/regenerate
 *
 * Auto-rigenerazione: riempie VIDEO_DA_FARE fino a 5
 * pescando dai QUALIFICATO con score più alto.
 *
 * Logica:
 * 1. Conta quanti lead sono in VIDEO_DA_FARE
 * 2. Se < 5, prende i top-scored QUALIFICATO
 * 3. Li sposta in VIDEO_DA_FARE
 */
export async function POST() {
  try {
    // Quanti video da fare ci sono già?
    const currentCount = await db.lead.count({
      where: { pipelineStage: "VIDEO_DA_FARE" },
    });

    const slotsToFill = MAX_VIDEO_DA_FARE - currentCount;

    if (slotsToFill <= 0) {
      return NextResponse.json({
        moved: 0,
        message: `La lista è già piena (${currentCount}/${MAX_VIDEO_DA_FARE})`,
      });
    }

    // Prendi i top-scored QUALIFICATO con analisi Gemini
    const candidates = await db.lead.findMany({
      where: {
        pipelineStage: "QUALIFICATO",
        geminiAnalysis: { not: Prisma.DbNull },
      },
      orderBy: { opportunityScore: "desc" },
      take: slotsToFill,
      select: { id: true, name: true, opportunityScore: true },
    });

    if (candidates.length === 0) {
      // Fallback: prova con DA_QUALIFICARE che hanno analisi
      const fallbackCandidates = await db.lead.findMany({
        where: {
          pipelineStage: "DA_QUALIFICARE",
          geminiAnalysis: { not: Prisma.DbNull },
          opportunityScore: { gte: 50 },
        },
        orderBy: { opportunityScore: "desc" },
        take: slotsToFill,
        select: { id: true, name: true, opportunityScore: true },
      });

      if (fallbackCandidates.length === 0) {
        return NextResponse.json({
          moved: 0,
          message: "Nessun lead qualificato disponibile da promuovere",
        });
      }

      // Sposta fallback candidates
      const ids = fallbackCandidates.map((c) => c.id);
      await db.lead.updateMany({
        where: { id: { in: ids } },
        data: { pipelineStage: "VIDEO_DA_FARE" },
      });

      // Log activities
      for (const c of fallbackCandidates) {
        await db.activity.create({
          data: {
            leadId: c.id,
            type: "STAGE_CHANGE",
            notes: `Auto-promosso a VIDEO_DA_FARE (score: ${c.opportunityScore})`,
          },
        });
      }

      console.log(
        `[REGENERATE] Promossi ${fallbackCandidates.length} lead da DA_QUALIFICARE a VIDEO_DA_FARE:`,
        fallbackCandidates.map((c) => `${c.name} (${c.opportunityScore})`)
      );

      return NextResponse.json({
        moved: fallbackCandidates.length,
        from: "DA_QUALIFICARE",
        leads: fallbackCandidates,
      });
    }

    // Sposta candidates da QUALIFICATO a VIDEO_DA_FARE
    const ids = candidates.map((c) => c.id);
    await db.lead.updateMany({
      where: { id: { in: ids } },
      data: { pipelineStage: "VIDEO_DA_FARE" },
    });

    // Log activities
    for (const c of candidates) {
      await db.activity.create({
        data: {
          leadId: c.id,
          type: "STAGE_CHANGE",
          notes: `Auto-promosso a VIDEO_DA_FARE (score: ${c.opportunityScore})`,
        },
      });
    }

    console.log(
      `[REGENERATE] Promossi ${candidates.length} lead da QUALIFICATO a VIDEO_DA_FARE:`,
      candidates.map((c) => `${c.name} (${c.opportunityScore})`)
    );

    return NextResponse.json({
      moved: candidates.length,
      from: "QUALIFICATO",
      leads: candidates,
    });
  } catch (error) {
    console.error("[API] regenerate error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore interno" },
      { status: 500 }
    );
  }
}
