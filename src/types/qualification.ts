// ==========================================
// TIPI PER QUALIFICA AUTOMATICA PROSPECT
// ==========================================

/**
 * Risultato check sito web (Modulo 1)
 */
export interface WebsiteCheckResult {
  sito_presente: boolean;
  performance_score: number | null; // 0-100
  mobile_friendly: boolean | null;
  primo_caricamento: string | null; // es. "4.2 s"
  esito: "debole" | "medio" | "buono" | null; // <50 debole, 50-74 medio, >=75 buono
}

/**
 * Risultato detect tecnologie (Modulo 1b)
 */
export interface TechDetectionResult {
  has_facebook_pixel: boolean;
  has_gtm: boolean;
  has_google_analytics: boolean;
  cms_wordpress: boolean;
  cms_wix: boolean;
  errore?: string;
}

/**
 * Risultato check Google Ads (Modulo 2 - DataForSEO)
 */
export interface GoogleAdsCheckResult {
  google_ads_attive: boolean;
  numero_ads: number;
  segnale: string; // es. "🔴 spende in ads su base debole"
  errore?: string;
}

/**
 * Risultato check Meta Ads (Modulo 3 - Meta Ad Library)
 */
export interface MetaAdsCheckResult {
  meta_ads_attive: boolean;
  numero_ads: number;
  pagina_trovata: string | null;
  segnale: string; // es. "🔴 spende su Meta"
  errore?: string;
}

/**
 * Priorità qualifica
 */
export type QualificationPriority = "ALTA" | "MEDIA" | "BASSA";

/**
 * Output completo della qualifica prospect
 * Corrisponde al dizionario specificato nella spec
 */
export interface QualificationOutput {
  // Identificazione
  azienda: string;
  dominio: string;

  // Qualifica automatica
  punteggio_qualifica: number; // 0-100
  priorita: QualificationPriority;

  // Dati tecnici
  sito_presente: boolean;
  sito_performance: number | null; // 0-100
  sito_mobile: boolean | null;
  cms: string; // "WordPress" / "Wix" / "altro"
  pixel_facebook: boolean;
  gtm_presente: boolean;

  // Advertising
  google_ads_attive: boolean;
  google_ads_numero: number;
  meta_ads_attive: boolean;
  meta_ads_numero: number;
  meta_pagina: string | null;

  // Per Alessio
  angolo_loom: string;

  // Per Dani (da completare manualmente)
  nota_dani: string;
  titolare_verificato: boolean;

  // Metadata
  timestamp_check: string; // ISO 8601
  errori: string[]; // lista eventuali errori non bloccanti
}
