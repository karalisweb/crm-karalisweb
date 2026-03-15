import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma, PipelineStage } from "@prisma/client";
import { calculateLeadScore, extractScoreInputFromGeminiAnalysis, IndustryTier } from "@/lib/scoring/lead-score";

/**
 * PATCH /api/leads/[id]/tier-override
 *
 * Override manuale del tier settore.
 *
 * Body: { tier: "high_ticket" | "standard" | "low_ticket" }
 *
 * Salva tierOverride, ricalcola score e riclassifica pipeline.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { tier } = body;

    const validTiers: IndustryTier[] = ["high_ticket", "standard", "low_ticket"];
    if (!tier || !validTiers.includes(tier)) {
      return NextResponse.json(
        { error: "Tier non valido. Valori: high_ticket, standard, low_ticket" },
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

    // Ricalcola score con il nuovo tier
    const scoreInput = extractScoreInputFromGeminiAnalysis(analysis, lead.category, {
      googleReviewsCount: lead.googleReviewsCount,
      googleRating: lead.googleRating,
      tierOverride: tier,
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
      if (scoreResult.score >= 80) newStage = PipelineStage.FARE_VIDEO;
      else if (scoreResult.score >= 50) newStage = PipelineStage.WARM_LEAD;
      else newStage = PipelineStage.COLD_LEAD;
    }

    // Salva
    await db.lead.update({
      where: { id },
      data: {
        tierOverride: tier,
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
      `[TIER-OVERRIDE] ${lead.name}: tier=${tier}, score ${lead.opportunityScore} -> ${scoreResult.score}, stage ${lead.pipelineStage} -> ${newStage}`
    );

    return NextResponse.json({
      success: true,
      tier,
      oldScore: lead.opportunityScore,
      newScore: scoreResult.score,
      oldStage: lead.pipelineStage,
      newStage,
      breakdown: scoreResult.breakdown,
    });
  } catch (error) {
    console.error("[API] tier-override error:", error);
    const message = error instanceof Error ? error.message : "Errore";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
