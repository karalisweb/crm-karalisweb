import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runGeminiAnalysis } from "@/lib/gemini-analysis";
import { isGeminiConfigured } from "@/lib/gemini";
import { extractStrategicData } from "@/lib/audit/strategic-extractor";
import { Prisma } from "@prisma/client";
import { calculateLeadScore, extractScoreInputFromGeminiAnalysis } from "@/lib/scoring/lead-score";
import { checkGoogleAds, isDataForSEOConfigured } from "@/lib/qualification/check-google-ads";
import { checkMetaAds, isMetaAdsConfigured, buildAdLibraryUrl, buildGoogleAdsTransparencyUrl } from "@/lib/qualification/check-meta-ads";

/**
 * POST /api/leads/[id]/gemini-analysis
 *
 * Esegue l'Analisi Strategica del Posizionamento v3:
 * 1. Scarica HTML del sito
 * 2. Deep scraping: home_text, about_text, services_text, has_active_ads
 * 3. Check Google Ads (DataForSEO) → landing page URL + text + ad copy
 * 4. Check Meta Ads (Apify) → meta_ads_copy
 * 5. Invia tutto a Gemini per generare il copione teleprompter
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!isGeminiConfigured()) {
      return NextResponse.json(
        {
          error:
            "Gemini API key non configurata. Vai in Impostazioni > API & Token.",
        },
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
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead non trovato" }, { status: 404 });
    }

    if (!lead.website) {
      return NextResponse.json(
        { error: "Sito web mancante. Impossibile analizzare." },
        { status: 400 }
      );
    }

    // 1. Fetch HTML del sito
    let url = lead.website;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    let html: string;
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(15000),
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      html = await response.text();
    } catch (fetchErr) {
      const msg =
        fetchErr instanceof Error ? fetchErr.message : "Errore sconosciuto";
      return NextResponse.json(
        { error: `Impossibile raggiungere il sito: ${msg}` },
        { status: 400 }
      );
    }

    const baseUrl = new URL(url).origin;
    const cleanDomain = baseUrl.replace(/^https?:\/\//, "").replace(/^www\./, "");

    // 2. Estrazione strategica (testo sito + ads detection on-page)
    const strategicData = await extractStrategicData(html, baseUrl, lead.name);

    // Se il testo della home è troppo corto, prova about/services come fallback
    const totalText = [
      strategicData.home_text,
      strategicData.about_text,
      strategicData.services_text,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    if (totalText.length < 10) {
      return NextResponse.json(
        {
          error:
            "Impossibile estrarre testo sufficiente dal sito. La homepage potrebbe essere vuota, protetta da JavaScript o bloccata.",
        },
        { status: 400 }
      );
    }

    if (!strategicData.home_text || strategicData.home_text.trim().length < 10) {
      strategicData.home_text =
        strategicData.about_text || strategicData.services_text || "";
    }

    // 3. Check Ads esterni (DataForSEO + Meta Ads) — in parallelo, non bloccanti
    console.log(`[ANALYSIS] ${lead.name}: avvio check ads esterni...`);

    const [googleAdsResult, metaAdsResult] = await Promise.allSettled([
      isDataForSEOConfigured()
        ? checkGoogleAds(cleanDomain)
        : Promise.resolve(null),
      isMetaAdsConfigured()
        ? checkMetaAds(lead.name, cleanDomain)
        : Promise.resolve(null),
    ]);

    const googleAds = googleAdsResult.status === "fulfilled" ? googleAdsResult.value : null;
    const metaAds = metaAdsResult.status === "fulfilled" ? metaAdsResult.value : null;

    console.log(
      `[ANALYSIS] ${lead.name}: GoogleAds=${googleAds?.google_ads_attive ? "SI" : "no"} (LP: ${googleAds?.landing_page_url ?? "N/A"}), ` +
      `MetaAds=${metaAds?.meta_ads_attive ? "SI" : "no"} (copy: ${metaAds?.meta_ads_copy?.length ?? 0})`
    );

    // 4. Prepara input Gemini con tutti i dati raccolti
    const geminiInput = {
      ...strategicData,
      // Sovrascrive has_active_ads se le API esterne confermano (union con on-page detection)
      has_active_ads: strategicData.has_active_ads ||
        (googleAds?.google_ads_attive ?? false) ||
        (metaAds?.meta_ads_attive ?? false),
      // Nuovi campi Ads Intelligence
      landing_page_text: googleAds?.landing_page_text ?? null,
      landing_page_url: googleAds?.landing_page_url ?? null,
      google_ad_copy: googleAds?.ad_copy ?? null,
      meta_ads_copy: metaAds?.meta_ads_copy ?? [],
    };

    // 5. Analisi Gemini
    const analysis = await runGeminiAnalysis(geminiInput);

    // Aggiungi URL di fallback per ricerca manuale
    analysis.ad_library_url = metaAds?.ad_library_url ?? buildAdLibraryUrl(lead.name);
    analysis.google_ads_transparency_url = buildGoogleAdsTransparencyUrl(cleanDomain);

    // 6. Calcola score e salva risultato
    const scoreInput = extractScoreInputFromGeminiAnalysis(analysis, lead.category ?? null);
    const scoreResult = calculateLeadScore(scoreInput);

    await db.lead.update({
      where: { id },
      data: {
        geminiAnalysis: analysis as unknown as Prisma.InputJsonValue,
        geminiAnalyzedAt: new Date(),
        opportunityScore: scoreResult.score,
      },
    });

    console.log(`[SCORING] ${lead.name}: score=${scoreResult.score} (${scoreResult.breakdown.join(", ")})`);

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error("[API] gemini-analysis error:", error);
    const message =
      error instanceof Error ? error.message : "Errore nell'analisi AI";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
