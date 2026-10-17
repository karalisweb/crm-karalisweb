/**
 * Il cervello degli agenti: un solo punto d'accesso all'AI.
 *
 * Usa Claude (Opus 5.5) se è configurata ANTHROPIC_API_KEY, altrimenti Gemini (la chiave
 * c'è già in produzione). Ogni risposta è JSON validato contro uno schema e porta con sé
 * token e costo, così il tetto di spesa è reale.
 */
import Anthropic from "@anthropic-ai/sdk";
import { getGeminiClient } from "@/lib/gemini";
import { costoAiCentesimi } from "./costi";

/** Schema JSON minimo, comprensibile sia a Claude sia a Gemini. */
export type Schema =
  | { type: "string"; description?: string; enum?: string[] }
  | { type: "number" | "integer" | "boolean"; description?: string }
  | { type: "array"; items: Schema; description?: string }
  | { type: "object"; properties: Record<string, Schema>; required: string[]; description?: string };

export interface RichiestaAI {
  /** Istruzioni stabili dell'agente (il suo mestiere). */
  sistema: string;
  /** I materiali di questo lavoro: referti, testi del sito, dati dell'azienda. */
  testo: string;
  schema: Schema;
  maxTokens?: number;
  /** Un PDF da leggere insieme al testo (es. un caso studio), in base64. */
  pdf?: string;
}

export interface RispostaAI<T> {
  dati: T;
  motore: "claude" | "gemini";
  modello: string;
  tokenIn: number;
  tokenOut: number;
  costCents: number;
}

export const MODELLO_CLAUDE = "claude-opus-5-5";

export function motoreAI(): "claude" | "gemini" | null {
  if (process.env.ANTHROPIC_API_KEY) return "claude";
  if (process.env.GEMINI_API_KEY) return "gemini";
  return null;
}

/** Claude vuole additionalProperties:false su ogni oggetto per gli output strutturati. */
function schemaPerClaude(s: Schema): Record<string, unknown> {
  if (s.type === "object") {
    return {
      type: "object",
      ...(s.description ? { description: s.description } : {}),
      properties: Object.fromEntries(Object.entries(s.properties).map(([k, v]) => [k, schemaPerClaude(v)])),
      required: s.required,
      additionalProperties: false,
    };
  }
  if (s.type === "array") {
    return { type: "array", ...(s.description ? { description: s.description } : {}), items: schemaPerClaude(s.items) };
  }
  return { ...s };
}

async function chiediClaude<T>(r: RichiestaAI): Promise<RispostaAI<T>> {
  const client = new Anthropic();
  // Fallback lato server: se i filtri di sicurezza rifiutano, la richiesta viene rifatta
  // su un altro modello invece di fallire. Il parametro è in beta, per questo il cast.
  const params = {
    model: MODELLO_CLAUDE,
    max_tokens: r.maxTokens ?? 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: r.sistema,
    output_config: { effort: "medium", format: { type: "json_schema", schema: schemaPerClaude(r.schema) } },
    messages: [{
      role: "user",
      content: r.pdf
        ? [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: r.pdf } }, { type: "text", text: r.testo }]
        : r.testo,
    }],
  };
  const res = await client.beta.messages.create(params as unknown as Parameters<typeof client.beta.messages.create>[0]) as Anthropic.Beta.BetaMessage;

  if (res.stop_reason === "refusal") throw new Error("L'AI ha rifiutato la richiesta (filtri di sicurezza)");
  if (res.stop_reason === "max_tokens") throw new Error("Risposta dell'AI troncata (max_tokens)");
  const testo = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  return {
    dati: JSON.parse(testo) as T,
    motore: "claude",
    modello: res.model,
    tokenIn: res.usage.input_tokens,
    tokenOut: res.usage.output_tokens,
    costCents: costoAiCentesimi(res.model, res.usage.input_tokens, res.usage.output_tokens),
  };
}

async function chiediGemini<T>(r: RichiestaAI): Promise<RispostaAI<T>> {
  const client = getGeminiClient();
  if (!client) throw new Error("Nessuna chiave AI configurata (ANTHROPIC_API_KEY o GEMINI_API_KEY)");
  const modello = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const model = client.getGenerativeModel({
    model: modello,
    systemInstruction: r.sistema,
    generationConfig: {
      responseMimeType: "application/json",
      // Lo schema minimo usa gli stessi nomi di tipo di Gemini ("object", "string"…).
      responseSchema: r.schema as never,
      maxOutputTokens: r.maxTokens ?? 8192,
    },
  });
  const contenuto = r.pdf ? [{ inlineData: { mimeType: "application/pdf", data: r.pdf } }, { text: r.testo }] : r.testo;
  const res = await model.generateContent(contenuto, { timeout: r.pdf ? 120_000 : 60_000 });
  const tokenIn = res.response.usageMetadata?.promptTokenCount ?? 0;
  const tokenOut = res.response.usageMetadata?.candidatesTokenCount ?? 0;
  return {
    dati: JSON.parse(res.response.text()) as T,
    motore: "gemini",
    modello,
    tokenIn,
    tokenOut,
    costCents: costoAiCentesimi(modello, tokenIn, tokenOut),
  };
}

/** Una domanda all'AI con risposta JSON strutturata. */
export async function chiediJSON<T>(r: RichiestaAI): Promise<RispostaAI<T>> {
  const motore = motoreAI();
  if (motore === "claude") return chiediClaude<T>(r);
  if (motore === "gemini") return chiediGemini<T>(r);
  throw new Error("Nessuna chiave AI configurata (ANTHROPIC_API_KEY o GEMINI_API_KEY)");
}

/**
 * Regole comuni a ogni agente che scrive con l'AI: il contesto di Karalisweb e il divieto
 * di inventare. Va in testa al prompt di sistema di ciascuno.
 */
export const REGOLE_COMUNI = `Lavori per Karalisweb, agenzia di web marketing in Sardegna. Vende siti web e servizi operativi (Google Ads, SEO, Meta Ads, gestione social, contenuti) passando sempre dal Metodo Strategico Digitale (Metodo SD): prima si capisce la strategia dell'azienda, poi si scelgono gli strumenti. L'obiettivo immediato con ogni azienda è ottenere una call; quello reale è vendere un sito o un servizio operativo.

Chi scrive i messaggi è Alessio Loi, fondatore di Karalisweb: firma sempre "Alessio Loi — Karalisweb" (o solo "Alessio" nei messaggi brevi). Mai altri cognomi, mai firme inventate.

Regole che non si violano:
- Usa SOLO i fatti presenti nei materiali che ricevi. Se un dato manca, scrivilo come mancante: non dedurlo, non inventarlo.
- Ogni affermazione su un'azienda deve poter essere ricondotta a una prova nei materiali (una citazione, un dato di un referto).
- Scrivi in italiano semplice, diretto, senza tono da venditore: niente "potremmo aiutarvi", "soluzioni", "esservi utile".`;
