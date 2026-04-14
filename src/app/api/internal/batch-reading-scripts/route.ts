import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PipelineStage } from "@prisma/client";
import { generateReadingScriptForLead } from "@/lib/gemini-reading-script";

/**
 * POST /api/internal/batch-reading-scripts
 *
 * Genera gli script di lettura Tella per tutti i lead in FARE_VIDEO che:
 * - Hanno l'analisi strategica completata (analystOutput)
 * - Non hanno ancora un readingScript in geminiAnalysis
 *
 * Processa in modo sequenziale con delay per non saturare Gemini.
 * Fire-and-forget a livello di endpoint ma sincrono nel loop (tiene aperta
 * la richiesta finche' non ha finito, max ~1 min per lead).
 *
 * Auth: CRON_SECRET in prod, bypassato da /api/internal in dev.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.CRON_SECRET;

  if (expectedToken && process.env.NODE_ENV === "production") {
    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const DELAY_BETWEEN_MS = 2000;

  try {
    const candidates = await db.lead.findMany({
      where: {
        pipelineStage: PipelineStage.FARE_VIDEO,
        analystOutput: { not: undefined },
      },
      select: { id: true, name: true, geminiAnalysis: true, analystOutput: true },
    });

    const toProcess = candidates.filter((c) => {
      if (!c.analystOutput) return false;
      const ga = c.geminiAnalysis as Record<string, unknown> | null;
      if (!ga || typeof ga !== "object") return true;
      return !("readingScript" in ga) || !ga.readingScript;
    });

    console.log(
      `[BATCH_READING] ${toProcess.length}/${candidates.length} lead da processare`
    );

    let generated = 0;
    const failed: { id: string; name: string; error: string }[] = [];

    for (const lead of toProcess) {
      try {
        await generateReadingScriptForLead(lead.id);
        generated++;
        console.log(`[BATCH_READING] OK ${lead.name}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        failed.push({ id: lead.id, name: lead.name, error: msg });
        console.error(`[BATCH_READING] FAIL ${lead.name}: ${msg}`);
      }
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_MS));
    }

    return NextResponse.json({
      success: true,
      total: toProcess.length,
      generated,
      failedCount: failed.length,
      failed,
    });
  } catch (error) {
    console.error("[batch-reading-scripts] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Errore durante il batch",
      },
      { status: 500 }
    );
  }
}
