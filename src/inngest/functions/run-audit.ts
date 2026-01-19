import { inngest } from "../client";
import { db } from "@/lib/db";
import { runFullAudit } from "@/lib/audit";
import { Prisma } from "@prisma/client";

/**
 * Funzione Inngest per eseguire l'audit di un singolo lead
 */
export const runAuditFunction = inngest.createFunction(
  {
    id: "run-audit",
    name: "Run Website Audit",
    concurrency: {
      limit: 10, // Max 10 audit contemporanei
    },
    retries: 2,
  },
  { event: "audit/run" },
  async ({ event, step }) => {
    const { leadId, website, googleRating, googleReviewsCount } = event.data;

    // Step 1: Marca il lead come "running"
    await step.run("mark-running", async () => {
      await db.lead.update({
        where: { id: leadId },
        data: { auditStatus: "RUNNING" },
      });
    });

    // Step 2: Esegui l'audit
    const result = await step.run("run-audit", async () => {
      try {
        return await runFullAudit({
          website,
          googleRating,
          googleReviewsCount,
        });
      } catch (error) {
        // Se fallisce, marca come failed
        await db.lead.update({
          where: { id: leadId },
          data: {
            auditStatus: "FAILED",
            auditData: {
              error: error instanceof Error ? error.message : "Unknown error",
            },
          },
        });
        throw error;
      }
    });

    // Step 3: Salva i risultati e sposta in TO_CALL
    await step.run("save-results", async () => {
      await db.lead.update({
        where: { id: leadId },
        data: {
          auditStatus: "COMPLETED",
          auditCompletedAt: new Date(),
          opportunityScore: result.opportunityScore,
          auditData: result.auditData as unknown as Prisma.InputJsonValue,
          talkingPoints: result.talkingPoints,
          // Quando l'audit è completato, il lead è pronto per essere chiamato
          pipelineStage: "TO_CALL",
        },
      });
    });

    return {
      leadId,
      score: result.opportunityScore,
      issues: result.issues.length,
    };
  }
);

/**
 * Funzione Inngest per eseguire audit in batch per una ricerca
 */
export const runAuditBatchFunction = inngest.createFunction(
  {
    id: "run-audit-batch",
    name: "Run Audit Batch",
  },
  { event: "audit/batch" },
  async ({ event, step }) => {
    const { searchId } = event.data;

    // Trova tutti i lead della ricerca che hanno un website e audit pending
    const leads = await step.run("find-leads", async () => {
      return db.lead.findMany({
        where: {
          searchId,
          website: { not: null },
          auditStatus: "PENDING",
        },
        select: {
          id: true,
          website: true,
          googleRating: true,
          googleReviewsCount: true,
        },
      });
    });

    // Invia eventi per ogni lead
    await step.run("send-audit-events", async () => {
      const events = leads.map((lead) => ({
        name: "audit/run" as const,
        data: {
          leadId: lead.id,
          website: lead.website!,
          googleRating: lead.googleRating ? Number(lead.googleRating) : null,
          googleReviewsCount: lead.googleReviewsCount,
        },
      }));

      if (events.length > 0) {
        await inngest.send(events);
      }
    });

    return {
      searchId,
      leadsQueued: leads.length,
    };
  }
);
