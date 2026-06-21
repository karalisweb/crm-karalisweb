import { NextResponse } from "next/server";
import { runOptInMailer } from "@/lib/opt-in-mailer";

/**
 * POST /api/cron/opt-in-mailer
 *
 * Invia la MAIL 1 (opt-in) ai lead caldi/tiepidi con email, e i follow-up.
 * Pensato per girare spesso con piccoli batch (invii distribuiti nella giornata).
 * Protetto da CRON_SECRET.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runOptInMailer();
    const summary = { ...result, timestamp: new Date().toISOString() };
    console.log("[opt-in-mailer]", summary);
    return NextResponse.json(summary);
  } catch (error) {
    console.error("[opt-in-mailer] Fatal error:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
