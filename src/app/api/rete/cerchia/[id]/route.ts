import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { db } from "@/lib/db";

/** DELETE /api/rete/cerchia/[id] — toglie una persona aggiunta a mano dalla cerchia (si segna, non si cancella). */
export async function DELETE(_r: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  const { id } = await params;
  const r = await db.cerchiaContatto.updateMany({ where: { id, rimossoAt: null }, data: { rimossoAt: new Date() } });
  return r.count ? NextResponse.json({ success: true }) : NextResponse.json({ error: "Non trovato" }, { status: 404 });
}
