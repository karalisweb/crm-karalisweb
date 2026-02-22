import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateVideoScript } from "@/lib/audit/video-script-generator";
import { Prisma } from "@prisma/client";
import type { AuditData } from "@/types";

/**
 * POST /api/leads/[id]/generate-script
 *
 * Genera (o rigenera) lo script video per un lead.
 * Richiede: audit completato.
 * Se il lead e' in QUALIFICATO, lo sposta a VIDEO_DA_FARE.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Carica il lead con tutti i dati necessari
    const lead = await db.lead.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        auditStatus: true,
        auditData: true,
        opportunityScore: true,
        commercialTag: true,
        danielaNotes: true,
        googleRating: true,
        googleReviewsCount: true,
        pipelineStage: true,
      },
    });

    if (!lead) {
      return NextResponse.json(
        { error: "Lead non trovato" },
        { status: 404 }
      );
    }

    if (lead.auditStatus !== "COMPLETED" || !lead.auditData) {
      return NextResponse.json(
        { error: "Audit non completato. Impossibile generare lo script." },
        { status: 400 }
      );
    }

    // Genera lo script
    const auditData = lead.auditData as unknown as AuditData;
    const videoScript = generateVideoScript({
      auditData,
      opportunityScore: lead.opportunityScore || 0,
      commercialTag: lead.commercialTag,
      danielaNotes: lead.danielaNotes,
      googleRating: lead.googleRating ? Number(lead.googleRating) : null,
      googleReviewsCount: lead.googleReviewsCount,
      leadName: lead.name,
    });

    // Determina se spostare lo stage
    const shouldMoveStage = lead.pipelineStage === "QUALIFICATO";

    // Salva lo script e aggiorna lo stage se necessario
    const updatedLead = await db.lead.update({
      where: { id },
      data: {
        videoScriptData: videoScript as unknown as Prisma.InputJsonValue,
        ...(shouldMoveStage && { pipelineStage: "VIDEO_DA_FARE" }),
      },
    });

    // Se abbiamo spostato lo stage, logga l'attivita
    if (shouldMoveStage) {
      await db.activity.create({
        data: {
          leadId: id,
          type: "STAGE_CHANGE",
          notes: "Script video generato, pronto per registrazione",
        },
      });
    }

    return NextResponse.json({
      success: true,
      videoScript,
      pipelineStage: updatedLead.pipelineStage,
    });
  } catch (error) {
    console.error("[API] generate-script error:", error);
    return NextResponse.json(
      { error: "Errore nella generazione dello script" },
      { status: 500 }
    );
  }
}
