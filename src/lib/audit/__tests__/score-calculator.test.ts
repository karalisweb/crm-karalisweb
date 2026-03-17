import { describe, it, expect } from "vitest";
import { calculateOpportunityScore } from "../score-calculator";
import type { AuditData } from "@/types";

// Helper: crea un AuditData completo con valori "buoni" (score basso)
function makeGoodAudit(): AuditData {
  return {
    website: {
      performance: 90,
      accessibility: 90,
      bestPractices: 90,
      seoScore: 90,
      loadTime: 1.5,
      mobile: true,
      https: true,
      hasContactForm: true,
      hasWhatsApp: true,
      hasLiveChat: false,
    },
    seo: {
      hasMetaTitle: true,
      metaTitle: "Buon Titolo | Azienda",
      metaTitleLength: 30,
      hasMetaDescription: true,
      metaDescription: "Una bella descrizione",
      metaDescriptionLength: 50,
      hasH1: true,
      h1Count: 1,
      h1Text: ["Titolo"],
      hasSitemap: true,
      hasRobotsTxt: true,
      hasSchemaMarkup: true,
      hasCanonical: true,
      canonicalUrl: "https://example.com",
      hasOpenGraph: true,
      openGraph: { title: "Test" },
      imagesWithoutAlt: 0,
      totalImages: 5,
      coreWebVitals: { lcp: 2000, fid: 50, cls: 0.05 },
    },
    tracking: {
      hasGoogleAnalytics: false,
      hasGA4: true,
      hasGTM: true,
      gtmId: "GTM-ABC123",
      hasFacebookPixel: true,
      fbPixelId: "123",
      hasGoogleAdsTag: true,
      googleAdsId: "AW-123",
      hasConversionTracking: true,
      hasHotjar: false,
      hasClarity: false,
      hasLinkedInInsight: false,
      hasTikTokPixel: false,
    },
    social: {
      facebook: { linkedFromSite: true, url: "https://facebook.com/azienda" },
      instagram: { linkedFromSite: true, url: "https://instagram.com/azienda" },
      linkedin: { linkedFromSite: true, url: "https://linkedin.com/company/azienda" },
      youtube: { linkedFromSite: true, url: "https://youtube.com/@azienda" },
      tiktok: { linkedFromSite: false, url: null },
      twitter: { linkedFromSite: false, url: null },
    },
    googleBusiness: {
      rating: 4.5,
      reviewsCount: 50,
      hasPhotos: true,
      photosCount: 20,
    },
    content: {
      hasBlog: true,
      blogUrl: "/blog",
      lastPostDate: new Date().toISOString().split("T")[0],
      daysSinceLastPost: 10,
      estimatedPostCount: 20,
    },
    emailMarketing: {
      hasNewsletterForm: true,
      hasPopup: false,
      hasLeadMagnet: true,
      emailProvider: "Mailchimp",
    },
    trust: {
      hasCookieBanner: true,
      hasPrivacyPolicy: true,
      privacyPolicyUrl: "/privacy",
      hasTerms: true,
      termsUrl: "/terms",
      hasTestimonials: true,
      hasTrustBadges: true,
    },
    tech: {
      cms: "WordPress",
      cmsVersion: "6.4",
      phpVersion: null,
      stack: ["WordPress", "Bootstrap"],
      isOutdated: false,
    },
    issues: [],
  };
}

// Helper: crea un AuditData con tutto "rotto" (score alto)
function makeBadAudit(): AuditData {
  return {
    website: {
      performance: 20,
      accessibility: 30,
      bestPractices: 40,
      seoScore: 30,
      loadTime: 8,
      mobile: false,
      https: false,
      hasContactForm: false,
      hasWhatsApp: false,
      hasLiveChat: false,
    },
    seo: {
      hasMetaTitle: false,
      metaTitle: null,
      metaTitleLength: 0,
      hasMetaDescription: false,
      metaDescription: null,
      metaDescriptionLength: 0,
      hasH1: false,
      h1Count: 0,
      h1Text: [],
      hasSitemap: false,
      hasRobotsTxt: false,
      hasSchemaMarkup: false,
      hasCanonical: false,
      canonicalUrl: null,
      hasOpenGraph: false,
      openGraph: {},
      imagesWithoutAlt: 10,
      totalImages: 10,
      coreWebVitals: { lcp: 6000, fid: 300, cls: 0.5 },
    },
    tracking: {
      hasGoogleAnalytics: false,
      hasGA4: false,
      hasGTM: false,
      gtmId: null,
      hasFacebookPixel: false,
      fbPixelId: null,
      hasGoogleAdsTag: false,
      googleAdsId: null,
      hasConversionTracking: false,
      hasHotjar: false,
      hasClarity: false,
      hasLinkedInInsight: false,
      hasTikTokPixel: false,
    },
    social: {
      facebook: { linkedFromSite: false, url: null },
      instagram: { linkedFromSite: false, url: null },
      linkedin: { linkedFromSite: false, url: null },
      youtube: { linkedFromSite: false, url: null },
      tiktok: { linkedFromSite: false, url: null },
      twitter: { linkedFromSite: false, url: null },
    },
    googleBusiness: {
      rating: 3.2,
      reviewsCount: 5,
      hasPhotos: false,
      photosCount: 0,
    },
    content: {
      hasBlog: false,
      blogUrl: null,
      lastPostDate: null,
      daysSinceLastPost: null,
      estimatedPostCount: 0,
    },
    emailMarketing: {
      hasNewsletterForm: false,
      hasPopup: false,
      hasLeadMagnet: false,
      emailProvider: null,
    },
    trust: {
      hasCookieBanner: false,
      hasPrivacyPolicy: false,
      privacyPolicyUrl: null,
      hasTerms: false,
      termsUrl: null,
      hasTestimonials: false,
      hasTrustBadges: false,
    },
    tech: {
      cms: null,
      cmsVersion: null,
      phpVersion: null,
      stack: [],
      isOutdated: false,
    },
    issues: [],
  };
}

describe("calculateOpportunityScore", () => {
  it("sito perfetto = score 0", () => {
    const score = calculateOpportunityScore(makeGoodAudit());
    expect(score).toBe(0);
  });

  it("sito con tutti i problemi = score 100 (cap)", () => {
    const score = calculateOpportunityScore(makeBadAudit());
    expect(score).toBe(100);
  });

  it("score mai superiore a 100", () => {
    const score = calculateOpportunityScore(makeBadAudit());
    expect(score).toBeLessThanOrEqual(100);
  });

  // Website scoring
  it("performance < 40 = +10 punti", () => {
    const audit = makeGoodAudit();
    audit.website.performance = 30;
    expect(calculateOpportunityScore(audit)).toBe(10);
  });

  it("performance 40-69 = +5 punti", () => {
    const audit = makeGoodAudit();
    audit.website.performance = 60;
    expect(calculateOpportunityScore(audit)).toBe(5);
  });

  it("performance >= 70 = 0 punti", () => {
    const audit = makeGoodAudit();
    audit.website.performance = 85;
    expect(calculateOpportunityScore(audit)).toBe(0);
  });

  it("non mobile = +10 punti", () => {
    const audit = makeGoodAudit();
    audit.website.mobile = false;
    expect(calculateOpportunityScore(audit)).toBe(10);
  });

  it("no https = +5 punti", () => {
    const audit = makeGoodAudit();
    audit.website.https = false;
    expect(calculateOpportunityScore(audit)).toBe(5);
  });

  it("no contact form = +3 punti", () => {
    const audit = makeGoodAudit();
    audit.website.hasContactForm = false;
    expect(calculateOpportunityScore(audit)).toBe(3);
  });

  it("no whatsapp E no live chat = +2 punti", () => {
    const audit = makeGoodAudit();
    audit.website.hasWhatsApp = false;
    audit.website.hasLiveChat = false;
    expect(calculateOpportunityScore(audit)).toBe(2);
  });

  // SEO scoring
  it("no meta title = +5, no meta desc = +5", () => {
    const audit = makeGoodAudit();
    audit.seo.hasMetaTitle = false;
    audit.seo.hasMetaDescription = false;
    expect(calculateOpportunityScore(audit)).toBe(10);
  });

  it("no schema markup = +4", () => {
    const audit = makeGoodAudit();
    audit.seo.hasSchemaMarkup = false;
    expect(calculateOpportunityScore(audit)).toBe(4);
  });

  it("LCP > 4000 = +5", () => {
    const audit = makeGoodAudit();
    audit.seo.coreWebVitals.lcp = 5000;
    expect(calculateOpportunityScore(audit)).toBe(5);
  });

  // Tracking scoring
  it("no GA e no GA4 = +8", () => {
    const audit = makeGoodAudit();
    audit.tracking.hasGA4 = false;
    audit.tracking.hasGoogleAnalytics = false;
    expect(calculateOpportunityScore(audit)).toBe(8);
  });

  it("no FB Pixel = +6", () => {
    const audit = makeGoodAudit();
    audit.tracking.hasFacebookPixel = false;
    expect(calculateOpportunityScore(audit)).toBe(6);
  });

  it("no Google Ads tag = +6", () => {
    const audit = makeGoodAudit();
    audit.tracking.hasGoogleAdsTag = false;
    expect(calculateOpportunityScore(audit)).toBe(6);
  });

  // Google Business scoring
  it("rating < 4.0 = +4", () => {
    const audit = makeGoodAudit();
    audit.googleBusiness.rating = 3.5;
    expect(calculateOpportunityScore(audit)).toBe(4);
  });

  it("reviewsCount < 20 = +4", () => {
    const audit = makeGoodAudit();
    audit.googleBusiness.reviewsCount = 15;
    expect(calculateOpportunityScore(audit)).toBe(4);
  });

  it("reviewsCount < 10 = +4 + +2 bonus = +6", () => {
    const audit = makeGoodAudit();
    audit.googleBusiness.reviewsCount = 5;
    expect(calculateOpportunityScore(audit)).toBe(6);
  });

  it("rating null = 0 punti (non penalizza)", () => {
    const audit = makeGoodAudit();
    audit.googleBusiness.rating = null;
    audit.googleBusiness.reviewsCount = null;
    expect(calculateOpportunityScore(audit)).toBe(0);
  });

  // Content scoring
  it("no blog = +3", () => {
    const audit = makeGoodAudit();
    audit.content.hasBlog = false;
    expect(calculateOpportunityScore(audit)).toBe(3);
  });

  it("blog fermo > 180 giorni = +3", () => {
    const audit = makeGoodAudit();
    audit.content.daysSinceLastPost = 200;
    expect(calculateOpportunityScore(audit)).toBe(3);
  });

  it("blog fermo 90-180 giorni = +2", () => {
    const audit = makeGoodAudit();
    audit.content.daysSinceLastPost = 120;
    expect(calculateOpportunityScore(audit)).toBe(2);
  });

  // Trust scoring
  it("no cookie banner = +3", () => {
    const audit = makeGoodAudit();
    audit.trust.hasCookieBanner = false;
    expect(calculateOpportunityScore(audit)).toBe(3);
  });

  it("no privacy policy = +2", () => {
    const audit = makeGoodAudit();
    audit.trust.hasPrivacyPolicy = false;
    expect(calculateOpportunityScore(audit)).toBe(2);
  });

  // Email scoring
  it("no newsletter = +3", () => {
    const audit = makeGoodAudit();
    audit.emailMarketing.hasNewsletterForm = false;
    expect(calculateOpportunityScore(audit)).toBe(3);
  });

  it("no lead magnet = +2", () => {
    const audit = makeGoodAudit();
    audit.emailMarketing.hasLeadMagnet = false;
    expect(calculateOpportunityScore(audit)).toBe(2);
  });

  // Combinazioni
  it("score cumulativo corretto: no SEO + no tracking", () => {
    const audit = makeGoodAudit();
    audit.seo.hasMetaTitle = false;       // +5
    audit.seo.hasMetaDescription = false;  // +5
    audit.tracking.hasGA4 = false;
    audit.tracking.hasGoogleAnalytics = false; // +8
    expect(calculateOpportunityScore(audit)).toBe(18);
  });
});
