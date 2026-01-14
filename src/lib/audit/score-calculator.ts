import type { AuditData } from "@/types";

/**
 * Calcola l'opportunity score basato sui problemi rilevati
 * Piu problemi = piu opportunita di vendita = score piu alto
 */
export function calculateOpportunityScore(audit: AuditData): number {
  let score = 0;

  // === SITO WEB (max 25 punti) ===
  if (audit.website.performance < 40) {
    score += 10;
  } else if (audit.website.performance < 70) {
    score += 5;
  }

  if (!audit.website.mobile) {
    score += 10;
  }

  if (!audit.website.https) {
    score += 5;
  }

  if (!audit.website.hasContactForm) {
    score += 3;
  }

  if (!audit.website.hasWhatsApp && !audit.website.hasLiveChat) {
    score += 2;
  }

  // === SEO (max 25 punti) ===
  if (!audit.seo.hasMetaTitle) {
    score += 5;
  }

  if (!audit.seo.hasMetaDescription) {
    score += 5;
  }

  if (!audit.seo.hasH1) {
    score += 3;
  }

  if (!audit.seo.hasSitemap) {
    score += 3;
  }

  if (!audit.seo.hasSchemaMarkup) {
    score += 4;
  }

  if (audit.seo.coreWebVitals.lcp > 4000) {
    score += 5;
  }

  // === TRACKING & ADS (max 20 punti) ===
  if (!audit.tracking.hasGoogleAnalytics && !audit.tracking.hasGA4) {
    score += 8;
  }

  if (!audit.tracking.hasFacebookPixel) {
    score += 6;
  }

  if (!audit.tracking.hasGoogleAdsTag) {
    score += 6;
  }

  // === SOCIAL MEDIA (max 10 punti) ===
  if (!audit.social.facebook.linkedFromSite) {
    score += 3;
  }

  if (!audit.social.instagram.linkedFromSite) {
    score += 3;
  }

  if (!audit.social.linkedin.linkedFromSite) {
    score += 2;
  }

  if (!audit.social.youtube.linkedFromSite) {
    score += 2;
  }

  // === GOOGLE BUSINESS PROFILE (max 10 punti) ===
  if (audit.googleBusiness.rating !== null && audit.googleBusiness.rating < 4.0) {
    score += 4;
  }

  if (
    audit.googleBusiness.reviewsCount !== null &&
    audit.googleBusiness.reviewsCount < 20
  ) {
    score += 4;
  }

  if (
    audit.googleBusiness.reviewsCount !== null &&
    audit.googleBusiness.reviewsCount < 10
  ) {
    score += 2; // Bonus se molto poche
  }

  // === CONTENT (max 5 punti) ===
  if (!audit.content.hasBlog) {
    score += 3;
  } else if (
    audit.content.daysSinceLastPost !== null &&
    audit.content.daysSinceLastPost > 180
  ) {
    score += 3;
  } else if (
    audit.content.daysSinceLastPost !== null &&
    audit.content.daysSinceLastPost > 90
  ) {
    score += 2;
  }

  // === TRUST & COMPLIANCE (max 5 punti) ===
  if (!audit.trust.hasCookieBanner) {
    score += 3;
  }

  if (!audit.trust.hasPrivacyPolicy) {
    score += 2;
  }

  // === EMAIL MARKETING (max 5 punti) ===
  if (!audit.emailMarketing.hasNewsletterForm) {
    score += 3;
  }

  if (!audit.emailMarketing.hasLeadMagnet) {
    score += 2;
  }

  return Math.min(score, 100);
}
