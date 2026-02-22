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
  // === SCOUTING ===
  NUOVO: { label: "Nuovo", icon: "inbox", color: "gray", group: "scouting" },

  // === QUALIFICAZIONE ===
  DA_QUALIFICARE: { label: "Da qualificare", icon: "clipboard-check", color: "amber", group: "qualificazione" },
  QUALIFICATO: { label: "Qualificato", icon: "user-check", color: "blue", group: "qualificazione" },

  // === OUTREACH ===
  VIDEO_DA_FARE: { label: "Video da fare", icon: "video", color: "purple", group: "outreach" },
  VIDEO_INVIATO: { label: "Video inviato", icon: "send", color: "indigo", group: "outreach" },
  LETTERA_INVIATA: { label: "Lettera inviata", icon: "mail", color: "cyan", group: "outreach" },
  FOLLOW_UP_LINKEDIN: { label: "Follow-up LinkedIn", icon: "linkedin", color: "sky", group: "outreach" },

  // === VENDITA ===
  RISPOSTO: { label: "Ha risposto", icon: "message-circle", color: "green", group: "vendita" },
  CALL_FISSATA: { label: "Call fissata", icon: "calendar", color: "purple", group: "vendita" },
  IN_CONVERSAZIONE: { label: "In conversazione", icon: "messages-square", color: "teal", group: "vendita" },
  PROPOSTA_INVIATA: { label: "Proposta inviata", icon: "file-text", color: "yellow", group: "vendita" },
  VINTO: { label: "Cliente", icon: "trophy", color: "emerald", group: "vendita" },
  PERSO: { label: "Perso", icon: "x-circle", color: "red", group: "vendita" },

  // === ARCHIVIO ===
  DA_RICHIAMARE_6M: { label: "Richiamare tra 6 mesi", icon: "clock", color: "orange", group: "archivio" },
  RICICLATO: { label: "Riciclato", icon: "recycle", color: "slate", group: "archivio" },
  NON_TARGET: { label: "Non target", icon: "x", color: "slate", group: "archivio" },
  SENZA_SITO: { label: "Senza sito", icon: "globe-off", color: "gray", group: "archivio" },
} as const;

export type PipelineStageKey = keyof typeof PIPELINE_STAGES;

// Gruppi di stage per navigazione e filtri
export const STAGE_GROUPS = {
  scouting: ["NUOVO"] as PipelineStageKey[],
  qualificazione: ["DA_QUALIFICARE", "QUALIFICATO"] as PipelineStageKey[],
  outreach: ["VIDEO_DA_FARE", "VIDEO_INVIATO", "LETTERA_INVIATA", "FOLLOW_UP_LINKEDIN"] as PipelineStageKey[],
  vendita: ["RISPOSTO", "CALL_FISSATA", "IN_CONVERSAZIONE", "PROPOSTA_INVIATA", "VINTO", "PERSO"] as PipelineStageKey[],
  archivio: ["DA_RICHIAMARE_6M", "RICICLATO", "NON_TARGET", "SENZA_SITO"] as PipelineStageKey[],
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
    return { label: "Hot lead", emoji: "fire", color: "red" };
  }
  if (score >= 60) {
    return { label: "Buon potenziale", emoji: "thumbs-up", color: "green" };
  }
  if (score >= 40) {
    return { label: "Potenziale medio", emoji: "ok-hand", color: "yellow" };
  }
  return { label: "Bassa priorita", emoji: "snowflake", color: "blue" };
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
