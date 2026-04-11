import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { renderTemplate } from "@/lib/workflow-templates";
import { sendOutreachEmail } from "@/lib/email";

/**
 * POST /api/cron/workflow-engine
 *
 * Cron giornaliero che esegue il workflow email/WA.
 * Per ogni lead negli stadi VIDEO_INVIATO / FOLLOW_UP_1 / FOLLOW_UP_2:
 * - Trova il prossimo step da eseguire
 * - Verifica delay e condizioni
 * - AUTO + email → invia automaticamente
 * - AUTO + whatsapp → crea Task (WA non è automatizzabile)
 * - MANUAL → crea Task per revisione umana
 */
export async function POST(request: Request) {
  // Auth
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check globale
    const settings = await db.settings.findFirst({
      select: {
        workflowEnabled: true,
        bookingUrl: true,
        signatureAlessio: true,
        signatureFrancesca: true,
        caseStudiesBlock: true,
      },
    });

    if (!settings?.workflowEnabled) {
      return NextResponse.json({ message: "Workflow disabilitato", processed: 0 });
    }

    // Carica step attivi
    const steps = await db.workflowStep.findMany({
      where: { active: true },
      orderBy: [{ stepNumber: "asc" }, { channel: "asc" }],
    });

    if (steps.length === 0) {
      return NextResponse.json({ message: "Nessuno step attivo", processed: 0 });
    }

    // Stadi che attivano il workflow
    const triggerStages = [...new Set(steps.map((s) => s.triggerStage).filter(Boolean))] as string[];

    // Trova lead candidati
    const leads = await db.lead.findMany({
      where: {
        pipelineStage: { in: triggerStages as any[] },
        unsubscribed: false,
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
        workflowExecutions: {
          select: { stepId: true, sentAt: true, status: true, step: { select: { stepNumber: true } } },
        },
      },
      take: 100, // Batch limit
    });

    let autoSent = 0;
    let tasksCreated = 0;
    let skipped = 0;

    const templateSettings = {
      bookingUrl: settings.bookingUrl,
      signatureAlessio: settings.signatureAlessio,
      signatureFrancesca: settings.signatureFrancesca,
      caseStudiesBlock: settings.caseStudiesBlock,
    };

    for (const lead of leads) {
      try {
        const videoWatched = (lead.videoViewsCount ?? 0) > 0 || (lead.videoMaxWatchPercent ?? 0) > 0;
        const leadChannel = lead.outreachChannel === "WA" ? "whatsapp" : "email";
        const executedStepIds = new Set(lead.workflowExecutions.map((e) => e.stepId));

        // Filtra step per: stesso triggerStage, canale lead, condizione
        const candidateSteps = steps.filter((s) => {
          if (s.triggerStage !== lead.pipelineStage) return false;
          if (s.channel !== leadChannel) return false;
          if (executedStepIds.has(s.id)) return false;
          if (s.condition === "video_watched" && !videoWatched) return false;
          if (s.condition === "video_not_watched" && videoWatched) return false;
          return true;
        });

        if (candidateSteps.length === 0) {
          skipped++;
          continue;
        }

        const step = candidateSteps[0]; // Prendi il primo matching

        // Verifica delay
        let referenceDate: Date | null = null;
        if (step.stepNumber === 1) {
          referenceDate = lead.videoSentAt;
        } else {
          // Prendi la data dell'ultimo step eseguito
          const prevExec = lead.workflowExecutions
            .filter((e) => e.step.stepNumber < step.stepNumber && e.sentAt)
            .sort((a, b) => (b.sentAt!.getTime() - a.sentAt!.getTime()));
          referenceDate = prevExec[0]?.sentAt || lead.lastContactedAt;
        }

        if (!referenceDate) {
          skipped++;
          continue;
        }

        const daysSince = Math.floor((Date.now() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince < step.delayDays) {
          skipped++;
          continue;
        }

        // Renderizza template
        const renderedBody = renderTemplate(step.body, lead, templateSettings, step);
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
            { fromName: step.fromName || undefined, fromEmail: step.fromEmail || undefined },
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
                    data: { pipelineStage: step.nextStage as any, lastContactedAt: new Date() },
                  }),
                ]
              : []),
          ]);

          if (sent) autoSent++;
          continue;
        }

        // MANUAL (qualsiasi canale) o AUTO + WHATSAPP → crea Task
        const taskTitle = step.mode === "auto"
          ? `WA Auto: ${step.name} — ${lead.name}`
          : `Workflow: ${step.name} — ${lead.name}`;

        let taskDescription = renderedBody;
        if (step.channel === "whatsapp") {
          const phone = lead.whatsappNumber || lead.phone || "";
          const cleanPhone = phone.replace(/\D/g, "");
          const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(renderedBody)}`;
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

        tasksCreated++;
      } catch (leadError) {
        console.error(`[workflow-engine] Error processing lead ${lead.id}:`, leadError);
        skipped++;
      }
    }

    // ========================================
    // FASE 2: Segnalazioni LinkedIn + Telefono
    // Per lead in FOLLOW_UP_2 (workflow email completato)
    // che non hanno ancora task LinkedIn/Telefono
    // ========================================
    let linkedinTasks = 0;
    let phoneTasks = 0;

    const postWorkflowLeads = await db.lead.findMany({
      where: {
        pipelineStage: "FOLLOW_UP_2" as any,
        unsubscribed: false,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        tasks: {
          where: { completedAt: null },
          select: { title: true },
        },
      },
      take: 50,
    });

    for (const lead of postWorkflowLeads) {
      const existingTitles = lead.tasks.map((t) => t.title);

      // Task LinkedIn (se non esiste già)
      if (!existingTitles.some((t) => t.includes("LinkedIn"))) {
        await db.task.create({
          data: {
            leadId: lead.id,
            title: `🔗 Cerca su LinkedIn — ${lead.name}`,
            description: `Il workflow email è completato. Cerca ${lead.name} su LinkedIn, collegati e invia un messaggio personalizzato.`,
            dueAt: new Date(),
          },
        });
        linkedinTasks++;
      }

      // Task Telefono (se non esiste già e ha numero)
      if (lead.phone && !existingTitles.some((t) => t.includes("Chiama") || t.includes("Telefon"))) {
        await db.task.create({
          data: {
            leadId: lead.id,
            title: `📞 Chiama — ${lead.name}`,
            description: `Il workflow email è completato. Chiama ${lead.name} al ${lead.phone} per un contatto diretto.`,
            dueAt: new Date(),
          },
        });
        phoneTasks++;
      }
    }

    const summary = {
      processed: leads.length,
      autoSent,
      tasksCreated,
      skipped,
      postWorkflow: { linkedinTasks, phoneTasks },
      timestamp: new Date().toISOString(),
    };

    console.log("[workflow-engine]", summary);
    return NextResponse.json(summary);
  } catch (error) {
    console.error("[workflow-engine] Fatal error:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
