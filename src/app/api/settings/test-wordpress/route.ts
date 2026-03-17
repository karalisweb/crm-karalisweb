import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * GET /api/settings/test-wordpress
 *
 * Testa la connessione WordPress:
 * 1. Verifica che le credenziali siano configurate
 * 2. Chiama WP REST API per verificare autenticazione
 * 3. Verifica che il CPT video_prospect esista
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const wpUrl = process.env.WP_URL;
    const wpUser = process.env.WP_USER;
    const wpAppPassword = process.env.WP_APP_PASSWORD;

    if (!wpUrl || !wpUser || !wpAppPassword) {
      return NextResponse.json({
        success: false,
        message: "Credenziali WordPress non configurate",
      });
    }

    const authHeader = `Basic ${Buffer.from(`${wpUser}:${wpAppPassword}`).toString("base64")}`;

    // Step 1: Verifica autenticazione
    const userRes = await fetch(`${wpUrl}/wp-json/wp/v2/users/me`, {
      headers: { Authorization: authHeader },
      signal: AbortSignal.timeout(10000),
    });

    if (!userRes.ok) {
      if (userRes.status === 401 || userRes.status === 403) {
        return NextResponse.json({
          success: false,
          message: "Autenticazione fallita — verifica username e Application Password",
        });
      }
      return NextResponse.json({
        success: false,
        message: `Errore WordPress: ${userRes.status} ${userRes.statusText}`,
      });
    }

    const userData = await userRes.json();
    const userName = userData.name || userData.slug || wpUser;

    // Step 2: Verifica CPT video_prospect
    const cptRes = await fetch(`${wpUrl}/wp-json/wp/v2/types/video_prospect`, {
      headers: { Authorization: authHeader },
      signal: AbortSignal.timeout(10000),
    });

    let cptStatus = "";
    if (cptRes.ok) {
      const cptData = await cptRes.json();
      cptStatus = ` | CPT "${cptData.name}" attivo`;
    } else {
      cptStatus = " | ⚠️ CPT 'video_prospect' non trovato — crealo in ACF PRO";
    }

    return NextResponse.json({
      success: true,
      message: `Connesso come: ${userName}${cptStatus}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore sconosciuto";
    if (message.includes("timeout") || message.includes("abort")) {
      return NextResponse.json({
        success: false,
        message: "Timeout — il sito WordPress non risponde",
      });
    }
    return NextResponse.json({
      success: false,
      message: `Errore: ${message}`,
    });
  }
}
