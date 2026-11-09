import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireSession } from "@/lib/api-auth";
import { aggiungiContatto } from "@/lib/agents/rete";
import { pulisciContattoManuale } from "@/lib/agents/rete-regole";

const Schema = z.object({ email: z.string().max(200).nullish(), telefono: z.string().max(40).nullish() });

/** POST /api/percorso/[leadId]/contatto { email?, telefono? } — v3.125: mail o telefono trovati a mano. */
export async function POST(request: Request, { params }: { params: Promise<{ leadId: string }> }) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  const { leadId } = await params;
  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dati non validi" }, { status: 400 });
  const c = pulisciContattoManuale(parsed.data);
  if (!c.ok) return NextResponse.json({ error: c.errore }, { status: 400 });
  const esito = await aggiungiContatto(leadId, { email: c.email, telefono: c.telefono, whatsapp: c.whatsapp }, gate.userId);
  if (!esito) return NextResponse.json({ error: "Azienda non trovata" }, { status: 404 });
  return NextResponse.json({ ok: true, esito, soloFisso: !!c.telefono && !c.whatsapp && !c.email });
}
