import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Crea un client Gemini AI. Ritorna null se API key non configurata.
 */
export function getGeminiClient(): GoogleGenerativeAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Verifica se Gemini AI è configurato
 */
export function isGeminiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}
