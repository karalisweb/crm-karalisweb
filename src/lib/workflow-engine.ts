import { db } from "@/lib/db";
import { renderTemplate } from "@/lib/workflow-templates";
import { sendOutreachEmail } from "@/lib/email";
import type { WorkflowStep } from "@prisma/client";

/**
 * Workflow Engine — logica condivisa
 *
 * Estratta da /api/cron/workflow-engine per permettere anche il trigger
 * immediato (es. appena un lead entra in VIDEO_INVIATO, deve partire subito
 * il messaggio 1 senza aspettare il cron notturno).
 *
 * Regole di stop (filtri applicati):
 * - pipelineStage deve essere un triggerStage attivo (se il lead passa a
 *   CALL_FISSATA, il trigger non matcha piu' e il workflow si ferma)
 * - respondedAt deve essere null (se il lead ha risposto, stop)
 * - unsubscribed deve essere false
 */

export interface WorkflowProcessResult {
  processed: number;
  autoSent: number;
  tasksCreated: number;
  skipped: number;
}

interface WorkflowSettings {
  bookingUrl: string | null;
  signatureAlessio: string | null;
  signatureFrancesca: string | null;
  caseStudiesBlock: string | null;
}

/**
 * Processa il workflow per un singolo lead (fire-and-forget style).
 * Ritorna true se ha eseguito almeno uno step, false altrimenti.
 */
export async function processLeadWorkflow(leadId: string): Promise<boolean> {
  const settings = await db.settings.findFirst({
    select: {
      workflowEnabled: true,
      bookingUrl: true,
      signatureAlessio: true,
      signatureFrancesca: true,
      caseStudiesBlock: true,
    },
  });

  if (!settings?.workflowEnabled) return false;

  const steps = await db.workflowStep.findMany({
    where: { active: true },
    orderBy: [{ stepNumber: "asc" }, { channel: "asc" }],
  });
  if (steps.length === 0) return false;

  const lead = await db.lead.findUnique({
    where: { id: leadId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      whatsappNumber: true,
      category: true,
      segment: true,
      videoLandingUrl: true,
      pipelineStage: true,
      outreachChannel: true,
      videoViewsCount: true,
      videoMaxWatchPercent: true,
      videoSentAt: true,
      lastContactedAt: true,
      respondedAt: true,
      unsubscribed: true,
      workflowExecutions: {
        select: {
          stepId: true,
          sentAt: true,
          status: true,
          step: { select: { stepNumber: true } },
        },
      },
    },
  });

  if (!lead) return false;

  // Regole di stop
  if (lead.unsubscribed) return false;
  if (lead.respondedAt) return false;

  const templateSettings: WorkflowSettings = {
    bookingUrl: settings.bookingUrl,
    signatureAlessio: settings.signatureAlessio,
    signatureFrancesca: settings.signatureFrancesca,
    caseStudiesBlock: settings.caseStudiesBlock,
  };

  const executed = await runStepsForLead(lead, steps, templateSettings);
  return executed > 0;
}

/**
 * Processa in batch tutti i lead candidati al workflow (usato dal cron giornaliero).
 */
export async function processBatchWorkflow(): Promise<WorkflowProcessResult> {
  const result: WorkflowProcessResult = {
    processed: 0,
    autoSent: 0,
    tasksCreated: 0,
    skipped: 0,
  };

  const settings = await db.settings.findFirst({
    select: {
      workflowEnabled: true,
      bookingUrl: true,
      signatureAlessio: true,
      signatureFrancesca: true,
      caseStudiesBlock: true,
    },
  });

  if (!settings?.workflowEnabled) return result;

  const steps = await db.workflowStep.findMany({
    where: { active: true },
    orderBy: [{ stepNumber: "asc" }, { channel: "asc" }],
  });
  if (steps.length === 0) return result;

  const triggerStages = [
    ...new Set(steps.map((s) => s.triggerStage).filter(Boolean)),
  ] as string[];

  const leads = await db.lead.findMany({
    where: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pipelineStage: { in: triggerStages as any[] },
      unsubscribed: false,
      respondedAt: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      whatsappNumber: true,
      category: true,
      segment: true,
      videoLandingUrl: true,
      pipelineStage: true,
      outreachChannel: true,
      videoViewsCount: true,
      videoMaxWatchPercent: true,
      videoSentAt: true,
      lastContactedAt: true,
      respondedAt: true,
      unsubscribed: true,
      workflowExecutions: {
        select: {
          stepId: true,
          sentAt: true,
          status: true,
          step: { select: { stepNumber: true } },
        },
      },
    },
    take: 100,
  });

  const templateSettings: WorkflowSettings = {
    bookingUrl: settings.bookingUrl,
    signatureAlessio: settings.signatureAlessio,
    signatureFrancesca: settings.signatureFrancesca,
    caseStudiesBlock: settings.caseStudiesBlock,
  };

  result.processed = leads.length;

  for (const lead of leads) {
    try {
      const counters = await runStepsForLeadWithCounters(
        lead,
        steps,
        templateSettings
      );
      result.autoSent += counters.autoSent;
      result.tasksCreated += counters.tasksCreated;
      result.skipped += counters.skipped;
    } catch (err) {
      console.error(`[workflow-engine] Error lead ${lead.id}:`, err);
      result.skipped++;
    }
  }

  return result;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LeadForWorkflow = any;

async function runStepsForLead(
  lead: LeadForWorkflow,
  steps: WorkflowStep[],
  templateSettings: WorkflowSettings
): Promise<number> {
  const { autoSent, tasksCreated } = await runStepsForLeadWithCounters(
    lead,
    steps,
    templateSettings
  );
  return autoSent + tasksCreated;
}

async function runStepsForLeadWithCounters(
  lead: LeadForWorkflow,
  steps: WorkflowStep[],
  templateSettings: WorkflowSettings
): Promise<{ autoSent: number; tasksCreated: number; skipped: number }> {
  const result = { autoSent: 0, tasksCreated: 0, skipped: 0 };

  const videoWatched =
    (lead.videoViewsCount ?? 0) > 0 || (lead.videoMaxWatchPercent ?? 0) > 0;
  const leadChannel =
    lead.outreachChannel === "WA" ? "whatsapp" : "email";
  const executedStepIds = new Set<string>(
    lead.workflowExecutions.map((e: { stepId: string }) => e.stepId)
  );

  const candidateSteps = steps.filter((s) => {
    if (s.triggerStage !== lead.pipelineStage) return false;
    if (s.channel !== leadChannel) return false;
    if (executedStepIds.has(s.id)) return false;
    if (s.condition === "video_watched" && !videoWatched) return false;
    if (s.condition === "video_not_watched" && videoWatched) return false;
    return true;
  });

  if (candidateSteps.length === 0) {
    result.skipped++;
    return result;
  }

  const step = candidateSteps[0];

  // Verifica delay
  let referenceDate: Date | null = null;
  if (step.stepNumber === 1) {
    referenceDate = lead.videoSentAt;
  } else {
    const prevExec = lead.workflowExecutions
      .filter(
        (e: {
          sentAt: Date | null;
          step: { stepNumber: number };
        }) => e.step.stepNumber < step.stepNumber && e.sentAt
      )
      .sort(
        (
          a: { sentAt: Date | null },
          b: { sentAt: Date | null }
        ) => b.sentAt!.getTime() - a.sentAt!.getTime()
      );
    referenceDate = prevExec[0]?.sentAt || lead.lastContactedAt;
  }

  if (!referenceDate) {
    result.skipped++;
    return result;
  }

  const daysSince = Math.floor(
    (Date.now() - referenceDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysSince < step.delayDays) {
    result.skipped++;
    return result;
  }

  const renderedBody = renderTemplate(
    step.body,
    lead,
    templateSettings,
    step
  );
  const renderedSubject = step.subject
    ? renderTemplate(step.subject, lead, templateSettings, step)
    : null;

  // AUTO + EMAIL → invio diretto
  if (step.mode === "auto" && step.channel === "email" && lead.email) {
    const sent = await sendOutreachEmail(
      lead.email,
      renderedSubject || `Analisi per ${lead.name}`,
      renderedBody,
      lead.id,
      {
        fromName: step.fromName || undefined,
        fromEmail: step.fromEmail || undefined,
      }
    );

    await db.$transaction([
      db.workflowExecution.create({
        data: {
          stepId: step.id,
          leadId: lead.id,
          status: sent ? "sent" : "failed",
          sentAt: sent ? new Date() : null,
          error: sent ? null : "SMTP error",
        },
      }),
      db.activity.create({
        data: {
          leadId: lead.id,
          type: "EMAIL_OUTREACH",
          notes: `[Auto Workflow Step ${step.stepNumber}] ${step.name} → ${lead.email}`,
        },
      }),
      ...(sent && step.nextStage
        ? [
            db.lead.update({
              where: { id: lead.id },
              data: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                pipelineStage: step.nextStage as any,
                lastContactedAt: new Date(),
              },
            }),
          ]
        : []),
    ]);

    if (sent) result.autoSent++;
    return result;
  }

  // MANUAL o WA AUTO → crea Task
  const taskTitle =
    step.mode === "auto"
      ? `WA Auto: ${step.name} — ${lead.name}`
      : `Workflow: ${step.name} — ${lead.name}`;

  let taskDescription = renderedBody;
  if (step.channel === "whatsapp") {
    const phone = lead.whatsappNumber || lead.phone || "";
    const cleanPhone = phone.replace(/\D/g, "");
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
      renderedBody
    )}`;
    taskDescription = `${renderedBody}\n\n---\nLink WA: ${waUrl}`;
  }
  if (step.channel === "email" && renderedSubject) {
    taskDescription = `Oggetto: ${renderedSubject}\n\n${renderedBody}`;
  }

  const task = await db.task.create({
    data: {
      leadId: lead.id,
      title: taskTitle,
      description: taskDescription,
      dueAt: new Date(),
    },
  });

  await db.workflowExecution.create({
    data: {
      stepId: step.id,
      leadId: lead.id,
      status: "pending",
      taskId: task.id,
    },
  });

  result.tasksCreated++;
  return result;
}
