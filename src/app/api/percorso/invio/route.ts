import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireSession } from "@/lib/api-auth";
import { registraInvio } from "@/lib/agents/invio-tracciato";

const Schema = z.object({ voceId: z.string().min(1), canale: z.enum(["whatsapp", "linkedin", "email", "pagina"]) });

/** POST /api/percorso/invio — v3.103: manda (email) o registra (WhatsApp, LinkedIn) un messaggio del Percorso. */
export async function POST(request: Request) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dati non validi" }, { status: 400 });
  const e = await registraInvio(parsed.data.voceId, parsed.data.canale, gate.userId);
  return e.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: e.errore }, { status: e.stato });
}
