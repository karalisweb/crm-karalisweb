import { NextRequest, NextResponse } from "next/server";
import { eseguiTurnoBni } from "@/lib/agents/bni";

/**
 * POST /api/cron/squadra-bni — un turno della squadra BNI (copertura Sardegna, stratega
 * di capitolo, messaggi per le azioni approvate, mappa della prossima regione).
 * Chiamato una volta al giorno dal crontab del VPS. Protetto da CRON_SECRET (middleware).
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.CRON_SECRET;
  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const riepilogo = await eseguiTurnoBni();
    console.log("[squadra-bni] turno:", JSON.stringify(riepilogo));
    return NextResponse.json({ success: true, ...riepilogo });
  } catch (error) {
    console.error("[squadra-bni] turno fallito:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Errore interno" }, { status: 500 });
  }
}
