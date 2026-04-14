import { db } from "@/lib/db";
import { getGeminiClient } from "@/lib/gemini";
import { DEFAULT_READING_SCRIPT_PROMPT } from "@/lib/prompts";
import type { AnalystOutput, AnalystPainPoint } from "@/lib/gemini-analyst";
import type { AuditData } from "@/types";

/**
 * Genera lo script di lettura per Tella e lo salva in geminiAnalysis.readingScript.
 * Estratto da /api/leads/[id]/reading-script per essere chiamato sia da
 * background-jobs (dopo lo scriptwriter) sia dal batch di retro-popolamento.
 */
export async function generateReadingScriptForLead(
  leadId: string,
  customInstructions: string = ""
): Promise<string> {
  const lead = await db.lead.findUnique({
    where: { id: leadId },
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

  if (!lead) throw new Error("Lead non trovato");

  const analystData = lead.analystOutput as unknown as AnalystOutput | null;
  if (!analystData?.pain_points) {
    throw new Error("Analisi strategica non ancora eseguita");
  }

  const client = getGeminiClient();
  if (!client) throw new Error("Gemini API key non configurata");

  const auditData = lead.auditData as unknown as AuditData | null;
  const hasGoogleAds = auditData?.tracking?.hasGoogleAdsTag ?? false;
  const hasMetaAds = auditData?.tracking?.hasFacebookPixel ?? false;

  const isSindromeEgo =
    analystData.primary_pattern?.toLowerCase().includes("ego") ?? false;

  const sortedPainPoints = (analystData.pain_points || []).sort(
    (a: AnalystPainPoint, b: AnalystPainPoint) => {
      const order = { high: 0, medium: 1, low: 2 };
      return (order[a.severity] ?? 2) - (order[b.severity] ?? 2);
    }
  );
  const pp1 = sortedPainPoints[0];
  const pp2 = sortedPainPoints[1];
  const pp3 = sortedPainPoints[2];

  const city = extractCity(lead.address);

  const settings = await db.settings.findUnique({
    where: { id: "default" },
    select: { readingScriptPrompt: true },
  });
  const promptTemplate =
    settings?.readingScriptPrompt || DEFAULT_READING_SCRIPT_PROMPT;

  const prompt = promptTemplate
    .replace(/\{\{NOME_AZIENDA\}\}/g, lead.name)
    .replace(
      /\{\{SETTORE\}\}/g,
      lead.segment || lead.category || "Non specificato"
    )
    .replace(/\{\{CITTA\}\}/g, city)
    .replace(/\{\{SINDROME_EGO\}\}/g, isSindromeEgo ? "si" : "no")
    .replace(
      /\{\{BRAND_SCORE\}\}/g,
      String(analystData.brand_positioning_score ?? "N/A")
    )
    .replace(
      /\{\{CLICHE_TROVATO\}\}/g,
      analystData.cliche_found || "Nessuna cliche trovata"
    )
    .replace(
      /\{\{DEBOLEZZA\}\}/g,
      analystData.communication_weakness || "Non identificata"
    )
    .replace(
      /\{\{GOOGLE_RATING\}\}/g,
      lead.googleRating ? String(Number(lead.googleRating)) : "Non disponibile"
    )
    .replace(
      /\{\{NUMERO_RECENSIONI\}\}/g,
      lead.googleReviewsCount
        ? String(lead.googleReviewsCount)
        : "Non disponibile"
    )
    .replace(
      /\{\{PAIN_POINT_1\}\}/g,
      pp1 ? `${pp1.area} - ${pp1.finding}` : "Non disponibile"
    )
    .replace(
      /\{\{PAIN_POINT_2\}\}/g,
      pp2 ? `${pp2.area} - ${pp2.finding}` : "Non disponibile"
    )
    .replace(
      /\{\{PAIN_POINT_3\}\}/g,
      pp3 ? `${pp3.area} - ${pp3.finding}` : "Non disponibile"
    )
    .replace(/\{\{GOOGLE_ADS\}\}/g, hasGoogleAds ? "Si, attivi" : "Non verificabile")
    .replace(/\{\{META_ADS\}\}/g, hasMetaAds ? "Si, attivi" : "Non verificabile")
    .replace(/\{\{CHI_PARLA\}\}/g, "Alessio Loi, fondatore di Karalisweb")
    .replace(/\{\{PROSPECT_NAME\}\}/g, lead.name)
    .replace(/\{\{PROSPECT_WEBSITE\}\}/g, lead.website || "N/A")
    .replace(
      /\{\{CUSTOM_INSTRUCTIONS\}\}/g,
      customInstructions
        ? `ISTRUZIONI AGGIUNTIVE: ${customInstructions}`
        : ""
    );

  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const model = client.getGenerativeModel({ model: modelName });

  const result = await Promise.race([
    model.generateContent(prompt),
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("Timeout: nessuna risposta in 30 secondi")),
        30_000
      )
    ),
  ]);

  const script = result.response.text().trim();

  await db.lead.update({
    where: { id: leadId },
    data: {
      geminiAnalysis: {
        ...((lead.geminiAnalysis as object) || {}),
        readingScript: script,
        readingScriptGeneratedAt: new Date().toISOString(),
        readingScriptModel: modelName,
      },
    },
  });

  return script;
}

function extractCity(address: string | null): string {
  if (!address) return "Non specificata";
  const parts = address.split(",").map((p) => p.trim());
  if (parts.length >= 2) return parts[parts.length - 2];
  return parts[0];
}
