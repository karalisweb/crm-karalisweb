import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/api-auth";
import { lanciaAgente } from "@/lib/agents/arricchimento";

const Schema = z.object({ agente: z.string().min(2).max(40) });

/** POST /api/ricerca/aziende/[id]/lancia — il pulsante "Lancia" / "Rifai" di un blocco della scheda. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  const { id } = await params;
  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Agente non valido" }, { status: 400 });
  try {
    return NextResponse.json(await lanciaAgente(id, parsed.data.agente));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore" }, { status: 400 });
  }
}
