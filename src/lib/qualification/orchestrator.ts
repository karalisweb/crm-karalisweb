/**
 * Orchestratore Qualifica Prospect
 *
 * Esegue i tre moduli in PARALLELO per contenere i tempi,
 * aggrega i risultati, calcola il punteggio e genera l'angolo Loom.
 *
 * Timeout totale per una singola azienda: max 20 secondi (i check girano in parallelo).
 * Nessun check è bloccante: se un modulo fallisce, gli altri continuano.
 */

import type { QualificationOutput } from "@/types/qualification";
import { checkWebsite, detectTechnologies } from "./check-website";
import { checkGoogleAds } from "./check-google-ads";
import { checkMetaAds } from "./check-meta-ads";
import { calculateQualificationScore } from "./qualification-scoring";
import { generaAngoloLoom } from "./angolo-loom-generator";
import type {
  WebsiteCheckResult,
  TechDetectionResult,
  GoogleAdsCheckResult,
  MetaAdsCheckResult,
} from "@/types/qualification";

/**
 * Qualifica un prospect eseguendo tutti i check in parallelo.
 *
 * @param nomeAzienda - Nome azienda
 * @param dominio - Dominio del sito web
 * @returns Output completo della qualifica
 */
export async function qualificaProspect(
  nomeAzienda: string,
  dominio: string
): Promise<QualificationOutput> {
  const startTime = Date.now();
  const errori: string[] = [];

  // Esecuzione parallela di tutti i moduli (con Promise.allSettled per non-blocking)
  const [websiteResult, techResult, googleAdsResult, metaAdsResult] =
    await Promise.allSettled([
      checkWebsite(dominio),
      detectTechnologies(dominio),
      checkGoogleAds(dominio),
      checkMetaAds(nomeAzienda, dominio),
    ]);

  // Estrai risultati (o valori default se falliti)
  const website: WebsiteCheckResult =
    websiteResult.status === "fulfilled"
      ? websiteResult.value
      : {
          sito_presente: false,
          performance_score: null,
          mobile_friendly: null,
          primo_caricamento: null,
          esito: null,
        };

  if (websiteResult.status === "rejected") {
    errori.push(`check_website: ${websiteResult.reason?.message || "errore sconosciuto"}`);
  }

  const tech: TechDetectionResult =
    techResult.status === "fulfilled"
      ? techResult.value
      : {
          has_facebook_pixel: false,
          has_gtm: false,
          has_google_analytics: false,
          cms_wordpress: false,
          cms_wix: false,
          errore: "Modulo fallito",
        };

  if (techResult.status === "rejected") {
    errori.push(`detect_technologies: ${techResult.reason?.message || "errore sconosciuto"}`);
  }

  const googleAds: GoogleAdsCheckResult =
    googleAdsResult.status === "fulfilled"
      ? googleAdsResult.value
      : {
          google_ads_attive: false,
          numero_ads: 0,
          segnale: "nessuna ads",
          errore: "Modulo fallito",
          landing_page_url: null,
          landing_page_text: null,
          ad_copy: null,
        };

  if (googleAdsResult.status === "rejected") {
    errori.push(`check_google_ads: ${googleAdsResult.reason?.message || "errore sconosciuto"}`);
  }

  const metaAds: MetaAdsCheckResult =
    metaAdsResult.status === "fulfilled"
      ? metaAdsResult.value
      : {
          meta_ads_attive: false,
          numero_ads: 0,
          pagina_trovata: null,
          segnale: "nessuna ads Meta",
          errore: "Modulo fallito",
          meta_ads_copy: [],
          ad_library_url: "",
        };

  if (metaAdsResult.status === "rejected") {
    errori.push(`check_meta_ads: ${metaAdsResult.reason?.message || "errore sconosciuto"}`);
  }

  // Raccogli errori non-fatali dai moduli
  if (tech.errore) errori.push(`detect_technologies: ${tech.errore}`);
  if (googleAds.errore) errori.push(`check_google_ads: ${googleAds.errore}`);
  if (metaAds.errore) errori.push(`check_meta_ads: ${metaAds.errore}`);

  // Calcola punteggio
  const scoring = calculateQualificationScore({
    website,
    tech,
    googleAds,
    metaAds,
  });

  // Genera angolo Loom
  const angoloLoom = generaAngoloLoom({ website, googleAds, metaAds, tech });

  // Determina CMS
  let cms = "altro";
  if (tech.cms_wordpress) cms = "WordPress";
  else if (tech.cms_wix) cms = "Wix";

  const latency = Date.now() - startTime;
  console.log(
    `[QUALIFICA] ${nomeAzienda} (${dominio}): score=${scoring.punteggio}, priorita=${scoring.priorita}, tempo=${latency}ms`
  );

  return {
    // Identificazione
    azienda: nomeAzienda,
    dominio,

    // Qualifica automatica
    punteggio_qualifica: scoring.punteggio,
    priorita: scoring.priorita,

    // Dati tecnici
    sito_presente: website.sito_presente,
    sito_performance: website.performance_score,
    sito_mobile: website.mobile_friendly,
    cms,
    pixel_facebook: tech.has_facebook_pixel,
    gtm_presente: tech.has_gtm,

    // Advertising
    google_ads_attive: googleAds.google_ads_attive,
    google_ads_numero: googleAds.numero_ads,
    meta_ads_attive: metaAds.meta_ads_attive,
    meta_ads_numero: metaAds.numero_ads,
    meta_pagina: metaAds.pagina_trovata,

    // Per Alessio
    angolo_loom: angoloLoom,

    // Per Dani (da completare manualmente)
    nota_dani: "",
    titolare_verificato: false,

    // Metadata
    timestamp_check: new Date().toISOString(),
    errori,
  };
}
