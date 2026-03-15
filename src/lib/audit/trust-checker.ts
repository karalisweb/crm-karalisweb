import * as cheerio from "cheerio";
import type { TrustAudit, WebsiteAudit } from "@/types";

interface TrustCheckResult extends TrustAudit {
  hasContactForm: boolean;
  hasWhatsApp: boolean;
  whatsappNumber: string | null;
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

  // WhatsApp — rileva presenza E estrai numero
  const hasWhatsApp = /wa\.me|whatsapp|api\.whatsapp/i.test(html);
  let whatsappNumber: string | null = null;

  // Estrai numero da wa.me/NUMERO
  const waLinks = $('a[href*="wa.me"], a[href*="whatsapp.com"]');
  waLinks.each((_, el) => {
    if (whatsappNumber) return; // gia trovato
    const href = $(el).attr("href") || "";
    // Pattern: wa.me/39XXXXXXXXXX o api.whatsapp.com/send?phone=39XXXXXXXXXX
    const waMatch = href.match(/wa\.me\/(\d{10,15})/);
    if (waMatch) {
      whatsappNumber = waMatch[1];
      return;
    }
    const apiMatch = href.match(/phone=(\d{10,15})/);
    if (apiMatch) {
      whatsappNumber = apiMatch[1];
      return;
    }
  });

  // Fallback: cerca nel testo HTML per pattern wa.me/NUMERO non in link
  if (!whatsappNumber) {
    const textMatch = html.match(/wa\.me\/(\d{10,15})/);
    if (textMatch) {
      whatsappNumber = textMatch[1];
    }
  }

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
    whatsappNumber,
    hasLiveChat,
  };
}
