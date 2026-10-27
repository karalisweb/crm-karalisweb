import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { leggiPercorso } from "@/lib/agents/percorso";

/** GET /api/percorso — le aziende nei 4 passi (Trovate, Chi me la presenta, In riscaldamento, Contatto) e il passo di oggi. */
export async function GET() {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  return NextResponse.json(await leggiPercorso());
}
