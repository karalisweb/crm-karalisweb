import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { segnaRispostaCaso } from "@/lib/agents/rete";

/** POST /api/percorso/[leadId]/risposta — v3.116: "Mi ha risposto: vuole il caso studio". */
export async function POST(_request: Request, { params }: { params: Promise<{ leadId: string }> }) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  const { leadId } = await params;
  if (!(await segnaRispostaCaso(leadId, gate.userId))) return NextResponse.json({ error: "Già segnato o azienda non nel percorso" }, { status: 409 });
  return NextResponse.json({ ok: true });
}
