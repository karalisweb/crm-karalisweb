import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/stats/segments
 *
 * Statistiche volume per segmento: conteggio lead, distribuzione stage, score medio.
 */
export async function GET() {
  try {
    // Conteggio per segmento
    const segmentCounts = await db.lead.groupBy({
      by: ["segment"],
      _count: { id: true },
      _avg: { opportunityScore: true },
      orderBy: { _count: { id: "desc" } },
    });

    // Conteggio per stage per segmento (per i top segmenti)
    const stageCounts = await db.lead.groupBy({
      by: ["segment", "pipelineStage"],
      _count: { id: true },
      where: { segment: { not: null } },
    });

    // Raggruppa stage per segmento
    const stageBySegment: Record<string, Record<string, number>> = {};
    for (const row of stageCounts) {
      if (!row.segment) continue;
      if (!stageBySegment[row.segment]) stageBySegment[row.segment] = {};
      stageBySegment[row.segment][row.pipelineStage] = row._count.id;
    }

    return NextResponse.json({
      segments: segmentCounts.map((s) => ({
        segment: s.segment || "_senza_segmento",
        count: s._count.id,
        avgScore: Math.round(s._avg.opportunityScore ?? 0),
        stages: stageBySegment[s.segment || ""] || {},
      })),
    });
  } catch (error) {
    console.error("Error fetching segment stats:", error);
    return NextResponse.json({ error: "Errore" }, { status: 500 });
  }
}
