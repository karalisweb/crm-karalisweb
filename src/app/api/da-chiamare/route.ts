import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * API per la pagina "Da Chiamare"
 * Ritorna lead DA_CHIAMARE e opzionalmente DA_VERIFICARE
 * Ordinati per opportunityScore DESC (score più alto = primo da chiamare)
 *
 * GET /api/da-chiamare
 * Query params:
 *   - limit: numero di lead DA_CHIAMARE (default tutti)
 *   - includeVerifica: "true" per includere anche DA_VERIFICARE
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const includeVerifica = searchParams.get("includeVerifica") === "true";

    // Lead DA_CHIAMARE - ordinati per score (alto prima)
    const daChiamareLeads = await db.lead.findMany({
      where: {
        pipelineStage: "DA_CHIAMARE",
      },
      orderBy: [
        { opportunityScore: "desc" },
        { commercialPriority: "asc" },
        { createdAt: "desc" },
      ],
      ...(limitParam ? { take: parseInt(limitParam, 10) } : {}),
      select: {
        id: true,
        name: true,
        phone: true,
        website: true,
        category: true,
        address: true,
        googleRating: true,
        googleReviewsCount: true,
        googleMapsUrl: true,
        // Dati commerciali
        commercialTag: true,
        commercialTagReason: true,
        commercialPriority: true,
        commercialSignals: true,
        isCallable: true,
        // Audit
        opportunityScore: true,
        auditData: true,
        talkingPoints: true,
        auditCompletedAt: true,
        // CRM
        pipelineStage: true,
        lastContactedAt: true,
        notes: true,
      },
    });

    // Lead DA_VERIFICARE (opzionale)
    let daVerificareLeads: typeof daChiamareLeads = [];
    if (includeVerifica) {
      daVerificareLeads = await db.lead.findMany({
        where: {
          pipelineStage: "DA_VERIFICARE",
        },
        orderBy: [
          { opportunityScore: "desc" },
          { createdAt: "desc" },
        ],
        select: {
          id: true,
          name: true,
          phone: true,
          website: true,
          category: true,
          address: true,
          googleRating: true,
          googleReviewsCount: true,
          googleMapsUrl: true,
          commercialTag: true,
          commercialTagReason: true,
          commercialPriority: true,
          commercialSignals: true,
          isCallable: true,
          opportunityScore: true,
          auditData: true,
          talkingPoints: true,
          auditCompletedAt: true,
          pipelineStage: true,
          lastContactedAt: true,
          notes: true,
        },
      });
    }

    // Conteggi per la dashboard
    const [countDaChiamare, countDaVerificare, countArchiviati] =
      await Promise.all([
        db.lead.count({ where: { pipelineStage: "DA_CHIAMARE" } }),
        db.lead.count({ where: { pipelineStage: "DA_VERIFICARE" } }),
        db.lead.count({
          where: {
            pipelineStage: { in: ["NON_TARGET", "SENZA_SITO", "PERSO"] },
          },
        }),
      ]);

    return NextResponse.json({
      daChiamare: daChiamareLeads,
      daVerificare: daVerificareLeads,
      counts: {
        daChiamare: countDaChiamare,
        daVerificare: countDaVerificare,
        archiviati: countArchiviati,
      },
    });
  } catch (error) {
    console.error("[API] da-chiamare error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
