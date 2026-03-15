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
    ] = await Promise.all([
      db.lead.count({ where: { pipelineStage: "DA_ANALIZZARE" } }),
      db.lead.count({ where: { pipelineStage: "HOT_LEAD" } }),
      db.lead.count({ where: { pipelineStage: "WARM_LEAD" } }),
      db.lead.count({ where: { pipelineStage: "COLD_LEAD" } }),
      db.lead.count({ where: { pipelineStage: "FARE_VIDEO" } }),
      db.lead.count({ where: { pipelineStage: "FARE_VIDEO", scriptRegeneratedAt: { not: null } } }),
      db.lead.count({ where: { pipelineStage: "VIDEO_INVIATO" } }),
      db.lead.count({
        where: {
          pipelineStage: { in: ["FOLLOW_UP_1", "FOLLOW_UP_2", "FOLLOW_UP_3"] },
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
