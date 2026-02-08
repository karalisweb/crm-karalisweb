import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/leads/[id]/verify
 * Salva lo stato della checklist di verifica audit.
 * Quando tutte le voci sono spuntate, il lead diventa "verificato".
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { checks } = body;

    if (!checks || !Array.isArray(checks)) {
      return NextResponse.json(
        { error: "checks array required" },
        { status: 400 }
      );
    }

    // Verifica se tutte le checkbox sono spuntate
    const allChecked = checks.every(
      (c: { checked: boolean }) => c.checked === true
    );

    // Aggiorna il lead
    const updated = await db.lead.update({
      where: { id },
      data: {
        auditVerificationChecks: { items: checks },
        auditVerified: allChecked,
        ...(allChecked
          ? {
              auditVerifiedAt: new Date(),
              auditVerifiedBy: "daniela",
            }
          : {
              auditVerifiedAt: null,
            }),
      },
      select: {
        id: true,
        auditVerified: true,
        auditVerifiedAt: true,
      },
    });

    // Se appena verificato, crea un'attività
    if (allChecked) {
      await db.activity.create({
        data: {
          leadId: id,
          type: "NOTE",
          notes: `Audit verificato: ${checks.length}/${checks.length} check completati`,
          createdBy: "daniela",
        },
      });
    }

    return NextResponse.json({
      success: true,
      auditVerified: updated.auditVerified,
      auditVerifiedAt: updated.auditVerifiedAt,
    });
  } catch (error) {
    console.error("[API] verify error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
