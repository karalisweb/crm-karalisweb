import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// GET /api/settings/test-meta - Testa connessione Meta Ads (via Apify)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const apifyToken = process.env.APIFY_TOKEN;

    if (!apifyToken) {
      return NextResponse.json({
        success: false,
        message: "Token Apify non configurato — necessario per Meta Ads",
      });
    }

    // Verifica che l'actor sia accessibile con il token Apify
    const response = await fetch(
      `https://api.apify.com/v2/acts/apify~facebook-ads-scraper?token=${apifyToken}`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (response.ok) {
      const data = await response.json();
      const actorName = data?.data?.title || "Facebook Ads Scraper";
      return NextResponse.json({
        success: true,
        message: `OK — Actor: ${actorName} (usa token Apify)`,
      });
    }

    return NextResponse.json({
      success: false,
      message: `Errore accesso actor Apify: HTTP ${response.status}`,
    });
  } catch (error) {
    console.error("Error testing Meta Ads (Apify):", error);
    return NextResponse.json({
      success: false,
      message: "Errore di connessione (timeout o rete)",
    });
  }
}
