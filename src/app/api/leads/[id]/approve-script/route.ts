import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

/**
 * POST /api/leads/[id]/approve-script
 *
 * Approva o modifica l'output del Prompt 2 "Sceneggiatore".
 * Body: { action: "approve" | "edit", geminiAnalysis?: object, puntoDoloreBreve?: string, puntoDoloreLungo?: string }
 * Sblocca Step 3 (YouTube URL) e successivi.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, geminiAnalysis, puntoDoloreBreve, puntoDoloreLungo } = body;

    if (!action || !["approve", "edit"].includes(action)) {
      return NextResponse.json(
        { error: "action deve essere 'approve' o 'edit'" },
        { status: 400 }
      );
    }

    // Verify lead exists and has script output
    const lead = await db.lead.findUnique({
      where: { id },
      select: { id: true, geminiAnalysis: true, analystApprovedAt: true },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead non trovato" }, { status: 404 });
    }

    if (!lead.analystApprovedAt) {
      return NextResponse.json(
        { error: "L'output dell'analista deve essere approvato prima" },
        { status: 400 }
      );
    }

    if (!lead.geminiAnalysis && action === "approve") {
      return NextResponse.json(
        { error: "Nessuno script da approvare. Genera prima lo script." },
        { status: 400 }
      );
    }

    // Get user info
    const session = await auth();
    const approvedBy = session?.user?.email || "admin";

    // Build update data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      scriptApprovedAt: new Date(),
      scriptApprovedBy: approvedBy,
    };

    if (action === "edit") {
      if (geminiAnalysis) {
        updateData.geminiAnalysis = geminiAnalysis;
      }
      if (puntoDoloreBreve !== undefined) {
        updateData.puntoDoloreBreve = puntoDoloreBreve;
      }
      if (puntoDoloreLungo !== undefined) {
        updateData.puntoDoloreLungo = puntoDoloreLungo;
        // Also update landingPuntoDolore for backward compat with WordPress integration
        updateData.landingPuntoDolore = puntoDoloreLungo;
      }
    }

    await db.lead.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[approve-script] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore durante l'approvazione" },
      { status: 500 }
    );
  }
}
