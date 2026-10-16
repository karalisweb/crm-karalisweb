import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { db } from "@/lib/db";

const STATI = ["IN_ATTESA", "APPROVATO", "SCARTATO"] as const;

/** GET /api/cassetta?stato=IN_ATTESA — quello che aspetta una decisione. */
export async function GET(request: NextRequest) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;

  const richiesto = request.nextUrl.searchParams.get("stato") ?? "IN_ATTESA";
  const stato = (STATI as readonly string[]).includes(richiesto) ? (richiesto as (typeof STATI)[number]) : "IN_ATTESA";

  const [voci, conteggi] = await Promise.all([
    db.approvalItem.findMany({
      where: { status: stato },
      orderBy: { createdAt: stato === "IN_ATTESA" ? "asc" : "desc" },
      take: 100,
      include: {
        lead: { select: { id: true, name: true, website: true, category: true, address: true, phone: true, googleRating: true, googleReviewsCount: true } },
        bniChapter: { select: { id: true, name: true, city: true } },
        bniMembro: { select: { id: true, name: true, phone: true, company: true, profession: true, chapter: true } },
      },
    }),
    db.approvalItem.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  return NextResponse.json({
    voci,
    conteggi: Object.fromEntries(conteggi.map((c) => [c.status, c._count._all])),
  });
}
