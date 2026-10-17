import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireSession } from "@/lib/api-auth";
import { db } from "@/lib/db";

/**
 * GET /api/ricerca/persone?q=&fonte=linkedin|rete_membro&bni=1 — il contenitore LinkedIn:
 * le persone trovate, con l'azienda collegata e (se c'è) il membro BNI.
 */
export async function GET(request: NextRequest) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  const sp = request.nextUrl.searchParams;
  const q = sp.get("q")?.trim().slice(0, 100);
  const fonte = sp.get("fonte");
  const where: Prisma.PersonaWhereInput = {
    ...(fonte === "linkedin" || fonte === "rete_membro" ? { fonte } : {}),
    ...(sp.get("bni") === "1" ? { bniMembroId: { not: null } } : sp.get("bni") === "0" ? { bniMembroId: null } : {}),
    ...(q ? { OR: [{ nome: { contains: q, mode: "insensitive" } }, { aziendaNome: { contains: q, mode: "insensitive" } }, { ruolo: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const [persone, totale] = await Promise.all([
    db.persona.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        lead: { select: { id: true, name: true, website: true } },
        bniMembro: { select: { id: true, name: true, chapter: true } },
        chiave: { select: { tipo: true, valore: true, casoStudio: { select: { id: true, titolo: true } } } },
      },
    }),
    db.persona.count({ where }),
  ]);
  return NextResponse.json({ persone, totale });
}
