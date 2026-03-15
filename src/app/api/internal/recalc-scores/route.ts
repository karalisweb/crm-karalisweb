import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PipelineStage, Prisma } from "@prisma/client";
import { calculateLeadScore, extractScoreInputFromGeminiAnalysis } from "@/lib/scoring/lead-score";

/**
 * POST /api/internal/recalc-scores
 *
 * v3.4 — Ricalcola opportunityScore + auto-riclassifica pipeline.
 * Usa scoring v3.1: tierOverride, tracking bonus, reviews bonus.
 *
 * Richiede CRON_SECRET per autenticazione.
 */
export async function POST(request: NextRequest) {
  // Auth: accetta sia header che x-cron-secret
  const authHeader = request.headers.get("authorization");
  const cronHeader = request.headers.get("x-cron-secret");
  const expectedToken = process.env.CRON_SECRET;

  const isAuthorized =
    (expectedToken && authHeader === `Bearer ${expectedToken}`) ||
    (expectedToken && cronHeader === expectedToken);

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const leads = await db.lead.findMany({
    where: {
      geminiAnalysis: { not: { equals: null } },
    },
    select: {
      id: true,
      name: true,
      category: true,
      geminiAnalysis: true,
      auditData: true,
      opportunityScore: true,
      pipelineStage: true,
      googleRating: true,
      googleReviewsCount: true,
      tierOverride: true,
    },
  });

  console.log(`[RECALC v3.4] Ricalcolo score per ${leads.length} lead (scoring v3.1)...`);

  const results: Array<{
    name: string;
    oldScore: number | null;
    newScore: number;
    oldStage: string;
    newStage: string;
    breakdown: string[];
  }> = [];

  for (const lead of leads) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const analysis = lead.geminiAnalysis as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const audit = lead.auditData as any;

    // Fix: Se ads_networks_found è vuoto ma auditData ha tracking_tools, inietta
    if (
      analysis &&
      (!analysis.ads_networks_found || analysis.ads_networks_found.length === 0) &&
      audit?.tracking_tools?.length > 0
    ) {
      analysis.ads_networks_found = audit.tracking_tools;
      await db.lead.update({
        where: { id: lead.id },
        data: {
          geminiAnalysis: {
            ...analysis,
            ads_networks_found: audit.tracking_tools,
          } as unknown as Prisma.InputJsonValue,
        },
      });
    }

    const scoreInput = extractScoreInputFromGeminiAnalysis(analysis, lead.category, {
      googleReviewsCount: lead.googleReviewsCount,
      googleRating: lead.googleRating,
      tierOverride: lead.tierOverride,
    });
    const scoreResult = calculateLeadScore(scoreInput);

    // Auto-classificazione
    let newStage: PipelineStage;
    const classifiableStages: PipelineStage[] = [
      PipelineStage.DA_ANALIZZARE,
      PipelineStage.HOT_LEAD,
      PipelineStage.WARM_LEAD,
      PipelineStage.COLD_LEAD,
      PipelineStage.FARE_VIDEO,
    ];

    if (classifiableStages.includes(lead.pipelineStage as PipelineStage)) {
      if (scoreResult.score >= 80) newStage = PipelineStage.FARE_VIDEO;
      else if (scoreResult.score >= 50) newStage = PipelineStage.WARM_LEAD;
      else newStage = PipelineStage.COLD_LEAD;
    } else {
      newStage = lead.pipelineStage as PipelineStage;
    }

    await db.lead.update({
      where: { id: lead.id },
      data: {
        opportunityScore: scoreResult.score,
        pipelineStage: newStage,
        scoreBreakdown: {
          score: scoreResult.score,
          tier: scoreResult.tier,
          breakdown: scoreResult.breakdown,
          calculatedAt: new Date().toISOString(),
        } as unknown as Prisma.InputJsonValue,
      },
    });

    results.push({
      name: lead.name,
      oldScore: lead.opportunityScore,
      newScore: scoreResult.score,
      oldStage: lead.pipelineStage,
      newStage,
      breakdown: scoreResult.breakdown,
    });

    const emoji = newStage === "FARE_VIDEO" ? "🎬" : newStage === "WARM_LEAD" ? "👍" : "❄️";
    console.log(
      `[RECALC v3.4] ${emoji} ${lead.name}: ${lead.opportunityScore ?? "null"} → ${scoreResult.score} | ${lead.pipelineStage} → ${newStage} (${scoreResult.breakdown.join(", ")})`
    );
  }

  const stageChanges = results.filter(r => r.oldStage !== r.newStage).length;
  const scoreChanges = results.filter(r => r.oldScore !== r.newScore).length;

  console.log(
    `[RECALC v3.4] === DONE === ${leads.length} lead | ${scoreChanges} score cambiati | ${stageChanges} stage cambiati`
  );

  return NextResponse.json({
    total: leads.length,
    scoreChanges,
    stageChanges,
    results,
  });
}
