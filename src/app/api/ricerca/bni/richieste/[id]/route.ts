import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import type { Prisma } from "@prisma/client";
import { requireSession } from "@/lib/api-auth";
import { db } from "@/lib/db";

const Schema = z.object({ messaggio: z.string().min(5).max(3000) });
const SchemaFollowup = z.object({ followup: z.literal(true) });

/**
 * PATCH /api/ricerca/bni/richieste/[id] — Alessio corregge il testo di una richiesta di 121 prima di mandarla.
 * v3.105: { followup: true } registra il follow-up mandato (richiesta già partita): torna in "Aspetto risposta"
 * per altre 72 ore e la riga dice che il follow-up è già partito.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  const { id } = await params;
  try {
    const body = await request.json();
    if (SchemaFollowup.safeParse(body).success) {
      const voce = await db.approvalItem.findUnique({ where: { id }, select: { kind: true, status: true, payload: true } });
      if (!voce || voce.kind !== "MESSAGGIO_BNI") return NextResponse.json({ error: "Richiesta non trovata" }, { status: 404 });
      if (voce.status !== "APPROVATO") return NextResponse.json({ error: "La richiesta non è ancora stata mandata" }, { status: 409 });
      await db.approvalItem.update({ where: { id }, data: { payload: { ...(voce.payload as object), followupAt: new Date().toISOString() } as Prisma.InputJsonValue } });
      return NextResponse.json({ success: true });
    }
    const { messaggio } = Schema.parse(body);
    const voce = await db.approvalItem.findUnique({ where: { id }, select: { kind: true, status: true, payload: true } });
    if (!voce || !["MESSAGGIO_BNI", "VISITA_CAPITOLO"].includes(voce.kind)) return NextResponse.json({ error: "Richiesta non trovata" }, { status: 404 });
    if (voce.status !== "IN_ATTESA") return NextResponse.json({ error: "Già mandata" }, { status: 409 });
    await db.approvalItem.update({
      where: { id },
      data: { payload: { ...(voce.payload as object), messaggio: messaggio.trim(), modificatoDaAlessio: true, modello: 2 } as Prisma.InputJsonValue },
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof ZodError) return NextResponse.json({ error: "Testo non valido" }, { status: 400 });
    throw e;
  }
}
