import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma, PipelineStage } from "@prisma/client";
import { calculateLeadScore, extractScoreInputFromGeminiAnalysis } from "@/lib/scoring/lead-score";

/**
 * POST /api/leads/[id]/recalc-score
 *
 * Ricalcola lo score di un singolo lead dai dati esistenti nel DB.
 * Usa: geminiAnalysis, category, tierOverride, googleRating, googleReviewsCount.
 * Riclassifica pipeline stage se necessario.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const lead = await db.lead.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        category: true,
        geminiAnalysis: true,
        auditData: true,
        pipelineStage: true,
        opportunityScore: true,
        googleRating: true,
        googleReviewsCount: true,
        tierOverride: true,
        hasActiveGoogleAds: true,
        hasActiveMetaAds: true,
        adsVerifiedManually: true,
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead non trovato" }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const analysis = (lead.geminiAnalysis || {}) as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const audit = lead.auditData as any;

    // Fix: inietta tracking tools da auditData se ads_networks_found è vuoto
    if (
      analysis &&
      (!analysis.ads_networks_found || analysis.ads_networks_found.length === 0) &&
      audit?.tracking_tools?.length > 0
    ) {
      analysis.ads_networks_found = audit.tracking_tools;
      // Aggiorna anche nel DB
      await db.lead.update({
        where: { id },
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
      hasActiveGoogleAds: lead.hasActiveGoogleAds,
      hasActiveMetaAds: lead.hasActiveMetaAds,
      adsVerifiedManually: lead.adsVerifiedManually,
    });
    const scoreResult = calculateLeadScore(scoreInput);

    // Riclassifica (solo se in fasi iniziali)
    const classifiableStages: PipelineStage[] = [
      PipelineStage.DA_ANALIZZARE,
      PipelineStage.HOT_LEAD,
      PipelineStage.WARM_LEAD,
      PipelineStage.COLD_LEAD,
      PipelineStage.FARE_VIDEO,
    ];

    let newStage = lead.pipelineStage;
    if (classifiableStages.includes(lead.pipelineStage as PipelineStage)) {
      if (scoreResult.score >= 80) newStage = PipelineStage.HOT_LEAD;
      else if (scoreResult.score >= 50) newStage = PipelineStage.WARM_LEAD;
      else newStage = PipelineStage.COLD_LEAD;
    }

    await db.lead.update({
      where: { id },
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

    console.log(
      `[RECALC-SINGLE] ${lead.name}: score ${lead.opportunityScore} -> ${scoreResult.score}, stage ${lead.pipelineStage} -> ${newStage}`
    );

    return NextResponse.json({
      success: true,
      oldScore: lead.opportunityScore,
      newScore: scoreResult.score,
      oldStage: lead.pipelineStage,
      newStage,
      breakdown: scoreResult.breakdown,
      tier: scoreResult.tier,
    });
  } catch (error) {
    console.error("[API] recalc-score error:", error);
    const message = error instanceof Error ? error.message : "Errore";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
