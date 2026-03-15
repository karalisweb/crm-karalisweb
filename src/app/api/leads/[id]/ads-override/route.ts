import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma, PipelineStage } from "@prisma/client";
import { calculateLeadScore, extractScoreInputFromGeminiAnalysis } from "@/lib/scoring/lead-score";

/**
 * PATCH /api/leads/[id]/ads-override
 *
 * Override manuale dello stato Ads di un lead.
 * Usato quando l'utente verifica manualmente su Meta Ad Library / Google Ads Transparency
 * e trova che le ads rilevate non sono corrette.
 *
 * Body: { hasActiveAds: boolean }
 *
 * Dopo l'override:
 * 1. Aggiorna i campi ads nel DB
 * 2. Aggiorna has_active_ads nella geminiAnalysis
 * 3. Ricalcola score con i nuovi dati
 * 4. Riclassifica pipeline stage
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { hasActiveAds } = body;

    if (typeof hasActiveAds !== "boolean") {
      return NextResponse.json(
        { error: "hasActiveAds deve essere un booleano" },
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
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead non trovato" }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const analysis = (lead.geminiAnalysis || {}) as any;

    // 1. Aggiorna has_active_ads nella geminiAnalysis
    analysis.has_active_ads = hasActiveAds;
    analysis.ads_override = {
      overriddenAt: new Date().toISOString(),
      overriddenTo: hasActiveAds,
      reason: hasActiveAds ? "Verificato: ads attive" : "Verificato: nessuna ad trovata",
    };

    // 2. Ricalcola score
    const scoreInput = extractScoreInputFromGeminiAnalysis(analysis, lead.category);
    const scoreResult = calculateLeadScore(scoreInput);

    // 3. Riclassifica (solo se in fasi iniziali)
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

    // 4. Salva tutto
    await db.lead.update({
      where: { id },
      data: {
        hasActiveGoogleAds: hasActiveAds ? lead.pipelineStage === lead.pipelineStage : false, // reset
        hasActiveMetaAds: false,
        // Se override a false, pulisci anche i dati ads
        ...(!hasActiveAds && {
          hasActiveGoogleAds: false,
          hasActiveMetaAds: false,
          googleAdsCopy: null,
          metaAdsCopy: null,
          landingPageUrl: null,
          landingPageText: null,
        }),
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
      `[ADS-OVERRIDE] ${lead.name}: ads=${hasActiveAds}, score ${lead.opportunityScore} → ${scoreResult.score}, stage ${lead.pipelineStage} → ${newStage}`
    );

    return NextResponse.json({
      success: true,
      oldScore: lead.opportunityScore,
      newScore: scoreResult.score,
      oldStage: lead.pipelineStage,
      newStage,
      breakdown: scoreResult.breakdown,
    });
  } catch (error) {
    console.error("[API] ads-override error:", error);
    const message = error instanceof Error ? error.message : "Errore";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
