import { NextResponse } from "next/server";
import { sendDailyReport } from "@/lib/daily-report";

/**
 * POST /api/cron/daily-report
 * Manda il report giornaliero (riepilogo di ieri) agli indirizzi configurati.
 * Protetto da CRON_SECRET.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await sendDailyReport();
    return NextResponse.json({ ...result, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("[daily-report] Fatal error:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
