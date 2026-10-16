import { NextResponse } from "next/server";
import { requireSession, enforceUserRateLimit } from "@/lib/api-auth";
import { eseguiAgenteVendita, ErroreTrattativa } from "@/lib/vendita/trattative";
import type { AgenteVendita } from "@/lib/vendita/regole";

const AGENTI: AgenteVendita[] = ["preparazione_call", "dopo_call", "recall", "nurturing"];

/**
 * POST /api/trattative/[id]/agente  { agente } — fa lavorare subito un agente di vendita
 * (es. il Dopo-call appena incollata la trascrizione). Il risultato va in cassetta.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  const limited = enforceUserRateLimit("vendita-agente", gate.userId, 10, 10 * 60_000);
  if (limited) return limited;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  if (!AGENTI.includes(body?.agente)) return NextResponse.json({ error: "Agente sconosciuto" }, { status: 400 });
  try {
    return NextResponse.json(await eseguiAgenteVendita(id, body.agente));
  } catch (err) {
    if (err instanceof ErroreTrattativa) return NextResponse.json({ error: err.message }, { status: err.stato });
    console.error("[trattative] agente fallito:", err);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
