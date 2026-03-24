import { getGeminiClient } from "./gemini";
import { SchemaType, type Schema } from "@google/generative-ai";
import { extractStrategicData } from "./audit/strategic-extractor";
import { validatePublicUrl } from "./url-validator";
import { db } from "./db";
import { DEFAULT_ANALYST_PROMPT, replacePlaceholders } from "./prompts-v2";

// ==========================================
// TIPI
// ==========================================

export interface AnalystPainPoint {
  area: string;
  finding: string;
  evidence: string;
  severity: "high" | "medium" | "low";
}

export interface AnalystOutput {
  pain_points: AnalystPainPoint[];
  primary_pattern: string;
  cliche_found: string;
  brand_positioning_score: number;
  communication_weakness: string;
  punto_dolore_breve: string;
  punto_dolore_lungo: string;
  // Metadata
  generatedAt: string;
  model: string;
  // Evidence data (per UI)
  home_text_length: number;
  about_text_length: number;
  services_text_length: number;
  cliche_status: string;
  tracking_tools: string[];
}

// ==========================================
// JSON SCHEMA per Gemini
// ==========================================

const ANALYST_RESPONSE_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    pain_points: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          area: { type: SchemaType.STRING, description: "Area del problema (es. Brand Positioning, SEO, Content, ecc.)" },
          finding: { type: SchemaType.STRING, description: "Cosa hai trovato di problematico" },
          evidence: { type: SchemaType.STRING, description: "Citazione ESATTA dal sito come prova" },
          severity: { type: SchemaType.STRING, description: "high | medium | low" },
        },
        required: ["area", "finding", "evidence", "severity"],
      },
    },
    primary_pattern: {
      type: SchemaType.STRING,
      description: "Pattern principale: Lista della Spesa | Sindrome dell'Ego | Target Fantasma | NESSUNO",
    },
    cliche_found: {
      type: SchemaType.STRING,
      description: "Frase cliché esatta trovata nei testi. Se nessuna: NESSUNA_CLICHE_TROVATA",
    },
    brand_positioning_score: {
      type: SchemaType.NUMBER,
      description: "Punteggio brand positioning da 1 (pessimo) a 10 (ottimo)",
    },
    communication_weakness: {
      type: SchemaType.STRING,
      description: "Sintesi della debolezza comunicativa principale",
    },
    punto_dolore_breve: {
      type: SchemaType.STRING,
      description: "1-2 frasi incisive che catturano il problema principale. Per uso WhatsApp.",
    },
    punto_dolore_lungo: {
      type: SchemaType.STRING,
      description: "Paragrafo che approfondisce il problema con empatia. Per landing page.",
    },
  },
  required: [
    "pain_points",
    "primary_pattern",
    "cliche_found",
    "brand_positioning_score",
    "communication_weakness",
    "punto_dolore_breve",
    "punto_dolore_lungo",
  ],
};

// ==========================================
// FETCH HTML (riusa pattern da background-jobs)
// ==========================================

async function fetchSiteHtml(url: string): Promise<string> {
  validatePublicUrl(url);

  const response = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ${url}`);
  }

  const html = await response.text();
  if (html.length > 5_000_000) {
    throw new Error("HTML troppo grande (>5MB)");
  }

  return html;
}

// ==========================================
// RUN ANALYST PROMPT
// ==========================================

const DEFAULT_MODEL = "gemini-2.5-flash";

export async function runAnalystPrompt(
  leadId: string,
  notes?: string
): Promise<AnalystOutput> {
  // 1. Carica lead
  const lead = await db.lead.findUniqueOrThrow({
    where: { id: leadId },
    select: { name: true, website: true },
  });

  if (!lead.website) {
    throw new Error("Lead senza sito web");
  }

  // 2. Gemini client
  const client = getGeminiClient();
  if (!client) {
    throw new Error("Gemini API key non configurata. Vai in Impostazioni > API & Token.");
  }

  // 3. Ri-scrapa il sito (HTML fresco)
  console.log(`[ANALYST] ${lead.name} — Scraping ${lead.website}...`);
  const html = await fetchSiteHtml(lead.website);

  // 4. Estrai dati strategici
  const extracted = await extractStrategicData(html, lead.website, lead.name);

  // 5. Carica prompt personalizzato o default
  const settings = await db.settings.findFirst();
  const promptTemplate = settings?.analystPrompt || DEFAULT_ANALYST_PROMPT;

  // 6. Sostituisci placeholder
  const prompt = replacePlaceholders(promptTemplate, {
    "{{company_name}}": lead.name,
    "{{home_text}}": extracted.home_text || "DATA_MISSING",
    "{{about_text}}": extracted.about_text || "DATA_MISSING",
    "{{services_text}}": extracted.services_text || "DATA_MISSING",
    "{{cliche_status}}": extracted.cliche_status,
    "{{tracking_tools}}": extracted.tracking_tools_found.join(", ") || "Nessuno trovato",
  });

  // 7. Appendi note per rigenerazione (se presenti)
  const finalPrompt = notes
    ? `${prompt}\n\n--- ISTRUZIONI AGGIUNTIVE ---\n${notes}`
    : prompt;

  // 8. Chiama Gemini
  const modelName = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const model = client.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: ANALYST_RESPONSE_SCHEMA,
    },
  });

  console.log(`[ANALYST] ${lead.name} — Calling Gemini (${modelName})...`);

  const result = await Promise.race([
    model.generateContent(finalPrompt),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Gemini timeout: nessuna risposta in 30 secondi")), 30_000)
    ),
  ]);

  const response = result.response;

  if (response.usageMetadata) {
    console.log(
      `[ANALYST] ${lead.name} — tokens: prompt=${response.usageMetadata.promptTokenCount}, ` +
      `candidates=${response.usageMetadata.candidatesTokenCount}, ` +
      `total=${response.usageMetadata.totalTokenCount}`
    );
  }

  const text = response.text();
  let parsed: Omit<AnalystOutput, "generatedAt" | "model" | "home_text_length" | "about_text_length" | "services_text_length" | "cliche_status" | "tracking_tools">;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Risposta Gemini non è un JSON valido. Risposta: ${text.substring(0, 200)}...`);
  }

  if (!parsed.pain_points || !parsed.primary_pattern || !parsed.punto_dolore_breve || !parsed.punto_dolore_lungo) {
    throw new Error("Risposta Gemini incompleta: mancano campi obbligatori");
  }

  // 9. Componi output completo con metadata
  const output: AnalystOutput = {
    ...parsed,
    generatedAt: new Date().toISOString(),
    model: modelName,
    home_text_length: extracted.home_text?.length || 0,
    about_text_length: extracted.about_text?.length || 0,
    services_text_length: extracted.services_text?.length || 0,
    cliche_status: extracted.cliche_status,
    tracking_tools: extracted.tracking_tools_found,
  };

  return output;
}
