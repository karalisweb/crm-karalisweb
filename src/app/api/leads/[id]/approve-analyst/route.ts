import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

/**
 * POST /api/leads/[id]/approve-analyst
 *
 * Approva o modifica l'output del Prompt 1 "Analista".
 * Body: { action: "approve" | "edit", analystOutput?: object }
 * Se "edit": sovrascrive l'output con i dati forniti.
 * Sblocca Step 2 (Sceneggiatore).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, analystOutput } = body;

    if (!action || !["approve", "edit"].includes(action)) {
      return NextResponse.json(
        { error: "action deve essere 'approve' o 'edit'" },
        { status: 400 }
      );
    }

    // Verify lead exists and has analyst output
    const lead = await db.lead.findUnique({
      where: { id },
      select: { id: true, analystOutput: true },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead non trovato" }, { status: 404 });
    }

    if (!lead.analystOutput && action === "approve") {
      return NextResponse.json(
        { error: "Nessun output analista da approvare. Esegui prima l'analisi." },
        { status: 400 }
      );
    }

    // Get user info
    const session = await auth();
    const approvedBy = session?.user?.email || "admin";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finalOutput = action === "edit" && analystOutput
      ? analystOutput
      : lead.analystOutput;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const outputData = finalOutput as any;

    // Update lead
    await db.lead.update({
      where: { id },
      data: {
        ...(action === "edit" && analystOutput
          ? { analystOutput: analystOutput as import("@prisma/client").Prisma.InputJsonValue }
          : {}),
        analystApprovedAt: new Date(),
        analystApprovedBy: approvedBy,
        // Save punto di dolore from output
        puntoDoloreBreve: outputData?.punto_dolore_breve || null,
        puntoDoloreLungo: outputData?.punto_dolore_lungo || null,
        // Reset downstream (script needs to be re-generated with new data)
        scriptApprovedAt: null,
        scriptApprovedBy: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[approve-analyst] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore durante l'approvazione" },
      { status: 500 }
    );
  }
}
