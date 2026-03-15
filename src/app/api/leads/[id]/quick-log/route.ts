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
  | "FOLLOW_UP"
  | "LINKEDIN_SENT"
  | "TELEFONATA"
  | "CALL_SCHEDULED"
  | "IN_TRATTATIVA"
  | "MARK_ARCHIVED"
  | "MARK_LOST"
  | "MARK_WON"
  | "MOVE_TO_VIDEO"
  | "MOVE_TO_WARM"
  | "MOVE_TO_COLD"
  | "MOVE_BACK"
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
    "VIDEO_SENT", "FOLLOW_UP", "LINKEDIN_SENT", "TELEFONATA",
    "CALL_SCHEDULED", "IN_TRATTATIVA", "MARK_ARCHIVED",
    "MARK_LOST", "MARK_WON", "MOVE_TO_VIDEO", "MOVE_TO_WARM",
    "MOVE_TO_COLD", "MOVE_BACK", "CALL_LOGGED",
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

  // Fetch current lead to determine next stage for progressive actions
  const currentLead = await db.lead.findUnique({
    where: { id: leadId },
    select: { pipelineStage: true, outreachChannel: true },
  });

  switch (action as ActionType) {
    case "VIDEO_SENT": {
      const channel = body.channel || "EMAIL"; // "WA" | "EMAIL"
      newStage = "VIDEO_INVIATO";
      updateData = { videoSentAt: now, lastContactedAt: now, outreachChannel: channel };
      activityType = "VIDEO_SENT";
      activityNotes = notes || `Video inviato via ${channel === "WA" ? "WhatsApp" : "Email"}`;
      break;
    }

    case "FOLLOW_UP": {
      // Progressive: FOLLOW_UP_1 → 2 → 3
      const currentStage = currentLead?.pipelineStage;
      if (currentStage === "FOLLOW_UP_2" || currentStage === "FOLLOW_UP_3") {
        newStage = "FOLLOW_UP_3";
      } else if (currentStage === "FOLLOW_UP_1") {
        newStage = "FOLLOW_UP_2";
      } else {
        newStage = "FOLLOW_UP_1";
      }
      updateData = { lastContactedAt: now };
      activityType = "STAGE_CHANGE";
      activityNotes = notes || `Follow-up effettuato (${newStage})`;
      break;
    }

    case "LINKEDIN_SENT":
      newStage = "LINKEDIN";
      updateData = { linkedinSentAt: now, lastContactedAt: now };
      activityType = "LINKEDIN_SENT";
      activityNotes = notes || "Outreach LinkedIn inviato";
      break;

    case "TELEFONATA": {
      // Progressive: TELEFONATA_1 → 2 → 3
      const curStage = currentLead?.pipelineStage;
      if (curStage === "TELEFONATA_2" || curStage === "TELEFONATA_3") {
        newStage = "TELEFONATA_3";
      } else if (curStage === "TELEFONATA_1") {
        newStage = "TELEFONATA_2";
      } else {
        newStage = "TELEFONATA_1";
      }
      updateData = { lastContactedAt: now, callAttempts: { increment: 1 } };
      activityType = "CALL";
      activityNotes = notes || `Telefonata effettuata (${newStage})`;
      break;
    }

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

    case "IN_TRATTATIVA":
      newStage = "IN_TRATTATIVA";
      updateData = { lastContactedAt: now };
      activityType = "STAGE_CHANGE";
      activityNotes = notes || "Trattativa avviata";
      break;

    case "MARK_ARCHIVED": {
      newStage = "ARCHIVIATO";
      const months = recontactMonths || 6;
      const recontactDate = new Date();
      recontactDate.setMonth(recontactDate.getMonth() + months);
      updateData = { recontactAt: recontactDate };
      activityType = "STAGE_CHANGE";
      activityNotes = notes || `Archiviato, ricontattare tra ${months} mesi`;
      break;
    }

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
      newStage = "CLIENTE";
      activityType = "STAGE_CHANGE";
      activityNotes = notes || "Cliente acquisito";
      break;

    case "MOVE_TO_VIDEO":
      newStage = "FARE_VIDEO";
      activityType = "STAGE_CHANGE";
      activityNotes = notes || "Spostato a Fare Video";
      break;

    case "MOVE_TO_WARM":
      newStage = "WARM_LEAD";
      activityType = "STAGE_CHANGE";
      activityNotes = notes || "Spostato da Fare Video a Warm Lead";
      break;

    case "MOVE_TO_COLD":
      newStage = "COLD_LEAD";
      activityType = "STAGE_CHANGE";
      activityNotes = notes || "Spostato da Fare Video a Cold Lead";
      break;

    case "MOVE_BACK": {
      // Rimanda indietro da FARE_VIDEO: il sistema piazza in base allo score
      const leadForScore = await db.lead.findUnique({
        where: { id: leadId },
        select: { opportunityScore: true },
      });
      const score = leadForScore?.opportunityScore ?? 0;
      if (score >= 80) {
        newStage = "HOT_LEAD";
      } else if (score >= 50) {
        newStage = "WARM_LEAD";
      } else {
        newStage = "COLD_LEAD";
      }
      activityType = "STAGE_CHANGE";
      activityNotes = notes || `Rimandato indietro da Fare Video → ${newStage} (score: ${score})`;
      break;
    }
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
 * Legacy call logging (per la fase vendita: CALL_FISSATA, IN_TRATTATIVA)
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
      newStage = "IN_TRATTATIVA";
      break;
    case "NO_ANSWER":
    case "BUSY":
      newStage = "IN_TRATTATIVA";
      break;
    case "ANSWERED":
    default:
      newStage = "IN_TRATTATIVA";
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
