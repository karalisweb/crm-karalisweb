import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { turnoRete } from "@/lib/agents/rete";

/** POST /api/rete/turno — "Aggiorna adesso": entrate, ponti, seguito (senza aspettare il turno). */
export async function POST() {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  return NextResponse.json({ success: true, ...(await turnoRete()) });
}
