import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { creaFollowup } from "@/lib/agents/rete";

/**
 * POST /api/percorso/[leadId]/followup — v3.113 (Alessio: "voglio fare un follow-up"): il follow-up subito, senza
 * aspettare i 5 giorni. Compare in "Follow-up da mandare", con lo stesso canale del primo messaggio.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ leadId: string }> }) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  const { leadId } = await params;
  const l = await db.lavorazione.findUnique({ where: { leadId }, select: { id: true } });
  if (!l) return NextResponse.json({ error: "Azienda non nel percorso" }, { status: 404 });
  if (!(await creaFollowup(l.id))) return NextResponse.json({ error: "Il follow-up c'è già o non serve" }, { status: 409 });
  return NextResponse.json({ ok: true });
}
