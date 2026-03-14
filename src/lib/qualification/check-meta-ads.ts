/**
 * Modulo 3 — Verifica Meta Ads (via Apify - Meta Ad Library Scraper)
 *
 * Verifica se l'azienda ha inserzioni pubblicitarie attive su Facebook/Instagram.
 *
 * Strategia a 2 livelli:
 * 1. Prova Apify actor "curious_coder/facebook-ads-library-scraper" (aggiornato 2024+)
 * 2. Se Apify fallisce o non configurato, ritorna risultato vuoto con URL di fallback manuale
 *
 * Output: has_active_meta_ads, meta_ads_copy (primi 3 testi annunci)
 */

import { ApifyClient } from "apify-client";
import type { MetaAdsCheckResult } from "@/types/qualification";

// Actor aggiornato per Meta Ad Library (sostituto del vecchio apify/facebook-ads-scraper)
const META_ADS_ACTOR = "curious_coder/facebook-ads-library-scraper";
// Fallback: actor originale Apify (in caso il primo non esista)
const META_ADS_ACTOR_FALLBACK = "apify/facebook-ads-scraper";

/**
 * Verifica se Apify è configurato (necessario per Meta Ads check)
 */
export function isMetaAdsConfigured(): boolean {
  return !!process.env.APIFY_TOKEN;
}

/**
 * Costruisce l'URL pubblico della Meta Ad Library per ricerca manuale
 */
export function buildAdLibraryUrl(searchTerm: string): string {
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
 * Costruisce l'URL di Google Ads Transparency Center per ricerca manuale
 */
export function buildGoogleAdsTransparencyUrl(domain: string): string {
  const cleanDomain = domain
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0];
  return `https://adstransparency.google.com/?domain=${encodeURIComponent(cleanDomain)}&region=IT`;
}

/**
 * Controlla se l'azienda ha Meta Ads attive tramite Apify.
 * Estrae has_active_meta_ads e meta_ads_copy (primi 3 testi).
 *
 * @param companyName - Nome azienda (stringa di ricerca)
 * @param domain - Dominio opzionale
 * @returns Risultato con ads attive, copy degli annunci, e URL fallback
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
      meta_ads_copy: [],
      ad_library_url: buildAdLibraryUrl(companyName),
    };
  }

  const startTime = Date.now();

  // Prova prima l'actor aggiornato, poi fallback
  for (const actorId of [META_ADS_ACTOR, META_ADS_ACTOR_FALLBACK]) {
    try {
      const client = new ApifyClient({ token: apifyToken });
      const adLibraryUrl = buildAdLibraryUrl(companyName);

      console.log(
        `[META ADS] Provo actor "${actorId}" per "${companyName}"...`
      );

      const run = await client.actor(actorId).call(
        {
          startUrls: [{ url: adLibraryUrl }],
          resultsLimit: 5,
          activeStatus: "active",
        },
        {
          timeout: 45, // 45 secondi (ridotto da 60)
          memory: 512,
        }
      );

      const latency = Date.now() - startTime;

      // Recupera i risultati dal dataset
      const { items } = await client
        .dataset(run.defaultDatasetId)
        .listItems({ limit: 5 });

      const numeroAds = items.length;
      const metaAdsAttive = numeroAds > 0;

      // Estrai nome pagina e copy degli annunci
      let paginaTrovata: string | null = null;
      const metaAdsCopy: string[] = [];

      for (const item of items.slice(0, 3)) {
        const ad = item as Record<string, unknown>;

        // Nome pagina
        if (!paginaTrovata) {
          paginaTrovata =
            (ad.pageName as string) ||
            (ad.page_name as string) ||
            (ad.pageAlias as string) ||
            null;
        }

        // Copy dell'annuncio
        const adBody =
          (ad.adCreativeBody as string) ||
          (ad.ad_creative_body as string) ||
          (ad.body as string) ||
          (ad.text as string) ||
          null;
        if (adBody && adBody.length > 10) {
          metaAdsCopy.push(adBody.length > 200 ? adBody.substring(0, 200) + "..." : adBody);
        }
      }

      let segnale: string;
      if (metaAdsAttive) {
        segnale = `🔴 spende su Meta (${numeroAds} annunci attivi)`;
      } else {
        segnale = "nessuna ads Meta";
      }

      console.log(
        `[META ADS] "${companyName}": ${numeroAds} ads, pagina: ${paginaTrovata || "N/A"}, ` +
        `copy: ${metaAdsCopy.length} testi (${latency}ms) [actor: ${actorId}]`
      );

      return {
        meta_ads_attive: metaAdsAttive,
        numero_ads: numeroAds,
        pagina_trovata: paginaTrovata,
        segnale,
        meta_ads_copy: metaAdsCopy,
        ad_library_url: adLibraryUrl,
      };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Errore sconosciuto";
      console.warn(
        `[META ADS] Actor "${actorId}" fallito per "${companyName}": ${errMsg}`
      );
      // Prova il prossimo actor
      continue;
    }
  }

  // Se tutti gli actor falliscono, ritorna risultato vuoto con URL fallback
  const latency = Date.now() - startTime;
  console.error(
    `[META ADS] Tutti gli actor falliti per "${companyName}" (${latency}ms)`
  );

  return {
    meta_ads_attive: false,
    numero_ads: 0,
    pagina_trovata: null,
    segnale: "nessuna ads Meta (errore API)",
    errore: "Tutti gli actor Apify falliti",
    meta_ads_copy: [],
    ad_library_url: buildAdLibraryUrl(companyName),
  };
}
