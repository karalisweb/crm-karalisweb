/**
 * Ads Evidence Detector
 * Rileva se un'azienda sta facendo advertising online
 * Combina segnali da: SERP (Google Search) + Landing Page
 */

import { ApifyClient } from "apify-client";
import type { AdsEvidenceLevel, SerpAdsResult } from "@/types/commercial";

const apifyClient = new ApifyClient({
  token: process.env.APIFY_TOKEN,
});

// Actor per Google Search SERP
const GOOGLE_SEARCH_ACTOR = "apify/google-search-scraper";

interface AdsEvidenceResult {
  level: AdsEvidenceLevel;
  reason: string;
  serpData?: SerpAdsResult;
  landingSignals: LandingAdsSignals;
}

interface LandingAdsSignals {
  hasGoogleAdsTag: boolean;
  googleAdsId: string | null;
  hasConversionTracking: boolean;
  hasRemarketingTag: boolean;
  hasFacebookPixel: boolean;
  fbPixelId: string | null;
  hasGclid: boolean;
  hasFbclid: boolean;
  hasConversionLinker: boolean;
  // GTM è un segnale importante: chi usa GTM probabilmente fa o ha fatto ads
  hasGTM: boolean;
  gtmId: string | null;
  // LinkedIn e TikTok ads
  hasLinkedInInsight: boolean;
  hasTikTokPixel: boolean;
}

/**
 * Estrae segnali ads dalla landing page (HTML gia' scaricato)
 */
export function detectLandingAdsSignals(html: string): LandingAdsSignals {
  // Google Ads tag (AW-XXXXXXX)
  const gadsMatch = html.match(/AW-\d{9,}/);
  const hasGoogleAdsTag = !!gadsMatch || /googleads\.g\.doubleclick\.net/.test(html);

  // Conversion tracking
  const hasConversionTracking =
    /gtag\s*\(\s*['"]event['"]\s*,\s*['"]conversion['"]/.test(html) ||
    /google_conversion_id/.test(html) ||
    /conversion_async\.js/.test(html);

  // Remarketing tag
  const hasRemarketingTag =
    /google_remarketing_only/.test(html) ||
    /googleadservices\.com\/pagead\/conversion/.test(html) ||
    /gtag.*remarketing/.test(html);

  // Facebook Pixel
  const fbMatch = html.match(/fbq\s*\(\s*['"]init['"]\s*,\s*['"](\d+)['"]/);
  const hasFacebookPixel =
    !!fbMatch || /connect\.facebook\.net.*fbevents\.js/.test(html);

  // Gclid/fbclid (parametri UTM da Google/Facebook ads)
  const hasGclid = /gclid=/.test(html) || /gclid/.test(html);
  const hasFbclid = /fbclid=/.test(html) || /fbclid/.test(html);

  // Conversion Linker (GTM per cross-domain tracking)
  const hasConversionLinker =
    /conversion_linker/.test(html) || /conversionLinker/.test(html);

  // Google Tag Manager - SEGNALE IMPORTANTE
  // Chi usa GTM probabilmente gestisce campagne ads (o lo ha fatto)
  const gtmMatch = html.match(/GTM-[A-Z0-9]{6,}/);
  const hasGTM = !!gtmMatch || /googletagmanager\.com\/gtm\.js/.test(html);

  // LinkedIn Insight Tag
  const hasLinkedInInsight =
    /snap\.licdn\.com/.test(html) || /linkedin\.com\/px/.test(html);

  // TikTok Pixel
  const hasTikTokPixel = /analytics\.tiktok\.com/.test(html);

  return {
    hasGoogleAdsTag,
    googleAdsId: gadsMatch?.[0] || null,
    hasConversionTracking,
    hasRemarketingTag,
    hasFacebookPixel,
    fbPixelId: fbMatch?.[1] || null,
    hasGclid,
    hasFbclid,
    hasConversionLinker,
    hasGTM,
    gtmId: gtmMatch?.[0] || null,
    hasLinkedInInsight,
    hasTikTokPixel,
  };
}

/**
 * Cerca il brand/dominio su Google per vedere se appare in paid
 * Usa Apify Google Search Scraper
 */
export async function checkSerpForAds(
  domain: string,
  brandName: string
): Promise<SerpAdsResult | null> {
  // Estrai nome dominio pulito
  const cleanDomain = domain
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0];

  // Query: cerca il brand name
  const query = brandName || cleanDomain.split(".")[0];

  // In mock mode, simula risposta
  if (!process.env.APIFY_TOKEN) {
    console.log("[MOCK] SERP check per:", query);
    // In mock, assumiamo nessun ads trovato
    return {
      domain: cleanDomain,
      foundInPaidResults: false,
      query,
      searchedAt: new Date().toISOString(),
    };
  }

  try {
    // Avvia ricerca su Google Italia
    const run = await apifyClient.actor(GOOGLE_SEARCH_ACTOR).call({
      queries: query,
      maxPagesPerQuery: 1,
      resultsPerPage: 10,
      languageCode: "it",
      countryCode: "it",
      mobileResults: false,
      includeUnfilteredResults: false,
      saveHtml: false,
      saveHtmlToKeyValueStore: false,
    }, {
      timeout: 60, // 60 secondi max
    });

    // Recupera risultati
    const dataset = await apifyClient
      .dataset(run.defaultDatasetId)
      .listItems();

    // Cerca il dominio nei risultati paid
    let foundInPaid = false;
    let paidPosition: number | undefined;

    for (const item of dataset.items) {
      const paidResults = (item.paidResults || []) as Array<{
        url?: string;
        displayedUrl?: string;
        position?: number;
      }>;

      for (const paid of paidResults) {
        const paidUrl = paid.url || paid.displayedUrl || "";
        if (paidUrl.toLowerCase().includes(cleanDomain.toLowerCase())) {
          foundInPaid = true;
          paidPosition = paid.position;
          break;
        }
      }

      if (foundInPaid) break;
    }

    return {
      domain: cleanDomain,
      foundInPaidResults: foundInPaid,
      paidPosition,
      query,
      searchedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[SERP CHECK] Errore:", error);
    return null;
  }
}

/**
 * Calcola il livello di ads evidence combinando SERP + landing
 */
export function calculateAdsEvidence(
  landingSignals: LandingAdsSignals,
  serpResult: SerpAdsResult | null
): AdsEvidenceResult {
  const reasons: string[] = [];

  // STRONG: Prova diretta di ads attive
  if (serpResult?.foundInPaidResults) {
    reasons.push(`Ads attive in SERP (query: "${serpResult.query}")`);
    return {
      level: "strong",
      reason: reasons.join(". "),
      serpData: serpResult,
      landingSignals,
    };
  }

  // STRONG: Conversion tracking attivo (significa ads attive che misurano)
  if (landingSignals.hasConversionTracking) {
    reasons.push("Conversion tracking Google Ads attivo");
    return {
      level: "strong",
      reason: reasons.join(". "),
      serpData: serpResult || undefined,
      landingSignals,
    };
  }

  // MEDIUM: Segnali indiretti ma significativi
  const mediumSignals: string[] = [];

  if (landingSignals.hasGoogleAdsTag) {
    mediumSignals.push(`Tag Google Ads presente (${landingSignals.googleAdsId})`);
  }
  if (landingSignals.hasRemarketingTag) {
    mediumSignals.push("Remarketing tag presente");
  }
  if (landingSignals.hasFacebookPixel) {
    mediumSignals.push(`Facebook Pixel presente (${landingSignals.fbPixelId})`);
  }
  if (landingSignals.hasGclid || landingSignals.hasFbclid) {
    mediumSignals.push("Tracciamento click ads (gclid/fbclid)");
  }
  if (landingSignals.hasConversionLinker) {
    mediumSignals.push("Conversion Linker attivo");
  }
  // LinkedIn e TikTok ads sono segnali medium
  if (landingSignals.hasLinkedInInsight) {
    mediumSignals.push("LinkedIn Insight Tag presente");
  }
  if (landingSignals.hasTikTokPixel) {
    mediumSignals.push("TikTok Pixel presente");
  }

  if (mediumSignals.length >= 2) {
    return {
      level: "medium",
      reason: mediumSignals.join(". "),
      serpData: serpResult || undefined,
      landingSignals,
    };
  }

  // WEAK: Un solo segnale indiretto O presenza di GTM
  // GTM indica che l'azienda ha infrastruttura per fare ads
  if (mediumSignals.length === 1) {
    return {
      level: "weak",
      reason: mediumSignals[0],
      serpData: serpResult || undefined,
      landingSignals,
    };
  }

  // GTM presente = WEAK (hanno infrastruttura, potrebbero fare/aver fatto ads)
  // Questo è il fix critico: GTM non deve andare in "none"
  if (landingSignals.hasGTM) {
    return {
      level: "weak",
      reason: `GTM presente (${landingSignals.gtmId}) - infrastruttura per ads/tracking avanzato`,
      serpData: serpResult || undefined,
      landingSignals,
    };
  }

  // NONE: Nessuna evidenza
  return {
    level: "none",
    reason: "Nessuna evidenza di advertising attivo",
    serpData: serpResult || undefined,
    landingSignals,
  };
}

/**
 * Funzione principale: analizza ads evidence completa
 */
export async function detectAdsEvidence(
  html: string,
  domain: string,
  brandName: string,
  skipSerp: boolean = false
): Promise<AdsEvidenceResult> {
  // 1. Analizza landing page
  const landingSignals = detectLandingAdsSignals(html);

  // 2. Se abbiamo gia' segnali forti dalla landing, skip SERP (risparmio costi)
  if (landingSignals.hasConversionTracking) {
    return calculateAdsEvidence(landingSignals, null);
  }

  // 3. Cerca in SERP (se non skip)
  let serpResult: SerpAdsResult | null = null;
  if (!skipSerp) {
    serpResult = await checkSerpForAds(domain, brandName);
  }

  // 4. Calcola livello finale
  return calculateAdsEvidence(landingSignals, serpResult);
}
