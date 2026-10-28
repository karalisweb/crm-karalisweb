import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/api-auth";
import { scegliPiattaforma } from "@/lib/agents/arricchimento";
import { messaggioAllaPagina, segnaCommento } from "@/lib/agents/rete";
import { PIATTAFORME } from "@/lib/agents/rete-regole";

const Schema = z.discriminatedUnion("azione", [
  z.object({ azione: z.literal("piattaforma"), piattaforma: z.enum(PIATTAFORME) }),
  z.object({ azione: z.literal("commento"), piattaforma: z.enum(PIATTAFORME) }),
  z.object({ azione: z.literal("messaggio_pagina") }),
]);

/**
 * POST /api/ricerca/aziende/[id]/relazione — entrare in relazione dalla scheda:
 *   piattaforma      → Alessio sceglie dove commentare la pagina dell'azienda;
 *   commento         → "Ho commentato": conta come un commento (al 5° il contatto diretto va in Cassetta);
 *   messaggio_pagina → prepara il messaggio privato alla pagina (chi decide non si sa).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  const { id } = await params;
  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  const d = parsed.data;
  if (d.azione === "piattaforma") {
    await scegliPiattaforma(id, d.piattaforma);
    return NextResponse.json({ ok: true });
  }
  if (d.azione === "commento") return NextResponse.json({ ok: true, ...(await segnaCommento(id, d.piattaforma)) });
  const creato = await messaggioAllaPagina(id);
  return NextResponse.json({ ok: true, creato });
}
