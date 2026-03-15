import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma, PipelineStage } from "@prisma/client";
import { calculateLeadScore, extractScoreInputFromGeminiAnalysis } from "@/lib/scoring/lead-score";

/**
 * PATCH /api/leads/[id]/ads-override
 *
 * v3.4 — Verifica manuale separata Google Ads / Meta Ads.
 * Usa scoring v3.1 con tierOverride, tracking bonus, reviews bonus.
 *
 * Body: { googleAds?: boolean | null, metaAds?: boolean | null }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { googleAds, metaAds } = body;

    if (googleAds === undefined && metaAds === undefined) {
      return NextResponse.json(
        { error: "Serve almeno googleAds o metaAds" },
        { status: 400 }
      );
    }

    const lead = await db.lead.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        category: true,
        geminiAnalysis: true,
        pipelineStage: true,
        opportunityScore: true,
        hasActiveGoogleAds: true,
        hasActiveMetaAds: true,
        googleRating: true,
        googleReviewsCount: true,
        tierOverride: true,
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead non trovato" }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const analysis = (lead.geminiAnalysis || {}) as any;

    // Determina nuovi valori
    const newGoogle = googleAds !== undefined ? (googleAds === true) : lead.hasActiveGoogleAds;
    const newMeta = metaAds !== undefined ? (metaAds === true) : lead.hasActiveMetaAds;
    const hasActiveAds = newGoogle || newMeta;

    // Aggiorna nella geminiAnalysis
    analysis.has_active_ads = hasActiveAds;
    analysis.ads_override = {
      googleAds: googleAds !== undefined ? googleAds : (analysis.ads_override?.googleAds ?? null),
      metaAds: metaAds !== undefined ? metaAds : (analysis.ads_override?.metaAds ?? null),
      verifiedAt: new Date().toISOString(),
    };

    // Ricalcola score — passa i NUOVI valori ads verificati
    const scoreInput = extractScoreInputFromGeminiAnalysis(analysis, lead.category, {
      googleReviewsCount: lead.googleReviewsCount,
      googleRating: lead.googleRating,
      tierOverride: lead.tierOverride,
      hasActiveGoogleAds: newGoogle,
      hasActiveMetaAds: newMeta,
      adsVerifiedManually: true,
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

    // Salva tutto
    await db.lead.update({
      where: { id },
      data: {
        hasActiveGoogleAds: newGoogle,
        hasActiveMetaAds: newMeta,
        adsVerifiedManually: true,
        adsCheckedAt: new Date(),
        geminiAnalysis: analysis as unknown as Prisma.InputJsonValue,
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
      `[ADS-OVERRIDE] ${lead.name}: google=${newGoogle}, meta=${newMeta}, score ${lead.opportunityScore} -> ${scoreResult.score}, stage ${lead.pipelineStage} -> ${newStage}`
    );

    return NextResponse.json({
      success: true,
      googleAds: newGoogle,
      metaAds: newMeta,
      oldScore: lead.opportunityScore,
      newScore: scoreResult.score,
      oldStage: lead.pipelineStage,
      newStage,
      breakdown: scoreResult.breakdown,
      tier: scoreResult.tier,
    });
  } catch (error) {
    console.error("[API] ads-override error:", error);
    const message = error instanceof Error ? error.message : "Errore";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
