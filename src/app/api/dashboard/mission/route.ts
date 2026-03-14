import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma, PipelineStage } from "@prisma/client";

/**
 * GET /api/dashboard/mission
 *
 * Ritorna i dati per la "Missione di Oggi":
 * - I 5 video da registrare: top score con analisi Gemini
 *   (da VIDEO_DA_FARE, QUALIFICATO, o DA_QUALIFICARE)
 * - Follow-up prioritari (VIDEO_INVIATO da >48h)
 * - Conteggi per sidebar badges
 *
 * Logica "Missione":
 * - Pesca i top 5 lead PRONTI (= hanno geminiAnalysis) che non sono
 *   ancora stati inviati, ordinati per score. Indipendente dallo stage.
 * - I lead già VIDEO_INVIATO o oltre sono esclusi.
 */
export async function GET() {
  try {
    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    // Stage "pronti" = non ancora inviati e non archiviati
    const stagesPronti: PipelineStage[] = [
      "DA_QUALIFICARE",
      "QUALIFICATO",
      "VIDEO_DA_FARE",
    ];

    const [
      // I 5 video di oggi: top scored con analisi, non ancora inviati
      videoDaFare,
      // Follow-up prioritari: VIDEO_INVIATO da >48h
      followUpPrioritari,
      // Badge: Da Analizzare (senza Gemini, con sito)
      countDaAnalizzare,
      // Badge: Follow-up >48h
      countFollowUp48h,
      // Badge: Inviati recenti (<48h)
      countInviatiRecenti,
      // Badge: Appuntamenti
      countCallFissata,
      // Badge: In chiusura
      countInChiusura,
      // Badge: Hot Leads (score ≥80, con analisi, non ancora inviati)
      countHotLeads,
      // Badge: Warm Leads (score 50-79, con analisi, non ancora inviati)
      countWarmLeads,
    ] = await Promise.all([
      // TOP 5 pronti per video (hanno analisi Gemini + score)
      db.lead.findMany({
        where: {
          pipelineStage: { in: stagesPronti },
          geminiAnalysis: { not: Prisma.DbNull },
          opportunityScore: { not: null },
        },
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
          pipelineStage: true,
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

      // Da Analizzare: hanno sito ma non hanno Gemini analysis
      db.lead.count({
        where: {
          pipelineStage: { in: stagesPronti },
          website: { not: null },
          geminiAnalysis: { equals: Prisma.DbNull },
        },
      }),

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

      // In chiusura
      db.lead.count({
        where: {
          pipelineStage: { in: ["IN_CONVERSAZIONE", "PROPOSTA_INVIATA"] },
        },
      }),

      // Hot leads: score ≥80, con analisi, non inviati
      db.lead.count({
        where: {
          pipelineStage: { in: stagesPronti },
          geminiAnalysis: { not: Prisma.DbNull },
          opportunityScore: { gte: 80 },
        },
      }),

      // Warm leads: score 50-79, con analisi, non inviati
      db.lead.count({
        where: {
          pipelineStage: { in: stagesPronti },
          geminiAnalysis: { not: Prisma.DbNull },
          opportunityScore: { gte: 50, lt: 80 },
        },
      }),
    ]);

    // Quanti dei top 5 sono effettivamente pronti
    const readyCount = videoDaFare.length;

    return NextResponse.json({
      videoDaFare,
      followUpPrioritari,
      badges: {
        daRegistrare: readyCount,
        daAnalizzare: countDaAnalizzare,
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
