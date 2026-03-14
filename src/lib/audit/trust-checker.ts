import * as cheerio from "cheerio";
import type { TrustAudit, WebsiteAudit } from "@/types";

interface TrustCheckResult extends TrustAudit {
  hasContactForm: boolean;
  hasWhatsApp: boolean;
  hasLiveChat: boolean;
}

export function checkTrust(html: string): TrustCheckResult {
  const $ = cheerio.load(html);
  const allText = html.toLowerCase();

  // Cookie banner (pattern comuni)
  const cookiePatterns = [
    /cookie[-_]?banner/i,
    /cookie[-_]?consent/i,
    /cookie[-_]?notice/i,
    /gdpr[-_]?consent/i,
    /iubenda/i,
    /cookiebot/i,
    /onetrust/i,
    /tarteaucitron/i,
    /cookie[-_]?law/i,
    /acceptcookies/i,
  ];
  const hasCookieBanner = cookiePatterns.some((p) => p.test(html));

  // Privacy policy
  const privacyLink = $('a[href*="privacy"], a[href*="informativa"]')
    .first()
    .attr("href");
  const hasPrivacyPolicy = !!privacyLink || /privacy[- ]?policy/i.test(allText);

  // Terms
  const termsLink = $('a[href*="terms"], a[href*="condizioni"]')
    .first()
    .attr("href");
  const hasTerms = !!termsLink || /terms|condizioni/i.test(allText);

  // Testimonials (euristiche)
  const testimonialPatterns = [
    /testimonial/i,
    /recensioni?.clienti/i,
    /customer.review/i,
    /cosa.dicono/i,
    /dicono.di.noi/i,
    /clienti.soddisfatti/i,
  ];
  const hasTestimonials = testimonialPatterns.some((p) => p.test(html));

  // Trust badges
  const trustPatterns = [
    /ssl[- ]?secure/i,
    /pagamento[- ]?sicuro/i,
    /verified/i,
    /certificat/i,
    /badge/i,
    /sicurezza/i,
    /garanzia/i,
  ];
  const hasTrustBadges = trustPatterns.some((p) => p.test(html));

  // Contact form
  const hasContactForm =
    $("form").filter((_, el) => {
      const formHtml = $(el).html() || "";
      return /email|messaggio|message|contatt|nome|name/i.test(formHtml);
    }).length > 0;

  // WhatsApp
  const hasWhatsApp = /wa\.me|whatsapp|api\.whatsapp/i.test(html);

  // Live chat (pattern comuni)
  const chatPatterns = [
    /tawk\.to/i,
    /crisp\.chat/i,
    /intercom/i,
    /drift/i,
    /livechat/i,
    /zendesk/i,
    /hubspot.*chat/i,
    /tidio/i,
    /freshchat/i,
    /olark/i,
  ];
  const hasLiveChat = chatPatterns.some((p) => p.test(html));

  return {
    hasCookieBanner,
    hasPrivacyPolicy,
    privacyPolicyUrl: privacyLink || null,
    hasTerms,
    termsUrl: termsLink || null,
    hasTestimonials,
    hasTrustBadges,
    hasContactForm,
    hasWhatsApp,
    hasLiveChat,
  };
}
