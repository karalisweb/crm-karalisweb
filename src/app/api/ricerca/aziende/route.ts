import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { db } from "@/lib/db";

/**
 * GET /api/ricerca/aziende?canale= — il contenitore Meta + Google: le aziende trovate dagli
 * agenti partendo dai casi studio, le più recenti prima.
 */
export async function GET(request: NextRequest) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  const canale = request.nextUrl.searchParams.get("canale");
  const ritrovamenti = await db.ritrovamento.findMany({
    where: { leadId: { not: null }, canale: canale && ["maps", "google", "facebook", "instagram"].includes(canale) ? canale : { not: "linkedin" } },
    orderBy: { createdAt: "desc" },
    take: 300,
    include: {
      lead: { select: { id: true, name: true, website: true, address: true, category: true, phone: true, googleRating: true, googleReviewsCount: true, socialUrl: true, pipelineStage: true } },
      chiave: { select: { tipo: true, casoStudio: { select: { id: true, titolo: true } } } },
    },
  });
  // Un'azienda una volta sola (il ritrovamento più recente).
  const viste = new Set<string>();
  const aziende = ritrovamenti
    .filter((r) => r.lead && r.lead.pipelineStage !== "NON_TARGET" && !viste.has(r.lead.id) && viste.add(r.lead.id))
    .map((r) => ({ ...r.lead!, canale: r.canale, trovataIl: r.createdAt, caso: r.chiave.casoStudio }));
  return NextResponse.json({ aziende, totale: aziende.length });
}
