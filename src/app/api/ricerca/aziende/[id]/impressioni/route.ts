import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/api-auth";
import { salvaImpressione } from "@/lib/agents/arricchimento";
import { SEZIONI_IMPRESSIONI, type SezioneImpressione } from "@/lib/agents/impressioni-sezioni";

const Schema = z.object({
  sezione: z.enum(Object.keys(SEZIONI_IMPRESSIONI) as [SezioneImpressione, ...SezioneImpressione[]]),
  testo: z.string().max(1000),
});

/** POST /api/ricerca/aziende/[id]/impressioni — Alessio scrive cosa ha visto in una sezione; i ganci si rifanno. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  const { id } = await params;
  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Impressione non valida (massimo 1000 caratteri)" }, { status: 400 });
  await salvaImpressione(id, parsed.data.sezione, parsed.data.testo);
  return NextResponse.json({ ok: true });
}
