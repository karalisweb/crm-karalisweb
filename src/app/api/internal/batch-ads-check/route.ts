import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PipelineStage, Prisma } from "@prisma/client";
import {
  analyzeAdsForLead,
  getCircuitBreakerStatus,
  resetCircuitBreaker,
} from "@/lib/ads-intelligence";

/**
 * POST /api/internal/batch-ads-check
 *
 * Lancia il check Ads Intelligence (Google SERP + Meta Ad Library)
 * per tutti i lead analizzati che non hanno ancora adsCheckedAt.
 *
 * Query params:
 * - force=true → ricontrolla anche lead già verificati
 * - limit=N → max lead (default 50)
 * - delay=N → ms tra chiamate (default 5000)
 *
 * ATTENZIONE: ogni lead fa 2 chiamate Apify (Google + Meta).
 * Con 50 lead = ~100 chiamate Apify.
 *
 * Protetto da CRON_SECRET.
 */

const DEFAULT_DELAY_MS = 5000;

export async function POST(request: NextRequest) {
  // Auth
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.CRON_SECRET;
  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "true";
  const limitParam = searchParams.get("limit");
  const delayParam = searchParams.get("delay");
  const maxLeads = limitParam ? parseInt(limitParam, 10) : 50;
  const delayMs = delayParam ? parseInt(delayParam, 10) : DEFAULT_DELAY_MS;

  // Reset circuit breaker all'inizio del batch
  resetCircuitBreaker();

  // Trova lead da analizzare
  const leads = await db.lead.findMany({
    where: {
      website: { not: null },
      NOT: { geminiAnalysis: { equals: Prisma.DbNull } },
      pipelineStage: {
        in: [
          PipelineStage.DA_ANALIZZARE,
          PipelineStage.HOT_LEAD,
          PipelineStage.WARM_LEAD,
          PipelineStage.COLD_LEAD,
          PipelineStage.FARE_VIDEO,
        ],
      },
      ...(force ? {} : { adsCheckedAt: null }),
    },
    select: {
      id: true,
      name: true,
      website: true,
    },
    take: maxLeads,
    orderBy: { opportunityScore: "desc" },
  });

  console.log(
    `[BATCH-ADS] Avvio check Ads per ${leads.length} lead (force=${force}, limit=${maxLeads}, delay=${delayMs}ms)`
  );

  if (leads.length === 0) {
    return NextResponse.json({
      message: "Nessun lead da verificare",
      total: 0,
    });
  }

  const results: Array<{
    id: string;
    name: string;
    status: "ok" | "error" | "circuit_broken";
    google?: string;
    meta?: string;
    error?: string;
  }> = [];

  for (const lead of leads) {
    // Check circuit breaker prima di ogni chiamata
    const cb = getCircuitBreakerStatus();
    if (cb.broken) {
      console.error(
        `[BATCH-ADS] ⛔ Circuit breaker attivo dopo ${cb.failures} errori. Stop batch.`
      );
      results.push({
        id: lead.id,
        name: lead.name,
        status: "circuit_broken",
        error: `Circuit breaker: ${cb.failures} errori consecutivi`,
      });
      // Aggiungi i rimanenti come circuit_broken
      const remaining = leads.slice(leads.indexOf(lead) + 1);
      for (const r of remaining) {
        results.push({
          id: r.id,
          name: r.name,
          status: "circuit_broken",
          error: "Skipped (circuit breaker)",
        });
      }
      break;
    }

    try {
      const domain = lead
        .website!.replace(/^https?:\/\//, "")
        .replace(/^www\./, "")
        .split("/")[0];

      const result = await analyzeAdsForLead(lead.id, lead.name, domain);

      results.push({
        id: lead.id,
        name: lead.name,
        status: "ok",
        google: result.hasActiveGoogleAds ? "ADS FOUND" : "no ads",
        meta: result.hasActiveMetaAds ? "ADS FOUND" : "no ads",
      });

      const gIcon = result.hasActiveGoogleAds ? "🟢" : "⚪";
      const mIcon = result.hasActiveMetaAds ? "🟢" : "⚪";
      console.log(
        `[BATCH-ADS] ${lead.name}: Google=${gIcon} Meta=${mIcon}`
      );

      // Delay tra chiamate per non sovraccaricare
      if (leads.indexOf(lead) < leads.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      results.push({
        id: lead.id,
        name: lead.name,
        status: "error",
        error: msg,
      });
      console.error(`[BATCH-ADS] ❌ ${lead.name}: ${msg}`);
    }
  }

  const ok = results.filter((r) => r.status === "ok").length;
  const errors = results.filter((r) => r.status === "error").length;
  const broken = results.filter((r) => r.status === "circuit_broken").length;
  const withGoogleAds = results.filter((r) => r.google === "ADS FOUND").length;
  const withMetaAds = results.filter((r) => r.meta === "ADS FOUND").length;

  console.log(
    `[BATCH-ADS] === DONE === ${ok}/${leads.length} processati\n` +
      `  🟢 Google Ads: ${withGoogleAds} | Meta Ads: ${withMetaAds}\n` +
      `  ❌ Errori: ${errors} | ⛔ Circuit broken: ${broken}`
  );

  return NextResponse.json({
    total: leads.length,
    processed: ok,
    errors,
    circuitBroken: broken,
    withGoogleAds,
    withMetaAds,
    results,
  });
}
