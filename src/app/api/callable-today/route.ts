import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CommercialTag } from "@prisma/client";

/**
 * API per la dashboard "Chiamabili oggi"
 * Ritorna max 10 lead (default 5) ordinati per priorita commerciale
 *
 * GET /api/callable-today
 * Query params:
 *   - limit: numero di lead (default 5, max 10)
 *   - excludeTags: tag da escludere (comma-separated)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Limite (default 5, max 10)
    const limitParam = searchParams.get("limit");
    let limit = 5;
    if (limitParam) {
      const parsed = parseInt(limitParam, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 10) {
        limit = parsed;
      }
    }

    // Tag da escludere (oltre a NON_TARGET che e' sempre escluso)
    const excludeTagsParam = searchParams.get("excludeTags");
    const excludeTags: CommercialTag[] = ["NON_TARGET"];
    if (excludeTagsParam) {
      const tags = excludeTagsParam.split(",") as CommercialTag[];
      excludeTags.push(...tags.filter((t) => Object.values(CommercialTag).includes(t)));
    }

    // Query: lead chiamabili, ordinati per priorita
    const leads = await db.lead.findMany({
      where: {
        // Solo lead con audit completato
        auditStatus: "COMPLETED",
        // Solo callable
        isCallable: true,
        // Escludi tag non target
        commercialTag: {
          notIn: excludeTags,
        },
        // Solo in stage TO_CALL o NEW (non gia chiamati oggi)
        pipelineStage: {
          in: ["NEW", "TO_CALL"],
        },
        // Con sito web
        website: {
          not: null,
        },
      },
      orderBy: [
        // Prima per priorita commerciale (1=alta)
        { commercialPriority: "asc" },
        // Poi per opportunity score (alto prima)
        { opportunityScore: "desc" },
        // Infine per data creazione (nuovi prima)
        { createdAt: "desc" },
      ],
      take: limit,
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
        // Audit
        opportunityScore: true,
        auditCompletedAt: true,
        // CRM
        pipelineStage: true,
        lastContactedAt: true,
        notes: true,
      },
    });

    // Conta totali per stats
    const stats = await db.lead.groupBy({
      by: ["commercialTag"],
      where: {
        auditStatus: "COMPLETED",
        isCallable: true,
        pipelineStage: {
          in: ["NEW", "TO_CALL"],
        },
      },
      _count: true,
    });

    const totalCallable = stats
      .filter((s) => s.commercialTag !== "NON_TARGET")
      .reduce((acc, s) => acc + s._count, 0);

    return NextResponse.json({
      leads,
      meta: {
        returned: leads.length,
        limit,
        totalCallable,
        tagBreakdown: stats.reduce(
          (acc, s) => ({
            ...acc,
            [s.commercialTag || "null"]: s._count,
          }),
          {} as Record<string, number>
        ),
      },
    });
  } catch (error) {
    console.error("[API] callable-today error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
