import { getGeminiClient } from "./gemini";
import type { AuditData } from "@/types";

// ==========================================
// TIPI
// ==========================================

export interface GeminiAnalysisInput {
  leadName: string;
  website: string;
  category: string | null;
  auditData: AuditData;
  qualificationData: Record<string, unknown> | null;
  opportunityScore: number | null;
  commercialTag: string | null;
  googleRating: number | null;
  googleReviewsCount: number | null;
}

export interface GeminiAnalysisResult {
  marketingCoherence: {
    summary: string;
    targetAudience: string;
    messagingIssues: string[];
    score: "coerente" | "parzialmente_coerente" | "incoerente";
  };
  topErrors: Array<{
    title: string;
    description: string;
    businessImpact: string;
    suggestion: string;
  }>;
  heygenPrompt: string;
  generatedAt: string;
  model: string;
}

// ==========================================
// PROMPT
// ==========================================

function buildPrompt(input: GeminiAnalysisInput): string {
  const auditSummary = summarizeAuditData(input.auditData);

  return `Sei un consulente senior di marketing digitale italiano che analizza la presenza online di aziende.

CONTESTO:
- Azienda: "${input.leadName}"
- Settore: ${input.category || "Non specificato"}
- Sito web: ${input.website}
- Rating Google: ${input.googleRating ?? "N/D"}/5 (${input.googleReviewsCount ?? 0} recensioni)
- Opportunity Score: ${input.opportunityScore ?? "N/D"}/100
- Tag commerciale: ${input.commercialTag || "Nessuno"}

DATI AUDIT TECNICO:
${auditSummary}

ISTRUZIONI:
Analizza i dati forniti e produci un JSON con questa struttura esatta:

{
  "marketingCoherence": {
    "summary": "2-3 frasi sulla coerenza complessiva del marketing online dell'azienda",
    "targetAudience": "Chi sembra essere il target dell'azienda in base al sito",
    "messagingIssues": ["Lista di problemi nel messaging/comunicazione identificati"],
    "score": "coerente" | "parzialmente_coerente" | "incoerente"
  },
  "topErrors": [
    {
      "title": "Titolo breve dell'errore",
      "description": "Spiegazione dettagliata del problema",
      "businessImpact": "Impatto concreto sul business (con dati se possibile)",
      "suggestion": "Cosa dovrebbero fare per risolvere"
    }
  ],
  "heygenPrompt": "Testo completo del prompt per generare un video personalizzato"
}

REGOLE:
1. marketingCoherence: analizza se il sito comunica in modo coerente, se il target e chiaro, se l'offerta e ben presentata
2. topErrors: ESATTAMENTE 3 errori di marketing/digitali (non puramente tecnici). Concentrati su errori che impattano il business: mancanza di tracking, assenza di CTA, comunicazione inefficace, mancanza di social proof, ecc.
3. heygenPrompt: scrivi un testo in prima persona (come se fossi il consulente che parla al titolare). Il video deve:
   - Durare 60-90 secondi quando letto ad alta voce
   - Iniziare con un complimento sincero e specifico sull'azienda
   - Menzionare 2-3 problemi specifici trovati nell'audit (con dati concreti)
   - Chiudersi con una CTA morbida per una call conoscitiva gratuita di 15 minuti
   - Tono: professionale ma amichevole, diretto ma non aggressivo
   - NON menzionare "audit automatico" o "analisi automatizzata" — parla come se avessi analizzato personalmente il sito

IMPORTANTE: Rispondi SOLO con il JSON, senza markdown, senza backtick, senza testo aggiuntivo.`;
}

function summarizeAuditData(audit: AuditData): string {
  const lines: string[] = [];

  // Website performance
  if (audit.website) {
    lines.push(`Performance: ${audit.website.performance ?? "N/D"}/100`);
    lines.push(`Mobile-friendly: ${audit.website.mobile ? "Si" : "No"}`);
    lines.push(`HTTPS: ${audit.website.https ? "Si" : "No"}`);
    lines.push(`Form contatto: ${audit.website.hasContactForm ? "Si" : "No"}`);
    lines.push(`WhatsApp: ${audit.website.hasWhatsApp ? "Si" : "No"}`);
    lines.push(`Live chat: ${audit.website.hasLiveChat ? "Si" : "No"}`);
  }

  // SEO
  if (audit.seo) {
    lines.push(`Meta title: ${audit.seo.hasMetaTitle ? "Presente" : "ASSENTE"}`);
    lines.push(`Meta description: ${audit.seo.hasMetaDescription ? "Presente" : "ASSENTE"}`);
    lines.push(`H1: ${audit.seo.hasH1 ? "Presente" : "ASSENTE"}`);
    lines.push(`Sitemap: ${audit.seo.hasSitemap ? "Si" : "No"}`);
    lines.push(`Schema markup: ${audit.seo.hasSchemaMarkup ? "Si" : "No"}`);
    lines.push(`Open Graph: ${audit.seo.hasOpenGraph ? "Si" : "No"}`);
    if (audit.seo.imagesWithoutAlt != null) {
      lines.push(`Immagini senza alt: ${audit.seo.imagesWithoutAlt}`);
    }
  }

  // Tracking
  if (audit.tracking) {
    lines.push(`Google Analytics: ${audit.tracking.hasGA4 ? "GA4" : audit.tracking.hasGoogleAnalytics ? "Universal (obsoleto)" : "ASSENTE"}`);
    lines.push(`GTM: ${audit.tracking.hasGTM ? "Si" : "No"}`);
    lines.push(`Facebook Pixel: ${audit.tracking.hasFacebookPixel ? "Si" : "No"}`);
    lines.push(`Google Ads tag: ${audit.tracking.hasGoogleAdsTag ? "Si" : "No"}`);
    lines.push(`Hotjar/Clarity: ${audit.tracking.hasHotjar || audit.tracking.hasClarity ? "Si" : "No"}`);
  }

  // Social
  if (audit.social) {
    const socials = [];
    if (audit.social.facebook?.linkedFromSite) socials.push("Facebook");
    if (audit.social.instagram?.linkedFromSite) socials.push("Instagram");
    if (audit.social.linkedin?.linkedFromSite) socials.push("LinkedIn");
    if (audit.social.youtube?.linkedFromSite) socials.push("YouTube");
    lines.push(`Social collegati al sito: ${socials.length > 0 ? socials.join(", ") : "NESSUNO"}`);
  }

  // Trust
  if (audit.trust) {
    lines.push(`Cookie banner GDPR: ${audit.trust.hasCookieBanner ? "Si" : "No"}`);
    lines.push(`Privacy policy: ${audit.trust.hasPrivacyPolicy ? "Si" : "No"}`);
    lines.push(`Testimonials: ${audit.trust.hasTestimonials ? "Si" : "No"}`);
  }

  // Blog/Content
  if (audit.content) {
    lines.push(`Blog: ${audit.content.hasBlog ? `Si (ultimo post: ${audit.content.daysSinceLastPost ?? "?"} giorni fa)` : "No"}`);
  }

  // Email Marketing
  if (audit.emailMarketing) {
    lines.push(`Newsletter form: ${audit.emailMarketing.hasNewsletterForm ? "Si" : "No"}`);
    lines.push(`Lead magnet: ${audit.emailMarketing.hasLeadMagnet ? "Si" : "No"}`);
  }

  // Tech
  if (audit.tech) {
    lines.push(`CMS: ${audit.tech.cms || "Non rilevato"}`);
    if (audit.tech.isOutdated) lines.push(`Stack tecnologico: OBSOLETO`);
  }

  return lines.join("\n");
}

// ==========================================
// ESECUZIONE ANALISI
// ==========================================

// Modello di default se non configurato dall'utente
const DEFAULT_MODEL = "gemini-2.5-flash";

export async function runGeminiAnalysis(
  input: GeminiAnalysisInput
): Promise<GeminiAnalysisResult> {
  const client = getGeminiClient();
  if (!client) {
    throw new Error("Gemini API key non configurata. Vai in Impostazioni > API & Token.");
  }

  // Usa il modello scelto dall'utente nelle impostazioni, o il default
  const modelName = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const model = client.getGenerativeModel({ model: modelName });
  const prompt = buildPrompt(input);

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();

  // Pulisci il testo da eventuali backtick markdown
  const cleanedText = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed: Omit<GeminiAnalysisResult, "generatedAt" | "model">;
  try {
    parsed = JSON.parse(cleanedText);
  } catch {
    throw new Error(
      `Risposta Gemini non e un JSON valido. Risposta: ${cleanedText.substring(0, 200)}...`
    );
  }

  // Validazione base
  if (!parsed.marketingCoherence || !parsed.topErrors || !parsed.heygenPrompt) {
    throw new Error("Risposta Gemini incompleta: mancano campi obbligatori");
  }

  return {
    ...parsed,
    generatedAt: new Date().toISOString(),
    model: modelName,
  };
}
