import { NextRequest, NextResponse } from "next/server";
import { eseguiTurnoVendita } from "@/lib/vendita/trattative";

/**
 * POST /api/cron/vendita — gli agenti di vendita sulle trattative aperte: preparazione delle
 * call del giorno dopo, dopo-call sulle trascrizioni nuove, recall scaduti, nurturing.
 * Ogni ora nelle ore di lavoro (crontab del VPS). Protetto da CRON_SECRET (middleware).
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.CRON_SECRET;
  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const r = await eseguiTurnoVendita();
    console.log("[vendita] turno:", JSON.stringify(r));
    return NextResponse.json({ success: true, ...r });
  } catch (error) {
    console.error("[vendita] turno fallito:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Errore interno" }, { status: 500 });
  }
}
