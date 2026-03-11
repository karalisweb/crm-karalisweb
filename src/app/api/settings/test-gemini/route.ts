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

    // Testa la key con una chiamata minimale
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Rispondi solo: OK" }] }],
        }),
        signal: AbortSignal.timeout(15000),
      }
    );

    if (response.ok) {
      return NextResponse.json({
        success: true,
        message: "API Key valida | Modello: gemini-2.0-flash",
      });
    } else if (response.status === 400 || response.status === 403) {
      const errorData = await response.json().catch(() => null);
      const errorMsg = errorData?.error?.message || "API Key non valida";
      return NextResponse.json({
        success: false,
        message: errorMsg,
      });
    } else {
      return NextResponse.json({
        success: false,
        message: `Errore API: HTTP ${response.status}`,
      });
    }
  } catch (error) {
    console.error("Error testing Gemini:", error);
    return NextResponse.json({
      success: false,
      message: "Errore di connessione (timeout o rete)",
    });
  }
}
