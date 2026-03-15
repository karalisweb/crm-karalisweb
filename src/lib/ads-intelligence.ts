/**
 * Ads Intelligence Engine v4 — STRICT MODE
 *
 * RESET v3.1: Eliminati tutti i falsi positivi.
 * - Match SOLO su dominio esatto (no fallback a competitor)
 * - Se dominio non matcha → hasAds: false
 * - Circuit breaker: 3 errori consecutivi → sospendi coda
 * - ads_status certificato: CONFIRMED | NOT_FOUND | API_ERROR
 */

import { ApifyClient } from "apify-client";
import * as cheerio from "cheerio";
import { db } from "@/lib/db";

// ==========================================
// CONFIGURAZIONE
// ==========================================

const APIFY_TIMEOUT_SECONDS = 45;
const APIFY_MEMORY_MB = 512;
const LP_FETCH_TIMEOUT_MS = 12000;
const LP_MAX_TEXT_LENGTH = 2000;

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
};

const GOOGLE_SEARCH_ACTOR = "apify/google-search-scraper";
const META_ADS_ACTORS = [
  "curious_coder/facebook-ads-library-scraper",
  "apify/facebook-ads-scraper",
];

// ==========================================
// CIRCUIT BREAKER
// ==========================================

let consecutiveFailures = 0;
const CIRCUIT_BREAKER_THRESHOLD = 3;

function isCircuitBroken(): boolean {
  return consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD;
}

function recordSuccess(): void {
  consecutiveFailures = 0;
}

function recordFailure(): void {
  consecutiveFailures++;
  if (isCircuitBroken()) {
    console.error(
      `[ADS-INTEL] ⛔ CIRCUIT BREAKER ATTIVO: ${consecutiveFailures} errori consecutivi. ` +
      `Le chiamate Apify sono sospese. Risolvere il problema e riavviare l'app.`
    );
  }
}

export function resetCircuitBreaker(): void {
  consecutiveFailures = 0;
  console.log("[ADS-INTEL] Circuit breaker resettato.");
}

export function getCircuitBreakerStatus(): { broken: boolean; failures: number } {
  return { broken: isCircuitBroken(), failures: consecutiveFailures };
}

// ==========================================
// TIPI
// ==========================================

export type AdsStatus = "CONFIRMED" | "NOT_FOUND" | "API_ERROR" | "PENDING";

export interface AdsIntelligenceResult {
  hasActiveGoogleAds: boolean;
  googleAdsStatus: AdsStatus;
  googleAdsCopy: string | null;
  hasActiveMetaAds: boolean;
  metaAdsStatus: AdsStatus;
  metaAdsCopy: string | null;
  landingPageUrl: string | null;
  landingPageText: string | null;
  adsCoherenceWarning: string | null;
  errors: string[];
}

// ==========================================
// URL BUILDER
// ==========================================

export function buildMetaAdLibraryUrl(companyName: string): string {
  const params = new URLSearchParams({
    active_status: "active",
    ad_type: "all",
    country: "IT",
    search_type: "keyword_unordered",
    q: companyName,
  });
  return `https://www.facebook.com/ads/library/?${params.toString()}`;
}

export function buildGoogleAdsTransparencyUrl(domain: string): string {
  const clean = domain
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0];
  return `https://adstransparency.google.com/?domain=${encodeURIComponent(clean)}&region=IT`;
}

// ==========================================
// 1. GOOGLE ADS CHECK — STRICT DOMAIN MATCH
// ==========================================

interface GoogleAdsFound {
  hasAds: boolean;
  status: AdsStatus;
  adCopy: string | null;
  landingPageUrl: string | null;
}

async function checkGoogleAdsViaApify(
  companyName: string,
  domain: string,
  client: ApifyClient
): Promise<GoogleAdsFound> {
  try {
    console.log(`[ADS-INTEL] Google Ads check per "${companyName}" (${domain})...`);

    const run = await client.actor(GOOGLE_SEARCH_ACTOR).call(
      {
        queries: `${companyName} ${domain}`,
        resultsPerPage: 5,
        maxPagesPerQuery: 1,
        languageCode: "it",
        countryCode: "it",
        mobileResults: false,
        includeUnfilteredResults: false,
        saveHtml: false,
        saveHtmlToKeyValueStore: false,
      },
      {
        timeout: APIFY_TIMEOUT_SECONDS,
        memory: APIFY_MEMORY_MB,
      }
    );

    const { items } = await client
      .dataset(run.defaultDatasetId)
      .listItems({ limit: 1 });

    if (!items || items.length === 0) {
      console.log(`[ADS-INTEL] Google: nessun risultato SERP per "${companyName}"`);
      recordSuccess();
      return { hasAds: false, status: "NOT_FOUND", adCopy: null, landingPageUrl: null };
    }

    const serp = items[0] as Record<string, unknown>;
    const paidResults = (serp.paidResults || serp.paid_results || []) as Array<Record<string, unknown>>;

    if (!Array.isArray(paidResults) || paidResults.length === 0) {
      console.log(`[ADS-INTEL] Google: nessun annuncio a pagamento per "${companyName}"`);
      recordSuccess();
      return { hasAds: false, status: "NOT_FOUND", adCopy: null, landingPageUrl: null };
    }

    // STRICT: accetta SOLO annunci il cui URL contiene il dominio del lead
    const cleanDomain = domain.replace(/^www\./, "").toLowerCase();
    const matchingAd = paidResults.find((ad) => {
      const adUrl = ((ad.url || ad.displayedUrl || ad.link || "") as string).toLowerCase();
      return adUrl.includes(cleanDomain);
    });

    // NESSUN FALLBACK: se il dominio non matcha → NOT_FOUND
    if (!matchingAd) {
      console.log(
        `[ADS-INTEL] Google: ${paidResults.length} annunci nella SERP ma NESSUNO matcha "${cleanDomain}". SCARTATI.`
      );
      recordSuccess();
      return { hasAds: false, status: "NOT_FOUND", adCopy: null, landingPageUrl: null };
    }

    const title = (matchingAd.title || "") as string;
    const description = (matchingAd.description || matchingAd.desc || "") as string;
    const adCopy = [title, description].filter(Boolean).join(" — ") || null;
    const landingPageUrl = (matchingAd.url || matchingAd.link || null) as string | null;

    console.log(
      `[ADS-INTEL] Google: CONFERMATO per "${cleanDomain}" — LP=${landingPageUrl}`
    );

    recordSuccess();
    return { hasAds: true, status: "CONFIRMED", adCopy, landingPageUrl };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    handleApifyError("Google Ads", msg);
    recordFailure();
    return { hasAds: false, status: "API_ERROR", adCopy: null, landingPageUrl: null };
  }
}

// ==========================================
// 2. META ADS CHECK
// ==========================================

interface MetaAdsFound {
  hasAds: boolean;
  status: AdsStatus;
  adsCopy: string | null;
}

async function checkMetaAdsViaApify(
  companyName: string,
  client: ApifyClient
): Promise<MetaAdsFound> {
  const adLibraryUrl = buildMetaAdLibraryUrl(companyName);

  for (const actorId of META_ADS_ACTORS) {
    try {
      console.log(`[ADS-INTEL] Meta Ads check con "${actorId}" per "${companyName}"...`);

      const run = await client.actor(actorId).call(
        {
          startUrls: [{ url: adLibraryUrl }],
          resultsLimit: 5,
          activeStatus: "active",
        },
        {
          timeout: APIFY_TIMEOUT_SECONDS,
          memory: APIFY_MEMORY_MB,
        }
      );

      const { items } = await client
        .dataset(run.defaultDatasetId)
        .listItems({ limit: 5 });

      if (!items || items.length === 0) {
        console.log(`[ADS-INTEL] Meta: nessun annuncio per "${companyName}" [${actorId}]`);
        recordSuccess();
        return { hasAds: false, status: "NOT_FOUND", adsCopy: null };
      }

      const copies: string[] = [];
      for (const item of items.slice(0, 3)) {
        const ad = item as Record<string, unknown>;
        const body =
          (ad.adCreativeBody as string) ||
          (ad.ad_creative_body as string) ||
          (ad.body as string) ||
          (ad.text as string) ||
          null;
        if (body && body.length > 10) {
          copies.push(body.length > 200 ? body.substring(0, 200) + "..." : body);
        }
      }

      const adsCopy = copies.length > 0 ? copies.join(" | ") : null;
      recordSuccess();
      return { hasAds: true, status: "CONFIRMED", adsCopy };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      handleApifyError(`Meta Ads (${actorId})`, msg);
      recordFailure();
      continue;
    }
  }

  return { hasAds: false, status: "API_ERROR", adsCopy: null };
}

// ==========================================
// 3. LANDING PAGE SCRAPER
// ==========================================

async function scrapeLandingPageText(url: string): Promise<string | null> {
  try {
    let finalUrl = url;
    if (!finalUrl.startsWith("http")) finalUrl = "https://" + finalUrl;

    const response = await fetch(finalUrl, {
      signal: AbortSignal.timeout(LP_FETCH_TIMEOUT_MS),
      headers: FETCH_HEADERS,
    });

    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);

    $("nav, footer, aside, script, style, noscript, iframe, svg, " +
      "[class*='cookie'], [class*='popup'], [class*='modal']").remove();

    const parts: string[] = [];

    $("h1, h2, h3").slice(0, 10).each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 3) parts.push(text);
    });

    $("p").each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 15) parts.push(text);
    });

    $("li").slice(0, 15).each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 10) parts.push(`• ${text}`);
    });

    if (parts.length === 0) {
      const bodyText = $("body").text().replace(/\s+/g, " ").trim();
      if (bodyText.length > 20) parts.push(bodyText);
    }

    if (parts.length === 0) return null;

    const unique = [...new Set(parts)];
    const result = unique.join("\n\n");
    return result.length > LP_MAX_TEXT_LENGTH
      ? result.substring(0, LP_MAX_TEXT_LENGTH) + "..."
      : result;
  } catch (err) {
    console.error(`[ADS-INTEL] LP scrape error (${url}):`, err instanceof Error ? err.message : err);
    return null;
  }
}

// ==========================================
// ERROR HANDLER
// ==========================================

function handleApifyError(module: string, errorMsg: string): void {
  const isCredits = /402|compute units|billing|payment|insufficient/i.test(errorMsg);
  const isRateLimit = /429|rate limit|too many/i.test(errorMsg);
  const isTimeout = /timeout|abort|timed out/i.test(errorMsg);
  const isDeprecated = /deprecated|not found|404|does not exist/i.test(errorMsg);

  if (isCredits) {
    console.error(`[ADS-INTEL] ⚠️ ${module}: CREDITI ESAURITI — ${errorMsg}`);
  } else if (isRateLimit) {
    console.error(`[ADS-INTEL] ⚠️ ${module}: RATE LIMIT — ${errorMsg}`);
  } else if (isTimeout) {
    console.error(`[ADS-INTEL] ⚠️ ${module}: TIMEOUT — ${errorMsg}`);
  } else if (isDeprecated) {
    console.error(`[ADS-INTEL] ⚠️ ${module}: ACTOR DEPRECATO — ${errorMsg}`);
  } else {
    console.error(`[ADS-INTEL] ⚠️ ${module}: ERRORE GENERICO — ${errorMsg}`);
  }
}

// ==========================================
// ENTRY POINT
// ==========================================

export async function analyzeAdsForLead(
  leadId: string,
  companyName: string,
  domain: string
): Promise<AdsIntelligenceResult> {
  const result: AdsIntelligenceResult = {
    hasActiveGoogleAds: false,
    googleAdsStatus: "PENDING",
    googleAdsCopy: null,
    hasActiveMetaAds: false,
    metaAdsStatus: "PENDING",
    metaAdsCopy: null,
    landingPageUrl: null,
    landingPageText: null,
    adsCoherenceWarning: null,
    errors: [],
  };

  const apifyToken = process.env.APIFY_TOKEN;

  if (!apifyToken) {
    result.errors.push("APIFY_TOKEN non configurato");
    result.googleAdsStatus = "API_ERROR";
    result.metaAdsStatus = "API_ERROR";
    await saveAdsResultsToDB(leadId, result);
    return result;
  }

  if (isCircuitBroken()) {
    result.errors.push(`Circuit breaker attivo: ${consecutiveFailures} errori consecutivi.`);
    result.googleAdsStatus = "API_ERROR";
    result.metaAdsStatus = "API_ERROR";
    await saveAdsResultsToDB(leadId, result);
    return result;
  }

  const client = new ApifyClient({ token: apifyToken });
  const cleanDomain = domain
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0];

  const [googleResult, metaResult] = await Promise.allSettled([
    checkGoogleAdsViaApify(companyName, cleanDomain, client),
    checkMetaAdsViaApify(companyName, client),
  ]);

  if (googleResult.status === "fulfilled") {
    result.hasActiveGoogleAds = googleResult.value.hasAds;
    result.googleAdsStatus = googleResult.value.status;
    result.googleAdsCopy = googleResult.value.adCopy;
    result.landingPageUrl = googleResult.value.landingPageUrl;
  } else {
    result.errors.push(`Google Ads: ${googleResult.reason?.message || "errore"}`);
    result.googleAdsStatus = "API_ERROR";
  }

  if (metaResult.status === "fulfilled") {
    result.hasActiveMetaAds = metaResult.value.hasAds;
    result.metaAdsStatus = metaResult.value.status;
    result.metaAdsCopy = metaResult.value.adsCopy;
  } else {
    result.errors.push(`Meta Ads: ${metaResult.reason?.message || "errore"}`);
    result.metaAdsStatus = "API_ERROR";
  }

  // Scrape LP solo se confermata per il dominio giusto
  if (result.landingPageUrl && result.hasActiveGoogleAds) {
    result.landingPageText = await scrapeLandingPageText(result.landingPageUrl);
  }

  await saveAdsResultsToDB(leadId, result);

  console.log(
    `[ADS-INTEL] Completato per "${companyName}": ` +
    `Google=${result.googleAdsStatus}, Meta=${result.metaAdsStatus} ` +
    `(circuit: ${consecutiveFailures}/${CIRCUIT_BREAKER_THRESHOLD})`
  );

  return result;
}

// ==========================================
// DB SAVE
// ==========================================

async function saveAdsResultsToDB(
  leadId: string,
  result: AdsIntelligenceResult
): Promise<void> {
  try {
    await db.lead.update({
      where: { id: leadId },
      data: {
        hasActiveGoogleAds: result.hasActiveGoogleAds,
        hasActiveMetaAds: result.hasActiveMetaAds,
        googleAdsCopy: result.googleAdsCopy,
        metaAdsCopy: result.metaAdsCopy,
        landingPageUrl: result.landingPageUrl,
        landingPageText: result.landingPageText,
        adsCoherenceWarning: result.adsCoherenceWarning,
        adsCheckedAt: new Date(),
      },
    });
  } catch (err) {
    console.error(`[ADS-INTEL] DB save error:`, err instanceof Error ? err.message : err);
  }
}
