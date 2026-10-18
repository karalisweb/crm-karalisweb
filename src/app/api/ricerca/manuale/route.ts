import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/api-auth";
import { aggiungiAMano } from "@/lib/ricerca/manuale";

const Schema = z.object({
  tipo: z.enum(["azienda", "settore", "persona"]),
  testo: z.string().min(3).max(200),
  citta: z.string().max(80).nullable().optional(),
  azienda: z.string().max(200).nullable().optional(),
  linkedin: z.string().max(300).nullable().optional(),
});

/** POST /api/ricerca/manuale — Alessio scrive un'azienda, un settore o una persona da cui partire. */
export async function POST(request: NextRequest) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dati non validi" }, { status: 400 });
  try {
    return NextResponse.json(await aggiungiAMano(parsed.data));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore" }, { status: 400 });
  }
}
