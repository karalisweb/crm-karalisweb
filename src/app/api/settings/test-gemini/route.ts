import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// GET /api/settings/test-gemini - Testa connessione Google Gemini AI
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        message: "API Key Gemini non configurata",
      });
    }

    // Step 1: Lista modelli per verificare la key e trovare modelli disponibili
    const listResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!listResponse.ok) {
      if (listResponse.status === 400 || listResponse.status === 403) {
        const errorData = await listResponse.json().catch(() => null);
        return NextResponse.json({
          success: false,
          message: errorData?.error?.message || "API Key non valida",
        });
      }
      return NextResponse.json({
        success: false,
        message: `Errore API: HTTP ${listResponse.status}`,
      });
    }

    const listData = await listResponse.json();
    const models = (listData.models || []) as Array<{ name: string; displayName?: string }>;

    // Cerca un modello flash disponibile (preferenza: 2.0-flash > 1.5-flash)
    const flashModel = models.find((m) => m.name.includes("gemini-2.0-flash"))
      || models.find((m) => m.name.includes("gemini-1.5-flash"));

    const modelName = flashModel
      ? flashModel.name.replace("models/", "")
      : null;

    // Step 2: Testa generazione con il modello trovato
    if (modelName) {
      const genResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "Rispondi solo: OK" }] }],
          }),
          signal: AbortSignal.timeout(15000),
        }
      );

      if (genResponse.ok) {
        return NextResponse.json({
          success: true,
          message: `API Key valida | Modello: ${modelName} | ${models.length} modelli disponibili`,
        });
      }
    }

    // La key funziona (lista modelli OK) ma nessun modello flash trovato
    return NextResponse.json({
      success: true,
      message: `API Key valida | ${models.length} modelli disponibili${modelName ? ` | Flash: ${modelName}` : " | Nessun modello Flash trovato"}`,
    });
  } catch (error) {
    console.error("Error testing Gemini:", error);
    return NextResponse.json({
      success: false,
      message: "Errore di connessione (timeout o rete)",
    });
  }
}
