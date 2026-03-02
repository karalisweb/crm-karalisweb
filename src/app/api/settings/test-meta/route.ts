import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// GET /api/settings/test-meta - Testa connessione Meta Ad Library
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const token = process.env.META_ACCESS_TOKEN;

    if (!token) {
      return NextResponse.json({
        success: false,
        message: "Access Token Meta non configurato",
      });
    }

    // Testa il token verificando il proprio profilo (/me)
    const response = await fetch(
      `https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${token}`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (response.ok) {
      const data = await response.json();
      const name = data.name || data.id || "utente";
      return NextResponse.json({
        success: true,
        message: `Connesso come: ${name}`,
      });
    } else {
      const errorData = await response.json().catch(() => null);
      const errorMsg = errorData?.error?.message || `HTTP ${response.status}`;

      if (response.status === 401 || response.status === 400) {
        return NextResponse.json({
          success: false,
          message: `Token non valido o scaduto: ${errorMsg}`,
        });
      }

      return NextResponse.json({
        success: false,
        message: `Errore API Meta: ${errorMsg}`,
      });
    }
  } catch (error) {
    console.error("Error testing Meta:", error);
    return NextResponse.json({
      success: false,
      message: "Errore di connessione (timeout o rete)",
    });
  }
}
