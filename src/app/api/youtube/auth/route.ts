import { NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/youtube";

/**
 * GET /api/youtube/auth
 *
 * Redirige l'utente al consent screen di Google per autorizzare
 * l'upload video su YouTube. Usato una sola volta per ottenere
 * il refresh token.
 */
export async function GET() {
  try {
    const url = getAuthUrl();
    return NextResponse.redirect(url);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore configurazione YouTube" },
      { status: 500 }
    );
  }
}
