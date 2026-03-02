/**
 * Qualification Module
 * Sistema di qualifica automatica prospect per outreach commerciale
 */

// Orchestratore (punto di ingresso principale)
export { qualificaProspect } from "./orchestrator";

// Moduli individuali
export { checkWebsite, detectTechnologies } from "./check-website";
export { checkGoogleAds, isDataForSEOConfigured } from "./check-google-ads";
export { checkMetaAds, isMetaAdsConfigured } from "./check-meta-ads";

// Scoring
export { calculateQualificationScore } from "./qualification-scoring";

// Angolo Loom
export { generaAngoloLoom } from "./angolo-loom-generator";
