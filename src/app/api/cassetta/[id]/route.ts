import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { db } from "@/lib/db";

/**
 * POST /api/cassetta/[id] — la decisione di Alessio su una voce in cassetta.
 * Body: { decisione: "APPROVATO" | "SCARTATO", note?: string }
 *
 * Passo 1: approvare un fascicolo base vuol dire "su questa azienda vale la pena
 * spendere per la raccolta approfondita". Gli agenti che la fanno arrivano nei passi
 * successivi e partiranno da qui: oggi la decisione viene solo registrata.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  const { id } = await params;

  const body = await request.json().catch(() => ({}));
  const decisione = body?.decisione;
  if (decisione !== "APPROVATO" && decisione !== "SCARTATO") {
    return NextResponse.json({ error: "decisione deve essere APPROVATO o SCARTATO" }, { status: 400 });
  }
  const note = typeof body?.note === "string" ? body.note.slice(0, 1000) : null;

  // Si decide una volta sola: una voce già decisa non cambia.
  const r = await db.approvalItem.updateMany({
    where: { id, status: "IN_ATTESA" },
    data: { status: decisione, note, decidedAt: new Date(), decidedBy: gate.userId },
  });
  if (r.count === 0) {
    const esiste = await db.approvalItem.findUnique({ where: { id }, select: { status: true } });
    return NextResponse.json(
      { error: esiste ? `Già decisa (${esiste.status})` : "Voce non trovata" },
      { status: esiste ? 409 : 404 }
    );
  }
  return NextResponse.json({ success: true, stato: decisione });
}
