import { NextRequest, NextResponse } from "next/server";
import { processBatchVideoScripts } from "@/lib/background-jobs";

/**
 * POST /api/internal/batch-video-scripts
 *
 * Trova tutti i lead in FARE_VIDEO con audit completato ma senza script
 * teleprompter valido, e li accoda per la generazione (analista + scriptwriter
 * auto-approvati). Fire-and-forget: ritorna subito con la lista degli ID accodati.
 *
 * Auth: CRON_SECRET o bypassato dal middleware (solo /api/internal/).
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.CRON_SECRET;

  // Se CRON_SECRET è configurato e siamo in prod, richiedilo
  if (expectedToken && process.env.NODE_ENV === "production") {
    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const queued = await processBatchVideoScripts();
    return NextResponse.json({
      success: true,
      queued: queued.length,
      leadIds: queued,
    });
  } catch (error) {
    console.error("[batch-video-scripts] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Errore durante il batch",
      },
      { status: 500 }
    );
  }
}
