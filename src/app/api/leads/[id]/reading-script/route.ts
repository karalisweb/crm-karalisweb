import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getGeminiClient } from "@/lib/gemini";
import { DEFAULT_READING_SCRIPT_PROMPT } from "@/lib/prompts";

/**
 * Estrae i problemi specifici dall'audit data e talking points del lead
 * per rendere lo script iper-personalizzato
 */
function extractSiteProblems(
  auditData: Record<string, unknown> | null,
  talkingPoints: string[],
  analysis: Record<string, unknown>
): string {
  const problems: string[] = [];

  // 1. Talking points già generati (sono i problemi più importanti)
  if (talkingPoints && talkingPoints.length > 0) {
    for (const tp of talkingPoints) {
      problems.push(`- ${tp}`);
    }
  }

  // 2. Dati specifici dall'audit
  if (auditData) {
    const website = auditData.website as Record<string, unknown> | undefined;
    const seo = auditData.seo as Record<string, unknown> | undefined;
    const tracking = auditData.tracking as Record<string, unknown> | undefined;
    const trust = auditData.trust as Record<string, unknown> | undefined;
    const content = auditData.content as Record<string, unknown> | undefined;
    const tech = auditData.tech as Record<string, unknown> | undefined;
    const social = auditData.social as Record<string, Record<string, unknown>> | undefined;

    // Performance
    if (website?.performance !== undefined && (website.performance as number) < 50) {
      problems.push(`- Performance sito: ${website.performance}/100 (critica)`);
    }
    if (website?.loadTime !== undefined && (website.loadTime as number) > 3) {
      problems.push(`- Tempo caricamento: ${(website.loadTime as number).toFixed(1)} secondi (lento)`);
    }
    if (website?.mobile === false) {
      problems.push(`- Sito NON ottimizzato per mobile`);
    }
    if (website?.https === false) {
      problems.push(`- Sito senza HTTPS — Chrome mostra "Non sicuro"`);
    }

    // SEO specifico
    if (seo?.hasMetaTitle === false) {
      problems.push(`- Meta title mancante — Google non sa descrivere il sito`);
    }
    if (seo?.hasMetaDescription === false) {
      problems.push(`- Meta description mancante — nei risultati Google appare testo casuale`);
    }
    if (seo?.hasH1 === false) {
      problems.push(`- Tag H1 mancante nella homepage`);
    }
    if (seo?.hasSitemap === false) {
      problems.push(`- Sitemap.xml mancante — Google non indicizza tutte le pagine`);
    }
    if (seo?.hasSchemaMarkup === false) {
      problems.push(`- Nessuno Schema Markup — no rich snippet nei risultati`);
    }
    if (seo?.imagesWithoutAlt !== undefined && (seo.imagesWithoutAlt as number) > 5) {
      problems.push(`- ${seo.imagesWithoutAlt} immagini senza testo alternativo`);
    }

    // Tracking
    if (tracking?.hasGA4 === false && tracking?.hasGoogleAnalytics === false) {
      problems.push(`- Nessun Google Analytics installato — zero visibilità sul traffico`);
    }
    if (tracking?.hasGTM === false) {
      problems.push(`- Google Tag Manager assente`);
    }
    if (tracking?.hasFacebookPixel === false) {
      problems.push(`- Facebook Pixel non installato — no remarketing possibile`);
    }
    if (tracking?.hasGoogleAdsTag === false) {
      problems.push(`- Tag Google Ads assente — impossibile tracciare conversioni ads`);
    }

    // Trust & Compliance
    if (trust?.hasCookieBanner === false) {
      problems.push(`- Cookie banner GDPR mancante — rischio sanzioni`);
    }
    if (trust?.hasPrivacyPolicy === false) {
      problems.push(`- Privacy policy non trovata`);
    }
    if (trust?.hasContactForm === false && website?.hasContactForm === false) {
      problems.push(`- Nessun form di contatto visibile`);
    }

    // Content
    if (content?.hasBlog === false) {
      problems.push(`- Nessun blog — zero content marketing`);
    } else if (content?.daysSinceLastPost !== undefined && (content.daysSinceLastPost as number) > 180) {
      problems.push(`- Blog fermo da ${Math.floor((content.daysSinceLastPost as number) / 30)} mesi`);
    }

    // Tech
    if (tech?.isOutdated === true) {
      const cms = tech.cms ? `${tech.cms}${tech.cmsVersion ? ` v${tech.cmsVersion}` : ""}` : "Stack";
      problems.push(`- Tecnologia obsoleta: ${cms}`);
    }

    // Social
    if (social) {
      const missing: string[] = [];
      if (social.facebook && !social.facebook.linkedFromSite) missing.push("Facebook");
      if (social.instagram && !social.instagram.linkedFromSite) missing.push("Instagram");
      if (social.linkedin && !social.linkedin.linkedFromSite) missing.push("LinkedIn");
      if (missing.length >= 2) {
        problems.push(`- Social non collegati al sito: ${missing.join(", ")}`);
      }
    }
  }

  // 3. Dati dall'analisi Gemini (observations)
  const observations = analysis.observations as string[] | undefined;
  if (observations && observations.length > 0) {
    for (const obs of observations.slice(0, 5)) {
      if (!problems.some(p => p.includes(obs.substring(0, 30)))) {
        problems.push(`- ${obs}`);
      }
    }
  }

  if (problems.length === 0) {
    return "Nessun problema specifico rilevato dall'audit automatico.";
  }

  // Deduplica e limita
  const unique = [...new Set(problems)];
  return unique.slice(0, 15).join("\n");
}

/**
 * POST /api/leads/[id]/reading-script
 *
 * Genera lo script finale di lettura per il video.
 * Include i PROBLEMI SPECIFICI del sito del prospect.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const customInstructions = body.customInstructions || "";

    const lead = await db.lead.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        website: true,
        geminiAnalysis: true,
        geminiAnalyzedAt: true,
        auditData: true,
        opportunityScore: true,
        talkingPoints: true,
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead non trovato" }, { status: 404 });
    }

    const analysis = lead.geminiAnalysis as Record<string, unknown> | null;
    if (!analysis?.teleprompter_script) {
      return NextResponse.json(
        { error: "Analisi strategica non ancora eseguita. Genera prima l'analisi Gemini." },
        { status: 400 }
      );
    }

    const client = getGeminiClient();
    if (!client) {
      return NextResponse.json(
        { error: "Gemini API key non configurata." },
        { status: 500 }
      );
    }

    const teleprompter = analysis.teleprompter_script as Record<string, string>;
    const cliche = analysis.cliche_found as string;
    const errorPattern = analysis.primary_error_pattern as string;
    const strategicNote = analysis.strategic_note as string;

    // Estrai i problemi specifici del sito
    const siteProblems = extractSiteProblems(
      lead.auditData as Record<string, unknown> | null,
      lead.talkingPoints || [],
      analysis
    );

    // Leggi il prompt template dai settings (se personalizzato)
    const settings = await db.settings.findUnique({
      where: { id: "default" },
      select: { readingScriptPrompt: true },
    });

    const promptTemplate = settings?.readingScriptPrompt || DEFAULT_READING_SCRIPT_PROMPT;

    // Sostituisci le variabili nel template
    const prompt = promptTemplate
      .replace(/\{\{CHI_PARLA\}\}/g, "Alessio Loi, fondatore di Karalisweb")
      .replace(/\{\{PROSPECT_NAME\}\}/g, lead.name)
      .replace(/\{\{PROSPECT_WEBSITE\}\}/g, lead.website || "N/A")
      .replace(/\{\{OPPORTUNITY_SCORE\}\}/g, String(lead.opportunityScore ?? "N/A"))
      .replace(/\{\{ERROR_PATTERN\}\}/g, errorPattern || "N/A")
      .replace(/\{\{CLICHE\}\}/g, cliche || "N/A")
      .replace(/\{\{STRATEGIC_NOTE\}\}/g, strategicNote || "N/A")
      .replace(/\{\{PROBLEMI_SITO\}\}/g, siteProblems)
      .replace(/\{\{ATTO_1\}\}/g, teleprompter.atto_1 || "")
      .replace(/\{\{ATTO_2\}\}/g, teleprompter.atto_2 || "")
      .replace(/\{\{ATTO_3\}\}/g, teleprompter.atto_3 || "")
      .replace(/\{\{ATTO_4\}\}/g, teleprompter.atto_4 || "")
      .replace(/\{\{CUSTOM_INSTRUCTIONS\}\}/g, customInstructions ? `ISTRUZIONI AGGIUNTIVE: ${customInstructions}` : "");

    const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const model = client.getGenerativeModel({ model: modelName });

    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout: nessuna risposta in 30 secondi")), 30_000)
      ),
    ]);

    const script = result.response.text().trim();

    // Salva lo script nel lead
    await db.lead.update({
      where: { id },
      data: {
        videoScriptData: {
          ...(lead.geminiAnalysis as object),
          readingScript: script,
          readingScriptGeneratedAt: new Date().toISOString(),
          readingScriptModel: modelName,
        },
      },
    });

    return NextResponse.json({
      success: true,
      script,
      model: modelName,
    });
  } catch (error) {
    console.error("[API] reading-script error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore nella generazione dello script" },
      { status: 500 }
    );
  }
}
