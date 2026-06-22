import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/api-auth";
import { z } from "zod/v4";
import { Prisma } from "@prisma/client";

/**
 * Rete BNI — gestione membri dei capitoli.
 *
 * GET  /api/bni/membri?q=...   → lista membri (+ elenco capitoli per autocomplete)
 * POST /api/bni/membri         → crea un nuovo membro
 */

const createMembroSchema = z.object({
  name: z.string().min(1, "Nome obbligatorio").max(255),
  profession: z.string().max(255).optional(),
  company: z.string().max(255).optional(),
  chapter: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().max(255).optional(),
  website: z.string().max(500).optional(),
  notes: z.string().max(5000).optional(),
  status: z.enum(["ATTIVO", "VISITATORE", "EX_MEMBRO"]).optional(),
});

const clean = (v?: string) => {
  const t = v?.trim();
  return t ? t : null;
};

export async function GET(request: NextRequest) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;

  const q = request.nextUrl.searchParams.get("q")?.trim();

  const where: Prisma.BniMembroWhereInput = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { company: { contains: q, mode: "insensitive" } },
          { profession: { contains: q, mode: "insensitive" } },
          { chapter: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};

  const [membri, chapterRows] = await Promise.all([
    db.bniMembro.findMany({
      where,
      orderBy: [{ lastOneToOneAt: { sort: "desc", nulls: "last" } }, { name: "asc" }],
      include: { _count: { select: { referredLeads: true } } },
    }),
    db.bniMembro.findMany({
      where: { chapter: { not: null } },
      select: { chapter: true },
      distinct: ["chapter"],
      orderBy: { chapter: "asc" },
    }),
  ]);

  const chapters = chapterRows.map((r) => r.chapter).filter(Boolean) as string[];

  return NextResponse.json({ membri, chapters });
}

export async function POST(request: NextRequest) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;

  try {
    const body = await request.json();
    const data = createMembroSchema.parse(body);

    const membro = await db.bniMembro.create({
      data: {
        name: data.name.trim(),
        profession: clean(data.profession),
        company: clean(data.company),
        chapter: clean(data.chapter),
        phone: clean(data.phone),
        email: clean(data.email),
        website: clean(data.website),
        notes: clean(data.notes),
        status: data.status ?? "ATTIVO",
      },
    });

    return NextResponse.json({ success: true, membro });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dati non validi", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[BNI] Errore creazione membro:", error);
    return NextResponse.json(
      { error: "Errore nella creazione del membro" },
      { status: 500 }
    );
  }
}
