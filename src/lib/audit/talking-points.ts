import type { AuditData, TalkingPointsByService } from "@/types";

/**
 * Genera talking points per la chiamata commerciale
 * organizzati per servizio vendibile
 */
export function generateTalkingPoints(audit: AuditData): TalkingPointsByService {
  const points: TalkingPointsByService = {
    webDesign: [],
    seo: [],
    googleAds: [],
    metaAds: [],
    socialMedia: [],
    localMarketing: [],
    contentMarketing: [],
    emailMarketing: [],
    compliance: [],
  };

  // === WEB DESIGN ===
  if (audit.website.performance < 50) {
    points.webDesign.push(
      `Il vostro sito carica in ${audit.website.loadTime.toFixed(1)} secondi - ` +
        `il 53% degli utenti abbandona dopo 3 secondi`
    );
  }

  if (!audit.website.mobile) {
    points.webDesign.push(
      `Il sito non e ottimizzato per mobile - ` +
        `il 60% delle ricerche oggi e da smartphone`
    );
  }

  if (!audit.website.https) {
    points.webDesign.push(
      `Il sito mostra "Non sicuro" su Chrome - ` +
        `questo spaventa i clienti e Google vi penalizza`
    );
  }

  if (!audit.website.hasContactForm) {
    points.webDesign.push(
      `Non c'e un form di contatto ben visibile - ` +
        `i clienti non sanno come raggiungervi facilmente`
    );
  }

  if (!audit.website.hasWhatsApp && !audit.website.hasLiveChat) {
    points.webDesign.push(
      `Manca un canale di contatto immediato come WhatsApp o chat - ` +
        `i clienti vogliono risposte veloci`
    );
  }

  // === SEO ===
  if (!audit.seo.hasMetaDescription) {
    points.seo.push(
      `Manca la meta description - nei risultati Google ` +
        `apparite con testo casuale invece di un messaggio efficace`
    );
  }

  if (!audit.seo.hasMetaTitle) {
    points.seo.push(
      `Manca il meta title - Google non sa di cosa parla il vostro sito`
    );
  }

  if (audit.seo.coreWebVitals.lcp > 4000) {
    points.seo.push(`Core Web Vitals rossi - Google vi penalizza nel ranking`);
  }

  if (!audit.seo.hasSchemaMarkup) {
    points.seo.push(
      `Nessuno schema markup - non apparite con rich snippet ` +
        `come stelline e prezzi nei risultati Google`
    );
  }

  if (!audit.seo.hasSitemap) {
    points.seo.push(
      `Manca la sitemap.xml - Google potrebbe non indicizzare ` +
        `tutte le vostre pagine`
    );
  }

  if (!audit.seo.hasH1) {
    points.seo.push(
      `Manca il tag H1 - la struttura della pagina confonde i motori di ricerca`
    );
  }

  // === GOOGLE ADS ===
  if (!audit.tracking.hasGA4 && !audit.tracking.hasGoogleAnalytics) {
    points.googleAds.push(
      `Nessun Google Analytics - non sapete quanti visitatori avete ` +
        `ne cosa fanno sul sito`
    );
  }

  if (!audit.tracking.hasGoogleAdsTag) {
    points.googleAds.push(
      `Nessun tracking Google Ads - se fate campagne, ` +
        `non sapete quali convertono`
    );
  }

  if (!audit.tracking.hasGTM) {
    points.googleAds.push(
      `Nessun Google Tag Manager - la gestione dei tag e inefficiente ` +
        `e richiede modifiche al codice per ogni tracciamento`
    );
  }

  // === META ADS ===
  if (!audit.tracking.hasFacebookPixel) {
    points.metaAds.push(
      `Nessun Facebook Pixel - non potete fare remarketing ` +
        `ne tracciare conversioni da Meta`
    );
  }

  // === SOCIAL MEDIA ===
  if (!audit.social.facebook.linkedFromSite) {
    points.socialMedia.push(
      `Facebook non collegato al sito - perdete traffico social`
    );
  }

  if (!audit.social.instagram.linkedFromSite) {
    points.socialMedia.push(`Instagram non collegato al sito`);
  }

  if (!audit.social.linkedin.linkedFromSite) {
    points.socialMedia.push(
      `LinkedIn non collegato - perdete opportunita B2B`
    );
  }

  // === LOCAL MARKETING (GOOGLE BUSINESS) ===
  if (
    audit.googleBusiness.reviewsCount !== null &&
    audit.googleBusiness.reviewsCount < 20
  ) {
    points.localMarketing.push(
      `Solo ${audit.googleBusiness.reviewsCount} recensioni Google - ` +
        `i competitor ne hanno molte di piu`
    );
  }

  if (
    audit.googleBusiness.rating !== null &&
    audit.googleBusiness.rating < 4.0
  ) {
    points.localMarketing.push(
      `Rating ${audit.googleBusiness.rating} stelle - sotto la soglia ` +
        `psicologica di 4.0, molti clienti scartano a priori`
    );
  }

  // === CONTENT MARKETING ===
  if (!audit.content.hasBlog) {
    points.contentMarketing.push(
      `Nessun blog - perdete traffico SEO ogni giorno`
    );
  } else if (
    audit.content.daysSinceLastPost !== null &&
    audit.content.daysSinceLastPost > 180
  ) {
    points.contentMarketing.push(
      `Blog fermo da ${Math.floor(audit.content.daysSinceLastPost / 30)} mesi - ` +
        `perdete posizionamento organico`
    );
  } else if (
    audit.content.daysSinceLastPost !== null &&
    audit.content.daysSinceLastPost > 90
  ) {
    points.contentMarketing.push(
      `Ultimo post sul blog da oltre 3 mesi - ` +
        `la frequenza di pubblicazione e bassa`
    );
  }

  // === EMAIL MARKETING ===
  if (!audit.emailMarketing.hasNewsletterForm) {
    points.emailMarketing.push(
      `Nessun form newsletter - ogni visitatore che se ne va ` +
        `e un contatto perso per sempre`
    );
  }

  if (!audit.emailMarketing.hasLeadMagnet) {
    points.emailMarketing.push(
      `Nessun lead magnet - manca un incentivo per lasciare l'email`
    );
  }

  // === COMPLIANCE ===
  if (!audit.trust.hasCookieBanner) {
    points.compliance.push(
      `Manca cookie banner GDPR - rischiate sanzioni ` +
        `fino al 4% del fatturato`
    );
  }

  if (!audit.trust.hasPrivacyPolicy) {
    points.compliance.push(`Privacy policy mancante o non raggiungibile`);
  }

  if (!audit.trust.hasTerms) {
    points.compliance.push(`Mancano i termini e condizioni di servizio`);
  }

  return points;
}

/**
 * Genera un array flat di tutti i talking points per il database
 */
export function flattenTalkingPoints(points: TalkingPointsByService): string[] {
  const result: string[] = [];

  const sections = [
    { key: "webDesign", label: "WEB DESIGN" },
    { key: "seo", label: "SEO" },
    { key: "googleAds", label: "GOOGLE ADS" },
    { key: "metaAds", label: "META ADS" },
    { key: "socialMedia", label: "SOCIAL MEDIA" },
    { key: "localMarketing", label: "LOCAL MARKETING" },
    { key: "contentMarketing", label: "CONTENT MARKETING" },
    { key: "emailMarketing", label: "EMAIL MARKETING" },
    { key: "compliance", label: "COMPLIANCE" },
  ];

  for (const section of sections) {
    const sectionPoints = points[section.key as keyof TalkingPointsByService];
    if (sectionPoints.length > 0) {
      for (const point of sectionPoints) {
        result.push(`[${section.label}] ${point}`);
      }
    }
  }

  return result;
}

/**
 * Genera il suggerimento di apertura chiamata
 */
export function generateCallOpener(
  audit: AuditData,
  leadName: string,
  agencyName: string = "la nostra agenzia"
): string {
  // Trova il problema piu urgente
  let urgentIssue = "";
  let issueCount = 0;

  // Conta problemi totali
  const allPoints = generateTalkingPoints(audit);
  for (const points of Object.values(allPoints)) {
    issueCount += points.length;
  }

  if (audit.website.performance < 50) {
    urgentIssue = `il sito carica in ${audit.website.loadTime.toFixed(1)} secondi, il triplo del tempo massimo consigliato`;
  } else if (!audit.website.https) {
    urgentIssue = `il sito mostra "Non sicuro" su Chrome`;
  } else if (!audit.tracking.hasGA4 && !audit.tracking.hasGoogleAnalytics) {
    urgentIssue = `non avete nessun sistema di analytics per tracciare i visitatori`;
  } else if (!audit.trust.hasCookieBanner) {
    urgentIssue = `manca il cookie banner GDPR obbligatorio`;
  } else if (!audit.seo.hasMetaDescription) {
    urgentIssue = `il sito non ha una meta description ottimizzata per Google`;
  }

  if (!urgentIssue) {
    urgentIssue = "diversi aspetti tecnici che possono essere migliorati";
  }

  return (
    `Buongiorno, sono [Nome] di ${agencyName}. ` +
    `Ho fatto un'analisi gratuita del vostro sito e ho trovato ${issueCount} aree di miglioramento ` +
    `che vi stanno facendo perdere clienti. La piu urgente: ${urgentIssue}. ` +
    `Ha 10 minuti per vedere il report insieme?`
  );
}
