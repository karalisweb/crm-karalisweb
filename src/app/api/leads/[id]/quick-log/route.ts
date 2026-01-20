import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CallOutcome, Objection, NextStepType, PipelineStage } from "@prisma/client";

/**
 * API per logging rapido chiamata (<30 secondi)
 *
 * POST /api/leads/[id]/quick-log
 * Body: {
 *   outcome: CallOutcome,
 *   objection?: Objection,
 *   objectionNotes?: string,
 *   nextStep?: NextStepType,
 *   nextStepNotes?: string,
 *   nextFollowupAt?: string (ISO date),
 *   notes?: string
 * }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
      outcome,
      objection,
      objectionNotes,
      nextStep,
      nextStepNotes,
      nextFollowupAt,
      notes,
    } = body;

    // Valida outcome
    if (!outcome || !Object.values(CallOutcome).includes(outcome)) {
      return NextResponse.json(
        { error: "Outcome richiesto" },
        { status: 400 }
      );
    }

    // Determina il nuovo stage in base all'outcome
    let newStage: PipelineStage;
    switch (outcome) {
      case "INTERESTED":
        newStage = "INTERESTED";
        break;
      case "NOT_INTERESTED":
        newStage = "LOST";
        break;
      case "CALLBACK":
        newStage = "CALLED";
        break;
      case "ANSWERED":
      case "NO_ANSWER":
      case "BUSY":
      default:
        newStage = "CALLED";
        break;
    }

    // Aggiorna lead
    const updatedLead = await db.lead.update({
      where: { id },
      data: {
        // Esito chiamata
        lastCallOutcome: outcome,
        lastCallNotes: notes || null,
        lastContactedAt: new Date(),

        // Obiezione (se presente)
        mainObjection: objection || null,
        objectionNotes: objectionNotes || null,

        // Next step
        nextStepType: nextStep || null,
        nextStepNotes: nextStepNotes || null,
        nextFollowupAt: nextFollowupAt ? new Date(nextFollowupAt) : null,

        // Stage
        pipelineStage: newStage,

        // Se non interessato, segna lost reason
        ...(outcome === "NOT_INTERESTED" && objection
          ? { lostReason: `Obiezione: ${objection}${objectionNotes ? ` - ${objectionNotes}` : ""}` }
          : {}),
      },
    });

    // Crea activity per storico
    await db.activity.create({
      data: {
        leadId: id,
        type: "CALL",
        outcome,
        notes: [
          notes,
          objection ? `Obiezione: ${objection}` : null,
          nextStep ? `Next: ${nextStep}` : null,
        ]
          .filter(Boolean)
          .join(" | "),
      },
    });

    return NextResponse.json({
      success: true,
      lead: {
        id: updatedLead.id,
        pipelineStage: updatedLead.pipelineStage,
        lastCallOutcome: updatedLead.lastCallOutcome,
        nextFollowupAt: updatedLead.nextFollowupAt,
      },
    });
  } catch (error) {
    console.error("[API] quick-log error:", error);
    return NextResponse.json(
      { error: "Errore nel salvataggio" },
      { status: 500 }
    );
  }
}
