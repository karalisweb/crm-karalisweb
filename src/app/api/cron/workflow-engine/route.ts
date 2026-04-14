import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { processBatchWorkflow } from "@/lib/workflow-engine";

/**
 * POST /api/cron/workflow-engine
 *
 * Cron giornaliero che esegue il workflow email/WA.
 * - Legge tutti i lead in uno dei triggerStage attivi
 * - Esclude chi ha risposto (respondedAt != null) o e' unsubscribed
 * - Per ciascuno prova a eseguire il prossimo step disponibile
 *
 * Fase 2: segnalazioni LinkedIn + Telefono per lead in FOLLOW_UP_2 (workflow email completato).
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const batchResult = await processBatchWorkflow();

    // ========================================
    // FASE 2: Segnalazioni LinkedIn + Telefono
    // Per lead in FOLLOW_UP_2 (workflow email completato)
    // ========================================
    let linkedinTasks = 0;
    let phoneTasks = 0;

    const postWorkflowLeads = await db.lead.findMany({
      where: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pipelineStage: "FOLLOW_UP_2" as any,
        unsubscribed: false,
        respondedAt: null,
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

      if (
        lead.phone &&
        !existingTitles.some(
          (t) => t.includes("Chiama") || t.includes("Telefon")
        )
      ) {
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
      ...batchResult,
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
