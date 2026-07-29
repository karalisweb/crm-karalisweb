import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/api-auth";
import { z } from "zod/v4";
import { OPP_SOURCE_KEYS, OPEN_OPP_STAGES, isValidOppStage } from "@/lib/opportunita-stages";
import { Prisma } from "@prisma/client";

/**
 * OPPORTUNITA' EXTRA-BNI.
 * GET  /api/opportunita?stage=&open=1  → lista (+ conteggi)
 * POST /api/opportunita                → crea
 */

const createSchema = z.object({
  name: z.string().min(1, "Serve un nome").max(255),
  source: z.enum(OPP_SOURCE_KEYS as [string, ...string[]]).optional(),
  sourceDetail: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().max(255).optional(),
  website: z.string().max(500).optional(),
  about: z.string().max(5000).optional(),
  stage: z.enum(["DA_SENTIRE", "IN_CORSO", "PREVENTIVO", "VINTO", "PERSO"]).optional(),
  estimatedValue: z.number().int().min(0).max(100_000_000).nullable().optional(),
  nextFollowupAt: z.string().nullable().optional(),
  notes: z.string().max(5000).optional(),
});

const clean = (v?: string | null) => {
  const t = v?.trim();
  return t ? t : null;
};
const parseDate = (v?: string | null) => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

export async function GET(request: NextRequest) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;

  const stage = request.nextUrl.searchParams.get("stage")?.trim();
  const openOnly = request.nextUrl.searchParams.get("open") === "1";

  const where: Prisma.OpportunitaWhereInput = {};
  if (stage && isValidOppStage(stage)) where.stage = stage;
  else if (openOnly) where.stage = { in: OPEN_OPP_STAGES };

  const now = new Date();
  const [opportunita, openCount, followupDue] = await Promise.all([
    db.opportunita.findMany({
      where,
      // Prima quelle con un promemoria (piu' vicino in cima), poi le altre.
      orderBy: [{ nextFollowupAt: { sort: "asc", nulls: "last" } }, { updatedAt: "desc" }],
      take: 500,
    }),
    db.opportunita.count({ where: { stage: { in: OPEN_OPP_STAGES } } }),
    db.opportunita.count({ where: { stage: { in: OPEN_OPP_STAGES }, nextFollowupAt: { not: null, lte: now } } }),
  ]);

  return NextResponse.json({ opportunita, openCount, followupDue });
}

export async function POST(request: NextRequest) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;

  try {
    const body = await request.json();
    const data = createSchema.parse(body);

    const opp = await db.opportunita.create({
      data: {
        name: data.name.trim(),
        source: data.source ?? "altro",
        sourceDetail: clean(data.sourceDetail),
        phone: clean(data.phone),
        email: clean(data.email),
        website: clean(data.website),
        about: clean(data.about),
        stage: data.stage ?? "DA_SENTIRE",
        estimatedValue: data.estimatedValue ?? null,
        nextFollowupAt: parseDate(data.nextFollowupAt),
        notes: clean(data.notes),
        createdBy: gate.userId,
      },
    });

    return NextResponse.json({ success: true, opportunita: opp });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dati non validi", details: error.issues }, { status: 400 });
    }
    console.error("[OPP] Errore creazione opportunita:", error);
    return NextResponse.json({ error: "Errore nella creazione dell'opportunità" }, { status: 500 });
  }
}
