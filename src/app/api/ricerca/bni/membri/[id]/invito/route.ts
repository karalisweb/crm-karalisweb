import { NextRequest, NextResponse } from "next/server";
import { requireSession, enforceUserRateLimit } from "@/lib/api-auth";
import { invitoManuale } from "@/lib/agents/bni";

/** POST /api/ricerca/bni/membri/[id]/invito — scrive al volo l'invito a un 121 per questo membro. */
export async function POST(_r: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  const limited = enforceUserRateLimit("invito-121", gate.userId, 30, 10 * 60_000);
  if (limited) return limited;
  const { id } = await params;
  try {
    const voceId = await invitoManuale(id);
    return NextResponse.json({ success: true, voceId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore";
    return NextResponse.json({ error: msg === "Membro non trovato" ? msg : `Non sono riuscito a scrivere il messaggio: ${msg}` }, { status: msg === "Membro non trovato" ? 404 : 500 });
  }
}
