import { NextRequest, NextResponse } from "next/server";
import { prendiLavori } from "@/lib/agents/browser";

/**
 * GET /api/agenti/browser/lavori?limit=5[&soloLettura=1]
 *
 * L'agente di browser (dalla v3.134 sul server, prima Claude sul Mac di Alessio) prende in carico i
 * lavori di browser (social, Meta Ad Library, LinkedIn, decision maker, mappa BNI). Ogni lavoro passa
 * da IN_CODA a IN_CORSO: va chiuso con POST /api/agenti/browser/referto entro 3 ore. Con
 * `soloLettura=1` (di notte) non prende i lavori che commentano, collegano o scrivono.
 * Protetto da AGENTI_BROWSER_KEY (middleware).
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const limit = Math.min(Math.max(Number(sp.get("limit")) || 5, 1), 20);
  const soloLettura = sp.get("soloLettura") === "1";
  const lavori = await prendiLavori(limit, soloLettura);
  return NextResponse.json({ lavori });
}
