/**
 * Commercial Signals Detector
 * Rileva i 5 segnali commerciali essenziali
 */

import * as cheerio from "cheerio";
import type { CommercialSignals, AdsEvidenceLevel } from "@/types/commercial";
import { detectAdsEvidence, detectLandingAdsSignals } from "./ads-evidence-detector";

interface CommercialSignalsOptions {
  html: string;
  domain: string;
  brandName: string;
  skipSerp?: boolean;  // Se true, non fa la chiamata SERP (risparmio costi)
}

/**
 * Rileva se e' presente tracking (GA, GTM, o Pixel)
 */
function detectTrackingPresent(html: string): boolean {
  // Google Analytics (Universal o GA4)
  const hasGA =
    /UA-\d{4,10}-\d{1,4}/.test(html) ||
    /G-[A-Z0-9]{10,}/.test(html) ||
    /google-analytics\.com/.test(html) ||
    /googletagmanager\.com\/gtag/.test(html);

  // Google Tag Manager
  const hasGTM =
    /GTM-[A-Z0-9]{6,}/.test(html) ||
    /googletagmanager\.com\/gtm\.js/.test(html);

  // Facebook Pixel
  const hasFBPixel =
    /fbq\s*\(/.test(html) ||
    /connect\.facebook\.net.*fbevents/.test(html);

  return hasGA || hasGTM || hasFBPixel;
}

/**
 * Rileva Consent Mode V2 (GDPR compliance per ads)
 * Consent Mode V2 e' richiesto da Google dal Marzo 2024 per il tracking in EU
 */
function detectConsentModeV2(html: string): "yes" | "no" | "uncertain" {
  // Pattern per Consent Mode V2
  const consentModePatterns = [
    // gtag consent default/update
    /gtag\s*\(\s*['"]consent['"]\s*,\s*['"](default|update)['"]/,
    // Consent mode parameters
    /ad_storage|analytics_storage|ad_user_data|ad_personalization/,
    // Google Consent Mode V2 specific
    /consent_mode.*v2/i,
    // Common CMP that support Consent Mode V2
    /cookiebot.*consent/i,
    /iubenda.*consent/i,
    /onetrust.*consent/i,
    /termly.*consent/i,
    /cookiefirst.*consent/i,
  ];

  let matches = 0;
  for (const pattern of consentModePatterns) {
    if (pattern.test(html)) {
      matches++;
    }
  }

  // Rilevazione CMP che supportano nativamente Consent Mode V2
  const cmpV2Support = [
    /cookiebot/i,
    /iubenda/i,
    /onetrust/i,
    /termly/i,
    /cookiefirst/i,
    /usercentrics/i,
    /quantcast/i,
  ];

  const hasCmpV2 = cmpV2Support.some((p) => p.test(html));

  // Se ha CMP che supporta V2 E ha segnali di consent mode
  if (hasCmpV2 && matches >= 1) {
    return "yes";
  }

  // Se ha segnali ma non CMP riconosciuto
  if (matches >= 2) {
    return "yes";
  }

  // Se ha CMP ma non segnali espliciti
  if (hasCmpV2) {
    return "uncertain";
  }

  // Se ha almeno un segnale
  if (matches === 1) {
    return "uncertain";
  }

  return "no";
}

/**
 * Rileva se ci sono CTA chiare (form, telefono, WhatsApp)
 */
function detectCtaClear(html: string): boolean {
  const $ = cheerio.load(html);

  // Form di contatto visibile
  const hasContactForm = $("form").filter((_, el) => {
    const formHtml = $(el).html() || "";
    const formText = $(el).text().toLowerCase();
    return (
      /email|messaggio|message|contatt|richiedi|preventivo|info/i.test(formHtml) ||
      /email|messaggio|contatto|richiedi|preventivo/i.test(formText)
    );
  }).length > 0;

  // Telefono cliccabile (tel:)
  const hasClickablePhone = $('a[href^="tel:"]').length > 0;

  // WhatsApp
  const hasWhatsApp =
    /wa\.me|whatsapp|api\.whatsapp/i.test(html) ||
    $('a[href*="whatsapp"]').length > 0 ||
    $('a[href*="wa.me"]').length > 0;

  // Bottone CTA prominente
  const hasCtaButton = $("button, .btn, .button, a.cta, .cta-button").filter((_, el) => {
    const text = $(el).text().toLowerCase();
    return /contatt|richiedi|prenota|chiama|preventivo|scopri|inizia|prova/i.test(text);
  }).length > 0;

  // Email cliccabile (mailto:)
  const hasClickableEmail = $('a[href^="mailto:"]').length > 0;

  // Almeno 2 elementi CTA presenti = CTA chiara
  const ctaCount = [
    hasContactForm,
    hasClickablePhone,
    hasWhatsApp,
    hasCtaButton,
    hasClickableEmail,
  ].filter(Boolean).length;

  return ctaCount >= 2;
}

/**
 * Rileva se l'offerta e' focalizzata (non generico "contattateci")
 */
function detectOfferFocused(html: string): boolean {
  const $ = cheerio.load(html);

  // Cerca indicatori di offerta specifica
  const offerPatterns = [
    // Prezzi/preventivi
    /\d+\s*[,.]?\d*\s*€/,              // Prezzi in euro
    /€\s*\d+/,                          // Euro prima del numero
    /a partire da|da\s*€|prezzo/i,      // Indicatori prezzo
    /preventivo gratuito/i,
    /richiedi (un )?preventivo/i,

    // Offerte specifiche
    /sconto|offerta|promozione/i,
    /\d+%\s*(di\s*)?sconto/i,

    // Servizi chiari
    /i nostri servizi|servizi offerti|cosa (facciamo|offriamo)/i,
    /listino|catalogo|portfolio/i,

    // Settore specifico (non generico)
    /specializzat[oi]|espert[oi] (in|di)/i,
  ];

  const bodyText = $("body").text();
  const matchCount = offerPatterns.filter((p) => p.test(bodyText) || p.test(html)).length;

  // Cerca anche meta description focalizzata
  const metaDesc = $('meta[name="description"]').attr("content") || "";
  const hasSpecificMeta = /prezz|serviz|specializzat|espert|offr/i.test(metaDesc);

  // Cerca H1/H2 specifici (non generici)
  const headings = $("h1, h2").map((_, el) => $(el).text()).get().join(" ");
  const genericHeadings = /benvenuti|welcome|home|chi siamo|about/i.test(headings);
  const specificHeadings = /serviz|soluzion|prodott|offr|prezz/i.test(headings);

  // Penalizza se troppo generico
  if (genericHeadings && !specificHeadings) {
    return false;
  }

  // Almeno 2 pattern di offerta specifica + meta o heading specifico
  return matchCount >= 2 || (matchCount >= 1 && (hasSpecificMeta || specificHeadings));
}

/**
 * Funzione principale: rileva tutti i 5 segnali commerciali
 */
export async function detectCommercialSignals(
  options: CommercialSignalsOptions
): Promise<CommercialSignals> {
  const { html, domain, brandName, skipSerp = false } = options;
  const errors: string[] = [];

  // 1. Ads Evidence (SERP + Landing)
  let adsEvidence: AdsEvidenceLevel = "none";
  let adsEvidenceReason = "Analisi non completata";

  try {
    const adsResult = await detectAdsEvidence(html, domain, brandName, skipSerp);
    adsEvidence = adsResult.level;
    adsEvidenceReason = adsResult.reason;
  } catch (error) {
    errors.push(`Errore ads_evidence: ${error instanceof Error ? error.message : "unknown"}`);
    // Fallback: usa solo landing signals
    const landingSignals = detectLandingAdsSignals(html);
    if (landingSignals.hasConversionTracking) {
      adsEvidence = "strong";
      adsEvidenceReason = "Conversion tracking presente";
    } else if (landingSignals.hasGoogleAdsTag || landingSignals.hasFacebookPixel) {
      adsEvidence = "medium";
      adsEvidenceReason = "Tag ads presente (SERP check fallito)";
    }
  }

  // 2. Tracking presente
  const trackingPresent = detectTrackingPresent(html);

  // 3. Consent Mode V2
  const consentModeV2 = detectConsentModeV2(html);

  // 4. CTA chiara
  const ctaClear = detectCtaClear(html);

  // 5. Offerta focalizzata
  const offerFocused = detectOfferFocused(html);

  return {
    adsEvidence,
    adsEvidenceReason,
    trackingPresent,
    consentModeV2,
    ctaClear,
    offerFocused,
    analyzedAt: new Date().toISOString(),
    errors: errors.length > 0 ? errors : undefined,
  };
}
