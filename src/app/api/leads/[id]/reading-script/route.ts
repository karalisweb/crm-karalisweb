import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getGeminiClient } from "@/lib/gemini";
import { DEFAULT_READING_SCRIPT_PROMPT } from "@/lib/prompts";
import type { AnalystOutput, AnalystPainPoint } from "@/lib/gemini-analyst";
import type { AuditData } from "@/types";

/**
 * POST /api/leads/[id]/reading-script
 *
 * Genera lo script finale di lettura per il video Tella.
 * Usa i dati dell'analisi strategica (analystOutput) e dell'audit tecnico.
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
        address: true,
        category: true,
        segment: true,
        googleRating: true,
        googleReviewsCount: true,
        analystOutput: true,
        auditData: true,
        geminiAnalysis: true,
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead non trovato" }, { status: 404 });
    }

    // Serve l'analisi strategica (analystOutput) per i dati del prompt
    const analystData = lead.analystOutput as unknown as AnalystOutput | null;
    if (!analystData?.pain_points) {
      return NextResponse.json(
        { error: "Analisi strategica non ancora eseguita. Genera prima l'analisi." },
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

    // Estrai dati audit per tracking (Google Ads / Meta Ads)
    const auditData = lead.auditData as unknown as AuditData | null;
    const hasGoogleAds = auditData?.tracking?.hasGoogleAdsTag ?? false;
    const hasMetaAds = auditData?.tracking?.hasFacebookPixel ?? false;

    // Sindrome dell'Ego: si/no basato sul pattern
    const isSindromeEgo = analystData.primary_pattern?.toLowerCase().includes("ego") ?? false;

    // Pain points high severity (ordinati), poi medium come fallback
    const sortedPainPoints = (analystData.pain_points || [])
      .sort((a: AnalystPainPoint, b: AnalystPainPoint) => {
        const order = { high: 0, medium: 1, low: 2 };
        return (order[a.severity] ?? 2) - (order[b.severity] ?? 2);
      });
    const pp1 = sortedPainPoints[0];
    const pp2 = sortedPainPoints[1];
    const pp3 = sortedPainPoints[2];

    // Estrai città dall'indirizzo (ultima parte dopo la virgola, o tutto l'indirizzo)
    const city = extractCity(lead.address);

    // Leggi il prompt template dai settings (se personalizzato)
    const settings = await db.settings.findUnique({
      where: { id: "default" },
      select: { readingScriptPrompt: true },
    });

    const promptTemplate = settings?.readingScriptPrompt || DEFAULT_READING_SCRIPT_PROMPT;

    // Sostituisci le variabili nel template
    const prompt = promptTemplate
      .replace(/\{\{NOME_AZIENDA\}\}/g, lead.name)
      .replace(/\{\{SETTORE\}\}/g, lead.segment || lead.category || "Non specificato")
      .replace(/\{\{CITTA\}\}/g, city)
      .replace(/\{\{SINDROME_EGO\}\}/g, isSindromeEgo ? "si" : "no")
      .replace(/\{\{BRAND_SCORE\}\}/g, String(analystData.brand_positioning_score ?? "N/A"))
      .replace(/\{\{CLICHE_TROVATO\}\}/g, analystData.cliche_found || "Nessuna cliche trovata")
      .replace(/\{\{DEBOLEZZA\}\}/g, analystData.communication_weakness || "Non identificata")
      .replace(/\{\{GOOGLE_RATING\}\}/g, lead.googleRating ? String(Number(lead.googleRating)) : "Non disponibile")
      .replace(/\{\{NUMERO_RECENSIONI\}\}/g, lead.googleReviewsCount ? String(lead.googleReviewsCount) : "Non disponibile")
      .replace(/\{\{PAIN_POINT_1\}\}/g, pp1 ? `${pp1.area} - ${pp1.finding}` : "Non disponibile")
      .replace(/\{\{PAIN_POINT_2\}\}/g, pp2 ? `${pp2.area} - ${pp2.finding}` : "Non disponibile")
      .replace(/\{\{PAIN_POINT_3\}\}/g, pp3 ? `${pp3.area} - ${pp3.finding}` : "Non disponibile")
      .replace(/\{\{GOOGLE_ADS\}\}/g, hasGoogleAds ? "Si, attivi" : "Non verificabile")
      .replace(/\{\{META_ADS\}\}/g, hasMetaAds ? "Si, attivi" : "Non verificabile")
      // Backward compat: vecchi placeholder (ignorati se non presenti nel template)
      .replace(/\{\{CHI_PARLA\}\}/g, "Alessio Loi, fondatore di Karalisweb")
      .replace(/\{\{PROSPECT_NAME\}\}/g, lead.name)
      .replace(/\{\{PROSPECT_WEBSITE\}\}/g, lead.website || "N/A")
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
        geminiAnalysis: {
          ...((lead.geminiAnalysis as object) || {}),
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

/**
 * Estrae la città dall'indirizzo del lead.
 * Formato tipico Google Maps: "Via Roma 1, 28100 Novara NO, Italia"
 */
function extractCity(address: string | null): string {
  if (!address) return "Non disponibile";

  // Rimuovi "Italia" o "Italy" dalla fine
  const cleaned = address.replace(/,?\s*(Italia|Italy)\s*$/i, "").trim();

  // Prova a prendere l'ultima parte dopo l'ultima virgola
  const parts = cleaned.split(",").map((p) => p.trim());
  if (parts.length >= 2) {
    // L'ultima parte potrebbe essere "28100 Novara NO" → estrai il nome città
    const lastPart = parts[parts.length - 1];
    // Rimuovi CAP (5 cifre) e sigla provincia (2 lettere maiuscole alla fine)
    const cityMatch = lastPart.replace(/^\d{5}\s*/, "").replace(/\s+[A-Z]{2}$/, "").trim();
    if (cityMatch) return cityMatch;
  }

  return address;
}
