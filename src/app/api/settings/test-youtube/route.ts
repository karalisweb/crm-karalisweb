import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * GET /api/settings/test-youtube
 *
 * Testa la connessione YouTube:
 * 1. Verifica che le credenziali OAuth siano configurate
 * 2. Se c'è il refresh token, verifica che funzioni listando i canali
 * 3. Se non c'è il refresh token, segnala di completare l'autorizzazione
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const clientId = process.env.YOUTUBE_CLIENT_ID;
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
    const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;

    if (!clientId || !clientSecret) {
      return NextResponse.json({
        success: false,
        message: "YouTube Client ID e/o Client Secret non configurati",
      });
    }

    if (!refreshToken) {
      return NextResponse.json({
        success: false,
        message: "Credenziali OK ma manca il Refresh Token — clicca \"Autorizza YouTube\" per completare",
        needsAuth: true,
      });
    }

    // Testa il refresh token ottenendo info sul canale
    const { google } = await import("googleapis");
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      process.env.YOUTUBE_REDIRECT_URI || "http://localhost:3003/api/youtube/callback"
    );
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    const youtube = google.youtube({ version: "v3", auth: oauth2Client });

    const channelRes = await youtube.channels.list({
      part: ["snippet"],
      mine: true,
    });

    const channels = channelRes.data.items;
    if (channels && channels.length > 0) {
      const channelName = channels[0].snippet?.title || "Canale YouTube";
      return NextResponse.json({
        success: true,
        message: `Connesso al canale: ${channelName}`,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Connesso a YouTube (nessun canale trovato — upload comunque funzionante)",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore sconosciuto";

    if (message.includes("invalid_grant") || message.includes("Token has been expired")) {
      return NextResponse.json({
        success: false,
        message: "Refresh token scaduto o revocato — clicca \"Autorizza YouTube\" per ri-autorizzare",
        needsAuth: true,
      });
    }

    return NextResponse.json({
      success: false,
      message: `Errore: ${message}`,
    });
  }
}
