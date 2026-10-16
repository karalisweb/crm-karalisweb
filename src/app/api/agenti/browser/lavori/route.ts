import { NextRequest, NextResponse } from "next/server";
import { prendiLavori } from "@/lib/agents/browser";

/**
 * GET /api/agenti/browser/lavori?limit=5
 *
 * Claude sul Mac di Alessio prende in carico i lavori di browser (social, Meta Ad Library,
 * LinkedIn, decision maker, mappa BNI). Ogni lavoro passa da IN_CODA a IN_CORSO: va chiuso
 * con POST /api/agenti/browser/referto entro 3 ore. Protetto da AGENTI_BROWSER_KEY (middleware).
 */
export async function GET(request: NextRequest) {
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit")) || 5, 1), 20);
  const lavori = await prendiLavori(limit);
  return NextResponse.json({ lavori });
}
