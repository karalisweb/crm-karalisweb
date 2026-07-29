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
    // Nuove metriche dei due assi + reciprocita'
    partnersCount,
    clientsCount,
    referralsGivenTotal,
    referralsGivenThisMonth,
    never121,
    chaptersToVisit,
    offerteAperte,
    recallDovuti,
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
    // Partner di potere: la leva che porta piu' fatturato nel tempo
    db.bniMembro.count({ where: { status: "ATTIVO", memberRole: "PARTNER" } }),
    db.bniMembro.count({ where: { status: "ATTIVO", memberRole: "CLIENTE" } }),
    db.referralGiven.count(),
    db.referralGiven.count({ where: { givenAt: { gte: startOfMonth } } }),
    db.bniMembro.count({ where: { status: "ATTIVO", oneToOneCount: 0 } }),
    db.bniChapter.count({ where: { visitStatus: { in: ["DA_ANALIZZARE", "ANALIZZATO"] } } }),
    // Pipeline BNI: offerte in corso e recall arrivati a scadenza
    db.bniMembro.count({ where: { bniStage: "OFFERTA" } }),
    db.bniMembro.count({ where: { bniStage: "RECALL", nextRecallAt: { not: null, lte: now } } }),
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
    partnersCount,
    clientsCount,
    referralsGivenTotal,
    referralsGivenThisMonth,
    never121,
    chaptersToVisit,
    offerteAperte,
    recallDovuti,
    // Bilancio del Givers Gain: >0 sono in credito, <0 in debito con la rete
    reciprocityBalance: referralsGivenTotal - referralsReceived,
  });
}
