import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/dashboard/mission
 *
 * Ritorna i dati per la "Missione di Oggi":
 * - I 5 video da registrare (top score in VIDEO_DA_FARE)
 * - Follow-up prioritari (VIDEO_INVIATO da >48h senza risposta)
 * - Conteggi per sidebar badges
 */
export async function GET() {
  try {
    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const [
      // I 5 video di oggi (VIDEO_DA_FARE ordinati per score)
      videoDaFare,
      // Follow-up prioritari: VIDEO_INVIATO da >48h
      followUpPrioritari,
      // Conteggi per sidebar
      countVideoDaFare,
      countFollowUp48h,
      countInviatiRecenti,
      countCallFissata,
      countInChiusura,
      countHotLeads,
      countWarmLeads,
    ] = await Promise.all([
      // 5 video di oggi
      db.lead.findMany({
        where: { pipelineStage: "VIDEO_DA_FARE" },
        orderBy: { opportunityScore: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          category: true,
          website: true,
          opportunityScore: true,
          geminiAnalysis: true,
          commercialTag: true,
        },
      }),

      // Follow-up: inviati da >48h
      db.lead.findMany({
        where: {
          pipelineStage: "VIDEO_INVIATO",
          videoSentAt: { lt: fortyEightHoursAgo },
        },
        orderBy: { videoSentAt: "asc" },
        take: 20,
        select: {
          id: true,
          name: true,
          category: true,
          opportunityScore: true,
          videoSentAt: true,
          geminiAnalysis: true,
        },
      }),

      // Badge counts
      db.lead.count({ where: { pipelineStage: "VIDEO_DA_FARE" } }),

      // Follow-up >48h
      db.lead.count({
        where: {
          pipelineStage: "VIDEO_INVIATO",
          videoSentAt: { lt: fortyEightHoursAgo },
        },
      }),

      // Inviati recenti (<48h)
      db.lead.count({
        where: {
          pipelineStage: "VIDEO_INVIATO",
          OR: [
            { videoSentAt: { gte: fortyEightHoursAgo } },
            { videoSentAt: null },
          ],
        },
      }),

      // Appuntamenti
      db.lead.count({ where: { pipelineStage: "CALL_FISSATA" } }),

      // In chiusura (IN_CONVERSAZIONE + PROPOSTA_INVIATA)
      db.lead.count({
        where: {
          pipelineStage: { in: ["IN_CONVERSAZIONE", "PROPOSTA_INVIATA"] },
        },
      }),

      // Hot leads (score > 80, in QUALIFICATO)
      db.lead.count({
        where: {
          pipelineStage: "QUALIFICATO",
          opportunityScore: { gte: 80 },
        },
      }),

      // Warm leads (score 50-79, in QUALIFICATO)
      db.lead.count({
        where: {
          pipelineStage: "QUALIFICATO",
          opportunityScore: { gte: 50, lt: 80 },
        },
      }),
    ]);

    return NextResponse.json({
      videoDaFare,
      followUpPrioritari,
      badges: {
        daRegistrare: Math.min(countVideoDaFare, 5),
        followUp: countFollowUp48h,
        inviati: countInviatiRecenti,
        appuntamenti: countCallFissata,
        inChiusura: countInChiusura,
        hotLeads: countHotLeads,
        warmLeads: countWarmLeads,
      },
    });
  } catch (error) {
    console.error("[API] mission error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore interno" },
      { status: 500 }
    );
  }
}
