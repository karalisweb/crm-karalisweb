/**
 * Generatore Angolo Loom
 *
 * Genera il testo "angolo" per il video Loom personalizzato.
 * Logica a cascata: la prima condizione vera vince.
 */

import type {
  WebsiteCheckResult,
  GoogleAdsCheckResult,
  MetaAdsCheckResult,
  TechDetectionResult,
} from "@/types/qualification";

interface AngoloLoomInput {
  website: WebsiteCheckResult;
  googleAds: GoogleAdsCheckResult;
  metaAds: MetaAdsCheckResult;
  tech: TechDetectionResult;
}

/**
 * Genera l'angolo Loom pre-compilato.
 *
 * Logica a cascata (prima condizione vera vince):
 *
 * 1. Google Ads attive + performance < 50:
 *    → "Stanno spendendo in Google Ads (N ads attive) ma il sito ha performance score/100 — soldi buttati."
 *
 * 2. Meta Ads attive + nessun pixel Facebook:
 *    → "Hanno N ads attive su Meta ma nessun pixel sul sito — non tracciano nulla."
 *
 * 3. Nessun sito:
 *    → "Nessun sito trovato — investimento digitale zero, opportunità massima."
 *
 * 4. Sito non mobile-friendly:
 *    → "Sito non ottimizzato mobile — il loro cliente li vede da smartphone e rimbalza."
 *
 * 5. Fallback:
 *    → "Sito presente ma debole — analizzare in dettaglio."
 */
export function generaAngoloLoom(input: AngoloLoomInput): string {
  const { website, googleAds, metaAds, tech } = input;

  // 1. Google Ads attive + performance < 50
  if (
    googleAds.google_ads_attive &&
    website.sito_presente &&
    website.performance_score !== null &&
    website.performance_score < 50
  ) {
    return `Stanno spendendo in Google Ads (${googleAds.numero_ads} ads attive) ma il sito ha performance ${website.performance_score}/100 — soldi buttati.`;
  }

  // 2. Meta Ads attive + nessun pixel Facebook
  if (metaAds.meta_ads_attive && !tech.has_facebook_pixel) {
    return `Hanno ${metaAds.numero_ads} ads attive su Meta ma nessun pixel sul sito — non tracciano nulla.`;
  }

  // 3. Nessun sito
  if (!website.sito_presente) {
    return "Nessun sito trovato — investimento digitale zero, opportunità massima.";
  }

  // 4. Sito non mobile-friendly
  if (website.mobile_friendly === false) {
    return "Sito non ottimizzato mobile — il loro cliente li vede da smartphone e rimbalza.";
  }

  // 5. Fallback
  return "Sito presente ma debole — analizzare in dettaglio.";
}
