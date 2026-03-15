import { NextRequest, NextResponse } from "next/server";
import { recoverStuckJobs } from "@/lib/background-jobs";

/**
 * POST /api/cron/recover-stuck-jobs
 *
 * Recupera job bloccati in stato RUNNING da più di 30 minuti.
 * Richiede CRON_SECRET per autenticazione.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.CRON_SECRET;
  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const recovered = await recoverStuckJobs();

  return NextResponse.json({
    success: true,
    recovered,
    message: recovered > 0
      ? `Recuperati ${recovered} job bloccati`
      : "Nessun job bloccato trovato",
  });
}
