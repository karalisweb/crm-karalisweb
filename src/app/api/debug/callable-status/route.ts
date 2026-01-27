import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { CommercialTag } from "@prisma/client";

/**
 * GET /api/debug/callable-status
 * Endpoint diagnostico per verificare lo stato isCallable dei lead
 * Solo per admin autenticati
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    // 1. Conta per commercial_tag e is_callable
    const byTag = await db.lead.groupBy({
      by: ["commercialTag", "isCallable"],
      where: { auditStatus: "COMPLETED" },
      _count: true,
    });

    // 2. Lead in DA_CHIAMARE che non sono callable
    const dachiamarNotCallable = await db.lead.findMany({
      where: {
        pipelineStage: "DA_CHIAMARE",
        isCallable: false,
      },
      select: {
        id: true,
        name: true,
        commercialTag: true,
        opportunityScore: true,
        isCallable: true,
      },
    });

    // 3. Verifica quanti dovrebbero essere callable in base al tag
    const callableTagsForCheck: CommercialTag[] = [
      CommercialTag.ADS_ATTIVE_CONTROLLO_ASSENTE,
      CommercialTag.TRAFFICO_SENZA_DIREZIONE,
      CommercialTag.STRUTTURA_OK_NON_PRIORITIZZATA,
      CommercialTag.DA_APPROFONDIRE,
    ];
    const shouldBeCallable = await db.lead.count({
      where: {
        auditStatus: "COMPLETED",
        commercialTag: {
          in: callableTagsForCheck,
        },
        isCallable: false,
      },
    });

    // 4. Conta lead per pipeline stage e isCallable
    const byStageAndCallable = await db.lead.groupBy({
      by: ["pipelineStage", "isCallable"],
      _count: true,
    });

    // 5. Dettaglio commercial signals per i lead in DA_CHIAMARE
    const dachiamarDetails = await db.lead.findMany({
      where: {
        pipelineStage: "DA_CHIAMARE",
      },
      select: {
        id: true,
        name: true,
        commercialTag: true,
        commercialTagReason: true,
        opportunityScore: true,
        isCallable: true,
        commercialSignals: true,
      },
      take: 10,
    });

    return NextResponse.json({
      byTag: byTag.map((r) => ({
        commercialTag: r.commercialTag || "NULL",
        isCallable: r.isCallable,
        count: r._count,
      })),
      dachiamarNotCallable,
      shouldBeCallableButAreNot: shouldBeCallable,
      byStageAndCallable: byStageAndCallable.map((r) => ({
        pipelineStage: r.pipelineStage,
        isCallable: r.isCallable,
        count: r._count,
      })),
      dachiamarDetails,
    });
  } catch (error) {
    console.error("Error in callable status debug:", error);
    return NextResponse.json(
      { error: "Failed to get callable status" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/debug/callable-status
 * Fix isCallable per tutti i lead in base al commercialTag
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    // Tag che dovrebbero essere callable
    const callableTags: CommercialTag[] = [
      CommercialTag.ADS_ATTIVE_CONTROLLO_ASSENTE,
      CommercialTag.TRAFFICO_SENZA_DIREZIONE,
      CommercialTag.STRUTTURA_OK_NON_PRIORITIZZATA,
      CommercialTag.DA_APPROFONDIRE,
    ];

    // Fix: imposta isCallable = true per tag callable
    const fixedCallable = await db.lead.updateMany({
      where: {
        commercialTag: { in: callableTags },
        isCallable: false,
      },
      data: {
        isCallable: true,
      },
    });

    // Fix: imposta isCallable = false per NON_TARGET
    const fixedNotCallable = await db.lead.updateMany({
      where: {
        commercialTag: CommercialTag.NON_TARGET,
        isCallable: true,
      },
      data: {
        isCallable: false,
      },
    });

    return NextResponse.json({
      success: true,
      fixedCallable: fixedCallable.count,
      fixedNotCallable: fixedNotCallable.count,
      message: `Aggiornati ${fixedCallable.count} lead come callable, ${fixedNotCallable.count} come non callable`,
    });
  } catch (error) {
    console.error("Error fixing callable status:", error);
    return NextResponse.json(
      { error: "Failed to fix callable status" },
      { status: 500 }
    );
  }
}
