import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireSession } from "@/lib/api-auth";
import { azioneLavorazione } from "@/lib/agents/rete";

const Schema = z.object({ azione: z.enum(["presentato", "scaldata", "incontro", "proposta", "cliente", "pausa", "riprendi"]) });

/** PATCH /api/rete/lavorazioni/[id] — Alessio fa avanzare un'azienda in lavorazione. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  const { id } = await params;
  try {
    const { azione } = Schema.parse(await request.json());
    await azioneLavorazione(id, azione);
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof ZodError) return NextResponse.json({ error: "Azione non valida" }, { status: 400 });
    return NextResponse.json({ error: e instanceof Error ? e.message : "Errore" }, { status: 404 });
  }
}
