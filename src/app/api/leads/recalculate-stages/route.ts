import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PipelineStage } from "@prisma/client";

/**
 * POST /api/leads/recalculate-stages
 * Ricalcola gli stati dei lead in base allo score e ai tag commerciali
 * Considera lo scoreThreshold dalle impostazioni CRM
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    // Carica le impostazioni CRM per lo scoreThreshold
    const settings = await db.settings.findUnique({
      where: { id: "default" },
    });
    const scoreThreshold = settings?.scoreThreshold ?? 60;

    // Trova tutti i lead con audit completato ancora in NEW
    const leadsToUpdate = await db.lead.findMany({
      where: {
        auditStatus: "COMPLETED",
        pipelineStage: "NEW",
      },
      select: {
        id: true,
        name: true,
        opportunityScore: true,
        commercialTag: true,
        isCallable: true,
      },
    });

    const results = {
      total: leadsToUpdate.length,
      daChiamare: 0,
      daVerificare: 0,
      nonTarget: 0,
      senzaSito: 0,
      unchanged: 0,
    };

    for (const lead of leadsToUpdate) {
      let newStage: PipelineStage;

      // Logica di routing:
      // 1. NON_TARGET tag → NON_TARGET stage
      // 2. DA_APPROFONDIRE tag → DA_VERIFICARE stage
      // 3. Score < threshold → DA_VERIFICARE stage
      // 4. isCallable && score >= threshold → DA_CHIAMARE stage
      // 5. Otherwise → rimane in NEW

      if (lead.commercialTag === "NON_TARGET") {
        newStage = PipelineStage.NON_TARGET;
        results.nonTarget++;
      } else if (lead.commercialTag === "DA_APPROFONDIRE") {
        newStage = PipelineStage.DA_VERIFICARE;
        results.daVerificare++;
      } else if (lead.opportunityScore !== null && lead.opportunityScore < scoreThreshold) {
        // Score sotto soglia → DA_VERIFICARE (anche se callable)
        newStage = PipelineStage.DA_VERIFICARE;
        results.daVerificare++;
      } else if (lead.isCallable && lead.opportunityScore !== null && lead.opportunityScore >= scoreThreshold) {
        // Callable + score sopra soglia → DA_CHIAMARE
        newStage = PipelineStage.DA_CHIAMARE;
        results.daChiamare++;
      } else {
        // Nessuna condizione soddisfatta, rimane NEW
        results.unchanged++;
        continue;
      }

      await db.lead.update({
        where: { id: lead.id },
        data: { pipelineStage: newStage },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Ricalcolati ${results.total} lead con scoreThreshold=${scoreThreshold}`,
      scoreThreshold,
      results,
    });
  } catch (error) {
    console.error("Error recalculating stages:", error);
    return NextResponse.json(
      { error: "Failed to recalculate stages" },
      { status: 500 }
    );
  }
}
