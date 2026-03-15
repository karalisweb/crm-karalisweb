import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runGeminiAnalysis } from "@/lib/gemini-analysis";
import { isGeminiConfigured } from "@/lib/gemini";
import { extractStrategicData } from "@/lib/audit/strategic-extractor";
import { Prisma } from "@prisma/client";
import { calculateLeadScore, extractScoreInputFromGeminiAnalysis } from "@/lib/scoring/lead-score";
import { buildMetaAdLibraryUrl, buildGoogleAdsTransparencyUrl } from "@/lib/ads-intelligence";

/**
 * POST /api/leads/[id]/gemini-analysis
 *
 * MSD Engine v3.1 — STRICT MODE:
 * 1. Scarica HTML, estrae testi (home/about/services)
 * 2. Cliché detection deterministica (PASS/FAIL)
 * 3. Legge dati Ads certificati dal DB (mai da tracking on-page)
 * 4. Invia a Gemini con ads_status deterministico
 * 5. Supporta manualOverride per testi inseriti a mano
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check manualOverride nel body (opzionale)
    let manualTexts: {
      home_text?: string;
      about_text?: string;
      services_text?: string;
    } | null = null;

    try {
      const body = await request.json();
      if (body.manualOverride) {
        manualTexts = body.manualOverride;
      }
    } catch {
      // No body or invalid JSON — normal flow
    }

    if (!isGeminiConfigured()) {
      return NextResponse.json(
        { error: "Gemini API key non configurata. Vai in Impostazioni > API & Token." },
        { status: 400 }
      );
    }

    const lead = await db.lead.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        website: true,
        category: true,
        hasActiveGoogleAds: true,
        hasActiveMetaAds: true,
        googleAdsCopy: true,
        metaAdsCopy: true,
        landingPageUrl: true,
        landingPageText: true,
        adsCheckedAt: true,
        adsVerifiedManually: true,
        googleRating: true,
        googleReviewsCount: true,
        tierOverride: true,
        geminiAnalysis: true,
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead non trovato" }, { status: 404 });
    }

    if (!lead.website && !manualTexts) {
      return NextResponse.json(
        { error: "Sito web mancante e nessun testo manuale fornito." },
        { status: 400 }
      );
    }

    let home_text: string;
    let about_text: string | null = null;
    let services_text: string | null = null;
    let cliche_status: "PASS" | "FAIL" | "ERROR" = "ERROR";
    let cliches_found: Array<{ phrase: string; tag: string; context: string }> = [];
    let tracking_tools: string[] = [];

    if (manualTexts) {
      // === MANUAL OVERRIDE ===
      home_text = manualTexts.home_text || "";
      about_text = manualTexts.about_text || null;
      services_text = manualTexts.services_text || null;
      cliche_status = "PASS"; // Override manuale = bypass cliché check
    } else {
      // === SCRAPING AUTOMATICO ===
      let url = lead.website!;
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = "https://" + url;
      }

      let html: string;
      try {
        const response = await fetch(url, {
          signal: AbortSignal.timeout(15000),
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        html = await response.text();
      } catch (fetchErr) {
        const msg = fetchErr instanceof Error ? fetchErr.message : "Errore sconosciuto";
        return NextResponse.json({
          error: `Impossibile raggiungere il sito: ${msg}`,
          cliche_status: "ERROR",
          manual_check_required: true,
        }, { status: 400 });
      }

      const baseUrl = new URL(url).origin;
      const strategicData = await extractStrategicData(html, baseUrl, lead.name);

      home_text = strategicData.home_text;
      about_text = strategicData.about_text;
      services_text = strategicData.services_text;
      cliche_status = strategicData.cliche_status;
      cliches_found = strategicData.cliches_found;
      tracking_tools = strategicData.tracking_tools_found;

      const totalText = [home_text, about_text, services_text].filter(Boolean).join(" ").trim();
      if (totalText.length < 10) {
        return NextResponse.json({
          error: "Testo insufficiente dal sito. Usa l'override manuale.",
          cliche_status: "ERROR",
          manual_check_required: true,
        }, { status: 400 });
      }
    }

    // Determina ads_status — SOLO dalla verifica manuale
    let adsStatus: "CONFIRMED" | "NOT_FOUND" | "API_ERROR" | "PENDING" = "PENDING";
    if (lead.adsVerifiedManually) {
      if (lead.hasActiveGoogleAds || lead.hasActiveMetaAds) {
        adsStatus = "CONFIRMED";
      } else {
        adsStatus = "NOT_FOUND";
      }
    }

    // Input Gemini — NO travaso testi, NO has_active_ads da tracking
    const geminiInput = {
      company_name: lead.name,
      home_text,
      about_text,
      services_text,
      ads_status: adsStatus,
      landing_page_text: lead.landingPageText || null,
      landing_page_url: lead.landingPageUrl || null,
      google_ad_copy: lead.googleAdsCopy || null,
      meta_ads_copy: lead.metaAdsCopy ? [lead.metaAdsCopy] : [],
    };

    const analysis = await runGeminiAnalysis(geminiInput);

    // Inietta tracking tools REALI dallo strategic-extractor
    analysis.ads_networks_found = tracking_tools || [];

    const cleanDomain = (lead.website || "").replace(/^https?:\/\//, "").replace(/^www\./, "");
    analysis.ad_library_url = buildMetaAdLibraryUrl(lead.name);
    analysis.google_ads_transparency_url = buildGoogleAdsTransparencyUrl(cleanDomain);

    // Preserva ads_override e has_active_ads dalla vecchia analisi (sopravvive a rigenerazione)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const oldAnalysis = lead.geminiAnalysis as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const analysisAny = analysis as any;
    if (oldAnalysis?.ads_override) {
      analysisAny.ads_override = oldAnalysis.ads_override;
    }
    if (lead.adsVerifiedManually) {
      analysisAny.has_active_ads = lead.hasActiveGoogleAds || lead.hasActiveMetaAds;
    }

    const scoreInput = extractScoreInputFromGeminiAnalysis(analysis, lead.category ?? null, {
      googleReviewsCount: lead.googleReviewsCount,
      googleRating: lead.googleRating,
      tierOverride: lead.tierOverride,
      hasActiveGoogleAds: lead.hasActiveGoogleAds,
      hasActiveMetaAds: lead.hasActiveMetaAds,
      adsVerifiedManually: lead.adsVerifiedManually,
    });
    const scoreResult = calculateLeadScore(scoreInput);

    await db.lead.update({
      where: { id },
      data: {
        geminiAnalysis: analysis as unknown as Prisma.InputJsonValue,
        geminiAnalyzedAt: new Date(),
        opportunityScore: scoreResult.score,
        scoreBreakdown: {
          score: scoreResult.score,
          tier: scoreResult.tier,
          breakdown: scoreResult.breakdown,
          calculatedAt: new Date().toISOString(),
        } as unknown as Prisma.InputJsonValue,
      },
    });

    console.log(
      `[GEMINI v3.1] ${lead.name}: score=${scoreResult.score}, cliche=${cliche_status}, ads=${adsStatus}`
    );

    return NextResponse.json({
      success: true,
      analysis,
      evidence: {
        cliche_status,
        cliches_found,
        tracking_tools,
        ads_status: adsStatus,
        home_text_length: home_text.length,
        about_text_length: about_text?.length ?? 0,
        services_text_length: services_text?.length ?? 0,
      },
    });
  } catch (error) {
    console.error("[API] gemini-analysis error:", error);
    const message = error instanceof Error ? error.message : "Errore nell'analisi AI";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
