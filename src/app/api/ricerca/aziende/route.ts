import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { siglaIndirizzo } from "@/lib/ricerca/regole";

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
      lead: { select: { id: true, name: true, website: true, address: true, category: true, phone: true, googleRating: true, googleReviewsCount: true, socialUrl: true, pipelineStage: true, approvalItems: { where: { kind: "FASCICOLO_BASE" }, select: { status: true, title: true }, take: 1 } } },
      chiave: { select: { tipo: true, casoStudio: { select: { id: true, titolo: true, provincia: true } } } },
    },
  });
  // Un'azienda una volta sola (il ritrovamento più recente).
  const viste = new Set<string>();
  const aziende = ritrovamenti
    .filter((r) => r.lead && r.lead.pipelineStage !== "NON_TARGET" && !viste.has(r.lead.id) && viste.add(r.lead.id))
    .map((r) => {
      const { approvalItems, ...l } = r.lead!;
      // decisione: null = giro veloce in corso; IN_ATTESA = da decidere; APPROVATO; SCARTATO.
      return { ...l, canale: r.canale, trovataIl: r.createdAt, caso: r.chiave.casoStudio, provinciaCliente: r.chiave.tipo === "AZIENDA" && !!r.chiave.casoStudio?.provincia && siglaIndirizzo(l.address) === r.chiave.casoStudio.provincia, manuale: r.chiave.tipo === "MANUALE", decisione: approvalItems[0]?.status ?? null, sintesi: approvalItems[0]?.title ?? null };
    });
  return NextResponse.json({ aziende, totale: aziende.length });
}
