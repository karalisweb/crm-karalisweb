import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// GET /api/settings/test-dataforseo - Testa connessione DataForSEO
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const login = process.env.DATAFORSEO_LOGIN;
    const password = process.env.DATAFORSEO_PASSWORD;

    if (!login || !password) {
      return NextResponse.json({
        success: false,
        message: "Credenziali DataForSEO non configurate",
      });
    }

    // Testa la connessione con una chiamata leggera (appendix/user_data)
    const credentials = Buffer.from(`${login}:${password}`).toString("base64");
    const response = await fetch("https://api.dataforseo.com/v3/appendix/user_data", {
      method: "GET",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (response.ok) {
      const data = await response.json();
      const balance = data?.tasks?.[0]?.result?.[0]?.money?.balance;
      const balanceStr = balance != null ? ` | Credito: $${Number(balance).toFixed(2)}` : "";
      return NextResponse.json({
        success: true,
        message: `Connesso come: ${login}${balanceStr}`,
      });
    } else if (response.status === 401) {
      return NextResponse.json({
        success: false,
        message: "Credenziali non valide",
      });
    } else {
      return NextResponse.json({
        success: false,
        message: `Errore API: HTTP ${response.status}`,
      });
    }
  } catch (error) {
    console.error("Error testing DataForSEO:", error);
    return NextResponse.json({
      success: false,
      message: "Errore di connessione (timeout o rete)",
    });
  }
}
