import { getGeminiClient } from "./gemini";
import { SchemaType, type Schema } from "@google/generative-ai";
import { db } from "./db";
import { DEFAULT_SCRIPTWRITER_PROMPT, replacePlaceholders } from "./prompts-v2";

// ==========================================
// TIPI
// ==========================================

export interface ScriptwriterOutput {
  teleprompter_script: {
    atto_1: string;
    atto_2: string;
    atto_3: string;
    atto_4: string;
    atto_5: string;
  };
  strategic_note: string;
  // Metadata
  generatedAt: string;
  model: string;
  analysisVersion: string;
}

// ==========================================
// JSON SCHEMA per Gemini
// ==========================================

const SCRIPTWRITER_RESPONSE_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    teleprompter_script: {
      type: SchemaType.OBJECT,
      properties: {
        atto_1: { type: SchemaType.STRING, description: "Atto 1 - Introduzione (chi sono, perché ti mando questo video)" },
        atto_2: { type: SchemaType.STRING, description: "Atto 2 - La Scena del Crimine (problema concreto + metafora)" },
        atto_3: { type: SchemaType.STRING, description: "Atto 3 - I Soldi (collegamento problema-costi)" },
        atto_4: { type: SchemaType.STRING, description: "Atto 4 - La Soluzione (MSD, togliamo le colpe)" },
        atto_5: { type: SchemaType.STRING, description: "Atto 5 - Chiusura e Contatto (video MSD, form, messaggio)" },
      },
      required: ["atto_1", "atto_2", "atto_3", "atto_4", "atto_5"],
    },
    strategic_note: {
      type: SchemaType.STRING,
      description: "Nota strategica interna per Alessio. Solo fatti, nessuna speculazione.",
    },
  },
  required: ["teleprompter_script", "strategic_note"],
};

// ==========================================
// RUN SCRIPTWRITER PROMPT
// ==========================================

const DEFAULT_MODEL = "gemini-2.5-flash";

export async function runScriptwriterPrompt(
  leadId: string,
  notes?: string
): Promise<ScriptwriterOutput> {
  // 1. Carica lead con dati necessari
  const lead = await db.lead.findUniqueOrThrow({
    where: { id: leadId },
    select: {
      name: true,
      analystOutput: true,
      analystApprovedAt: true,
      puntoDoloreBreve: true,
      // Ads data
      hasActiveGoogleAds: true,
      hasActiveMetaAds: true,
      adsVerifiedManually: true,
    },
  });

  // 2. Gate check: analista deve essere approvato
  if (!lead.analystApprovedAt) {
    throw new Error("L'output dell'analista deve essere approvato prima di generare lo script");
  }

  if (!lead.analystOutput) {
    throw new Error("Output analista mancante");
  }

  // 3. Gemini client
  const client = getGeminiClient();
  if (!client) {
    throw new Error("Gemini API key non configurata. Vai in Impostazioni > API & Token.");
  }

  // 4. Determina ads_status
  let adsStatus = "PENDING";
  if (lead.adsVerifiedManually) {
    adsStatus = (lead.hasActiveGoogleAds || lead.hasActiveMetaAds) ? "CONFIRMED" : "NOT_FOUND";
  }

  // 5. Carica prompt personalizzato o default
  const settings = await db.settings.findFirst();
  const promptTemplate = settings?.scriptwriterPrompt || DEFAULT_SCRIPTWRITER_PROMPT;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const analystData = lead.analystOutput as any;

  // 6. Sostituisci placeholder
  const prompt = replacePlaceholders(promptTemplate, {
    "{{company_name}}": lead.name,
    "{{analyst_output}}": JSON.stringify(analystData, null, 2),
    "{{punto_dolore_breve}}": lead.puntoDoloreBreve || analystData.punto_dolore_breve || "DATA_MISSING",
    "{{ads_status}}": adsStatus,
    "{{cliche_found}}": analystData.cliche_found || "NESSUNA_CLICHE_TROVATA",
    "{{primary_error_pattern}}": analystData.primary_pattern || "NESSUNO",
  });

  // 7. Appendi note (se presenti)
  const finalPrompt = notes
    ? `${prompt}\n\n--- ISTRUZIONI AGGIUNTIVE ---\n${notes}`
    : prompt;

  // 8. Chiama Gemini
  const modelName = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const model = client.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: SCRIPTWRITER_RESPONSE_SCHEMA,
    },
  });

  console.log(`[SCRIPTWRITER] ${lead.name} — Calling Gemini (${modelName})...`);

  const result = await Promise.race([
    model.generateContent(finalPrompt),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Gemini timeout: nessuna risposta in 30 secondi")), 30_000)
    ),
  ]);

  const response = result.response;

  if (response.usageMetadata) {
    console.log(
      `[SCRIPTWRITER] ${lead.name} — tokens: prompt=${response.usageMetadata.promptTokenCount}, ` +
      `candidates=${response.usageMetadata.candidatesTokenCount}, ` +
      `total=${response.usageMetadata.totalTokenCount}`
    );
  }

  const text = response.text();
  let parsed: { teleprompter_script: { atto_1: string; atto_2: string; atto_3: string; atto_4: string; atto_5: string }; strategic_note: string };

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Risposta Gemini non è un JSON valido. Risposta: ${text.substring(0, 200)}...`);
  }

  if (
    !parsed.teleprompter_script?.atto_1 ||
    !parsed.teleprompter_script?.atto_2 ||
    !parsed.teleprompter_script?.atto_3 ||
    !parsed.teleprompter_script?.atto_4 ||
    !parsed.teleprompter_script?.atto_5
  ) {
    throw new Error("Risposta Gemini incompleta: mancano atti del teleprompter");
  }

  return {
    ...parsed,
    generatedAt: new Date().toISOString(),
    model: modelName,
    analysisVersion: "v2-scriptwriter",
  };
}
