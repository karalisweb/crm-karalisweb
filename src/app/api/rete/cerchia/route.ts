import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireSession } from "@/lib/api-auth";
import { loConosco } from "@/lib/agents/rete";

const Schema = z.object({ nome: z.string().min(2).max(160), conosco: z.boolean(), lavorazioneId: z.string().uuid().optional() });

/** POST /api/rete/cerchia — "lo conosco" (entra nella cerchia per sempre) o "non lo conosco" (per questa azienda). */
export async function POST(request: NextRequest) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  try {
    const d = Schema.parse(await request.json());
    await loConosco(d.nome, d.conosco, d.lavorazioneId);
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof ZodError) return NextResponse.json({ error: "Dati non validi" }, { status: 400 });
    throw e;
  }
}
