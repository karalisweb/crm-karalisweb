/**
 * Lead Score Calculator v3.1 — "Segnali Digitali"
 *
 * PRIORITÀ: il disallineamento nel sito è il driver principale.
 * Le ads sono un'aggravante, il tracking e le recensioni segnalano maturità digitale.
 *
 * Pesi v3.1:
 * - Errore strategico (disallineamento sito):  +50  (driver)
 * - Ads attive (verifica manuale):              +20  (aggravante)
 * - Tracking attivo (GA4/GTM/Pixel nel DOM):   +10  (segnale digitale)
 * - Recensioni forti (50+ e rating > 4.0):     +10  (business solido)
 * - Settore high-ticket:                        +20
 * - Settore standard:                           +10
 * - Settore low-ticket:                          +5
 *
 * Max teorico: 50 + 20 + 10 + 10 + 20 = 110 → cap 100
 *
 * Output: 0-100
 *   >= 80 → FARE_VIDEO
 *   50-79 → WARM
 *   < 50  → COLD
 */

// ==========================================
// INDUSTRY TIER CLASSIFICATION
// ==========================================

const HIGH_TICKET_KEYWORDS = [
  // Edilizia e costruzioni
  "edil", "costruzion", "impresa edile", "ristrutturazion",
  // Serramenti / Infissi
  "serramento", "serramenti", "infiss", "finestre", "porte", "blindat",
  // Piscine
  "piscin",
  // B2B / Industria
  "industriale", "automazione", "macchinari", "impianti",
  // Immobiliare
  "immobiliar", "agenzia immobiliare",
  // Studi professionali
  "studio legale", "avvocato", "commercialista", "consulenz",
  // Automotive
  "concessionari", "autofficina", "carrozzeri",
  // Energia
  "fotovoltaico", "solare", "energia", "climatizzazione",
  // Arredamento
  "arredament", "cucin", "mobili", "design", "interior",
  // Medicale
  "dentista", "odontoiatr", "clinica", "medic", "veterinar",
  // Tech
  "software", "web agency", "digital",
];

const LOW_TICKET_KEYWORDS = [
  "ristorante", "ristorazion", "pizzeri", "bar",
  "parrucchier", "barbier", "estetist", "nail",
  "fiorai", "fiorista", "fiori",
  "tabacch", "edicola",
  "lavanderi",
  "gelateri",
];

export type IndustryTier = "high_ticket" | "low_ticket" | "standard";

/**
 * Determina il tier del settore dalla categoria Google Maps.
 */
export function classifyIndustryTier(category: string | null): IndustryTier {
  if (!category) return "standard";
  const lower = category.toLowerCase();

  for (const kw of HIGH_TICKET_KEYWORDS) {
    if (lower.includes(kw)) return "high_ticket";
  }
  for (const kw of LOW_TICKET_KEYWORDS) {
    if (lower.includes(kw)) return "low_ticket";
  }
  return "standard";
}

// ==========================================
// SCORING INPUT
// ==========================================

export interface LeadScoreInput {
  /** Ads attive verificate manualmente */
  hasActiveAds: boolean;
  /** Ha tracking tools nel DOM (GA4, GTM, Meta Pixel, etc.) */
  hasTrackingTools: boolean;
  /** Categoria Google Maps */
  category: string | null;
  /** Errore strategico trovato da Gemini (es. "Lista della Spesa") */
  strategicErrorFound: string | null;
  /** Numero recensioni Google */
  googleReviewsCount: number;
  /** Rating Google (es. 4.5) */
  googleRating: number;
  /** Override manuale del tier (se presente, sovrascrive il calcolo automatico) */
  tierOverride?: IndustryTier | null;
}

export interface LeadScoreResult {
  score: number;        // 0-100
  tier: IndustryTier;
  breakdown: string[];  // Dettaglio per debug/trasparenza
}

// ==========================================
// SCORING FUNCTION
// ==========================================

/**
 * Calcola il lead score (0-100) basato sul "Disallineamento Strategico".
 *
 * v3.1 — "Segnali Digitali"
 *
 * Pesi:
 * - strategic_error_found !== null:             +50  (DRIVER)
 * - has_active_ads === true:                    +20  (aggravante)
 * - has_tracking_tools === true:                +10  (segnale digitale)
 * - reviews >= 100 && rating > 4.0:            +10  (business solido)
 * - industry_tier === 'high_ticket':            +20
 * - industry_tier === 'low_ticket':              +5
 * - industry_tier === 'standard':               +10
 *
 * Cap: 100
 */
export function calculateLeadScore(input: LeadScoreInput): LeadScoreResult {
  let score = 0;
  const breakdown: string[] = [];

  // Tier: usa override se presente, altrimenti calcolo automatico
  const tier: IndustryTier = (input.tierOverride && ["high_ticket", "standard", "low_ticket"].includes(input.tierOverride))
    ? input.tierOverride
    : classifyIndustryTier(input.category);

  // 1. Errore strategico = DRIVER PRINCIPALE (+50)
  if (input.strategicErrorFound) {
    score += 50;
    breakdown.push(`Errore strategico (${input.strategicErrorFound}): +50`);
  }

  // 2. Ads attive = aggravante, hanno budget (+20)
  if (input.hasActiveAds) {
    score += 20;
    breakdown.push("Ads attive: +20");
  }

  // 3. Tracking tools attivi = investe nel digitale (+10)
  if (input.hasTrackingTools) {
    score += 10;
    breakdown.push("Tracking attivo: +10");
  }

  // 4. Recensioni forti = business solido (+10)
  if (input.googleReviewsCount >= 50 && input.googleRating > 4.0) {
    score += 10;
    breakdown.push(`Recensioni forti (${input.googleReviewsCount} rec, ${input.googleRating}★): +10`);
  }

  // 5. Margine settore
  if (tier === "high_ticket") {
    score += 20;
    breakdown.push("Settore high-ticket: +20");
  } else if (tier === "low_ticket") {
    score += 5;
    breakdown.push("Settore low-ticket: +5");
  } else {
    score += 10;
    breakdown.push("Settore standard: +10");
  }

  const finalScore = Math.min(score, 100);

  return {
    score: finalScore,
    tier,
    breakdown,
  };
}

// ==========================================
// HELPER: Estrai dati per scoring da Gemini Analysis JSON
// ==========================================

/**
 * Estrae i dati necessari per lo scoring dal JSON geminiAnalysis salvato nel DB.
 *
 * v3.1: aggiunge tracking bonus, reviews bonus, tierOverride.
 */
export function extractScoreInputFromGeminiAnalysis(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  geminiAnalysis: any,
  category: string | null,
  extra?: {
    googleReviewsCount?: number | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    googleRating?: any; // Accepts Decimal, number, string, null
    tierOverride?: string | null;
  }
): LeadScoreInput {
  if (!geminiAnalysis || typeof geminiAnalysis !== "object") {
    return {
      hasActiveAds: false,
      hasTrackingTools: false,
      category,
      strategicErrorFound: null,
      googleReviewsCount: extra?.googleReviewsCount ?? 0,
      googleRating: Number(extra?.googleRating) || 0,
      tierOverride: (extra?.tierOverride as IndustryTier) || null,
    };
  }

  const hasActiveAds = geminiAnalysis.has_active_ads === true;

  // Tracking tools presenti nel DOM
  const networks: string[] = geminiAnalysis.ads_networks_found || [];
  const hasTrackingTools = networks.length > 0;

  const strategicErrorFound = geminiAnalysis.primary_error_pattern || null;

  return {
    hasActiveAds,
    hasTrackingTools,
    category,
    strategicErrorFound,
    googleReviewsCount: extra?.googleReviewsCount ?? 0,
    googleRating: Number(extra?.googleRating) || 0,
    tierOverride: (extra?.tierOverride as IndustryTier) || null,
  };
}
