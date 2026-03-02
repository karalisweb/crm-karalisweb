/**
 * Modulo 2 — Verifica Google Ads (DataForSEO)
 *
 * Verifica se l'azienda ha campagne Google Ads attive usando
 * DataForSEO SERP API — endpoint ads_search (Google Ads Transparency Center).
 *
 * Autenticazione: HTTP Basic Auth con login/password DataForSEO.
 * Costo stimato: ~$0.003 per chiamata.
 */

import type { GoogleAdsCheckResult } from "@/types/qualification";

const DATAFORSEO_API_URL =
  "https://api.dataforseo.com/v3/serp/google/ads_search/live/advanced";

/**
 * Verifica se DataForSEO è configurato
 */
export function isDataForSEOConfigured(): boolean {
  return !!(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD);
}

/**
 * Controlla se il dominio ha Google Ads attive tramite DataForSEO
 *
 * @param domain - Dominio da verificare (es. "azienda.it")
 * @returns Risultato con numero di ads attive e segnale
 */
export async function checkGoogleAds(
  domain: string
): Promise<GoogleAdsCheckResult> {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;

  // Se DataForSEO non è configurato, ritorna mock/default
  if (!login || !password) {
    console.log(
      `[GOOGLE ADS] DataForSEO non configurato, skip check per ${domain}`
    );
    return {
      google_ads_attive: false,
      numero_ads: 0,
      segnale: "nessuna ads (DataForSEO non configurato)",
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
      signal: AbortSignal.timeout(15000), // 15 secondi timeout come da spec
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
      };
    }

    // Naviga in tasks[0].result[0].items
    const items = task.result?.[0]?.items;
    const numeroAds = Array.isArray(items) ? items.length : 0;
    const googleAdsAttive = numeroAds > 0;

    let segnale: string;
    if (googleAdsAttive) {
      segnale = `🔴 spende in ads (${numeroAds} annunci trovati)`;
    } else {
      segnale = "nessuna ads";
    }

    console.log(
      `[GOOGLE ADS] ${cleanDomain}: ${numeroAds} ads trovate (${latency}ms)`
    );

    return {
      google_ads_attive: googleAdsAttive,
      numero_ads: numeroAds,
      segnale,
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
    };
  }
}
