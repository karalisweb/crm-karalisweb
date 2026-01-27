import type { AuditData } from "@/types";
import type { CommercialSignals } from "@/types/commercial";

/**
 * Talking Points per MSD (Metodo Strategico Digitale)
 *
 * OBIETTIVO: Aprire la porta per l'intervista strategica delle 49 domande
 * NON vendere servizi operativi (SEO, ads, siti)
 *
 * Il gancio e': "Vedo che investite, ma avete una strategia chiara?"
 */

// ============================================
// NUOVA STRUTTURA: Talking Points per MSD
// ============================================

export interface MSDTalkingPoints {
  // Gancio principale basato sui segnali commerciali
  mainHook: string;

  // Domande strategiche da porre (non affermazioni tecniche)
  strategicQuestions: string[];

  // Osservazioni concrete (evidenze dal sito, non giudizi)
  observations: string[];

  // Proposta di valore MSD
  msdPitch: string;
}

/**
 * Genera talking points orientati al MSD
 * Basato sui segnali commerciali + audit tecnico come contesto
 *
 * INTEGRA TUTTI I SEGNALI:
 * - Ads Evidence (Google Ads, conversioni, remarketing)
 * - Meta Ads (Facebook Pixel, eventi)
 * - Tracking (GA4, GTM, Hotjar, Clarity)
 * - Social (FB, IG, LinkedIn, YouTube, TikTok)
 * - Content (Blog, frequenza post)
 * - Email Marketing (Newsletter, Lead Magnet)
 * - Google Business (Rating, Recensioni)
 * - Trust (GDPR, Privacy, Cookie Banner)
 * - Tech Stack (CMS, versione)
 * - Consent Mode V2
 */
export function generateMSDTalkingPoints(
  commercialSignals: CommercialSignals | null,
  audit: AuditData
): MSDTalkingPoints {
  const questions: string[] = [];
  const observations: string[] = [];

  // === GANCIO PRINCIPALE basato su adsEvidence ===
  let mainHook = "";

  if (commercialSignals) {
    const { adsEvidence, trackingPresent, ctaClear, consentModeV2, offerFocused } = commercialSignals;

    if (adsEvidence === "strong" || adsEvidence === "medium") {
      // Fanno ads - il gancio e' sulla misurazione
      if (!trackingPresent) {
        mainHook = "Vedo che state investendo in advertising, ma non riesco a capire come misurate i risultati. Avete una strategia chiara per sapere cosa funziona e cosa no?";
        questions.push("Quanto state investendo mensilmente in advertising?");
        questions.push("Sapete quale canale vi porta piu' clienti?");
        questions.push("Come decidete se aumentare o diminuire il budget?");
      } else if (!ctaClear) {
        mainHook = "Vedo che portate traffico al sito, ma il percorso del visitatore non mi sembra chiaro. Avete definito cosa volete che faccia chi arriva?";
        questions.push("Qual e' l'azione principale che volete far fare ai visitatori?");
        questions.push("Quanti contatti/richieste ricevete dal sito ogni mese?");
        questions.push("Siete soddisfatti del tasso di conversione?");
      } else if (!offerFocused) {
        mainHook = "Vedo che avete struttura tecnica e traffico, ma l'offerta sul sito mi sembra generica. Avete definito chiaramente cosa vi differenzia dai competitor?";
        questions.push("Qual e' il vostro cliente ideale?");
        questions.push("Perche' dovrebbero scegliere voi invece di un competitor?");
        questions.push("Avete un'offerta specifica che comunicate online?");
      } else {
        mainHook = "Vedo che avete una presenza digital strutturata. Mi chiedo: avete mai fatto un'analisi strategica completa per capire se state andando nella direzione giusta?";
        questions.push("Come avete deciso la vostra strategia attuale?");
        questions.push("Ogni quanto la rivedete?");
        questions.push("Sapete esattamente perche' i clienti vi scelgono rispetto ai competitor?");
      }

      // Osservazioni concrete su ads
      if (audit.tracking.hasGoogleAdsTag) {
        observations.push("Tag Google Ads installato - state facendo campagne Search o Display");
      }
      if (consentModeV2 === "no") {
        observations.push("Consent Mode V2 non configurato - da Marzo 2024 Google lo richiede per tracciare le conversioni");
      }
    } else if (adsEvidence === "weak") {
      // Segnali deboli - potrebbero aver fatto ads in passato
      mainHook = "Vedo che avete un'infrastruttura di tracking configurata. State facendo o avete fatto advertising in passato? Come sta andando?";
      questions.push("Avete mai investito in advertising online?");
      questions.push("Se si', perche' avete smesso? Se no, cosa vi ha frenato?");
      questions.push("Come acquisite clienti oggi?");

      if (audit.tracking.hasGTM) {
        observations.push(`GTM configurato (${audit.tracking.gtmId || "presente"}) - segno di maturita' digitale`);
      }
    } else {
      // Nessuna evidenza ads
      mainHook = "Non vedo segnali di investimento in advertising. Come acquisite nuovi clienti oggi? Avete mai valutato una strategia digital strutturata?";
      questions.push("Da dove arrivano i vostri clienti oggi?");
      questions.push("Avete mai provato advertising online?");
      questions.push("Cosa vi ha frenato dall'investire in digital?");
    }
  } else {
    // Fallback se non ci sono segnali commerciali
    mainHook = "Ho analizzato il vostro sito e mi sono chiesto: avete una strategia digital definita o state procedendo per tentativi?";
    questions.push("Come avete costruito la vostra presenza online?");
    questions.push("Siete soddisfatti dei risultati?");
  }

  // =====================================================
  // === OSSERVAZIONI COMPLETE DA TUTTI I SEGNALI ===
  // =====================================================

  // --- 1. ANALYTICS & TRACKING ---
  if (audit.tracking.hasGA4) {
    observations.push("Google Analytics 4 configurato");
  } else if (audit.tracking.hasGoogleAnalytics) {
    observations.push("Google Analytics presente ma versione Universal (obsoleta dal Luglio 2023)");
    questions.push("Sapete che Universal Analytics non raccoglie piu' dati? Avete migrato a GA4?");
  } else {
    observations.push("Nessun sistema di analytics rilevato - non state misurando il traffico");
    questions.push("Come fate a sapere quante persone visitano il sito e cosa fanno?");
  }

  if (audit.tracking.hasGTM) {
    observations.push(`Google Tag Manager presente (${audit.tracking.gtmId || "configurato"})`);
  }

  if (audit.tracking.hasHotjar) {
    observations.push("Hotjar installato - state analizzando il comportamento utenti");
  }
  if (audit.tracking.hasClarity) {
    observations.push("Microsoft Clarity installato - state analizzando le sessioni");
  }

  // --- 2. META ADS / FACEBOOK ---
  if (audit.tracking.hasFacebookPixel) {
    observations.push(`Facebook Pixel attivo (${audit.tracking.fbPixelId || "configurato"}) - state facendo o avete fatto Meta Ads`);
    if (!questions.some(q => q.includes("Meta") || q.includes("Facebook"))) {
      questions.push("Come stanno andando le campagne su Facebook/Instagram?");
      questions.push("Riuscite a misurare il ritorno sull'investimento Meta?");
    }
  } else {
    observations.push("Nessun Facebook Pixel - non state tracciando conversioni da Meta");
    // Domanda strategica solo se ci sono altri segnali di advertising
    if (commercialSignals?.adsEvidence !== "none") {
      questions.push("Avete mai considerato di investire su Facebook/Instagram per raggiungere il vostro pubblico?");
    }
  }

  // --- 3. LINKEDIN & TIKTOK (Pixel avanzati) ---
  if (audit.tracking.hasLinkedInInsight) {
    observations.push("LinkedIn Insight Tag presente - fate advertising B2B su LinkedIn");
    questions.push("Il vostro target principale e' B2B? Come sta performando LinkedIn?");
  }
  if (audit.tracking.hasTikTokPixel) {
    observations.push("TikTok Pixel presente - state investendo su TikTok");
    questions.push("Il vostro pubblico e' giovane? Come vi trovate con TikTok Ads?");
  }

  // --- 4. SOCIAL MEDIA PRESENCE ---
  const socialPresent: string[] = [];
  const socialMissing: string[] = [];

  if (audit.social.facebook.linkedFromSite) {
    socialPresent.push("Facebook");
  } else {
    socialMissing.push("Facebook");
  }
  if (audit.social.instagram.linkedFromSite) {
    socialPresent.push("Instagram");
  } else {
    socialMissing.push("Instagram");
  }
  if (audit.social.linkedin.linkedFromSite) {
    socialPresent.push("LinkedIn");
  } else {
    socialMissing.push("LinkedIn");
  }
  if (audit.social.youtube?.linkedFromSite) {
    socialPresent.push("YouTube");
  }
  if (audit.social.tiktok?.linkedFromSite) {
    socialPresent.push("TikTok");
  }

  if (socialPresent.length > 0) {
    observations.push(`Presenti su: ${socialPresent.join(", ")}`);
  }
  if (socialPresent.length === 0) {
    observations.push("Nessun profilo social collegato al sito");
    questions.push("Siete presenti sui social? Se si', perche' non sono collegati al sito?");
  } else if (socialMissing.length > 0 && socialPresent.length < 3) {
    // Non tutti i social sono collegati
    questions.push(`Siete presenti anche su ${socialMissing.slice(0, 2).join(" o ")}?`);
  }

  // --- 5. BLOG & CONTENT MARKETING ---
  if (audit.content.hasBlog) {
    if (audit.content.daysSinceLastPost !== null && audit.content.daysSinceLastPost > 365) {
      observations.push(`Blog presente ma fermo da oltre un anno (${Math.floor(audit.content.daysSinceLastPost / 30)} mesi)`);
      questions.push("Avete abbandonato il blog? Perche'?");
      questions.push("Come gestite oggi la produzione di contenuti?");
    } else if (audit.content.daysSinceLastPost !== null && audit.content.daysSinceLastPost > 180) {
      observations.push(`Blog presente ma fermo da ${Math.floor(audit.content.daysSinceLastPost / 30)} mesi`);
      questions.push("Come mai il blog si e' fermato? Mancanza di tempo o strategia?");
    } else if (audit.content.daysSinceLastPost !== null && audit.content.daysSinceLastPost > 60) {
      observations.push(`Blog presente - ultimo post circa ${Math.floor(audit.content.daysSinceLastPost / 30)} mesi fa`);
      questions.push("Avete una strategia editoriale definita per il blog?");
    } else {
      observations.push("Blog attivo con pubblicazioni recenti");
      questions.push("Il blog vi porta traffico qualificato? Riuscite a misurarlo?");
    }
    if (audit.content.estimatedPostCount !== null && audit.content.estimatedPostCount < 10) {
      observations.push(`Pochi articoli pubblicati (circa ${audit.content.estimatedPostCount})`);
    }
  } else {
    observations.push("Nessun blog rilevato");
    questions.push("Avete mai considerato il content marketing per attrarre traffico organico?");
  }

  // --- 6. EMAIL MARKETING ---
  if (audit.emailMarketing.hasNewsletterForm) {
    observations.push("Form newsletter presente sul sito");
    if (audit.emailMarketing.emailProvider) {
      observations.push(`Provider email: ${audit.emailMarketing.emailProvider}`);
    }
    questions.push("Quanti iscritti avete alla newsletter? La usate attivamente?");
  } else {
    observations.push("Nessun form newsletter rilevato");
    questions.push("Come fate a mantenere il contatto con chi visita il sito ma non compra subito?");
  }

  if (audit.emailMarketing.hasLeadMagnet) {
    observations.push("Lead magnet presente (ebook, guida, download)");
  } else if (!audit.emailMarketing.hasNewsletterForm) {
    questions.push("Avete mai pensato di offrire qualcosa di valore in cambio dell'email (guida, ebook)?");
  }

  if (audit.emailMarketing.hasPopup) {
    observations.push("Popup di iscrizione attivo");
  }

  // --- 7. GOOGLE BUSINESS & LOCAL ---
  if (audit.googleBusiness.rating !== null) {
    const rating = audit.googleBusiness.rating;
    const reviews = audit.googleBusiness.reviewsCount || 0;

    if (rating >= 4.5 && reviews >= 50) {
      observations.push(`Ottimo profilo Google: ${rating} stelle con ${reviews} recensioni`);
    } else if (rating >= 4.0) {
      observations.push(`Rating Google: ${rating} stelle (${reviews} recensioni)`);
      if (reviews < 20) {
        questions.push("Avete una strategia per raccogliere piu' recensioni dai clienti soddisfatti?");
      }
    } else if (rating < 4.0) {
      observations.push(`Rating Google sotto 4.0: ${rating} stelle (${reviews} recensioni) - soglia critica`);
      questions.push("Siete consapevoli che un rating sotto 4.0 fa scartare molti potenziali clienti?");
      questions.push("Avete una strategia per migliorare le recensioni e gestire quelle negative?");
    }
  }

  // --- 8. TRUST & COMPLIANCE (GDPR) ---
  if (!audit.trust.hasCookieBanner) {
    observations.push("Cookie banner GDPR non rilevato - possibili rischi legali");
    questions.push("Siete sicuri di essere in regola con la normativa GDPR sui cookie?");
  }
  if (!audit.trust.hasPrivacyPolicy) {
    observations.push("Privacy policy non trovata");
  }
  if (audit.trust.hasTestimonials) {
    observations.push("Testimonial/recensioni presenti sul sito - buona social proof");
  }
  if (audit.trust.hasTrustBadges) {
    observations.push("Trust badges presenti (certificazioni, garanzie)");
  }

  // --- 9. TECH STACK ---
  if (audit.tech.cms) {
    let techNote = `CMS: ${audit.tech.cms}`;
    if (audit.tech.cmsVersion) {
      techNote += ` v${audit.tech.cmsVersion}`;
    }
    observations.push(techNote);

    if (audit.tech.isOutdated) {
      observations.push("Tecnologia obsoleta rilevata - potenziali problemi di sicurezza");
      questions.push("Quando e' stata fatta l'ultima manutenzione tecnica del sito?");
    }
  }

  // --- 10. PERFORMANCE & MOBILE ---
  if (audit.website.performance < 40) {
    observations.push(`Performance critica: ${audit.website.performance}/100 - impatto negativo su conversioni e SEO`);
    questions.push("Avete notato che il sito e' lento? Vi siete mai chiesti quanto vi costa in clienti persi?");
  } else if (audit.website.performance < 60) {
    observations.push(`Performance migliorabile: ${audit.website.performance}/100`);
  }

  if (!audit.website.mobile) {
    observations.push("Sito non ottimizzato per mobile - il 60%+ del traffico oggi e' da smartphone");
    questions.push("Sapete che percentuale di traffico arriva da mobile? Il sito offre una buona esperienza?");
  }

  if (!audit.website.https) {
    observations.push("Sito senza HTTPS - Chrome mostra 'Non sicuro'");
  }

  // --- 11. CTA & CONTATTI ---
  if (!audit.website.hasContactForm) {
    observations.push("Nessun form di contatto evidente");
    questions.push("Come vi contattano i potenziali clienti che arrivano dal sito?");
  }
  if (audit.website.hasWhatsApp) {
    observations.push("WhatsApp integrato - canale diretto attivo");
  }
  if (audit.website.hasLiveChat) {
    observations.push("Live chat presente");
  }
  if (!audit.website.hasWhatsApp && !audit.website.hasLiveChat && !audit.website.hasContactForm) {
    questions.push("Come fate a convertire i visitatori in contatti se non c'e' un modo facile per raggiungervi?");
  }

  // === PITCH MSD ===
  const msdPitch =
    "Noi lavoriamo in modo diverso: prima di proporvi qualsiasi servizio, " +
    "facciamo un'intervista strategica approfondita - 49 domande che ci permettono di capire " +
    "davvero il vostro business, i vostri clienti, e dove state andando. " +
    "Il risultato e' un documento di oltre 30 pagine che vi da' una mappa chiara " +
    "di cosa fare e perche'. Poi decidete voi se proseguire con noi o con altri. " +
    "Vi interessa capire come funziona?";

  // Rimuovi domande duplicate
  const uniqueQuestions = [...new Set(questions)];

  return {
    mainHook,
    strategicQuestions: uniqueQuestions,
    observations,
    msdPitch,
  };
}

// ============================================
// LEGACY: Mantiene compatibilita' con vecchio sistema
// ============================================

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

/**
 * @deprecated Usa generateMSDTalkingPoints per approccio strategico
 * Mantenuto per retrocompatibilita'
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
 * @deprecated Usa generateMSDTalkingPoints per approccio strategico
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
 * Genera script di apertura chiamata per MSD
 */
export function generateMSDCallOpener(
  leadName: string,
  commercialSignals: CommercialSignals | null,
  audit: AuditData
): string {
  const msdPoints = generateMSDTalkingPoints(commercialSignals, audit);

  return (
    `Buongiorno, parlo con [Nome]? Sono [TuoNome] di Karalisweb. ` +
    `Ho dato un'occhiata al vostro sito e mi sono posto una domanda: ` +
    `${msdPoints.mainHook} ` +
    `Avete due minuti per parlarne?`
  );
}

/**
 * @deprecated Usa generateMSDCallOpener
 */
export function generateCallOpener(
  audit: AuditData,
  leadName: string,
  agencyName: string = "la nostra agenzia"
): string {
  let urgentIssue = "";
  let issueCount = 0;

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
