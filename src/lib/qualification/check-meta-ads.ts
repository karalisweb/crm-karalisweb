/**
 * Modulo 3 — Verifica Meta Ads (via Apify - Meta Ad Library Scraper)
 *
 * Verifica se l'azienda ha inserzioni pubblicitarie attive su Facebook/Instagram.
 *
 * Usa l'actor Apify "apify/facebook-ads-scraper" che scrapa la Meta Ad Library pubblica.
 * Non richiede token Meta — usa il token Apify già configurato.
 *
 * Nota sui falsi positivi: la ricerca per nome può restituire aziende con nome simile.
 * Non è bloccante — Dani fa la verifica finale.
 */

import { ApifyClient } from "apify-client";
import type { MetaAdsCheckResult } from "@/types/qualification";

const META_ADS_ACTOR = "apify/facebook-ads-scraper";

/**
 * Verifica se Apify è configurato (necessario per Meta Ads check)
 */
export function isMetaAdsConfigured(): boolean {
  return !!process.env.APIFY_TOKEN;
}

/**
 * Costruisce l'URL di ricerca nella Meta Ad Library
 */
function buildAdLibraryUrl(searchTerm: string): string {
  const params = new URLSearchParams({
    active_status: "active",
    ad_type: "all",
    country: "IT",
    search_type: "keyword_unordered",
    q: searchTerm,
  });
  return `https://www.facebook.com/ads/library/?${params.toString()}`;
}

/**
 * Controlla se l'azienda ha Meta Ads attive tramite Apify
 *
 * @param companyName - Nome azienda (stringa di ricerca)
 * @param domain - Dominio opzionale (non usato ma mantenuto per compatibilità interfaccia)
 * @returns Risultato con numero di ads attive e segnale
 */
export async function checkMetaAds(
  companyName: string,
  domain?: string | null
): Promise<MetaAdsCheckResult> {
  const apifyToken = process.env.APIFY_TOKEN;

  if (!apifyToken) {
    console.log(
      `[META ADS] Token Apify non configurato, skip check per ${companyName}`
    );
    return {
      meta_ads_attive: false,
      numero_ads: 0,
      pagina_trovata: null,
      segnale: "nessuna ads Meta (Apify non configurato)",
    };
  }

  const startTime = Date.now();

  try {
    const client = new ApifyClient({ token: apifyToken });

    // Costruisci URL Ad Library con ricerca per nome azienda
    const adLibraryUrl = buildAdLibraryUrl(companyName);

    console.log(
      `[META ADS] Avvio Apify actor per "${companyName}" — URL: ${adLibraryUrl}`
    );

    // Esegui l'actor con timeout di 60 secondi e limite di 5 risultati
    const run = await client.actor(META_ADS_ACTOR).call(
      {
        startUrls: [{ url: adLibraryUrl }],
        resultsLimit: 5,
        activeStatus: "active",
      },
      {
        timeout: 60, // 60 secondi
        memory: 512, // MB
      }
    );

    const latency = Date.now() - startTime;

    // Recupera i risultati dal dataset
    const { items } = await client
      .dataset(run.defaultDatasetId)
      .listItems({ limit: 5 });

    const numeroAds = items.length;
    const metaAdsAttive = numeroAds > 0;

    // Estrai nome pagina dal primo risultato
    let paginaTrovata: string | null = null;
    if (items.length > 0) {
      const first = items[0] as Record<string, unknown>;
      paginaTrovata =
        (first.pageName as string) ||
        (first.page_name as string) ||
        null;
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

    console.error(
      `[META ADS] Errore per "${companyName}" (${latency}ms):`,
      errMsg
    );

    return {
      meta_ads_attive: false,
      numero_ads: 0,
      pagina_trovata: null,
      segnale: "nessuna ads Meta",
      errore: errMsg,
    };
  }
}
