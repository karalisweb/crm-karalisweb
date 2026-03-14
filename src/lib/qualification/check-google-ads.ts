/**
 * Modulo 2 — Verifica Google Ads (DataForSEO) + Landing Page Extraction
 *
 * Verifica se l'azienda ha campagne Google Ads attive usando
 * DataForSEO SERP API — endpoint ads_search.
 *
 * SE trova annunci, estrae:
 * - URL landing page dell'annuncio
 * - Copy dell'annuncio (title + description)
 * - Testo della landing page (via Cheerio scraping)
 *
 * Fail-safe: se credito esaurito, timeout o errore, ritorna gracefully
 * senza bloccare il CRM.
 */

import * as cheerio from "cheerio";
import type { GoogleAdsCheckResult } from "@/types/qualification";

const DATAFORSEO_API_URL =
  "https://api.dataforseo.com/v3/serp/google/ads_search/live/advanced";

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
};

/**
 * Verifica se DataForSEO è configurato
 */
export function isDataForSEOConfigured(): boolean {
  return !!(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD);
}

/**
 * Scarica una landing page e ne estrae il testo visibile principale (max 2000 char).
 */
async function scrapeLandingPageText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(12000),
      headers: FETCH_HEADERS,
    });

    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);

    // Rimuovi noise
    $("nav, footer, aside, script, style, noscript, iframe, svg, " +
      "[class*='cookie'], [class*='popup'], [class*='modal']").remove();

    const parts: string[] = [];

    // Headings
    $("h1, h2, h3").slice(0, 10).each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 3) parts.push(text);
    });

    // Paragrafi significativi
    $("p").each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 15) parts.push(text);
    });

    // Liste
    $("li").slice(0, 15).each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 10) parts.push(`• ${text}`);
    });

    // Fallback: body text
    if (parts.length === 0) {
      const bodyText = $("body").text().replace(/\s+/g, " ").trim();
      if (bodyText.length > 20) parts.push(bodyText);
    }

    if (parts.length === 0) return null;

    const unique = [...new Set(parts)];
    const result = unique.join("\n\n");
    return result.length > 2000 ? result.substring(0, 2000) + "..." : result;
  } catch (err) {
    console.error(`[GOOGLE ADS] Errore scraping LP ${url}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Controlla se il dominio ha Google Ads attive tramite DataForSEO.
 * Se trova annunci, estrae landing page URL, copy e testo LP.
 */
export async function checkGoogleAds(
  domain: string
): Promise<GoogleAdsCheckResult> {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;

  // Se DataForSEO non è configurato, ritorna default (non blocca nulla)
  if (!login || !password) {
    console.log(
      `[GOOGLE ADS] DataForSEO non configurato, skip check per ${domain}`
    );
    return {
      google_ads_attive: false,
      numero_ads: 0,
      segnale: "nessuna ads (DataForSEO non configurato)",
      landing_page_url: null,
      landing_page_text: null,
      ad_copy: null,
    };
  }

  // Pulisci dominio
  const cleanDomain = domain
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0];

  const startTime = Date.now();

  try {
    const authHeader = Buffer.from(`${login}:${password}`).toString("base64");

    const response = await fetch(DATAFORSEO_API_URL, {
      method: "POST",
      signal: AbortSignal.timeout(15000),
      headers: {
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        {
          advertiser_domains: [cleanDomain],
          location_code: 2380, // Italia
          language_code: "it",
        },
      ]),
    });

    const latency = Date.now() - startTime;
    console.log(
      `[GOOGLE ADS] Risposta per ${cleanDomain}: ${response.status} (${latency}ms)`
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[GOOGLE ADS] HTTP error: ${response.status} - ${errorText}`);
      return {
        google_ads_attive: false,
        numero_ads: 0,
        segnale: "nessuna ads",
        errore: `HTTP ${response.status}`,
        landing_page_url: null,
        landing_page_text: null,
        ad_copy: null,
      };
    }

    const data = await response.json();

    // Verifica status code API DataForSEO
    const task = data?.tasks?.[0];
    if (!task || task.status_code !== 20000) {
      const statusMsg = task?.status_message || "Unknown error";
      console.error(`[GOOGLE ADS] API error: ${statusMsg}`);
      return {
        google_ads_attive: false,
        numero_ads: 0,
        segnale: "nessuna ads",
        errore: statusMsg,
        landing_page_url: null,
        landing_page_text: null,
        ad_copy: null,
      };
    }

    // Naviga in tasks[0].result[0].items
    const items = task.result?.[0]?.items;
    const numeroAds = Array.isArray(items) ? items.length : 0;
    const googleAdsAttive = numeroAds > 0;

    let segnale: string;
    let landingPageUrl: string | null = null;
    let adCopy: string | null = null;
    let landingPageText: string | null = null;

    if (googleAdsAttive && Array.isArray(items) && items.length > 0) {
      segnale = `🔴 spende in ads (${numeroAds} annunci trovati)`;

      // Estrai dati dal primo annuncio
      const firstAd = items[0];

      // Landing page URL — DataForSEO usa "url" o "displayed_link" o "domain"
      landingPageUrl = firstAd.url || firstAd.displayed_link || null;

      // Ad copy — title + description
      const adTitle = firstAd.title || "";
      const adDescription = firstAd.description || "";
      adCopy = [adTitle, adDescription].filter(Boolean).join(" — ") || null;

      console.log(
        `[GOOGLE ADS] ${cleanDomain}: LP=${landingPageUrl}, copy="${adCopy?.substring(0, 80)}..."`
      );

      // Scrape landing page text (se abbiamo l'URL)
      if (landingPageUrl) {
        // Assicurati che sia un URL completo
        if (!landingPageUrl.startsWith("http")) {
          landingPageUrl = "https://" + landingPageUrl;
        }
        landingPageText = await scrapeLandingPageText(landingPageUrl);
        console.log(
          `[GOOGLE ADS] LP text per ${cleanDomain}: ${landingPageText?.length ?? 0} chars`
        );
      }
    } else {
      segnale = "nessuna ads";
    }

    console.log(
      `[GOOGLE ADS] ${cleanDomain}: ${numeroAds} ads trovate (${Date.now() - startTime}ms)`
    );

    return {
      google_ads_attive: googleAdsAttive,
      numero_ads: numeroAds,
      segnale,
      landing_page_url: landingPageUrl,
      landing_page_text: landingPageText,
      ad_copy: adCopy,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    const errMsg =
      error instanceof Error ? error.message : "Errore sconosciuto";

    if (
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError")
    ) {
      console.error(`[GOOGLE ADS] Timeout per ${cleanDomain} (${latency}ms)`);
    } else {
      console.error(`[GOOGLE ADS] Errore per ${cleanDomain}:`, errMsg);
    }

    return {
      google_ads_attive: false,
      numero_ads: 0,
      segnale: "nessuna ads",
      errore: errMsg,
      landing_page_url: null,
      landing_page_text: null,
      ad_copy: null,
    };
  }
}
