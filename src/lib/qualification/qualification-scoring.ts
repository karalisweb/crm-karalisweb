/**
 * Scoring di Qualifica Prospect
 *
 * Algoritmo che calcola un punteggio 0-100 basato su:
 * - Stato del sito web (presenza, performance, mobile)
 * - Ads attive (Google Ads, Meta Ads)
 * - Combinazione pixel + performance bassa
 *
 * Più problemi + più investimento ads = più opportunità di vendita.
 */

import type { WebsiteCheckResult, TechDetectionResult, GoogleAdsCheckResult, MetaAdsCheckResult, QualificationPriority } from "@/types/qualification";

interface ScoringInput {
  website: WebsiteCheckResult;
  tech: TechDetectionResult;
  googleAds: GoogleAdsCheckResult;
  metaAds: MetaAdsCheckResult;
}

interface ScoringResult {
  punteggio: number; // 0-100
  priorita: QualificationPriority;
  dettaglio: string[]; // Breakdown del punteggio per trasparenza
}

/**
 * Calcola il punteggio di qualifica (0-100)
 *
 * Tabella scoring:
 * | Condizione                           | Punti |
 * |--------------------------------------|-------|
 * | Sito assente                         | +40   |
 * | Performance score < 50               | +30   |
 * | Performance score 50-74              | +15   |
 * | Sito non mobile-friendly             | +10   |
 * | Google Ads attive                    | +25   |
 * | Meta Ads attive                     | +20   |
 * | Pixel presente MA performance < 60  | +15   |
 *
 * Punteggio finale: min(somma, 100)
 */
export function calculateQualificationScore(input: ScoringInput): ScoringResult {
  const { website, tech, googleAds, metaAds } = input;
  let score = 0;
  const dettaglio: string[] = [];

  // --- Sito assente: +40 ---
  if (!website.sito_presente) {
    score += 40;
    dettaglio.push("Sito assente: +40");
  } else {
    // --- Performance score ---
    if (website.performance_score !== null) {
      if (website.performance_score < 50) {
        score += 30;
        dettaglio.push(`Performance ${website.performance_score}/100 (< 50): +30`);
      } else if (website.performance_score < 75) {
        score += 15;
        dettaglio.push(`Performance ${website.performance_score}/100 (50-74): +15`);
      }
    }

    // --- Sito non mobile-friendly: +10 ---
    if (website.mobile_friendly === false) {
      score += 10;
      dettaglio.push("Non mobile-friendly: +10");
    }
  }

  // --- Google Ads attive: +25 ---
  if (googleAds.google_ads_attive) {
    score += 25;
    dettaglio.push(`Google Ads attive (${googleAds.numero_ads} ads): +25`);
  }

  // --- Meta Ads attive: +20 ---
  if (metaAds.meta_ads_attive) {
    score += 20;
    dettaglio.push(`Meta Ads attive (${metaAds.numero_ads} ads): +20`);
  }

  // --- Pixel presente MA performance < 60: +15 ---
  if (
    tech.has_facebook_pixel &&
    website.sito_presente &&
    website.performance_score !== null &&
    website.performance_score < 60
  ) {
    score += 15;
    dettaglio.push(`Pixel FB presente + performance ${website.performance_score} (< 60): +15`);
  }

  // Cap a 100
  const punteggio = Math.min(score, 100);

  // Priorità
  let priorita: QualificationPriority;
  if (punteggio >= 60) {
    priorita = "ALTA";
  } else if (punteggio >= 30) {
    priorita = "MEDIA";
  } else {
    priorita = "BASSA";
  }

  return {
    punteggio,
    priorita,
    dettaglio,
  };
}
