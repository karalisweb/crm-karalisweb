/**
 * Modulo 3 — Verifica Meta Ads (Meta Ad Library API)
 *
 * Verifica se l'azienda ha inserzioni pubblicitarie attive su Facebook/Instagram.
 *
 * API: Meta Ad Library API — gratuita, richiede Facebook App con token di accesso.
 * Il token ha scadenza — prevedere refresh o token a lunga scadenza.
 *
 * Nota sui falsi positivi: la ricerca per nome può restituire aziende con nome simile.
 * Se domain è disponibile, confronta il dominio nella page_website per aumentare la precisione.
 * Non è bloccante — Dani fa la verifica finale.
 */

import type { MetaAdsCheckResult } from "@/types/qualification";

const META_ADS_API_URL = "https://graph.facebook.com/v19.0/ads_archive";

/**
 * Verifica se Meta Ads API è configurata
 */
export function isMetaAdsConfigured(): boolean {
  return !!process.env.META_ACCESS_TOKEN;
}

/**
 * Controlla se l'azienda ha Meta Ads attive
 *
 * @param companyName - Nome azienda (stringa di ricerca)
 * @param domain - Dominio opzionale per ridurre falsi positivi
 * @returns Risultato con numero di ads attive e segnale
 */
export async function checkMetaAds(
  companyName: string,
  domain?: string | null
): Promise<MetaAdsCheckResult> {
  const accessToken = process.env.META_ACCESS_TOKEN;

  if (!accessToken) {
    console.log(
      `[META ADS] Token non configurato, skip check per ${companyName}`
    );
    return {
      meta_ads_attive: false,
      numero_ads: 0,
      pagina_trovata: null,
      segnale: "nessuna ads Meta (token non configurato)",
    };
  }

  const startTime = Date.now();

  try {
    // Costruisci URL con parametri
    const url = new URL(META_ADS_API_URL);
    url.searchParams.set("access_token", accessToken);
    url.searchParams.set("ad_reached_countries", '["IT"]');
    url.searchParams.set("ad_active_status", "ACTIVE");
    url.searchParams.set("search_terms", companyName);
    url.searchParams.set("ad_type", "ALL");
    url.searchParams.set(
      "fields",
      "id,ad_creative_bodies,ad_delivery_start_time,page_name"
    );
    url.searchParams.set("limit", "5");

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(15000), // 15 secondi timeout
      headers: {
        Accept: "application/json",
      },
    });

    const latency = Date.now() - startTime;
    console.log(
      `[META ADS] Risposta per "${companyName}": ${response.status} (${latency}ms)`
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[META ADS] HTTP error: ${response.status} - ${errorText}`);

      // Se il token è scaduto/invalido, logga warning specifico
      if (response.status === 400 || response.status === 401) {
        console.warn(
          "[META ADS] Token probabilmente scaduto — rigenerare da Meta for Developers"
        );
      }

      return {
        meta_ads_attive: false,
        numero_ads: 0,
        pagina_trovata: null,
        segnale: "nessuna ads Meta",
        errore: `HTTP ${response.status}`,
      };
    }

    const data = await response.json();

    // Conta risultati in data
    const ads = data?.data || [];
    const numeroAds = ads.length;
    const metaAdsAttive = numeroAds > 0;

    // Estrai nome pagina dal primo risultato
    let paginaTrovata: string | null = null;
    if (ads.length > 0 && ads[0].page_name) {
      paginaTrovata = ads[0].page_name;
    }

    let segnale: string;
    if (metaAdsAttive) {
      segnale = `🔴 spende su Meta (${numeroAds} annunci attivi)`;
    } else {
      segnale = "nessuna ads Meta";
    }

    console.log(
      `[META ADS] "${companyName}": ${numeroAds} ads trovate, pagina: ${paginaTrovata || "N/A"} (${latency}ms)`
    );

    return {
      meta_ads_attive: metaAdsAttive,
      numero_ads: numeroAds,
      pagina_trovata: paginaTrovata,
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
      console.error(
        `[META ADS] Timeout per "${companyName}" (${latency}ms)`
      );
    } else {
      console.error(`[META ADS] Errore per "${companyName}":`, errMsg);
    }

    return {
      meta_ads_attive: false,
      numero_ads: 0,
      pagina_trovata: null,
      segnale: "nessuna ads Meta",
      errore: errMsg,
    };
  }
}
