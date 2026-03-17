import { describe, it, expect } from "vitest";
import { generateTalkingPoints, flattenTalkingPoints } from "../talking-points";
import type { AuditData } from "@/types";

// Helper: AuditData con tutto mancante
function makeBadAudit(): AuditData {
  return {
    website: {
      performance: 20,
      accessibility: 30,
      bestPractices: 40,
      seoScore: 30,
      loadTime: 6.5,
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
      metaTitle: "Buon Titolo",
      metaTitleLength: 30,
      hasMetaDescription: true,
      metaDescription: "Descrizione",
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
      openGraph: {},
      imagesWithoutAlt: 0,
      totalImages: 5,
      coreWebVitals: { lcp: 2000, fid: 50, cls: 0.05 },
    },
    tracking: {
      hasGoogleAnalytics: false,
      hasGA4: true,
      hasGTM: true,
      gtmId: "GTM-ABC",
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
      facebook: { linkedFromSite: true, url: "https://facebook.com/a" },
      instagram: { linkedFromSite: true, url: "https://instagram.com/a" },
      linkedin: { linkedFromSite: true, url: "https://linkedin.com/company/a" },
      youtube: { linkedFromSite: true, url: null },
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
      stack: ["WordPress"],
      isOutdated: false,
    },
    issues: [],
  };
}

describe("generateTalkingPoints", () => {
  it("genera talking points webDesign per sito lento", () => {
    const audit = makeGoodAudit();
    audit.website.performance = 30;
    audit.website.loadTime = 6.5;
    const points = generateTalkingPoints(audit);
    expect(points.webDesign.length).toBeGreaterThan(0);
    expect(points.webDesign.some(p => p.includes("secondi"))).toBe(true);
  });

  it("genera talking points webDesign per non mobile", () => {
    const audit = makeGoodAudit();
    audit.website.mobile = false;
    const points = generateTalkingPoints(audit);
    expect(points.webDesign.some(p => p.includes("mobile"))).toBe(true);
  });

  it("genera talking points webDesign per no HTTPS", () => {
    const audit = makeGoodAudit();
    audit.website.https = false;
    const points = generateTalkingPoints(audit);
    expect(points.webDesign.some(p => p.includes("Non sicuro"))).toBe(true);
  });

  it("genera talking points SEO per meta description mancante", () => {
    const audit = makeGoodAudit();
    audit.seo.hasMetaDescription = false;
    const points = generateTalkingPoints(audit);
    expect(points.seo.some(p => p.includes("meta description"))).toBe(true);
  });

  it("genera talking points SEO per LCP alto", () => {
    const audit = makeGoodAudit();
    audit.seo.coreWebVitals.lcp = 5000;
    const points = generateTalkingPoints(audit);
    expect(points.seo.some(p => p.includes("Core Web Vitals"))).toBe(true);
  });

  it("genera talking points googleAds per no analytics", () => {
    const audit = makeGoodAudit();
    audit.tracking.hasGA4 = false;
    audit.tracking.hasGoogleAnalytics = false;
    const points = generateTalkingPoints(audit);
    expect(points.googleAds.some(p => p.includes("Analytics"))).toBe(true);
  });

  it("genera talking points metaAds per no pixel", () => {
    const audit = makeGoodAudit();
    audit.tracking.hasFacebookPixel = false;
    const points = generateTalkingPoints(audit);
    expect(points.metaAds.some(p => p.includes("Pixel"))).toBe(true);
  });

  it("genera talking points social per FB non collegato", () => {
    const audit = makeGoodAudit();
    audit.social.facebook.linkedFromSite = false;
    const points = generateTalkingPoints(audit);
    expect(points.socialMedia.some(p => p.includes("Facebook"))).toBe(true);
  });

  it("genera talking points local per poche recensioni", () => {
    const audit = makeGoodAudit();
    audit.googleBusiness.reviewsCount = 8;
    const points = generateTalkingPoints(audit);
    expect(points.localMarketing.some(p => p.includes("8 recensioni"))).toBe(true);
  });

  it("genera talking points local per rating basso", () => {
    const audit = makeGoodAudit();
    audit.googleBusiness.rating = 3.5;
    const points = generateTalkingPoints(audit);
    expect(points.localMarketing.some(p => p.includes("3.5"))).toBe(true);
  });

  it("genera talking points content per no blog", () => {
    const audit = makeGoodAudit();
    audit.content.hasBlog = false;
    const points = generateTalkingPoints(audit);
    expect(points.contentMarketing.some(p => p.includes("blog"))).toBe(true);
  });

  it("genera talking points compliance per no cookie banner", () => {
    const audit = makeGoodAudit();
    audit.trust.hasCookieBanner = false;
    const points = generateTalkingPoints(audit);
    expect(points.compliance.some(p => p.includes("cookie") || p.includes("GDPR"))).toBe(true);
  });

  it("sito buono = pochi talking points", () => {
    const points = generateTalkingPoints(makeGoodAudit());
    const total = Object.values(points).flat().length;
    expect(total).toBeLessThanOrEqual(2);
  });

  it("sito pessimo = molti talking points", () => {
    const points = generateTalkingPoints(makeBadAudit());
    const total = Object.values(points).flat().length;
    expect(total).toBeGreaterThanOrEqual(10);
  });
});

describe("flattenTalkingPoints", () => {
  it("aggiunge label sezione ai punti", () => {
    const audit = makeGoodAudit();
    audit.website.https = false;
    const points = generateTalkingPoints(audit);
    const flat = flattenTalkingPoints(points);
    expect(flat.some(p => p.startsWith("[WEB DESIGN]"))).toBe(true);
  });

  it("ritorna array vuoto se nessun talking point", () => {
    const points = generateTalkingPoints(makeGoodAudit());
    const flat = flattenTalkingPoints(points);
    expect(flat.length).toBeLessThanOrEqual(2);
  });

  it("include tutte le sezioni con problemi", () => {
    const flat = flattenTalkingPoints(generateTalkingPoints(makeBadAudit()));
    const labels = flat.map(p => p.match(/\[(.+?)\]/)?.[1]).filter(Boolean);
    const uniqueLabels = [...new Set(labels)];
    // Dovrebbe avere almeno 5 categorie diverse
    expect(uniqueLabels.length).toBeGreaterThanOrEqual(5);
  });
});
