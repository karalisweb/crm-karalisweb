import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/dashboard/mission
 *
 * Ritorna i conteggi per sidebar badges.
 * Pipeline: DA_ANALIZZARE → HOT/WARM/COLD → FARE_VIDEO → VIDEO_INVIATO
 * → FOLLOW_UP 1/2/3 → LINKEDIN → TELEFONATA 1/2/3
 * → CALL_FISSATA → IN_TRATTATIVA → CLIENTE/PERSO/ARCHIVIATO
 */
export async function GET() {
  try {
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
    ]);

    return NextResponse.json({
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
