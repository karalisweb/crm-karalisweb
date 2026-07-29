import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/api-auth";
import { z } from "zod/v4";
import { OPP_SOURCE_KEYS } from "@/lib/opportunita-stages";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  source: z.enum(OPP_SOURCE_KEYS as [string, ...string[]]).optional(),
  sourceDetail: z.string().max(255).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  email: z.string().max(255).nullable().optional(),
  website: z.string().max(500).nullable().optional(),
  about: z.string().max(5000).nullable().optional(),
  stage: z.enum(["DA_SENTIRE", "IN_CORSO", "PREVENTIVO", "VINTO", "PERSO"]).optional(),
  estimatedValue: z.number().int().min(0).max(100_000_000).nullable().optional(),
  nextFollowupAt: z.string().nullable().optional(),
  lastContactedAt: z.string().nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
});

const clean = (v?: string | null) => {
  if (v === null) return null;
  const t = v?.trim();
  return t ? t : null;
};
const parseDate = (v?: string | null) => {
  if (v === null || v === undefined) return undefined;
  if (v === "") return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;

  try {
    const { id } = await params;
    const data = updateSchema.parse(await request.json());

    const update: Record<string, unknown> = {};
    if (data.name !== undefined) update.name = data.name.trim();
    if (data.source !== undefined) update.source = data.source;
    if (data.sourceDetail !== undefined) update.sourceDetail = clean(data.sourceDetail);
    if (data.phone !== undefined) update.phone = clean(data.phone);
    if (data.email !== undefined) update.email = clean(data.email);
    if (data.website !== undefined) update.website = clean(data.website);
    if (data.about !== undefined) update.about = clean(data.about);
    if (data.stage !== undefined) update.stage = data.stage;
    if (data.estimatedValue !== undefined) update.estimatedValue = data.estimatedValue;
    if (data.notes !== undefined) update.notes = clean(data.notes);
    if (data.nextFollowupAt !== undefined) update.nextFollowupAt = parseDate(data.nextFollowupAt);
    if (data.lastContactedAt !== undefined) update.lastContactedAt = parseDate(data.lastContactedAt);

    const opp = await db.opportunita.update({ where: { id }, data: update });
    return NextResponse.json({ success: true, opportunita: opp });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dati non validi", details: error.issues }, { status: 400 });
    }
    console.error("[OPP] Errore aggiornamento:", error);
    return NextResponse.json({ error: "Errore nell'aggiornamento" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  try {
    const { id } = await params;
    await db.opportunita.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[OPP] Errore eliminazione:", error);
    return NextResponse.json({ error: "Errore nell'eliminazione" }, { status: 500 });
  }
}
