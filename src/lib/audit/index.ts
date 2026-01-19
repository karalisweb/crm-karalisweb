import type { AuditData, WebsiteAudit, SEOAudit, GoogleBusinessAudit } from "@/types";
import { checkSEO } from "./seo-checker";
import { detectTracking } from "./tracking-detector";
import { detectSocialLinks } from "./social-detector";
import { checkTrust } from "./trust-checker";
import { checkBlog } from "./blog-detector";
import { detectEmailMarketing } from "./email-detector";
import { detectTech } from "./tech-detector";
import { calculateOpportunityScore } from "./score-calculator";
import { generateTalkingPoints, flattenTalkingPoints } from "./talking-points";
import { runPageSpeedAnalysis, isPageSpeedConfigured } from "./pagespeed";

interface AuditOptions {
  website: string;
  googleRating?: number | null;
  googleReviewsCount?: number | null;
}

interface AuditResult {
  auditData: AuditData;
  opportunityScore: number;
  talkingPoints: string[];
  issues: string[];
}

/**
 * Esegue un audit completo di un sito web
 */
export async function runFullAudit(options: AuditOptions): Promise<AuditResult> {
  const { website, googleRating, googleReviewsCount } = options;

  // Normalizza URL
  let url = website;
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }

  // Fetch HTML della homepage
  const response = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch website: ${response.status}`);
  }

  const html = await response.text();
  const baseUrl = new URL(url).origin;

  // Esegui tutti i check in parallelo
  // PageSpeed viene eseguito solo se configurato (ha la API key)
  const pageSpeedPromise = isPageSpeedConfigured()
    ? runPageSpeedAnalysis(url, "mobile")
    : Promise.resolve(null);

  const [seoResult, blogResult, pageSpeedResult] = await Promise.all([
    checkSEO(html, baseUrl),
    checkBlog(html, baseUrl),
    pageSpeedPromise,
  ]);

  const trackingResult = detectTracking(html);
  const socialResult = detectSocialLinks(html);
  const trustResult = checkTrust(html);
  const emailResult = detectEmailMarketing(html);
  const techResult = detectTech(html);

  // Costruisci audit data
  // Se PageSpeed e' disponibile, usa i dati reali, altrimenti usa check HTML
  // Per mobile: usa PageSpeed se disponibile, altrimenti il nostro check HTML
  const isMobileFriendly = pageSpeedResult?.mobile ?? seoResult.mobileFriendly ?? false;

  const websiteAudit: WebsiteAudit = {
    performance: pageSpeedResult?.performance ?? 50,
    accessibility: pageSpeedResult?.accessibility ?? 50,
    bestPractices: pageSpeedResult?.bestPractices ?? 50,
    seoScore: pageSpeedResult?.seo ?? 50,
    loadTime: pageSpeedResult?.loadTime ?? 3.0,
    mobile: isMobileFriendly,
    https: url.startsWith("https://"),
    hasContactForm: trustResult.hasContactForm,
    hasWhatsApp: trustResult.hasWhatsApp,
    hasLiveChat: trustResult.hasLiveChat,
  };

  const seoAudit: SEOAudit = {
    hasMetaTitle: seoResult.hasMetaTitle ?? false,
    metaTitle: seoResult.metaTitle ?? null,
    metaTitleLength: seoResult.metaTitleLength ?? 0,
    hasMetaDescription: seoResult.hasMetaDescription ?? false,
    metaDescription: seoResult.metaDescription ?? null,
    metaDescriptionLength: seoResult.metaDescriptionLength ?? 0,
    hasH1: seoResult.hasH1 ?? false,
    h1Count: seoResult.h1Count ?? 0,
    h1Text: seoResult.h1Text ?? [],
    hasSitemap: seoResult.hasSitemap ?? false,
    hasRobotsTxt: seoResult.hasRobotsTxt ?? false,
    hasSchemaMarkup: seoResult.hasSchemaMarkup ?? false,
    hasCanonical: seoResult.hasCanonical ?? false,
    canonicalUrl: seoResult.canonicalUrl ?? null,
    hasOpenGraph: seoResult.hasOpenGraph ?? false,
    openGraph: seoResult.openGraph ?? {},
    imagesWithoutAlt: seoResult.imagesWithoutAlt ?? 0,
    totalImages: seoResult.totalImages ?? 0,
    coreWebVitals: {
      lcp: pageSpeedResult?.largestContentfulPaint ?? 2500,
      fid: pageSpeedResult?.totalBlockingTime ?? 100, // TBT come proxy per FID
      cls: pageSpeedResult?.cumulativeLayoutShift ?? 0.1,
    },
  };

  const googleBusinessAudit: GoogleBusinessAudit = {
    rating: googleRating ?? null,
    reviewsCount: googleReviewsCount ?? null,
    hasPhotos: false,
    photosCount: 0,
  };

  const auditData: AuditData = {
    website: websiteAudit,
    seo: seoAudit,
    tracking: trackingResult,
    social: socialResult,
    googleBusiness: googleBusinessAudit,
    content: blogResult,
    emailMarketing: emailResult,
    trust: {
      hasCookieBanner: trustResult.hasCookieBanner,
      hasPrivacyPolicy: trustResult.hasPrivacyPolicy,
      privacyPolicyUrl: trustResult.privacyPolicyUrl,
      hasTerms: trustResult.hasTerms,
      termsUrl: trustResult.termsUrl,
      hasTestimonials: trustResult.hasTestimonials,
      hasTrustBadges: trustResult.hasTrustBadges,
    },
    tech: techResult,
    issues: [],
  };

  // Genera lista issues
  const issues: string[] = [];

  if (websiteAudit.performance < 50) {
    issues.push(`Sito lento (performance ${websiteAudit.performance}/100)`);
  }
  if (!websiteAudit.mobile) {
    // Aggiungi dettagli sui problemi mobile se disponibili
    const mobileIssues = seoResult.mobileIssues;
    if (mobileIssues && mobileIssues.length > 0) {
      issues.push(`Non ottimizzato per mobile: ${mobileIssues[0]}`);
    } else {
      issues.push("Non ottimizzato per mobile");
    }
  }
  if (!websiteAudit.https) {
    issues.push("Manca HTTPS");
  }
  if (!seoAudit.hasMetaDescription) {
    issues.push("Manca meta description");
  }
  // Meta title: verifica se è ottimizzato, non solo se esiste
  if (!seoAudit.hasMetaTitle) {
    issues.push("Manca meta title");
  } else if (seoResult.metaTitleOptimized === false) {
    // Title esiste ma non è ottimizzato
    const titleIssues = seoResult.metaTitleIssues;
    if (titleIssues && titleIssues.length > 0) {
      issues.push(`Meta title non ottimizzato: ${titleIssues[0]}`);
    }
  }
  if (!trackingResult.hasGA4 && !trackingResult.hasGoogleAnalytics) {
    issues.push("Nessun analytics installato");
  }
  if (!trackingResult.hasFacebookPixel) {
    issues.push("Manca Facebook Pixel");
  }
  if (!trustResult.hasCookieBanner) {
    issues.push("Manca cookie banner GDPR");
  }
  if (!blogResult.hasBlog) {
    issues.push("Nessun blog");
  } else if (blogResult.daysSinceLastPost && blogResult.daysSinceLastPost > 180) {
    issues.push(`Blog fermo da ${Math.floor(blogResult.daysSinceLastPost / 30)} mesi`);
  }

  auditData.issues = issues;

  // Calcola score
  const opportunityScore = calculateOpportunityScore(auditData);

  // Genera talking points
  const talkingPointsObj = generateTalkingPoints(auditData);
  const talkingPoints = flattenTalkingPoints(talkingPointsObj);

  return {
    auditData,
    opportunityScore,
    talkingPoints,
    issues,
  };
}

export { calculateOpportunityScore } from "./score-calculator";
export { generateTalkingPoints, flattenTalkingPoints } from "./talking-points";
