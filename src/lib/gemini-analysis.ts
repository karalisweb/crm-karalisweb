import { getGeminiClient } from "./gemini";
import type { StrategicAnalysisInput, GeminiAnalysisResult } from "@/types";
import { SchemaType, type Schema } from "@google/generative-ai";

// ==========================================
// TIPI
// ==========================================

export type { StrategicAnalysisInput, GeminiAnalysisResult };

// ==========================================
// SYSTEM PROMPT (Brand Strategist)
// ==========================================

const SYSTEM_PROMPT = `Sei un Senior Brand Strategist. Analizza il testo fornito (hero_text e about_us_text). Il tuo obiettivo è trovare ALMENO UNA frase cliché, banale o priva di reale posizionamento (es. 'leader di settore', 'team giovane', 'servizio a 360 gradi').

Devi restituire un copione per il teleprompter di Alessio, diviso in 4 atti e formattato ESATTAMENTE così:

[ATTO 1 - Ghiaccio e Metafora] Ciao {company_name}, è un video di vendita ma non ti parlerò del tuo sito. Avete ingredienti ottimi ma cucinate senza ricetta (usa una metafora culinaria in base al loro settore).

[ATTO 2 - La Scena del Crimine] Siete sul web con un posizionamento invisibile. Guarda questa frase sulla vostra home: '[INSERISCI QUI LA FRASE CLICHÉ TROVATA]'. Se ci mettessi il logo del vostro competitor, sarebbe uguale.

[ATTO 3 - I Soldi] Se has_active_ads è TRUE: 'Dato che state pagando Google/Meta per le Ads, mandare traffico qui significa bruciare budget per far rimbalzare gli utenti.' Se has_active_ads è FALSE: 'Non state facendo Ads, ma anche se le faceste oggi, con questo messaggio brucereste solo budget.'

[ATTO 4 - La Soluzione] Non serve rifare il sito, serve prima il Metodo Strategico Digitale per creare l'architettura logica.`;

// ==========================================
// JSON SCHEMA per output strutturato
// ==========================================

const RESPONSE_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    cliche_found: {
      type: SchemaType.STRING,
      description: "La frase banale estratta dal loro sito",
    },
    teleprompter_script: {
      type: SchemaType.OBJECT,
      properties: {
        atto_1: {
          type: SchemaType.STRING,
          description: "Testo Atto 1 - Ghiaccio e Metafora",
        },
        atto_2: {
          type: SchemaType.STRING,
          description: "Testo Atto 2 - La Scena del Crimine",
        },
        atto_3: {
          type: SchemaType.STRING,
          description: "Testo Atto 3 - I Soldi",
        },
        atto_4: {
          type: SchemaType.STRING,
          description: "Testo Atto 4 - La Soluzione",
        },
      },
      required: ["atto_1", "atto_2", "atto_3", "atto_4"],
    },
    strategic_note: {
      type: SchemaType.STRING,
      description:
        "Nota interna per Alessio sul perché questa azienda non ha posizionamento",
    },
  },
  required: ["cliche_found", "teleprompter_script", "strategic_note"],
};

// ==========================================
// ESECUZIONE ANALISI
// ==========================================

const DEFAULT_MODEL = "gemini-2.5-flash";

export async function runGeminiAnalysis(
  input: StrategicAnalysisInput
): Promise<GeminiAnalysisResult> {
  const client = getGeminiClient();
  if (!client) {
    throw new Error(
      "Gemini API key non configurata. Vai in Impostazioni > API & Token."
    );
  }

  const modelName = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const model = client.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
    systemInstruction: SYSTEM_PROMPT,
  });

  // Payload JSON con le variabili estratte dallo scraper
  const userPrompt = JSON.stringify({
    company_name: input.company_name,
    hero_text: input.hero_text,
    about_us_text: input.about_us_text,
    has_active_ads: input.has_active_ads,
  });

  const result = await model.generateContent(userPrompt);
  const response = result.response;
  const text = response.text();

  let parsed: {
    cliche_found: string;
    teleprompter_script: {
      atto_1: string;
      atto_2: string;
      atto_3: string;
      atto_4: string;
    };
    strategic_note: string;
  };

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(
      `Risposta Gemini non è un JSON valido. Risposta: ${text.substring(0, 200)}...`
    );
  }

  // Validazione
  if (
    !parsed.cliche_found ||
    !parsed.teleprompter_script ||
    !parsed.strategic_note
  ) {
    throw new Error("Risposta Gemini incompleta: mancano campi obbligatori");
  }

  if (
    !parsed.teleprompter_script.atto_1 ||
    !parsed.teleprompter_script.atto_2 ||
    !parsed.teleprompter_script.atto_3 ||
    !parsed.teleprompter_script.atto_4
  ) {
    throw new Error("Risposta Gemini incompleta: mancano atti del teleprompter");
  }

  return {
    ...parsed,
    has_active_ads: input.has_active_ads,
    generatedAt: new Date().toISOString(),
    model: modelName,
  };
}
