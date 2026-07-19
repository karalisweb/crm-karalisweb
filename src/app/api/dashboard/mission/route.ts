import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parsePausedSegments } from "@/lib/segments";
import { approvalQueueWhere } from "@/lib/lead-filters";

/**
 * GET /api/dashboard/mission
 *
 * Fonte unica dei contatori (badge sidebar + KPI dashboard) e delle due liste
 * operative della home ("I video di oggi" + "Follow-up prioritari").
 * Pipeline: DA_ANALIZZARE → HOT/WARM/COLD → FARE_VIDEO → VIDEO_INVIATO
 * → FOLLOW-UP → TELEFONATE → CALL_FISSATA → IN_TRATTATIVA → CLIENTE
 */

// Campi minimi che servono alle card della dashboard.
const MISSION_LEAD_SELECT = {
  id: true,
  name: true,
  category: true,
  website: true,
  opportunityScore: true,
  geminiAnalysis: true,
  videoSentAt: true,
  commercialTag: true,
} as const;

export async function GET() {
  try {
    // Soglia + settori in pausa per allineare il contatore "da approvare" alla pagina.
    const settings = await db.settings.findUnique({
      where: { id: "default" },
      select: { outreachApprovalMinScore: true, pausedSegments: true },
    });
    const pausedKeys = parsePausedSegments(settings?.pausedSegments);
    const approvalThreshold = settings?.outreachApprovalMinScore ?? 60;

    const [
      countDaAnalizzare,
      countHotLeads,
      countWarmLeads,
      countColdLeads,
      countFareVideo,
      countFareVideoReady,
      countVideoInviati,
      countFollowUp,
      countLinkedin,
      countTelefonate,
      countCallFissate,
      countInTrattativa,
      countClienti,
      countRisposto,
      countEmailInviate,
      countVideoVisti,
      countBniDaLavorare,
      countDaApprovare,
      videoDaFare,
      followUpPrioritari,
    ] = await Promise.all([
      db.lead.count({ where: { pipelineStage: "DA_ANALIZZARE", optInSentAt: null } }),
      db.lead.count({ where: { pipelineStage: "HOT_LEAD", optInSentAt: null } }),
      db.lead.count({ where: { pipelineStage: "WARM_LEAD", optInSentAt: null } }),
      db.lead.count({ where: { pipelineStage: "COLD_LEAD", optInSentAt: null } }),
      db.lead.count({ where: { pipelineStage: "FARE_VIDEO" } }),
      db.lead.count({ where: { pipelineStage: "FARE_VIDEO", scriptRegeneratedAt: { not: null } } }),
      db.lead.count({ where: { pipelineStage: "VIDEO_INVIATO" } }),
      // Follow-up = richiami email opt-in partiti dopo qualche giorno, in attesa di risposta
      db.lead.count({
        where: {
          optInSentAt: { not: null },
          optInFollowupAt: { not: null },
          respondedAt: null,
          unsubscribed: false,
          pipelineStage: { not: "ARCHIVIATO" },
        },
      }),
      db.lead.count({ where: { pipelineStage: "LINKEDIN" } }),
      db.lead.count({
        where: {
          pipelineStage: { in: ["TELEFONATA_1", "TELEFONATA_2", "TELEFONATA_3"] },
        },
      }),
      db.lead.count({ where: { pipelineStage: "CALL_FISSATA" } }),
      db.lead.count({ where: { pipelineStage: "IN_TRATTATIVA" } }),
      db.lead.count({ where: { pipelineStage: "CLIENTE" } }),
      db.lead.count({ where: { respondedAt: { not: null } } }),
      // Email opt-in inviate e ancora in attesa di risposta (in gioco)
      db.lead.count({
        where: {
          optInSentAt: { not: null },
          respondedAt: null,
          pipelineStage: { in: ["HOT_LEAD", "WARM_LEAD", "COLD_LEAD"] },
        },
      }),
      // Video inviati che sono stati visti dal prospect
      db.lead.count({ where: { videoViewedAt: { not: null }, pipelineStage: "VIDEO_INVIATO" } }),
      // Opportunità BNI ancora da lavorare
      db.lead.count({ where: { pipelineStage: "BNI_DA_LAVORARE" } }),
      // Coda approvazione outreach (allineata alla pagina /approvazione).
      db.lead.count({ where: approvalQueueWhere(pausedKeys, approvalThreshold) }),
      // Lista "I video di oggi": lead pronti per registrare il video (FARE_VIDEO).
      db.lead.findMany({
        where: { pipelineStage: "FARE_VIDEO" },
        orderBy: [{ opportunityScore: "desc" }, { createdAt: "asc" }],
        take: 5,
        select: MISSION_LEAD_SELECT,
      }),
      // Lista "Follow-up prioritari": video già inviati, ancora senza risposta.
      db.lead.findMany({
        where: { pipelineStage: "VIDEO_INVIATO", respondedAt: null, unsubscribed: false },
        orderBy: [{ videoSentAt: "asc" }],
        take: 10,
        select: MISSION_LEAD_SELECT,
      }),
    ]);

    return NextResponse.json({
      videoDaFare,
      followUpPrioritari,
      badges: {
        daAnalizzare: countDaAnalizzare,
        hotLeads: countHotLeads,
        warmLeads: countWarmLeads,
        coldLeads: countColdLeads,
        fareVideo: countFareVideo,
        fareVideoReady: countFareVideoReady,
        videoInviati: countVideoInviati,
        followUp: countFollowUp,
        linkedin: countLinkedin,
        telefonate: countTelefonate,
        callFissate: countCallFissate,
        inTrattativa: countInTrattativa,
        clienti: countClienti,
        risposto: countRisposto,
        emailInviate: countEmailInviate,
        videoVisti: countVideoVisti,
        bniDaLavorare: countBniDaLavorare,
        daApprovare: countDaApprovare,
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
