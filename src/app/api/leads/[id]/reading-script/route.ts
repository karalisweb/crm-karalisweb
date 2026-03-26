import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getGeminiClient } from "@/lib/gemini";
import { DEFAULT_READING_SCRIPT_PROMPT } from "@/lib/prompts";
import { fetchSiteHtml } from "@/lib/gemini-analyst";
import { extractStrategicData } from "@/lib/audit/strategic-extractor";

/**
 * Estrae i problemi STRATEGICI dall'analisi Gemini del lead.
 * NON usa i dati tecnici dell'audit (meta tag, pixel, ecc.)
 * ma i problemi reali di posizionamento e comunicazione.
 */
function extractStrategicProblems(
  analysis: Record<string, unknown>
): string {
  const problems: string[] = [];

  // 1. Pattern di errore strategico (il più importante)
  const pattern = analysis.primary_error_pattern as string;
  if (pattern && pattern !== "NESSUNO") {
    if (pattern.includes("Lista della Spesa")) {
      problems.push(`- PATTERN: "Lista della Spesa" — Il sito elenca servizi senza un angolo differenziante. Non si capisce perché scegliere voi e non un competitor.`);
    } else if (pattern.includes("Sindrome dell'Ego")) {
      problems.push(`- PATTERN: "Sindrome dell'Ego" — Il sito parla solo di voi ("Siamo...", "La nostra azienda...") ma non del problema del cliente.`);
    } else if (pattern.includes("Target Fantasma")) {
      problems.push(`- PATTERN: "Target Fantasma" — Non c'è una dichiarazione chiara di CHI è il cliente ideale.`);
    } else {
      problems.push(`- PATTERN: ${pattern}`);
    }
  }

  // 2. Cliché trovato (frase esatta dal sito)
  const cliche = analysis.cliche_found as string;
  if (cliche && cliche !== "NESSUNA_CLICHE_TROVATA") {
    problems.push(`- FRASE CLICHÉ ESATTA DAL SITO: "${cliche}" — Se coprissi il logo con quello di un competitor, funzionerebbe ugualmente.`);
  }

  // 3. Nota strategica (contiene osservazioni specifiche)
  const strategicNote = analysis.strategic_note as string;
  if (strategicNote) {
    problems.push(`- NOTA STRATEGICA: ${strategicNote}`);
  }

  // 4. Stato ads (contesto commerciale)
  const hasActiveAds = analysis.has_active_ads as boolean;
  const googleAdCopy = analysis.google_ad_copy as string | null;
  const metaAdsCopy = analysis.meta_ads_copy as string[] | null;

  if (hasActiveAds && googleAdCopy) {
    problems.push(`- STANNO INVESTENDO IN ADS con questo annuncio: "${googleAdCopy}" — Ma il sito non mantiene la promessa.`);
  } else if (hasActiveAds) {
    problems.push(`- STANNO INVESTENDO IN ADS ma il sito non è costruito per convertire il traffico a pagamento.`);
  } else {
    problems.push(`- NON FANNO ADVERTISING — Invisibili nelle ricerche a pagamento, i competitor che investono gli rubano clienti.`);
  }

  if (metaAdsCopy && metaAdsCopy.length > 0) {
    problems.push(`- META ADS ATTIVE: "${metaAdsCopy[0]}"`);
  }

  // 5. Osservazioni dall'analisi (se presenti)
  const observations = analysis.observations as string[] | undefined;
  if (observations && observations.length > 0) {
    for (const obs of observations.slice(0, 3)) {
      problems.push(`- ${obs}`);
    }
  }

  if (problems.length === 0) {
    return "Analisi strategica completata ma nessun problema specifico estratto.";
  }

  return problems.join("\n");
}

/**
 * Recupera i testi estratti dal sito.
 * Prima cerca nei dati salvati (analystOutput), se non ci sono ri-estrae dal sito.
 */
async function getExtractedTexts(
  lead: { website: string | null; name: string; analystOutput: unknown }
): Promise<{ home_text: string; about_text: string; services_text: string }> {
  const analystData = lead.analystOutput as Record<string, unknown> | null;

  // Prova a prendere i testi salvati
  const savedHome = analystData?.extracted_home_text as string | null;
  const savedAbout = analystData?.extracted_about_text as string | null;
  const savedServices = analystData?.extracted_services_text as string | null;

  if (savedHome) {
    return {
      home_text: savedHome,
      about_text: savedAbout || "Non disponibile",
      services_text: savedServices || "Non disponibile",
    };
  }

  // Testi non salvati (lead esistente) → ri-estrai dal sito
  if (!lead.website) {
    return {
      home_text: "Sito non disponibile",
      about_text: "Non disponibile",
      services_text: "Non disponibile",
    };
  }

  try {
    console.log(`[reading-script] Ri-estrazione testi da ${lead.website}...`);
    const html = await fetchSiteHtml(lead.website);
    const extracted = await extractStrategicData(html, lead.website, lead.name);
    return {
      home_text: extracted.home_text || "Non estratto",
      about_text: extracted.about_text || "Non disponibile",
      services_text: extracted.services_text || "Non disponibile",
    };
  } catch (err) {
    console.warn(`[reading-script] Impossibile ri-estrarre testi: ${err}`);
    return {
      home_text: "Errore nell'estrazione",
      about_text: "Non disponibile",
      services_text: "Non disponibile",
    };
  }
}

/**
 * POST /api/leads/[id]/reading-script
 *
 * Genera lo script finale di lettura per il video.
 * Include i PROBLEMI STRATEGICI e i TESTI REALI del sito del prospect.
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
        analystOutput: true,
        auditData: true,
        opportunityScore: true,
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

    // Estrai i problemi STRATEGICI (non tecnici) dall'analisi
    const siteProblems = extractStrategicProblems(analysis);

    // Recupera i TESTI REALI del sito (salvati o ri-estratti)
    const extractedTexts = await getExtractedTexts(lead);

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
      .replace(/\{\{TESTI_HOMEPAGE\}\}/g, extractedTexts.home_text)
      .replace(/\{\{TESTI_ABOUT\}\}/g, extractedTexts.about_text)
      .replace(/\{\{TESTI_SERVIZI\}\}/g, extractedTexts.services_text)
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

    // Salva lo script nel lead (dentro geminiAnalysis, dove la pagina lo legge)
    await db.lead.update({
      where: { id },
      data: {
        geminiAnalysis: {
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
