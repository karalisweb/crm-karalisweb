import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runGeminiAnalysis } from "@/lib/gemini-analysis";
import { isGeminiConfigured } from "@/lib/gemini";
import { extractStrategicData } from "@/lib/audit/strategic-extractor";
import { Prisma, PipelineStage } from "@prisma/client";
import {
  calculateLeadScore,
  extractScoreInputFromGeminiAnalysis,
} from "@/lib/scoring/lead-score";
import {
  buildMetaAdLibraryUrl,
  buildGoogleAdsTransparencyUrl,
} from "@/lib/ads-intelligence";
import { validatePublicUrl } from "@/lib/url-validator";

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
};

// Delay tra chiamate Gemini (ms) — evita rate limiting
const DELAY_BETWEEN_CALLS_MS = 3000;

/**
 * POST /api/cron/batch-gemini-analysis
 *
 * MSD Engine v3.1 — BATCH NOTTURNO
 *
 * Flusso per ogni lead:
 * 1. Scarica HTML homepage
 * 2. Estrae testi (home/about/services) + cliché detection
 * 3. Legge ads_status dal DB (se già verificato)
 * 4. Chiama Gemini → genera script 4 atti
 * 5. Calcola score (0-100)
 * 6. Auto-classifica: HOT_LEAD (≥80) / WARM_LEAD (50-79) / COLD_LEAD (<50)
 * 7. Se sito non raggiungibile → DA_VERIFICARE
 *
 * Query params:
 * - force=true → rigenera anche lead con analisi v3.1 esistente
 * - limit=N → processa max N lead (default 20)
 *
 * Protetto da CRON_SECRET.
 */
export async function POST(request: NextRequest) {
  // Auth
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isGeminiConfigured()) {
    return NextResponse.json(
      { error: "Gemini API key non configurata" },
      { status: 400 }
    );
  }

  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "true";
  const limitParam = searchParams.get("limit");
  const maxLeads = limitParam ? parseInt(limitParam, 10) : 20;

  // Trova lead da processare
  const leads = await db.lead.findMany({
    where: {
      website: { not: null },
      // Solo lead in stage iniziali (non quelli già in pipeline avanzata)
      pipelineStage: {
        in: [
          PipelineStage.DA_ANALIZZARE,
          PipelineStage.HOT_LEAD,
          PipelineStage.WARM_LEAD,
          PipelineStage.COLD_LEAD,
        ],
      },
      ...(force
        ? {}
        : {
            OR: [
              { geminiAnalysis: { equals: Prisma.DbNull } },
              {
                NOT: {
                  geminiAnalysis: {
                    path: ["analysisVersion"],
                    equals: "3.1-strict",
                  },
                },
              },
            ],
          }),
    },
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
      googleRating: true,
      googleReviewsCount: true,
      tierOverride: true,
    },
    take: maxLeads,
    orderBy: { createdAt: "desc" },
  });

  console.log(
    `[BATCH v3.1] Avvio su ${leads.length} lead (force=${force}, limit=${maxLeads})`
  );

  const results: Array<{
    id: string;
    name: string;
    status: "ok" | "error" | "skip" | "unreachable";
    score?: number;
    stage?: string;
    error?: string;
  }> = [];

  for (const lead of leads) {
    try {
      if (!lead.website) {
        results.push({ id: lead.id, name: lead.name, status: "skip", error: "No website" });
        continue;
      }

      let url = lead.website;
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = "https://" + url;
      }

      // === STEP 1: Fetch HTML ===
      let html: string;
      try {
        validatePublicUrl(url);
        const response = await fetch(url, {
          signal: AbortSignal.timeout(15000),
          headers: FETCH_HEADERS,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        html = await response.text();
      } catch (fetchErr) {
        const msg = fetchErr instanceof Error ? fetchErr.message : "Fetch error";
        // Sito non raggiungibile — resta DA_ANALIZZARE, logga errore
        results.push({
          id: lead.id,
          name: lead.name,
          status: "unreachable",
          stage: "DA_ANALIZZARE",
          error: msg,
        });
        console.log(`[BATCH v3.1] 🔴 ${lead.name}: sito non raggiungibile (${msg})`);
        continue;
      }

      const baseUrl = new URL(url).origin;

      // === STEP 2: Estrazione strategica ===
      const strategicData = await extractStrategicData(html, baseUrl, lead.name);

      const totalText = [
        strategicData.home_text,
        strategicData.about_text,
        strategicData.services_text,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();

      if (totalText.length < 10) {
        results.push({
          id: lead.id,
          name: lead.name,
          status: "error",
          stage: "DA_ANALIZZARE",
          error: `Testo insufficiente (${totalText.length}ch)`,
        });
        console.log(`[BATCH v3.1] 🔴 ${lead.name}: testo insufficiente (${totalText.length}ch)`);
        continue;
      }

      // === STEP 3: Determina ads_status dal DB ===
      let adsStatus: "CONFIRMED" | "NOT_FOUND" | "API_ERROR" | "PENDING" = "PENDING";
      if (lead.adsCheckedAt) {
        adsStatus = (lead.hasActiveGoogleAds || lead.hasActiveMetaAds)
          ? "CONFIRMED"
          : "NOT_FOUND";
      }

      // === STEP 4: Gemini Analysis ===
      const geminiInput = {
        company_name: lead.name,
        home_text: strategicData.home_text,
        about_text: strategicData.about_text,
        services_text: strategicData.services_text,
        ads_status: adsStatus,
        landing_page_text: lead.landingPageText || null,
        landing_page_url: lead.landingPageUrl || null,
        google_ad_copy: lead.googleAdsCopy || null,
        meta_ads_copy: lead.metaAdsCopy ? [lead.metaAdsCopy] : [],
      };

      const analysis = await runGeminiAnalysis(geminiInput);

      // Inietta tracking tools REALI dallo strategic-extractor
      // (Gemini ritorna ads_networks_found: [] — fix: usiamo dati reali)
      analysis.ads_networks_found = strategicData.tracking_tools_found || [];

      // Aggiungi URL librerie ads
      const cleanDomain = (lead.website || "").replace(/^https?:\/\//, "").replace(/^www\./, "");
      analysis.ad_library_url = buildMetaAdLibraryUrl(lead.name);
      analysis.google_ads_transparency_url = buildGoogleAdsTransparencyUrl(cleanDomain);

      // === STEP 5: Calcolo score ===
      const scoreInput = extractScoreInputFromGeminiAnalysis(analysis, lead.category ?? null, {
        googleReviewsCount: lead.googleReviewsCount,
        googleRating: lead.googleRating,
        tierOverride: lead.tierOverride,
        hasActiveGoogleAds: lead.hasActiveGoogleAds,
        hasActiveMetaAds: lead.hasActiveMetaAds,
        adsCheckedAt: lead.adsCheckedAt,
      });
      const scoreResult = calculateLeadScore(scoreInput);

      // === STEP 6: Auto-classificazione (v3.5: ≥80 → HOT_LEAD, tu decidi se fare video) ===
      let newStage: PipelineStage;
      if (scoreResult.score >= 80) {
        newStage = PipelineStage.HOT_LEAD;
      } else if (scoreResult.score >= 50) {
        newStage = PipelineStage.WARM_LEAD;
      } else {
        newStage = PipelineStage.COLD_LEAD;
      }

      // === STEP 7: Salva tutto ===
      await db.lead.update({
        where: { id: lead.id },
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
          pipelineStage: newStage,
          // Salva testi estratti in audit_data per evidenze
          auditData: {
            home_text: strategicData.home_text,
            about_text: strategicData.about_text,
            services_text: strategicData.services_text,
            cliche_status: strategicData.cliche_status,
            cliches_found: strategicData.cliches_found,
            tracking_tools: strategicData.tracking_tools_found,
            extracted_at: new Date().toISOString(),
          } as unknown as Prisma.InputJsonValue,
        },
      });

      results.push({
        id: lead.id,
        name: lead.name,
        status: "ok",
        score: scoreResult.score,
        stage: newStage,
      });

      const emoji = newStage === "HOT_LEAD" ? "🔥" : newStage === "WARM_LEAD" ? "👍" : "❄️";
      console.log(
        `[BATCH v3.1] ${emoji} ${lead.name} — score=${scoreResult.score} → ${newStage} (${scoreResult.breakdown.join(", ")})`
      );

      // Pausa tra chiamate
      await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_CALLS_MS));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      results.push({ id: lead.id, name: lead.name, status: "error", error: msg });
      console.log(`[BATCH v3.1] ❌ ${lead.name}: ${msg}`);
    }
  }

  // === SUMMARY ===
  const ok = results.filter((r) => r.status === "ok").length;
  const errors = results.filter((r) => r.status === "error").length;
  const unreachable = results.filter((r) => r.status === "unreachable").length;
  const skipped = results.filter((r) => r.status === "skip").length;
  const hotLeads = results.filter((r) => r.stage === "HOT_LEAD").length;
  const warmLeads = results.filter((r) => r.stage === "WARM_LEAD").length;

  const summary = {
    total: leads.length,
    ok,
    errors,
    unreachable,
    skipped,
    hotLeads,
    warmLeads,
    results,
  };

  console.log(
    `[BATCH v3.1] ======= COMPLETATO =======\n` +
    `  Processati: ${ok}/${leads.length}\n` +
    `  🔥 HOT_LEAD: ${hotLeads} | 👍 WARM: ${warmLeads}\n` +
    `  🔴 Non raggiungibili: ${unreachable}\n` +
    `  ❌ Errori: ${errors} | ⏭ Skip: ${skipped}`
  );

  return NextResponse.json(summary);
}
