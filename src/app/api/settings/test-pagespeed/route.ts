import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// GET /api/settings/test-pagespeed - Testa connessione Google PageSpeed Insights
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const apiKey = process.env.PAGESPEED_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        message: "API Key PageSpeed non configurata",
      });
    }

    // Testa la key con un'analisi veloce su google.com (sito sempre raggiungibile)
    const testUrl = encodeURIComponent("https://www.google.com");
    const response = await fetch(
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${testUrl}&key=${apiKey}&category=performance&strategy=mobile`,
      { signal: AbortSignal.timeout(30000) }
    );

    if (response.ok) {
      const data = await response.json();
      const score = data?.lighthouseResult?.categories?.performance?.score;
      const scoreStr = score != null ? ` | Test score: ${Math.round(score * 100)}/100` : "";
      return NextResponse.json({
        success: true,
        message: `API Key valida${scoreStr}`,
      });
    } else if (response.status === 400 || response.status === 403) {
      const errorData = await response.json().catch(() => null);
      const errorMsg = errorData?.error?.message || "API Key non valida o API non abilitata";
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
    console.error("Error testing PageSpeed:", error);
    return NextResponse.json({
      success: false,
      message: "Errore di connessione (timeout o rete)",
    });
  }
}
