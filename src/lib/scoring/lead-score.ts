/**
 * Lead Score Calculator v2.0 — "Sanguinamento Finanziario"
 *
 * Lo score NON si basa più su SEO/tecnica, ma su:
 * - Budget sprecato (ads attive senza tracking = soldi bruciati)
 * - Margine del settore (high-ticket vs low-ticket)
 * - Errore strategico rilevato dall'AI
 *
 * Output: 0-100, compatibile con getScoreCategory()
 *   >= 80 → HOT (rosso)
 *   50-79 → WARM (giallo)
 *   < 50  → COLD (grigio)
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
  /** Ads attive rilevate dallo strategic extractor */
  hasActiveAds: boolean;
  /** Ha pixel/tracking (Facebook Pixel, Google Ads tag, GTM) — dalla Gemini analysis */
  hasTrackingPixel: boolean;
  /** Categoria Google Maps */
  category: string | null;
  /** Errore strategico trovato da Gemini (es. "Lista della Spesa") */
  strategicErrorFound: string | null;
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
 * Calcola il lead score (0-100) basato sul "Sanguinamento Finanziario".
 *
 * Logica:
 * - has_active_ads === true:                    +40
 * - has_active_ads && !has_tracking_pixel:       +20
 * - industry_tier === 'high_ticket':            +20
 * - industry_tier === 'low_ticket':              +5
 * - industry_tier === 'standard':               +10
 * - strategic_error_found !== null:             +20
 *
 * Cap: 100
 */
export function calculateLeadScore(input: LeadScoreInput): LeadScoreResult {
  let score = 0;
  const breakdown: string[] = [];
  const tier = classifyIndustryTier(input.category);

  // 1. Ads attive = hanno budget (+40)
  if (input.hasActiveAds) {
    score += 40;
    breakdown.push("Ads attive: +40");
  }

  // 2. Ads attive MA nessun pixel = bruciano soldi al buio (+20)
  if (input.hasActiveAds && !input.hasTrackingPixel) {
    score += 20;
    breakdown.push("Ads senza pixel/tracking: +20");
  }

  // 3. Margine settore
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

  // 4. Errore strategico trovato dall'AI (+20)
  if (input.strategicErrorFound) {
    score += 20;
    breakdown.push(`Errore strategico (${input.strategicErrorFound}): +20`);
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
 */
export function extractScoreInputFromGeminiAnalysis(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  geminiAnalysis: any,
  category: string | null
): LeadScoreInput {
  if (!geminiAnalysis || typeof geminiAnalysis !== "object") {
    return {
      hasActiveAds: false,
      hasTrackingPixel: false,
      category,
      strategicErrorFound: null,
    };
  }

  const hasActiveAds = geminiAnalysis.has_active_ads === true;

  // Determina se hanno tracking pixel
  // Cerchiamo nei networks trovati se c'è Facebook Pixel, Google Analytics, GTM
  const networks: string[] = geminiAnalysis.ads_networks_found || [];
  const trackingNetworks = [
    "Meta Pixel", "Google Analytics", "Google Tag Manager",
    "Google Ads", "LinkedIn Insight", "TikTok Pixel",
    "Microsoft Clarity", "Hotjar",
  ];
  const hasTrackingPixel = networks.some(n =>
    trackingNetworks.some(t => n.toLowerCase().includes(t.toLowerCase()))
  );

  const strategicErrorFound = geminiAnalysis.primary_error_pattern || null;

  return {
    hasActiveAds,
    hasTrackingPixel,
    category,
    strategicErrorFound,
  };
}
