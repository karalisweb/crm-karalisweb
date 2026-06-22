import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/api-auth";

/**
 * Rete BNI — metriche di sintesi ("cosa ne esce").
 * GET /api/bni/stats
 */
export async function GET() {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  // Soglia "membro freddo": nessun 121 da oltre 4 mesi (o mai)
  const coldThreshold = new Date(now.getFullYear(), now.getMonth() - 4, now.getDate());

  const [
    membersTotal,
    oneToOnesTotal,
    oneToOnesThisMonth,
    referralsReceived,
    membersInterested,
    bniLeadsOpen,
    bniClients,
    coldMembers,
  ] = await Promise.all([
    db.bniMembro.count(),
    db.oneToOne.count(),
    db.oneToOne.count({ where: { date: { gte: startOfMonth } } }),
    db.lead.count({ where: { source: "bni", bniOriginType: "referral" } }),
    db.lead.count({ where: { source: "bni", bniOriginType: "member_interest" } }),
    db.lead.count({
      where: { source: "bni", pipelineStage: { notIn: ["CLIENTE", "PERSO"] } },
    }),
    db.lead.count({ where: { source: "bni", pipelineStage: "CLIENTE" } }),
    db.bniMembro.count({
      where: {
        status: "ATTIVO",
        OR: [{ lastOneToOneAt: null }, { lastOneToOneAt: { lt: coldThreshold } }],
      },
    }),
  ]);

  return NextResponse.json({
    membersTotal,
    oneToOnesTotal,
    oneToOnesThisMonth,
    referralsReceived,
    membersInterested,
    bniLeadsOpen,
    bniClients,
    coldMembers,
  });
}
