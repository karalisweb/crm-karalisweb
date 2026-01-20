/**
 * Commercial Module
 * Sistema semplificato per qualificare lead per 5 chiamate/giorno
 */

// Detectors
export { detectAdsEvidence, detectLandingAdsSignals, checkSerpForAds } from "./ads-evidence-detector";
export { detectCommercialSignals } from "./commercial-signals-detector";

// Tagger
export {
  assignCommercialTag,
  sortByCommercialPriority,
  filterCallableLeads,
} from "./commercial-tagger";

// Re-export types
export type {
  AdsEvidenceLevel,
  CommercialTag,
  CommercialSignals,
  CommercialTagResult,
  SerpAdsResult,
  DomainBlacklist,
} from "@/types/commercial";

export {
  TAG_PRIORITY,
  TAG_LABELS,
  TAG_COLORS,
  DEFAULT_DOMAIN_BLACKLIST,
  isDomainBlacklisted,
} from "@/types/commercial";
