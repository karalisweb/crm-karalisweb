import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/leads/[id]/workflow-status
// Restituisce lo stato del workflow per un lead: step eseguiti, pendenti, prossimo
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const [lead, steps, executions] = await Promise.all([
      db.lead.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          pipelineStage: true,
          outreachChannel: true,
          videoViewsCount: true,
          videoMaxWatchPercent: true,
          videoSentAt: true,
          videoLandingUrl: true,
          category: true,
          unsubscribed: true,
        },
      }),
      db.workflowStep.findMany({
        where: { active: true },
        orderBy: [{ stepNumber: "asc" }, { channel: "asc" }, { variantLabel: "asc" }],
      }),
      db.workflowExecution.findMany({
        where: { leadId: id },
        include: { step: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    if (!lead) {
      return NextResponse.json({ error: "Lead non trovato" }, { status: 404 });
    }

    const videoWatched = (lead.videoViewsCount ?? 0) > 0 || (lead.videoMaxWatchPercent ?? 0) > 0;
    const executedStepIds = new Set(executions.map((e) => e.stepId));
    const leadChannel = lead.outreachChannel === "WA" ? "whatsapp" : "email";

    // Filtra step rilevanti per il canale del lead e le condizioni
    const relevantSteps = steps.filter((s) => {
      if (s.channel !== leadChannel) return false;
      if (s.condition === "video_watched" && !videoWatched) return false;
      if (s.condition === "video_not_watched" && videoWatched) return false;
      return true;
    });

    // Trova il prossimo step da eseguire
    const nextStep = relevantSteps.find((s) => !executedStepIds.has(s.id));

    return NextResponse.json({
      lead: {
        id: lead.id,
        name: lead.name,
        pipelineStage: lead.pipelineStage,
        outreachChannel: lead.outreachChannel,
        videoWatched,
        unsubscribed: lead.unsubscribed,
      },
      executions: executions.map((e) => ({
        id: e.id,
        stepId: e.stepId,
        stepName: e.step.name,
        stepNumber: e.step.stepNumber,
        channel: e.step.channel,
        status: e.status,
        sentAt: e.sentAt,
      })),
      nextStep: nextStep
        ? {
            id: nextStep.id,
            stepNumber: nextStep.stepNumber,
            channel: nextStep.channel,
            name: nextStep.name,
            mode: nextStep.mode,
            condition: nextStep.condition,
            variantLabel: nextStep.variantLabel,
            delayDays: nextStep.delayDays,
          }
        : null,
      allSteps: relevantSteps.map((s) => ({
        id: s.id,
        stepNumber: s.stepNumber,
        channel: s.channel,
        name: s.name,
        mode: s.mode,
        variantLabel: s.variantLabel,
        executed: executedStepIds.has(s.id),
      })),
    });
  } catch (error) {
    console.error("Error fetching workflow status:", error);
    return NextResponse.json({ error: "Errore" }, { status: 500 });
  }
}
