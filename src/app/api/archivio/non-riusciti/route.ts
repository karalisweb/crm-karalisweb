import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { ARCHIVIATA_NON_RIUSCITA } from "@/lib/agents/rete";

/**
 * GET /api/archivio/non-riusciti — i messaggi LinkedIn che il CRM ha provato 2 volte senza riuscirci (v3.95).
 * Stanno solo qui: nessun avviso in Oggi né nel report. Alessio ci guarda se vuole.
 */
export async function GET() {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;

  const voci = await db.approvalItem.findMany({
    where: { decidedBy: ARCHIVIATA_NON_RIUSCITA },
    orderBy: { decidedAt: "desc" },
    take: 100,
    select: { id: true, note: true, decidedAt: true, payload: true, lead: { select: { id: true, name: true } } },
  });

  return NextResponse.json({
    voci: voci.map((v) => {
      const p = (v.payload ?? {}) as { decisore?: string; linkedin?: string };
      return {
        id: v.id,
        azienda: v.lead?.name ?? null,
        leadId: v.lead?.id ?? null,
        persona: p.decisore && p.decisore !== "chi decide" ? p.decisore : null,
        linkedin: p.linkedin ?? null,
        motivo: v.note,
        quando: v.decidedAt,
      };
    }),
  });
}
