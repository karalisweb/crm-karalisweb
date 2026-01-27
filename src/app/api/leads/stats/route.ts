import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/leads/stats
 * Restituisce statistiche aggregate sui lead
 */
export async function GET() {
  try {
    // Count by audit status
    const auditStatusCounts = await db.lead.groupBy({
      by: ["auditStatus"],
      _count: true,
    });

    // Count by pipeline stage
    const pipelineStageCounts = await db.lead.groupBy({
      by: ["pipelineStage"],
      _count: true,
    });

    // Count by commercial tag (only completed audits)
    const commercialTagCounts = await db.lead.groupBy({
      by: ["commercialTag"],
      where: {
        auditStatus: "COMPLETED",
      },
      _count: true,
    });

    // Transform to objects
    const auditStatus: Record<string, number> = {};
    for (const item of auditStatusCounts) {
      auditStatus[item.auditStatus] = item._count;
    }

    const pipelineStage: Record<string, number> = {};
    for (const item of pipelineStageCounts) {
      pipelineStage[item.pipelineStage] = item._count;
    }

    const commercialTag: Record<string, number> = {};
    for (const item of commercialTagCounts) {
      if (item.commercialTag) {
        commercialTag[item.commercialTag] = item._count;
      }
    }

    // Total counts
    const total = await db.lead.count();
    const withWebsite = await db.lead.count({
      where: { website: { not: null } },
    });
    const withAudit = await db.lead.count({
      where: { auditStatus: "COMPLETED" },
    });
    const callable = await db.lead.count({
      where: { isCallable: true },
    });

    return NextResponse.json({
      total,
      withWebsite,
      withAudit,
      callable,
      auditStatus,
      pipelineStage,
      commercialTag,
    });
  } catch (error) {
    console.error("Error fetching lead stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
