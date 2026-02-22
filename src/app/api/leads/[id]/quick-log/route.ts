import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CallOutcome, Objection, NextStepType, PipelineStage, ActivityType } from "@prisma/client";

/**
 * API multi-action logger per il flusso video outreach
 *
 * POST /api/leads/[id]/quick-log
 *
 * Supporta due modalita:
 * 1. action-based (nuovo flusso outreach): { action: "VIDEO_SENT" | "LETTER_SENT" | ... }
 * 2. outcome-based (legacy call logging): { outcome: CallOutcome }
 */

type ActionType =
  | "VIDEO_SENT"
  | "LETTER_SENT"
  | "LINKEDIN_SENT"
  | "RESPONSE_RECEIVED"
  | "CALL_SCHEDULED"
  | "PROPOSAL_SENT"
  | "MARK_6M"
  | "MARK_RECYCLED"
  | "MARK_LOST"
  | "MARK_WON"
  | "QUALIFY"
  | "CALL_LOGGED";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Se c'e' un campo "action", usa il nuovo flusso
    if (body.action) {
      return handleAction(id, body);
    }

    // Altrimenti, usa il legacy call logging
    if (body.outcome) {
      return handleCallLog(id, body);
    }

    return NextResponse.json(
      { error: "Richiesto 'action' o 'outcome'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[API] quick-log error:", error);
    return NextResponse.json(
      { error: "Errore nel salvataggio" },
      { status: 500 }
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleAction(leadId: string, body: any) {
  const { action, notes, respondedVia, appointmentAt, recontactMonths, lostReason, lostReasonNotes } = body;

  const validActions: ActionType[] = [
    "VIDEO_SENT", "LETTER_SENT", "LINKEDIN_SENT", "RESPONSE_RECEIVED",
    "CALL_SCHEDULED", "PROPOSAL_SENT", "MARK_6M", "MARK_RECYCLED",
    "MARK_LOST", "MARK_WON", "QUALIFY", "CALL_LOGGED",
  ];

  if (!validActions.includes(action)) {
    return NextResponse.json(
      { error: `Azione non valida: ${action}` },
      { status: 400 }
    );
  }

  // Mappa action → stage, timestamp field, activity type
  const now = new Date();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let updateData: Record<string, any> = {};
  let newStage: PipelineStage | null = null;
  let activityType: ActivityType = "STAGE_CHANGE";
  let activityNotes = notes || "";

  switch (action as ActionType) {
    case "VIDEO_SENT":
      newStage = "VIDEO_INVIATO";
      updateData = { videoSentAt: now, lastContactedAt: now };
      activityType = "VIDEO_SENT";
      activityNotes = notes || "Video Tella inviato via email";
      break;

    case "LETTER_SENT":
      newStage = "LETTERA_INVIATA";
      updateData = { letterSentAt: now, lastContactedAt: now };
      activityType = "LETTER_SENT";
      activityNotes = notes || "Lettera cartacea inviata";
      break;

    case "LINKEDIN_SENT":
      newStage = "FOLLOW_UP_LINKEDIN";
      updateData = { linkedinSentAt: now, lastContactedAt: now };
      activityType = "LINKEDIN_SENT";
      activityNotes = notes || "Connessione/InMail LinkedIn inviata";
      break;

    case "RESPONSE_RECEIVED":
      newStage = "RISPOSTO";
      updateData = {
        respondedAt: now,
        respondedVia: respondedVia || null,
      };
      activityType = "RESPONSE_RECEIVED";
      activityNotes = respondedVia
        ? `Risposta ricevuta via ${respondedVia}${notes ? ` - ${notes}` : ""}`
        : notes || "Risposta ricevuta";
      break;

    case "CALL_SCHEDULED":
      newStage = "CALL_FISSATA";
      updateData = {
        appointmentAt: appointmentAt ? new Date(appointmentAt) : null,
      };
      activityType = "MEETING";
      activityNotes = appointmentAt
        ? `Call fissata per ${new Date(appointmentAt).toLocaleDateString("it-IT")}${notes ? ` - ${notes}` : ""}`
        : notes || "Call conoscitiva fissata";
      break;

    case "PROPOSAL_SENT":
      newStage = "PROPOSTA_INVIATA";
      updateData = { offerSentAt: now, lastContactedAt: now };
      activityType = "PROPOSAL_SENT";
      activityNotes = notes || "Proposta inviata";
      break;

    case "MARK_6M": {
      newStage = "DA_RICHIAMARE_6M";
      const months = recontactMonths || 6;
      const recontactDate = new Date();
      recontactDate.setMonth(recontactDate.getMonth() + months);
      updateData = { recontactAt: recontactDate };
      activityType = "STAGE_CHANGE";
      activityNotes = `Messo in attesa, ricontattare tra ${months} mesi (${recontactDate.toLocaleDateString("it-IT")})`;
      break;
    }

    case "MARK_RECYCLED":
      newStage = "RICICLATO";
      activityType = "STAGE_CHANGE";
      activityNotes = notes || "Riciclato come caso studio anonimizzato";
      break;

    case "MARK_LOST":
      newStage = "PERSO";
      updateData = {
        lostReason: lostReason || "ALTRO",
        lostReasonNotes: lostReasonNotes || notes || null,
      };
      activityType = "STAGE_CHANGE";
      activityNotes = `Perso${lostReason ? ` - Motivo: ${lostReason}` : ""}${notes ? ` - ${notes}` : ""}`;
      break;

    case "MARK_WON":
      newStage = "VINTO";
      activityType = "STAGE_CHANGE";
      activityNotes = notes || "Cliente acquisito";
      break;

    case "QUALIFY":
      newStage = "QUALIFICATO";
      updateData = {
        qualifiedAt: now,
        qualifiedBy: body.qualifiedBy || null,
        danielaNotes: body.danielaNotes || null,
        auditVerified: true,
        auditVerifiedAt: now,
        auditVerifiedBy: body.qualifiedBy || null,
        auditVerificationChecks: body.verificationChecks || null,
      };
      activityType = "QUALIFICATION";
      activityNotes = body.danielaNotes
        ? `Qualificato da ${body.qualifiedBy || "Daniela"}: ${body.danielaNotes}`
        : `Qualificato da ${body.qualifiedBy || "Daniela"}`;
      break;
  }

  // Applica aggiornamento lead
  if (newStage) {
    updateData.pipelineStage = newStage;
  }

  const updatedLead = await db.lead.update({
    where: { id: leadId },
    data: updateData,
  });

  // Crea activity per storico
  await db.activity.create({
    data: {
      leadId,
      type: activityType,
      notes: activityNotes,
    },
  });

  return NextResponse.json({
    success: true,
    lead: {
      id: updatedLead.id,
      pipelineStage: updatedLead.pipelineStage,
    },
  });
}

/**
 * Legacy call logging (per la fase vendita: CALL_FISSATA, IN_CONVERSAZIONE)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleCallLog(leadId: string, body: any) {
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
      newStage = "CALL_FISSATA";
      break;
    case "NOT_INTERESTED":
      newStage = "PERSO";
      break;
    case "CALLBACK":
      newStage = "IN_CONVERSAZIONE";
      break;
    case "NO_ANSWER":
    case "BUSY":
      // Non cambia stage, rimane dov'e'
      newStage = "IN_CONVERSAZIONE";
      break;
    case "ANSWERED":
    default:
      newStage = "IN_CONVERSAZIONE";
      break;
  }

  // Aggiorna lead
  const updatedLead = await db.lead.update({
    where: { id: leadId },
    data: {
      lastCallOutcome: outcome,
      lastCallNotes: notes || null,
      lastContactedAt: new Date(),
      mainObjection: objection || null,
      objectionNotes: objectionNotes || null,
      nextStepType: nextStep || null,
      nextStepNotes: nextStepNotes || null,
      nextFollowupAt: nextFollowupAt ? new Date(nextFollowupAt) : null,
      pipelineStage: newStage,
      ...(outcome === "NOT_INTERESTED"
        ? {
            lostReason: "NO_INTERESSE" as const,
            lostReasonNotes: objection
              ? `Obiezione: ${objection}${objectionNotes ? ` - ${objectionNotes}` : ""}`
              : null,
          }
        : {}),
    },
  });

  // Crea activity per storico
  await db.activity.create({
    data: {
      leadId,
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
}
