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
// PIPELINE STAGES CONFIG
// ==========================================

export const PIPELINE_STAGES = {
  NEW: { label: "Nuovo", icon: "inbox", color: "gray" },
  TO_CALL: { label: "Da chiamare", icon: "phone", color: "blue" },
  CALLED: { label: "Chiamato", icon: "phone-outgoing", color: "indigo" },
  INTERESTED: { label: "Interessato", icon: "target", color: "green" },
  AUDIT_SENT: { label: "Audit inviato", icon: "file-text", color: "purple" },
  MEETING: { label: "Meeting", icon: "calendar", color: "orange" },
  PROPOSAL: { label: "Preventivo", icon: "file", color: "yellow" },
  WON: { label: "Vinto", icon: "check-circle", color: "emerald" },
  LOST: { label: "Perso", icon: "x-circle", color: "red" },
} as const;

export type PipelineStageKey = keyof typeof PIPELINE_STAGES;

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

// Re-export commercial types
export * from "./commercial";
