import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/api-auth";

/**
 * GET /api/video-visti
 *
 * Lead a cui è stato inviato il video e che lo hanno effettivamente APERTO/visto
 * (videoViewedAt valorizzato). Sono i più caldi: hanno mostrato interesse.
 */
export async function GET() {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;

  const leads = await db.lead.findMany({
    where: {
      videoViewedAt: { not: null },
      pipelineStage: "VIDEO_INVIATO",
    },
    select: {
      id: true,
      name: true,
      phone: true,
      category: true,
      opportunityScore: true,
      videoSentAt: true,
      videoViewedAt: true,
      respondedAt: true,
    },
    orderBy: { videoViewedAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ leads, total: leads.length });
}
