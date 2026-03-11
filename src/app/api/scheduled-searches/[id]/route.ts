import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

// DELETE — Rimuove una ricerca dalla coda
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const { id } = await params;

    await db.scheduledSearch.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting scheduled search:", error);
    return NextResponse.json(
      { error: "Errore nell'eliminazione" },
      { status: 500 }
    );
  }
}

// PUT — Re-queue o aggiorna priority
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const updateData: Record<string, unknown> = {};

    // Re-queue: rimetti in coda
    if (body.requeue) {
      updateData.status = "QUEUED";
      updateData.errorMessage = null;
    }

    // Aggiorna priority
    if (typeof body.priority === "number") {
      updateData.priority = body.priority;
    }

    const updated = await db.scheduledSearch.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating scheduled search:", error);
    return NextResponse.json(
      { error: "Errore nell'aggiornamento" },
      { status: 500 }
    );
  }
}
