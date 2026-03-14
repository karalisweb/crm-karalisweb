/**
 * Ads Intelligence Engine v3 — 100% Apify
 *
 * Motore unificato per rilevare Google Ads e Meta Ads.
 * Usa esclusivamente Apify (piano Free $5/mese).
 *
 * Strategia "camaleontica":
 * - Ogni chiamata Apify è wrappata in try/catch con timeout 45s
 * - Errori 402/429/timeout/Actor deprecato → graceful degradation
 * - Se Apify fallisce, i booleani restano false e l'app continua
 * - I dati vengono salvati nel DB lead (campi dedicati)
 *
 * Flusso:
 * 1. Google Ads → apify/google-search-scraper (paidResults)
 * 2. Meta Ads → Actor Meta Ad Library (testi annunci)
 * 3. Landing Page → Cheerio scrape del LP URL
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

// Actor IDs — aggiornabili senza riscrivere logica
const GOOGLE_SEARCH_ACTOR = "apify/google-search-scraper";
const META_ADS_ACTORS = [
  "curious_coder/facebook-ads-library-scraper",
  "apify/facebook-ads-scraper",
];

// ==========================================
// TIPI
// ==========================================

export interface AdsIntelligenceResult {
  // Google Ads
  hasActiveGoogleAds: boolean;
  googleAdsCopy: string | null;
  // Meta Ads
  hasActiveMetaAds: boolean;
  metaAdsCopy: string | null;
  // Landing Page
  landingPageUrl: string | null;
  landingPageText: string | null;
  // Coherence check
  adsCoherenceWarning: string | null;
  // Metadata
  errors: string[];
}

// ==========================================
// URL BUILDER (sempre disponibili, anche senza Apify)
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
// 1. GOOGLE ADS CHECK (via Google Search Scraper)
// ==========================================

interface GoogleAdsFound {
  hasAds: boolean;
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
      return { hasAds: false, adCopy: null, landingPageUrl: null };
    }

    const serp = items[0] as Record<string, unknown>;

    // Cerca paidResults (annunci Google Ads)
    const paidResults = (serp.paidResults || serp.paid_results || []) as Array<Record<string, unknown>>;

    if (!Array.isArray(paidResults) || paidResults.length === 0) {
      console.log(`[ADS-INTEL] Google: nessun annuncio a pagamento per "${companyName}"`);
      return { hasAds: false, adCopy: null, landingPageUrl: null };
    }

    // Filtra per dominio pertinente (opzionale ma riduce falsi positivi)
    const cleanDomain = domain.replace(/^www\./, "").toLowerCase();
    const relevantAd = paidResults.find((ad) => {
      const adUrl = ((ad.url || ad.displayedUrl || ad.link || "") as string).toLowerCase();
      return adUrl.includes(cleanDomain);
    }) || paidResults[0]; // fallback al primo se nessuno matcha esattamente

    const title = (relevantAd.title || "") as string;
    const description = (relevantAd.description || relevantAd.desc || "") as string;
    const adCopy = [title, description].filter(Boolean).join(" — ") || null;
    const landingPageUrl = (relevantAd.url || relevantAd.link || null) as string | null;

    console.log(
      `[ADS-INTEL] Google: ${paidResults.length} annunci trovati! LP=${landingPageUrl}, copy="${adCopy?.substring(0, 60)}..."`
    );

    return {
      hasAds: true,
      adCopy,
      landingPageUrl,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    handleApifyError("Google Ads", msg);
    return { hasAds: false, adCopy: null, landingPageUrl: null };
  }
}

// ==========================================
// 2. META ADS CHECK (via Meta Ad Library Scraper)
// ==========================================

interface MetaAdsFound {
  hasAds: boolean;
  adsCopy: string | null; // Primi 2-3 testi uniti
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
        return { hasAds: false, adsCopy: null };
      }

      // Estrai copy dei primi 3 annunci
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

      console.log(
        `[ADS-INTEL] Meta: ${items.length} annunci trovati! copy: ${copies.length} testi [${actorId}]`
      );

      return { hasAds: true, adsCopy };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      handleApifyError(`Meta Ads (${actorId})`, msg);
      continue; // Prova il prossimo actor
    }
  }

  // Tutti gli actor falliti
  return { hasAds: false, adsCopy: null };
}

// ==========================================
// 3. LANDING PAGE SCRAPER (Cheerio)
// ==========================================

async function scrapeLandingPageText(url: string): Promise<string | null> {
  try {
    // Normalizza URL
    let finalUrl = url;
    if (!finalUrl.startsWith("http")) {
      finalUrl = "https://" + finalUrl;
    }

    console.log(`[ADS-INTEL] Scraping LP: ${finalUrl}`);

    const response = await fetch(finalUrl, {
      signal: AbortSignal.timeout(LP_FETCH_TIMEOUT_MS),
      headers: FETCH_HEADERS,
    });

    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);

    // Rimuovi noise
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
// RESILIENZA: Error Handler Camaleonte
// ==========================================

function handleApifyError(module: string, errorMsg: string): void {
  // Categorizza l'errore per logging chiaro
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
    console.error(`[ADS-INTEL] ⚠️ ${module}: ACTOR DEPRECATO/NON TROVATO — ${errorMsg}`);
  } else {
    console.error(`[ADS-INTEL] ⚠️ ${module}: ERRORE GENERICO — ${errorMsg}`);
  }
  // MAI throw — graceful degradation sempre
}

// ==========================================
// ENTRY POINT: Analizza Ads per un Lead
// ==========================================

/**
 * Esegue l'analisi Ads Intelligence completa per un lead.
 * Asincrono, non blocca la UI. Salva risultati nel DB.
 *
 * @returns I dati trovati (anche se parziali/vuoti)
 */
export async function analyzeAdsForLead(
  leadId: string,
  companyName: string,
  domain: string
): Promise<AdsIntelligenceResult> {
  const result: AdsIntelligenceResult = {
    hasActiveGoogleAds: false,
    googleAdsCopy: null,
    hasActiveMetaAds: false,
    metaAdsCopy: null,
    landingPageUrl: null,
    landingPageText: null,
    adsCoherenceWarning: null,
    errors: [],
  };

  const apifyToken = process.env.APIFY_TOKEN;

  if (!apifyToken) {
    result.errors.push("APIFY_TOKEN non configurato");
    console.log(`[ADS-INTEL] Token Apify mancante, skip analisi per "${companyName}"`);
    await saveAdsResultsToDB(leadId, result);
    return result;
  }

  const client = new ApifyClient({ token: apifyToken });
  const cleanDomain = domain
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0];

  // Esegui Google Ads e Meta Ads in parallelo (non bloccante)
  const [googleResult, metaResult] = await Promise.allSettled([
    checkGoogleAdsViaApify(companyName, cleanDomain, client),
    checkMetaAdsViaApify(companyName, client),
  ]);

  // Processa risultati Google Ads
  if (googleResult.status === "fulfilled") {
    result.hasActiveGoogleAds = googleResult.value.hasAds;
    result.googleAdsCopy = googleResult.value.adCopy;
    result.landingPageUrl = googleResult.value.landingPageUrl;
  } else {
    result.errors.push(`Google Ads: ${googleResult.reason?.message || "errore"}`);
  }

  // Processa risultati Meta Ads
  if (metaResult.status === "fulfilled") {
    result.hasActiveMetaAds = metaResult.value.hasAds;
    result.metaAdsCopy = metaResult.value.adsCopy;
  } else {
    result.errors.push(`Meta Ads: ${metaResult.reason?.message || "errore"}`);
  }

  // Se abbiamo trovato una LP, scrape il testo
  if (result.landingPageUrl) {
    result.landingPageText = await scrapeLandingPageText(result.landingPageUrl);

    // URL Coherence check: confronta dominio LP con dominio lead
    try {
      const lpDomain = new URL(result.landingPageUrl).hostname.replace(/^www\./, "").toLowerCase();
      if (lpDomain !== cleanDomain.toLowerCase()) {
        result.adsCoherenceWarning = `Dominio LP (${lpDomain}) diverso dal sito (${cleanDomain}). L'annuncio potrebbe puntare a una pagina esterna.`;
      }
    } catch {
      // URL non valido, ignora
    }
  }

  // Salva risultati nel DB (mai throw)
  await saveAdsResultsToDB(leadId, result);

  console.log(
    `[ADS-INTEL] Completato per "${companyName}": ` +
    `Google=${result.hasActiveGoogleAds ? "SI" : "no"}, ` +
    `Meta=${result.hasActiveMetaAds ? "SI" : "no"}, ` +
    `LP=${result.landingPageUrl ? "SI" : "no"} ` +
    `(errori: ${result.errors.length})`
  );

  return result;
}

// ==========================================
// DB: Salva risultati Ads nel Lead
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
    console.error(`[ADS-INTEL] DB save error per lead ${leadId}:`, err instanceof Error ? err.message : err);
    // MAI throw — il DB failure non deve bloccare nulla
  }
}
