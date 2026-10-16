import { NextRequest, NextResponse } from "next/server";
import { esplora, type EsitoEsplorazione } from "@/lib/agents/esploratore";

/**
 * POST /api/cron/esploratore?ricerche=1 — l'Esploratore cerca aziende nuove su Google
 * (una o più coppie categoria × città, max 5). Protetto da CRON_SECRET (middleware).
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.CRON_SECRET;
  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const quante = Math.min(Math.max(Number(request.nextUrl.searchParams.get("ricerche")) || 1, 1), 5);
  const esiti: EsitoEsplorazione[] = [];
  try {
    for (let i = 0; i < quante; i++) {
      const e = await esplora();
      esiti.push(e);
      if (e.motivo) break; // niente da cercare, budget finito o DataForSEO assente
    }
    console.log("[esploratore]", JSON.stringify(esiti));
    return NextResponse.json({ success: true, esiti });
  } catch (error) {
    console.error("[esploratore] fallito:", error);
    return NextResponse.json({ success: false, esiti, error: error instanceof Error ? error.message : "Errore interno" }, { status: 500 });
  }
}
