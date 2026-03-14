import type { AuditData, VideoScriptData, VideoScriptProblemBlock } from "@/types";

interface GenerateVideoScriptInput {
  auditData: AuditData;
  opportunityScore: number;
  commercialTag: string | null;
  danielaNotes: string | null;
  googleRating?: number | null;
  googleReviewsCount?: number | null;
  leadName: string;
}

/**
 * Genera lo script per il video Tella personalizzato.
 *
 * Struttura:
 * 1. Complimento sincero su qualcosa che funziona
 * 2. 3 blocchi problema concreti (dall'audit)
 * 3. CTA morbida per fissare una call
 */
export function generateVideoScript(input: GenerateVideoScriptInput): VideoScriptData {
  const { auditData, opportunityScore, commercialTag, danielaNotes, googleRating, googleReviewsCount, leadName } = input;

  const compliment = findCompliment(auditData, googleRating, googleReviewsCount, leadName);
  const problemBlocks = findTopProblems(auditData, commercialTag);
  const cta = generateCTA(commercialTag, problemBlocks.length);

  return {
    compliment,
    problemBlocks: problemBlocks.slice(0, 3), // Max 3 blocchi
    cta,
    generatedAt: new Date().toISOString(),
    generatedFrom: {
      auditScore: opportunityScore,
      commercialTag,
      danielaNotes,
    },
  };
}

/**
 * Trova un aspetto positivo genuino del prospect
 */
function findCompliment(
  audit: AuditData,
  googleRating?: number | null,
  googleReviewsCount?: number | null,
  leadName?: string,
): string {
  // Priorita: dal piu specifico al piu generico

  // Rating Google alto
  if (googleRating && googleRating >= 4.2 && googleReviewsCount && googleReviewsCount > 10) {
    return `Ho visto che ${leadName || "la vostra attivita"} ha ${googleRating} stelle con ${googleReviewsCount} recensioni su Google — un ottimo segnale di fiducia dai vostri clienti.`;
  }

  // Ha GA4 configurato = investe in dati
  if (audit.tracking.hasGA4 && audit.tracking.hasGTM) {
    return `Ho notato che avete un sistema di tracking strutturato con Google Analytics 4 e Tag Manager — questo mi dice che prendete sul serio i dati.`;
  }

  // Ha un blog attivo
  if (audit.content.hasBlog && audit.content.daysSinceLastPost !== null && audit.content.daysSinceLastPost < 90) {
    return `Ho visto che tenete il blog aggiornato con contenuti recenti — questo vi posiziona bene come riferimento nel vostro settore.`;
  }

  // Ha tracking base
  if (audit.tracking.hasGA4 || audit.tracking.hasGoogleAnalytics) {
    return `Vedo che avete Google Analytics installato — il fatto che misuriate i dati e' un buon punto di partenza.`;
  }

  // Buona presenza social
  const socialCount = [
    audit.social.facebook.linkedFromSite,
    audit.social.instagram.linkedFromSite,
    audit.social.linkedin.linkedFromSite,
  ].filter(Boolean).length;

  if (socialCount >= 2) {
    return `Ho notato che avete una buona presenza social collegata al sito — questo aiuta a costruire fiducia con i potenziali clienti.`;
  }

  // Ha SSL + form contatto
  if (audit.website.https && audit.website.hasContactForm) {
    return `Il vostro sito ha una buona base tecnica con connessione sicura e form di contatto — le fondamenta ci sono.`;
  }

  // Rating Google discreto
  if (googleRating && googleRating >= 4.0) {
    return `Ho visto le vostre ${googleRating} stelle su Google — un buon punteggio che mostra che i clienti vi apprezzano.`;
  }

  // Fallback generico ma onesto
  return `Ho analizzato la vostra presenza digitale e vedo che avete costruito una base su cui possiamo ragionare insieme.`;
}

/**
 * Identifica i problemi piu impattanti dall'audit, ordinati per impatto business
 */
function findTopProblems(audit: AuditData, commercialTag: string | null): VideoScriptProblemBlock[] {
  const problems: (VideoScriptProblemBlock & { priority: number })[] = [];

  // === TRACKING & ADS (impatto massimo per chi spende in ads) ===

  if (!audit.tracking.hasGA4 && !audit.tracking.hasGoogleAnalytics) {
    problems.push({
      area: "Tracking",
      problem: "Non avete nessun sistema di analytics installato",
      impact: "Non sapete quanti visitatori avete, da dove arrivano, ne cosa fanno sul sito. Ogni decisione di marketing diventa un salto nel buio.",
      priority: 1,
    });
  }

  if (commercialTag === "ADS_ATTIVE_CONTROLLO_ASSENTE") {
    if (!audit.tracking.hasGoogleAdsTag) {
      problems.push({
        area: "Google Ads",
        problem: "State investendo in pubblicita Google ma non tracciate le conversioni",
        impact: "Non sapete quali campagne portano clienti e quali bruciano budget. Potreste star buttando via meta del vostro investimento senza saperlo.",
        priority: 1,
      });
    }
    if (!audit.tracking.hasFacebookPixel) {
      problems.push({
        area: "Meta Ads",
        problem: "Nessun Facebook Pixel installato sul sito",
        impact: "Non potete fare remarketing sui visitatori del sito ne tracciare le conversioni da Facebook e Instagram.",
        priority: 2,
      });
    }
  } else {
    if (!audit.tracking.hasFacebookPixel) {
      problems.push({
        area: "Remarketing",
        problem: "Non avete il Facebook Pixel installato",
        impact: "Ogni visitatore che lascia il sito e' perso per sempre. Il remarketing permette di recuperare fino al 26% dei visitatori.",
        priority: 3,
      });
    }
  }

  // === PERFORMANCE ===

  if (audit.website.performance < 40) {
    problems.push({
      area: "Performance",
      problem: `Il sito ha un punteggio performance di ${audit.website.performance}/100`,
      impact: "Il 53% degli utenti abbandona un sito che impiega piu di 3 secondi a caricare. Un sito lento vi sta facendo perdere clienti ogni giorno.",
      priority: 2,
    });
  } else if (audit.website.performance < 60) {
    problems.push({
      area: "Performance",
      problem: `Le prestazioni del sito sono sotto la media (${audit.website.performance}/100)`,
      impact: "Google penalizza i siti lenti nel posizionamento. I vostri competitor piu veloci vi passano davanti nei risultati di ricerca.",
      priority: 4,
    });
  }

  // === SEO ===

  if (!audit.seo.hasMetaTitle || !audit.seo.hasMetaDescription) {
    const missing = [];
    if (!audit.seo.hasMetaTitle) missing.push("titolo");
    if (!audit.seo.hasMetaDescription) missing.push("descrizione");
    problems.push({
      area: "SEO",
      problem: `Manca ${missing.join(" e ")} nei risultati di Google`,
      impact: "Quando qualcuno cerca i vostri servizi, Google mostra testo casuale invece di un messaggio convincente. Perdete click a favore dei competitor.",
      priority: 3,
    });
  }

  if (!audit.seo.hasSchemaMarkup) {
    problems.push({
      area: "SEO",
      problem: "Nessuno schema markup configurato",
      impact: "Non apparite con stelline, prezzi o informazioni aggiuntive nei risultati Google. I competitor con rich snippet attirano piu click.",
      priority: 5,
    });
  }

  // === TRUST & COMPLIANCE ===

  if (!audit.trust.hasCookieBanner) {
    problems.push({
      area: "Compliance",
      problem: "Manca il cookie banner GDPR",
      impact: "Rischiate sanzioni fino al 4% del fatturato annuo. Inoltre, molti utenti sensibili alla privacy abbandonano siti senza consenso trasparente.",
      priority: 3,
    });
  }

  // === CONTENT ===

  if (audit.content.hasBlog && audit.content.daysSinceLastPost !== null && audit.content.daysSinceLastPost > 180) {
    const months = Math.floor(audit.content.daysSinceLastPost / 30);
    problems.push({
      area: "Contenuti",
      problem: `Il blog e' fermo da ${months} mesi`,
      impact: "Un blog abbandonato comunica trascuratezza. Inoltre perdete traffico organico ogni giorno che non pubblicate — i competitor riempiono il vuoto.",
      priority: 4,
    });
  } else if (!audit.content.hasBlog) {
    problems.push({
      area: "Contenuti",
      problem: "Nessun blog o sezione contenuti",
      impact: "Senza contenuti, dipendete al 100% dalla pubblicita a pagamento per il traffico. Il content marketing genera lead a costo zero nel tempo.",
      priority: 5,
    });
  }

  // === SOCIAL ===

  const hasFb = audit.social.facebook.linkedFromSite;
  const hasIg = audit.social.instagram.linkedFromSite;
  const hasLi = audit.social.linkedin.linkedFromSite;

  if (!hasFb && !hasIg && !hasLi) {
    problems.push({
      area: "Social",
      problem: "Nessun profilo social collegato al sito",
      impact: "I potenziali clienti cercano conferma sui social prima di contattarvi. Senza presenza social, sembrate meno affidabili dei competitor.",
      priority: 5,
    });
  }

  // === MOBILE ===

  if (!audit.website.mobile) {
    problems.push({
      area: "Mobile",
      problem: "Il sito non e' ottimizzato per smartphone",
      impact: "Oltre il 60% delle ricerche avviene da mobile. Un sito non responsive perde piu della meta dei potenziali clienti.",
      priority: 2,
    });
  }

  // === EMAIL MARKETING ===

  if (!audit.emailMarketing.hasNewsletterForm) {
    problems.push({
      area: "Email Marketing",
      problem: "Nessun form newsletter nel sito",
      impact: "Ogni visitatore che se ne va senza lasciare la mail e' un contatto perso per sempre. Una newsletter vi permette di nutrire il rapporto nel tempo.",
      priority: 6,
    });
  }

  // === TECH ===

  if (audit.tech.isOutdated) {
    problems.push({
      area: "Tecnologia",
      problem: `Stack tecnologico obsoleto${audit.tech.cms ? ` (${audit.tech.cms}${audit.tech.cmsVersion ? ` ${audit.tech.cmsVersion}` : ""})` : ""}`,
      impact: "Un CMS o framework obsoleto espone a rischi di sicurezza e limita le possibilita di crescita. I costi di manutenzione aumentano nel tempo.",
      priority: 5,
    });
  }

  // Ordina per priorita (1 = piu urgente) e prendi i top 3
  problems.sort((a, b) => a.priority - b.priority);

  return problems.map(({ priority: _p, ...rest }) => rest);
}

/**
 * Genera la CTA finale del video
 */
function generateCTA(commercialTag: string | null, problemCount: number): string {
  if (commercialTag === "ADS_ATTIVE_CONTROLLO_ASSENTE") {
    return `Ho trovato ${problemCount} aree critiche che stanno probabilmente impattando il ritorno dei vostri investimenti pubblicitari. Mi piacerebbe mostrarvi in dettaglio cosa ho trovato e capire insieme se ha senso approfondire — senza nessun impegno. Se vi interessa, rispondete a questa email e troviamo 15 minuti per parlarne.`;
  }

  if (commercialTag === "TRAFFICO_SENZA_DIREZIONE") {
    return `State generando traffico ma senza una direzione strategica chiara. Ho individuato ${problemCount} punti dove state perdendo opportunita concrete. Se volete, posso spiegarvi cosa ho trovato in una breve call di 15 minuti — zero impegno, zero vendita. Rispondete a questa email e ci organizziamo.`;
  }

  return `Ho individuato ${problemCount} aree di miglioramento nella vostra presenza digitale. Ho preparato un'analisi gratuita con delle osservazioni concrete. Se vi interessa capire dove state perdendo opportunita, rispondete a questa email — troviamo 15 minuti per vederlo insieme.`;
}
