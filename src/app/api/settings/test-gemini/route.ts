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

    // Usa il modello scelto dall'utente, o il default
    const selectedModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";

    // Step 1: Lista modelli per verificare la key e i modelli disponibili
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

    // Verifica che il modello selezionato esista
    const modelExists = models.some((m) => {
      const name = m.name.replace("models/", "");
      return name === selectedModel || name.startsWith(selectedModel + "-0");
    });

    // Step 2: Testa generazione con il modello selezionato
    const testModel = modelExists ? selectedModel : "gemini-2.5-flash";
    const genResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${testModel}:generateContent?key=${apiKey}`,
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
      const modelNote = !modelExists
        ? ` (${selectedModel} non disponibile, testato con ${testModel})`
        : "";
      return NextResponse.json({
        success: true,
        message: `API Key valida | Modello: ${testModel}${modelNote} | ${models.length} modelli disponibili`,
      });
    }

    // La key funziona (lista OK) ma generazione fallita
    return NextResponse.json({
      success: true,
      message: `API Key valida | ${models.length} modelli disponibili | Test generazione fallito per ${testModel}`,
    });
  } catch (error) {
    console.error("Error testing Gemini:", error);
    return NextResponse.json({
      success: false,
      message: "Errore di connessione (timeout o rete)",
    });
  }
}
