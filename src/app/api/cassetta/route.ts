import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { db } from "@/lib/db";

const STATI = ["IN_ATTESA", "APPROVATO", "SCARTATO"] as const;

/**
 * GET /api/cassetta?stato=IN_ATTESA — quello che aspetta una decisione.
 * Gli avvisi di settore stanno solo in Oggi (v3.71): un posto solo, niente doppioni.
 */
const SOLO_IN_OGGI = ["AVVISO_SETTORE"];
export async function GET(request: NextRequest) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;

  const richiesto = request.nextUrl.searchParams.get("stato") ?? "IN_ATTESA";
  const stato = (STATI as readonly string[]).includes(richiesto) ? (richiesto as (typeof STATI)[number]) : "IN_ATTESA";

  const [voci, conteggi] = await Promise.all([
    db.approvalItem.findMany({
      where: { status: stato, kind: { notIn: SOLO_IN_OGGI } },
      orderBy: { createdAt: stato === "IN_ATTESA" ? "asc" : "desc" },
      take: 100,
      include: {
        lead: { select: { id: true, name: true, website: true, category: true, address: true, phone: true, googleRating: true, googleReviewsCount: true } },
        bniChapter: { select: { id: true, name: true, city: true } },
        bniMembro: { select: { id: true, name: true, phone: true, company: true, profession: true, chapter: true } },
        trattativa: { select: { id: true, nome: true, stadio: true, origine: true, telefono: true, email: true, referente: true } },
      },
    }),
    db.approvalItem.groupBy({ by: ["status"], where: { kind: { notIn: SOLO_IN_OGGI } }, _count: { _all: true } }),
  ]);

  return NextResponse.json({
    voci,
    conteggi: Object.fromEntries(conteggi.map((c) => [c.status, c._count._all])),
  });
}
