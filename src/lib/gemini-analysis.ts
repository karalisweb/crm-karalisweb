import { getGeminiClient } from "./gemini";
import type { StrategicAnalysisInput, GeminiAnalysisResult } from "@/types";
import { SchemaType, type Schema } from "@google/generative-ai";

// ==========================================
// TIPI
// ==========================================

export type { StrategicAnalysisInput, GeminiAnalysisResult };

// ==========================================
// SYSTEM PROMPT v3.1 — EVIDENCE-ONLY MODE
// ==========================================

const SYSTEM_PROMPT = `Sei un Senior Brand Strategist. Analizzi SOLO i testi reali forniti nel payload JSON.

REGOLE ASSOLUTE:
1. PUOI USARE SOLO i testi presenti nei campi home_text, about_text, services_text.
2. La frase "cliche_found" DEVE essere una citazione ESATTA presa dai testi forniti. Non inventare frasi.
3. Se un campo è "DATA_MISSING", IGNORA quel campo. NON inventare contenuto per campi mancanti.
4. Se non trovi una frase cliché reale nei testi, scrivi "NESSUNA_CLICHE_TROVATA" nel campo cliche_found.
5. NON presumere, inferire o immaginare informazioni non presenti nei testi.

PATTERN DI ERRORE STRATEGICO (cerca evidenze nei testi):
1. L'Effetto 'Lista della Spesa': Il sito elenca servizi senza un angolo differenziante.
2. La Sindrome dell'Ego: Testo pieno di 'Siamo...', 'La nostra azienda...', ma non parla del problema del cliente.
3. Il Target Fantasma: Non c'è una dichiarazione chiara di CHI è il cliente ideale.

STRUTTURA DEL COPIONE (in prima persona, come Alessio, Founder di Karalisweb):

[ATTO 1 - Ghiaccio, Autorità e Anti-Operatività]
'Ciao {company_name}. Rompiamo subito il ghiaccio: sì, questo è un video commerciale, ma ci metto la faccia io come fondatore perché seleziono personalmente gli imprenditori con cui parlare. Lavoro nel digitale da oltre 20 anni e te lo dico subito: NON sono qui per venderti un nuovo sito web, una campagnetta social o la gestione SEO. Quelli sono solo strumenti. Io mi occupo di strategia. Ho analizzato il vostro posizionamento e, per usare una metafora culinaria, [METAFORA CULINARIA su ingredienti buoni ma senza ricetta].'

[ATTO 2 - La Scena del Crimine]
'Sono sul vostro sito. È un peccato, perché la vostra azienda è solida, ma siete caduti in una trappola comunissima. Guarda questa frase esatta che avete online: "[FRASE CLICHÉ ESATTA DAI TESTI]". Se coprissi il vostro logo con quello di un concorrente, funzionerebbe lo stesso. [CITA GLI ALTRI PATTERN TROVATI CON EVIDENZE DAI TESTI].'

[ATTO 3 - I Soldi]
CONDIZIONE: Leggi il campo "ads_status".
- SE ads_status è "CONFIRMED" E ads_copy è presente: 'Ho indagato e state sponsorizzando un annuncio che dice: "[CITA ads_copy ESATTO]". Ma quando clicco, [ANALIZZA landing_page_text E DESCRIVI L'INCOERENZA REALE]. State pagando per mandare traffico su una pagina che non mantiene la promessa dell'annuncio.'
- SE ads_status è "CONFIRMED" MA landing_page_text è null: 'State pagando per le Ads, ma mandare traffico su un sito con queste fondamenta significa bruciare budget.'
- SE ads_status è "NOT_FOUND": 'Oggi non state investendo in Ads. Questo vi rende invisibili nelle ricerche a pagamento, e i vostri competitor che lo fanno vi stanno rubando clienti ogni giorno.'
- SE ads_status è "API_ERROR" o "PENDING": 'Sul fronte pubblicitario non ho potuto verificare i dati in modo automatico, ma con queste fondamenta strategiche ogni investimento pubblicitario rischia di essere inefficace.'

[ATTO 4 - La Soluzione]
'Il problema non siete voi, ma l'assenza di un'architettura logica a monte. È esattamente quello che costruiamo in Karalisweb con il nostro Metodo Strategico Digitale (MSD). Ho attaccato subito dopo questa analisi una breve presentazione video che spiega come funziona l'MSD. Guardala, dura pochissimo. Ti scrivo qui in chat, a tra poco.'`;

// ==========================================
// JSON SCHEMA
// ==========================================

const RESPONSE_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    cliche_found: {
      type: SchemaType.STRING,
      description: "Frase esatta copiata dai testi forniti. Se nessuna trovata: NESSUNA_CLICHE_TROVATA",
    },
    primary_error_pattern: {
      type: SchemaType.STRING,
      description: "Pattern principale: Lista della Spesa | Sindrome dell'Ego | Target Fantasma | NESSUNO",
    },
    teleprompter_script: {
      type: SchemaType.OBJECT,
      properties: {
        atto_1: { type: SchemaType.STRING, description: "Atto 1 - Ghiaccio" },
        atto_2: { type: SchemaType.STRING, description: "Atto 2 - La Scena del Crimine" },
        atto_3: { type: SchemaType.STRING, description: "Atto 3 - I Soldi" },
        atto_4: { type: SchemaType.STRING, description: "Atto 4 - La Soluzione" },
      },
      required: ["atto_1", "atto_2", "atto_3", "atto_4"],
    },
    strategic_note: {
      type: SchemaType.STRING,
      description: "Nota interna per Alessio. Solo fatti dai testi, nessuna speculazione.",
    },
  },
  required: ["cliche_found", "primary_error_pattern", "teleprompter_script", "strategic_note"],
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

  // Payload deterministico — solo dati certificati
  const userPrompt = JSON.stringify({
    company_name: input.company_name,
    home_text: input.home_text || "DATA_MISSING",
    about_text: input.about_text || "DATA_MISSING",
    services_text: input.services_text || "DATA_MISSING",
    // Ads: solo dati certificati da Apify, MAI da tracking on-page
    ads_status: input.ads_status || "PENDING",
    ads_copy: input.google_ad_copy || input.meta_ads_copy?.[0] || null,
    landing_page_text: input.landing_page_text || null,
  });

  const result = await Promise.race([
    model.generateContent(userPrompt),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Gemini timeout: nessuna risposta in 30 secondi")), 30_000)
    ),
  ]);
  const response = result.response;

  // Log usage per monitoraggio costi
  if (response.usageMetadata) {
    console.log(
      `[GEMINI] ${input.company_name} — tokens: prompt=${response.usageMetadata.promptTokenCount}, ` +
      `candidates=${response.usageMetadata.candidatesTokenCount}, ` +
      `total=${response.usageMetadata.totalTokenCount}`
    );
  }

  const text = response.text();

  let parsed: {
    cliche_found: string;
    primary_error_pattern: string;
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

  if (
    !parsed.cliche_found ||
    !parsed.primary_error_pattern ||
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
    has_active_ads: input.ads_status === "CONFIRMED",
    ads_networks_found: [],
    generatedAt: new Date().toISOString(),
    model: modelName,
    analysisVersion: "3.1-strict",
    landing_page_url: input.landing_page_url || null,
    landing_page_text: input.landing_page_text || null,
    google_ad_copy: input.google_ad_copy || null,
    meta_ads_copy: input.meta_ads_copy || [],
  };
}
