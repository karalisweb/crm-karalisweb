// ==========================================
// TIPI PER SEGNALI COMMERCIALI
// Sistema semplificato per 5 chiamate/giorno
// ==========================================

/**
 * Evidenza di attivita pubblicitaria
 * - strong: Prova diretta (ads in SERP, conversion tracking attivo)
 * - medium: Segnali indiretti (pixel, remarketing tag, gclid storico)
 * - weak: Segnali deboli (solo analytics avanzato)
 * - none: Nessuna evidenza
 */
export type AdsEvidenceLevel = "strong" | "medium" | "weak" | "none";

/**
 * Tag commerciale - UNO SOLO per prospect
 * Determina se e perche chiamare
 */
export type CommercialTag =
  | "ADS_ATTIVE_CONTROLLO_ASSENTE"    // Spendono ma non misurano - PRIORITA 1
  | "TRAFFICO_SENZA_DIREZIONE"        // Traffico ma niente CTA - PRIORITA 2
  | "STRUTTURA_OK_NON_PRIORITIZZATA"  // Funziona ma non ottimizzato - PRIORITA 3
  | "NON_TARGET";                     // Non spendono in ads - SKIP

/**
 * I 5 segnali commerciali essenziali
 * Tutto il resto e' rumore per 5 chiamate/giorno
 */
export interface CommercialSignals {
  // 1. Evidenza ads (dalla SERP + landing)
  adsEvidence: AdsEvidenceLevel;
  adsEvidenceReason: string;

  // 2. Tracking presente (GA o GTM o Pixel)
  trackingPresent: boolean;

  // 3. Consent Mode V2 (GDPR compliance per ads)
  consentModeV2: "yes" | "no" | "uncertain";

  // 4. CTA chiara (form, telefono, WhatsApp visibili)
  ctaClear: boolean;

  // 5. Offerta focalizzata (non generico "contattateci")
  offerFocused: boolean;

  // Timestamp analisi
  analyzedAt: string;

  // Errori durante analisi (se presenti)
  errors?: string[];
}

/**
 * Risultato tagging commerciale
 */
export interface CommercialTagResult {
  tag: CommercialTag;
  tagReason: string;
  signals: CommercialSignals;
  isCallable: boolean;  // true se tag != NON_TARGET
  priority: 1 | 2 | 3 | 4;  // 1=alta, 4=skip
}

/**
 * Risultato ricerca SERP per ads evidence
 */
export interface SerpAdsResult {
  domain: string;
  foundInPaidResults: boolean;
  paidPosition?: number;
  query: string;
  searchedAt: string;
}

/**
 * Configurazione blacklist domini
 */
export interface DomainBlacklist {
  // Directory e aggregatori da escludere
  directories: string[];
  // Portali generici
  portals: string[];
  // Pattern regex (es. per sottodomini)
  patterns: RegExp[];
}

/**
 * Default blacklist
 */
export const DEFAULT_DOMAIN_BLACKLIST: DomainBlacklist = {
  directories: [
    "paginegialle.it",
    "paginebianche.it",
    "europages.it",
    "yelp.it",
    "yelp.com",
    "tripadvisor.it",
    "tripadvisor.com",
    "trustpilot.com",
    "trustpilot.it",
    "google.com",
    "google.it",
    "facebook.com",
    "instagram.com",
    "linkedin.com",
    "twitter.com",
    "x.com",
    "tiktok.com",
    "youtube.com",
  ],
  portals: [
    "subito.it",
    "kijiji.it",
    "bakeca.it",
    "infobel.com",
    "cylex.it",
    "hotfrog.it",
    "misterimprese.it",
    "tuttitalia.it",
    "comuni-italiani.it",
  ],
  patterns: [
    /\.gov\.it$/,
    /\.edu\.it$/,
    /wikipedia\.org$/,
    /^www\.comune\./,
  ],
};

/**
 * Verifica se un dominio e' in blacklist
 */
export function isDomainBlacklisted(
  domain: string,
  blacklist: DomainBlacklist = DEFAULT_DOMAIN_BLACKLIST
): boolean {
  const normalizedDomain = domain.toLowerCase().replace(/^www\./, "");

  // Check directories
  if (blacklist.directories.some(d => normalizedDomain.includes(d))) {
    return true;
  }

  // Check portals
  if (blacklist.portals.some(p => normalizedDomain.includes(p))) {
    return true;
  }

  // Check patterns
  if (blacklist.patterns.some(p => p.test(normalizedDomain))) {
    return true;
  }

  return false;
}

// ==========================================
// COSTANTI PER PRIORITA TAG
// ==========================================

export const TAG_PRIORITY: Record<CommercialTag, number> = {
  ADS_ATTIVE_CONTROLLO_ASSENTE: 1,
  TRAFFICO_SENZA_DIREZIONE: 2,
  STRUTTURA_OK_NON_PRIORITIZZATA: 3,
  NON_TARGET: 4,
};

export const TAG_LABELS: Record<CommercialTag, string> = {
  ADS_ATTIVE_CONTROLLO_ASSENTE: "Ads attive, controllo assente",
  TRAFFICO_SENZA_DIREZIONE: "Traffico senza direzione",
  STRUTTURA_OK_NON_PRIORITIZZATA: "Struttura OK, non prioritizzata",
  NON_TARGET: "Non target",
};

export const TAG_COLORS: Record<CommercialTag, string> = {
  ADS_ATTIVE_CONTROLLO_ASSENTE: "red",
  TRAFFICO_SENZA_DIREZIONE: "orange",
  STRUTTURA_OK_NON_PRIORITIZZATA: "yellow",
  NON_TARGET: "gray",
};
