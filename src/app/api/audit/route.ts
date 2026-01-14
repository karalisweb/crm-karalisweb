import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inngest } from "@/inngest/client";
import { runFullAudit } from "@/lib/audit";
import { Prisma } from "@prisma/client";

/**
 * POST /api/audit
 * Avvia un audit per un lead specifico
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leadId, sync = false } = body;

    if (!leadId) {
      return NextResponse.json(
        { error: "leadId is required" },
        { status: 400 }
      );
    }

    // Trova il lead
    const lead = await db.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    if (!lead.website) {
      return NextResponse.json(
        { error: "Lead has no website" },
        { status: 400 }
      );
    }

    // Se sync=true, esegui l'audit subito (per testing/debug)
    if (sync) {
      await db.lead.update({
        where: { id: leadId },
        data: { auditStatus: "RUNNING" },
      });

      try {
        const result = await runFullAudit({
          website: lead.website,
          googleRating: lead.googleRating ? Number(lead.googleRating) : null,
          googleReviewsCount: lead.googleReviewsCount,
        });

        await db.lead.update({
          where: { id: leadId },
          data: {
            auditStatus: "COMPLETED",
            auditCompletedAt: new Date(),
            opportunityScore: result.opportunityScore,
            auditData: result.auditData as unknown as Prisma.InputJsonValue,
            talkingPoints: result.talkingPoints,
          },
        });

        return NextResponse.json({
          success: true,
          leadId,
          score: result.opportunityScore,
          issues: result.issues,
        });
      } catch (error) {
        await db.lead.update({
          where: { id: leadId },
          data: {
            auditStatus: "FAILED",
            auditData: {
              error: error instanceof Error ? error.message : "Unknown error",
            },
          },
        });

        return NextResponse.json(
          {
            error: "Audit failed",
            details: error instanceof Error ? error.message : "Unknown error",
          },
          { status: 500 }
        );
      }
    }

    // Altrimenti, invia a Inngest per esecuzione asincrona
    await inngest.send({
      name: "audit/run",
      data: {
        leadId,
        website: lead.website,
        googleRating: lead.googleRating ? Number(lead.googleRating) : null,
        googleReviewsCount: lead.googleReviewsCount,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Audit queued",
      leadId,
    });
  } catch (error) {
    console.error("Error starting audit:", error);
    return NextResponse.json(
      { error: "Failed to start audit" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/audit/batch
 * Avvia audit per tutti i lead di una ricerca
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { searchId } = body;

    if (!searchId) {
      return NextResponse.json(
        { error: "searchId is required" },
        { status: 400 }
      );
    }

    // Conta lead da processare
    const count = await db.lead.count({
      where: {
        searchId,
        website: { not: null },
        auditStatus: "PENDING",
      },
    });

    if (count === 0) {
      return NextResponse.json({
        success: true,
        message: "No leads to audit",
        count: 0,
      });
    }

    // Invia evento batch a Inngest
    await inngest.send({
      name: "audit/batch",
      data: { searchId },
    });

    return NextResponse.json({
      success: true,
      message: `${count} audits queued`,
      count,
    });
  } catch (error) {
    console.error("Error starting batch audit:", error);
    return NextResponse.json(
      { error: "Failed to start batch audit" },
      { status: 500 }
    );
  }
}
