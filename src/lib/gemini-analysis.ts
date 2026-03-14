import { getGeminiClient } from "./gemini";
import type { StrategicAnalysisInput, GeminiAnalysisResult } from "@/types";
import { SchemaType, type Schema } from "@google/generative-ai";

// ==========================================
// TIPI
// ==========================================

export type { StrategicAnalysisInput, GeminiAnalysisResult };

// ==========================================
// SYSTEM PROMPT (Senior Brand Strategist v2)
// ==========================================

const SYSTEM_PROMPT = `Agisci come un Senior Brand Strategist. Il tuo obiettivo è analizzare l'intero ecosistema comunicativo dell'azienda combinando home_text, about_text e services_text. Devi valutare il sito contro questi 3 PATTERN DI ERRORE STRATEGICO:

1. L'Effetto 'Lista della Spesa': Il sito elenca servizi senza un angolo differenziante, rendendo l'azienda una commodity (scelta solo per il prezzo).
2. La Sindrome dell'Ego: Il testo è pieno di 'La nostra azienda', 'Siamo nati nel...', ma non parla mai del problema specifico del cliente.
3. Il Target Fantasma: Non c'è una dichiarazione chiara di CHI è il loro cliente ideale (cercano di vendere a tutti).

Trova il Pattern PIÙ GRAVE ed estrai dal testo una [FRASE CLICHÉ] esatta che lo dimostri. Poi verifica se sono presenti anche gli altri pattern per il 'multi-errore'.

STRUTTURA DEL COPIONE (Genera il testo in prima persona, come se parlasse Alessio, il Founder):

[ATTO 1 - Ghiaccio, Autorità e Anti-Operatività] 'Ciao {company_name}. Rompiamo subito il ghiaccio: sì, questo è un video commerciale, ma ci metto la faccia io come fondatore perché seleziono personalmente gli imprenditori con cui parlare. Lavoro nel digitale da oltre 20 anni e te lo dico subito per togliere ogni dubbio: NON sono qui per venderti un nuovo sito web, una campagnetta social o la gestione SEO. Quelli sono solo strumenti. Io mi occupo di strategia. Ho analizzato il vostro posizionamento e, per usare una metafora culinaria, [INSERIRE QUI UNA METAFORA SUL CUCINARE INGREDIENTI OTTIMI MA SENZA UNA VERA RICETTA].'

[ATTO 2 - La Scena del Crimine (Colpa al Sistema + Multi-Errore)] 'Sono sul vostro sito. È un peccato, perché la vostra azienda è solida, ma siete caduti in una trappola comunissima. È normale, perché purtroppo oggi lo standard del mercato web vi spinge a [INSERIRE IL PATTERN PIÙ GRAVE TROVATO]. Guarda questa frase esatta che avete online: "[INSERISCI FRASE CLICHÉ ESTRATTA]". Se coprissi il vostro logo con quello di un concorrente, funzionerebbe lo stesso. E attenzione, questo è solo il problema principale, perché lo "standard" vi ha portato anche a [CITARE RAPIDAMENTE GLI ALTRI ERRORI TROVATI TRA I 3 PATTERN].'

[ATTO 3 - I Soldi (Condizionale su has_active_ads)] SE has_active_ads è TRUE: 'Dato che state pagando Google/Meta per le Ads, mandare traffico su una pagina che vi fa percepire come gli altri significa letteralmente bruciare budget per far rimbalzare gli utenti e finanziare la guerra dei prezzi.' SE has_active_ads è FALSE: 'Anche se oggi non fate Ads, con queste fondamenta ogni euro che deciderete di investire in futuro per portarvi traffico andrà letteralmente bruciato.'

[ATTO 4 - La Soluzione e Il Ponte verso il Video Master] 'Il problema non siete voi, ma l'assenza di un'architettura logica a monte. È esattamente quello che costruiamo in Karalisweb con il nostro Metodo Strategico Digitale (MSD), che applico da anni sulle PMI. Per mostrarti di cosa si tratta senza farti perdere tempo, ho attaccato subito dopo questa mia analisi una breve presentazione video che spiega come funziona l'MSD e come ferma lo spreco di budget. Guardala, dura pochissimo. Ti scrivo qui in chat, a tra poco.'`;

// ==========================================
// JSON SCHEMA per output strutturato
// ==========================================

const RESPONSE_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    cliche_found: {
      type: SchemaType.STRING,
      description: "La frase esatta estratta dal sito che dimostra il pattern di errore",
    },
    primary_error_pattern: {
      type: SchemaType.STRING,
      description: "Il nome del pattern principale trovato tra: Lista della Spesa, Sindrome dell'Ego, Target Fantasma",
    },
    teleprompter_script: {
      type: SchemaType.OBJECT,
      properties: {
        atto_1: {
          type: SchemaType.STRING,
          description: "Testo Atto 1 - Ghiaccio, Autorità e Anti-Operatività",
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
        "Nota interna per Alessio sui punti deboli dell'azienda e perché non ha posizionamento",
    },
  },
  required: [
    "cliche_found",
    "primary_error_pattern",
    "teleprompter_script",
    "strategic_note",
  ],
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

  // Payload JSON con i testi estratti dal deep scraper
  const userPrompt = JSON.stringify({
    company_name: input.company_name,
    home_text: input.home_text,
    about_text: input.about_text,
    services_text: input.services_text,
    has_active_ads: input.has_active_ads,
  });

  const result = await model.generateContent(userPrompt);
  const response = result.response;
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

  // Validazione
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
    has_active_ads: input.has_active_ads,
    ads_networks_found: input.ads_networks_found || [],
    generatedAt: new Date().toISOString(),
    model: modelName,
    analysisVersion: "2.0",
  };
}
