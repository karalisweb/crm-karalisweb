// ==========================================
// TIPI PER AUDIT DATA
// ==========================================

export interface WebsiteAudit {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seoScore: number;
  loadTime: number;
  mobile: boolean;
  https: boolean;
  hasContactForm: boolean;
  hasWhatsApp: boolean;
  hasLiveChat: boolean;
}

export interface SEOAudit {
  hasMetaTitle: boolean;
  metaTitle: string | null;
  metaTitleLength: number;
  hasMetaDescription: boolean;
  metaDescription: string | null;
  metaDescriptionLength: number;
  hasH1: boolean;
  h1Count: number;
  h1Text: string[];
  hasSitemap: boolean;
  hasRobotsTxt: boolean;
  hasSchemaMarkup: boolean;
  hasCanonical: boolean;
  canonicalUrl: string | null;
  hasOpenGraph: boolean;
  openGraph: Record<string, string>;
  imagesWithoutAlt: number;
  totalImages: number;
  coreWebVitals: {
    lcp: number;  // Largest Contentful Paint (ms)
    fid: number;  // First Input Delay (ms)
    cls: number;  // Cumulative Layout Shift
  };
}

export interface TrackingAudit {
  hasGoogleAnalytics: boolean;
  hasGA4: boolean;
  hasGTM: boolean;
  gtmId: string | null;
  hasFacebookPixel: boolean;
  fbPixelId: string | null;
  hasGoogleAdsTag: boolean;
  googleAdsId: string | null;
  hasConversionTracking: boolean;
  hasHotjar: boolean;
  hasClarity: boolean;
  hasLinkedInInsight: boolean;
  hasTikTokPixel: boolean;
}

export interface SocialPresence {
  linkedFromSite: boolean;
  url: string | null;
}

export interface SocialAudit {
  facebook: SocialPresence;
  instagram: SocialPresence;
  linkedin: SocialPresence;
  youtube: SocialPresence;
  tiktok: SocialPresence;
  twitter: SocialPresence;
}

export interface GoogleBusinessAudit {
  rating: number | null;
  reviewsCount: number | null;
  hasPhotos: boolean;
  photosCount: number;
}

export interface ContentAudit {
  hasBlog: boolean;
  blogUrl: string | null;
  lastPostDate: string | null;
  daysSinceLastPost: number | null;
  estimatedPostCount: number;
}

export interface EmailMarketingAudit {
  hasNewsletterForm: boolean;
  hasPopup: boolean;
  hasLeadMagnet: boolean;
  emailProvider: string | null;
}

export interface TrustAudit {
  hasCookieBanner: boolean;
  hasPrivacyPolicy: boolean;
  privacyPolicyUrl: string | null;
  hasTerms: boolean;
  termsUrl: string | null;
  hasTestimonials: boolean;
  hasTrustBadges: boolean;
}

export interface TechAudit {
  cms: string | null;
  cmsVersion: string | null;
  phpVersion: string | null;
  stack: string[];
  isOutdated: boolean;
}

export interface AuditData {
  website: WebsiteAudit;
  seo: SEOAudit;
  tracking: TrackingAudit;
  social: SocialAudit;
  googleBusiness: GoogleBusinessAudit;
  content: ContentAudit;
  emailMarketing: EmailMarketingAudit;
  trust: TrustAudit;
  tech: TechAudit;
  issues: string[];
}

// ==========================================
// TIPI PER TALKING POINTS
// ==========================================

export interface TalkingPointsByService {
  webDesign: string[];
  seo: string[];
  googleAds: string[];
  metaAds: string[];
  socialMedia: string[];
  localMarketing: string[];
  contentMarketing: string[];
  emailMarketing: string[];
  compliance: string[];
}

// ==========================================
// TIPI PER GOOGLE MAPS (APIFY)
// ==========================================

export interface GoogleMapsResult {
  title: string;
  address: string;
  phone: string | null;
  website: string | null;
  totalScore: number | null;
  reviewsCount: number | null;
  placeId: string;
  url: string;
  categoryName: string | null;
}

// ==========================================
// PIPELINE STAGES CONFIG - Video Outreach
// ==========================================

export const PIPELINE_STAGES = {
  // === ANALISI ===
  DA_ANALIZZARE: { label: "Da Analizzare", icon: "scan-search", color: "amber", group: "analisi" },
  HOT_LEAD: { label: "Hot Lead", icon: "flame", color: "red", group: "analisi" },
  WARM_LEAD: { label: "Warm Lead", icon: "sun", color: "yellow", group: "analisi" },

  // === VIDEO ===
  FARE_VIDEO: { label: "Fare Video", icon: "video", color: "purple", group: "video" },
  VIDEO_INVIATO: { label: "Video Inviato", icon: "send", color: "indigo", group: "video" },

  // === FOLLOW-UP ===
  FOLLOW_UP_1: { label: "Follow-up 1", icon: "repeat", color: "cyan", group: "followup" },
  FOLLOW_UP_2: { label: "Follow-up 2", icon: "repeat", color: "cyan", group: "followup" },
  FOLLOW_UP_3: { label: "Follow-up 3", icon: "repeat", color: "cyan", group: "followup" },

  // === LINKEDIN ===
  LINKEDIN: { label: "LinkedIn", icon: "linkedin", color: "sky", group: "linkedin" },

  // === TELEFONATE ===
  TELEFONATA_1: { label: "Telefonata 1", icon: "phone", color: "teal", group: "telefonate" },
  TELEFONATA_2: { label: "Telefonata 2", icon: "phone", color: "teal", group: "telefonate" },
  TELEFONATA_3: { label: "Telefonata 3", icon: "phone", color: "teal", group: "telefonate" },

  // === VENDITA ===
  CALL_FISSATA: { label: "Call Fissata", icon: "calendar", color: "purple", group: "vendita" },
  IN_TRATTATIVA: { label: "In Trattativa", icon: "handshake", color: "emerald", group: "vendita" },

  // === CHIUSURA ===
  CLIENTE: { label: "Cliente", icon: "trophy", color: "emerald", group: "chiusura" },
  PERSO: { label: "Perso", icon: "x-circle", color: "red", group: "chiusura" },

  // === ARCHIVIO ===
  ARCHIVIATO: { label: "Archiviato", icon: "archive", color: "slate", group: "archivio" },
  NON_TARGET: { label: "Non Target", icon: "x", color: "slate", group: "archivio" },
  SENZA_SITO: { label: "Senza Sito", icon: "globe-off", color: "gray", group: "archivio" },
} as const;

export type PipelineStageKey = keyof typeof PIPELINE_STAGES;

// Gruppi di stage per navigazione e filtri
export const STAGE_GROUPS = {
  analisi: ["DA_ANALIZZARE", "HOT_LEAD", "WARM_LEAD"] as PipelineStageKey[],
  video: ["FARE_VIDEO", "VIDEO_INVIATO"] as PipelineStageKey[],
  followup: ["FOLLOW_UP_1", "FOLLOW_UP_2", "FOLLOW_UP_3"] as PipelineStageKey[],
  linkedin: ["LINKEDIN"] as PipelineStageKey[],
  telefonate: ["TELEFONATA_1", "TELEFONATA_2", "TELEFONATA_3"] as PipelineStageKey[],
  vendita: ["CALL_FISSATA", "IN_TRATTATIVA"] as PipelineStageKey[],
  chiusura: ["CLIENTE", "PERSO"] as PipelineStageKey[],
  archivio: ["ARCHIVIATO", "NON_TARGET", "SENZA_SITO"] as PipelineStageKey[],
} as const;

// ==========================================
// VIDEO SCRIPT DATA
// ==========================================

export interface VideoScriptProblemBlock {
  area: string;       // es. "Tracking", "SEO", "Performance"
  problem: string;    // Il problema specifico
  impact: string;     // Impatto business
}

export interface VideoScriptData {
  compliment: string;                    // Una cosa che funziona bene
  problemBlocks: VideoScriptProblemBlock[]; // 3 blocchi problema dall'audit
  cta: string;                           // Call to action
  generatedAt: string;                   // ISO date
  generatedFrom: {
    auditScore: number;
    commercialTag: string | null;
    danielaNotes: string | null;
  };
}

// ==========================================
// ANALISI STRATEGICA (Teleprompter)
// ==========================================

export interface StrategicAnalysisInput {
  company_name: string;
  home_text: string;
  about_text: string | null;
  services_text: string | null;
  /** Stato Ads certificato da Apify: CONFIRMED | NOT_FOUND | API_ERROR | PENDING */
  ads_status: "CONFIRMED" | "NOT_FOUND" | "API_ERROR" | "PENDING";
  /** Testo della landing page dell'annuncio (se trovato) */
  landing_page_text?: string | null;
  /** URL della landing page dell'annuncio */
  landing_page_url?: string | null;
  /** Copy degli annunci Meta Ads */
  meta_ads_copy?: string[];
  /** Copy dell'annuncio Google Ads */
  google_ad_copy?: string | null;
}

export interface TeleprompterScript {
  atto_1: string;
  atto_2: string;
  atto_3: string;
  atto_4: string;
}

export interface GeminiAnalysisResult {
  cliche_found: string;
  primary_error_pattern: string;
  teleprompter_script: TeleprompterScript;
  strategic_note: string;
  has_active_ads: boolean;
  ads_networks_found: string[];
  generatedAt: string;
  model: string;
  analysisVersion?: string;
  /** Dati Ads Intelligence (passthrough dal check) */
  landing_page_url?: string | null;
  landing_page_text?: string | null;
  google_ad_copy?: string | null;
  meta_ads_copy?: string[];
  /** URL fallback per ricerca manuale */
  ad_library_url?: string | null;
  google_ads_transparency_url?: string | null;
}

// ==========================================
// LOST REASONS CONFIG
// ==========================================

export const LOST_REASONS = {
  NO_INTERESSE: { label: "Non interessato", icon: "thumbs-down" },
  NO_BUDGET: { label: "No budget", icon: "wallet" },
  GHOST_CALL: { label: "Ghost alla call", icon: "ghost" },
  GHOST_OFFERTA: { label: "Ghost dopo offerta", icon: "clock" },
  COMPETITOR: { label: "Scelto competitor", icon: "users" },
  TEMPISTICA: { label: "Tempistica sbagliata", icon: "calendar-x" },
  ALTRO: { label: "Altro", icon: "more-horizontal" },
} as const;

export type LostReasonKey = keyof typeof LOST_REASONS;

// ==========================================
// AUDIT STATUS CONFIG
// ==========================================

export const AUDIT_STATUSES = {
  PENDING: { label: "In attesa", color: "gray" },
  RUNNING: { label: "In analisi...", color: "blue" },
  COMPLETED: { label: "Completato", color: "green" },
  FAILED: { label: "Errore", color: "red" },
  NO_WEBSITE: { label: "Nessun sito", color: "yellow" },
  TIMEOUT: { label: "Timeout", color: "orange" },
} as const;

export type AuditStatusKey = keyof typeof AUDIT_STATUSES;

// ==========================================
// SCORE INTERPRETATION
// ==========================================

export function getScoreCategory(score: number | null): {
  label: string;
  emoji: string;
  color: string;
} {
  if (score === null) {
    return { label: "Non analizzato", emoji: "?", color: "gray" };
  }
  if (score >= 80) {
    return { label: "HOT", emoji: "fire", color: "red" };
  }
  if (score >= 50) {
    return { label: "WARM", emoji: "flame", color: "yellow" };
  }
  return { label: "COLD", emoji: "snowflake", color: "gray" };
}

// ==========================================
// TIPI PER VERIFICA AUDIT (Checklist Daniela)
// ==========================================

export interface VerificationItem {
  key: string;
  label: string;
  hint: string;
  detectedValue: boolean | null; // Cosa ha rilevato l'audit: true=presente, false=assente, null=N/A
  userValue: boolean | null;     // Cosa ha verificato Daniela: true=c'è, false=non c'è, null=non ancora verificato
  checked: boolean;              // true quando Daniela ha dato la sua risposta (Sì o No)
  checkedAt?: string;
}

export interface VerificationChecks {
  items: VerificationItem[];
  notes?: string; // Note/comunicazioni di Daniela
}

// Re-export commercial types
export * from "./commercial";

// Re-export qualification types
export * from "./qualification";
