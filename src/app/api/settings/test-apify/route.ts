import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// GET /api/settings/test-apify - Testa connessione Apify
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const token = process.env.APIFY_TOKEN;

    if (!token) {
      return NextResponse.json({
        success: false,
        message: "Token Apify non configurato",
      });
    }

    // Testa la connessione chiamando l'API Apify
    const response = await fetch(`https://api.apify.com/v2/users/me?token=${token}`);

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({
        success: true,
        message: `Connesso come: ${data.data?.username || "utente"}`,
      });
    } else {
      return NextResponse.json({
        success: false,
        message: "Token non valido o scaduto",
      });
    }
  } catch (error) {
    console.error("Error testing Apify:", error);
    return NextResponse.json({
      success: false,
      message: "Errore di connessione",
    });
  }
}
