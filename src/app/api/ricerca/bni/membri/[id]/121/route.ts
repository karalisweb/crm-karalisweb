import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireSession, enforceUserRateLimit } from "@/lib/api-auth";
import { registra121 } from "@/lib/ricerca/dopo-121";

const Schema = z.object({
  data: z.string().datetime(),
  formato: z.enum(["PRESENZA", "ONLINE"]),
  testo: z.string().max(200_000).nullable().optional(),
  luogo: z.string().max(200).nullable().optional(),
});

/**
 * POST /api/ricerca/bni/membri/[id]/121 — registra un 121 (anche uno già fatto in passato).
 * Con la trascrizione di Meet o il vocale dettato, l'agente Dopo-121 compila la scheda.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  const limited = enforceUserRateLimit("registra-121", gate.userId, 20, 10 * 60_000);
  if (limited) return limited;
  const { id } = await params;
  try {
    const d = Schema.parse(await request.json());
    const esito = await registra121(id, { data: new Date(d.data), formato: d.formato, testo: d.testo, luogo: d.luogo }, gate.userId);
    return NextResponse.json({ success: true, ...esito });
  } catch (e) {
    if (e instanceof ZodError) return NextResponse.json({ error: "Dati non validi", dettagli: e.issues }, { status: 400 });
    if (e instanceof Error && e.message === "Membro non trovato") return NextResponse.json({ error: e.message }, { status: 404 });
    throw e;
  }
}
