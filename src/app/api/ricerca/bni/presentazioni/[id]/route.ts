import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireSession } from "@/lib/api-auth";
import { db } from "@/lib/db";

const Schema = z.object({ stato: z.enum(["DA_CHIEDERE", "CHIESTA", "PRESENTATO", "NO"]) });

/** PATCH /api/ricerca/bni/presentazioni/[id] — a che punto è una presentazione. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  const { id } = await params;
  try {
    const { stato } = Schema.parse(await request.json());
    const r = await db.bniPresentazione.updateMany({ where: { id }, data: { stato } });
    if (!r.count) return NextResponse.json({ error: "Presentazione non trovata" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof ZodError) return NextResponse.json({ error: "Stato non valido" }, { status: 400 });
    throw e;
  }
}
