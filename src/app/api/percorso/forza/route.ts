import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { forzaSottosezione } from "@/lib/agents/percorso";

/** POST /api/percorso/forza { passo, stato } — "Analizza adesso" su una sottosezione del Percorso (v3.111). */
export async function POST(request: Request) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  const body = (await request.json().catch(() => null)) as { passo?: unknown; stato?: unknown } | null;
  const passo = Number(body?.passo);
  const stato = typeof body?.stato === "string" ? body.stato : "";
  if (![1, 2, 3, 4].includes(passo) || !stato) return NextResponse.json({ error: "passo e stato richiesti" }, { status: 400 });
  return NextResponse.json({ success: true, ...(await forzaSottosezione(passo as 1 | 2 | 3 | 4, stato)) });
}
