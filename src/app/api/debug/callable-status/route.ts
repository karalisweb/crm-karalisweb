import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

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

    // 2. Lead in DA_QUALIFICARE che non sono callable
    const dachiamarNotCallable = await db.lead.findMany({
      where: {
        pipelineStage: "DA_QUALIFICARE",
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

    // 3. Verifica quanti dovrebbero essere callable (lead in DA_QUALIFICARE con isCallable=false)
    const shouldBeCallable = await db.lead.count({
      where: {
        pipelineStage: "DA_QUALIFICARE",
        isCallable: false,
      },
    });

    // 4. Conta lead per pipeline stage e isCallable
    const byStageAndCallable = await db.lead.groupBy({
      by: ["pipelineStage", "isCallable"],
      _count: true,
    });

    // 5. Dettaglio commercial signals per i lead in DA_QUALIFICARE
    const dachiamarDetails = await db.lead.findMany({
      where: {
        pipelineStage: "DA_QUALIFICARE",
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
 * Fix isCallable per tutti i lead in base al pipelineStage
 * - Lead in DA_CHIAMARE → isCallable = true
 * - Lead in NON_TARGET → isCallable = false
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    // Fix 1: Lead in DA_QUALIFICARE devono essere callable
    const fixedDaChiamare = await db.lead.updateMany({
      where: {
        pipelineStage: "DA_QUALIFICARE",
        isCallable: false,
      },
      data: {
        isCallable: true,
      },
    });

    // Fix 2: Lead in NON_TARGET non devono essere callable
    const fixedNonTarget = await db.lead.updateMany({
      where: {
        pipelineStage: "NON_TARGET",
        isCallable: true,
      },
      data: {
        isCallable: false,
      },
    });

    return NextResponse.json({
      success: true,
      fixedDaChiamare: fixedDaChiamare.count,
      fixedNonTarget: fixedNonTarget.count,
      message: `Aggiornati ${fixedDaChiamare.count} lead DA_QUALIFICARE come callable, ${fixedNonTarget.count} NON_TARGET come non callable`,
    });
  } catch (error) {
    console.error("Error fixing callable status:", error);
    return NextResponse.json(
      { error: "Failed to fix callable status" },
      { status: 500 }
    );
  }
}
