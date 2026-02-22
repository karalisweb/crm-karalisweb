import { inngest } from "../client";
import { db } from "@/lib/db";
import { runFullAudit } from "@/lib/audit";
import { detectCommercialSignals, assignCommercialTag } from "@/lib/commercial";
import { Prisma, CommercialTag, PipelineStage } from "@prisma/client";

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
    const { leadId, website, googleRating, googleReviewsCount, brandName } = event.data;

    // Step 1: Marca il lead come "running"
    await step.run("mark-running", async () => {
      await db.lead.update({
        where: { id: leadId },
        data: { auditStatus: "RUNNING" },
      });
    });

    // Step 2: Esegui l'audit tecnico (se debug mode attivo, altrimenti minimale)
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

    // Step 3: Rileva segnali commerciali (i 5 segnali essenziali)
    const commercialResult = await step.run("detect-commercial-signals", async () => {
      try {
        // Fetch HTML per analisi commerciale
        let url = website;
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
          url = "https://" + url;
        }

        const response = await fetch(url, {
          signal: AbortSignal.timeout(15000),
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status}`);
        }

        const html = await response.text();
        const domain = new URL(url).hostname;

        // Rileva i 5 segnali commerciali
        const signals = await detectCommercialSignals({
          html,
          domain,
          brandName: brandName || domain.split(".")[0],
          skipSerp: false, // Esegui anche check SERP
        });

        // Assegna tag commerciale
        const tagResult = assignCommercialTag({ signals });

        return {
          signals,
          tagResult,
        };
      } catch (error) {
        console.error("[COMMERCIAL] Errore rilevamento segnali:", error);
        // Fallback: NON_TARGET se non riusciamo ad analizzare
        return {
          signals: {
            adsEvidence: "none" as const,
            adsEvidenceReason: `Errore analisi: ${error instanceof Error ? error.message : "unknown"}`,
            trackingPresent: false,
            consentModeV2: "uncertain" as const,
            ctaClear: false,
            offerFocused: false,
            analyzedAt: new Date().toISOString(),
            errors: [error instanceof Error ? error.message : "unknown"],
          },
          tagResult: {
            tag: "NON_TARGET" as const,
            tagReason: `Analisi fallita: ${error instanceof Error ? error.message : "unknown"}`,
            isCallable: false,
            priority: 4 as const,
          },
        };
      }
    });

    // Step 4: Salva tutti i risultati
    await step.run("save-results", async () => {
      // Determina il pipelineStage: Daniela decide, l'app pre-filtra solo NON_TARGET
      let newPipelineStage: PipelineStage;
      if (commercialResult.tagResult.tag === "NON_TARGET") {
        newPipelineStage = PipelineStage.NON_TARGET;
      } else if (commercialResult.tagResult.isCallable) {
        // Tutti i lead callable vanno a Daniela per la qualificazione
        newPipelineStage = PipelineStage.DA_QUALIFICARE;
      } else {
        // Fallback: da qualificare comunque (Daniela decide)
        newPipelineStage = PipelineStage.DA_QUALIFICARE;
      }

      await db.lead.update({
        where: { id: leadId },
        data: {
          // Audit tecnico
          auditStatus: "COMPLETED",
          auditCompletedAt: new Date(),
          opportunityScore: result.opportunityScore,
          auditData: result.auditData as unknown as Prisma.InputJsonValue,
          talkingPoints: result.talkingPoints,

          // Segnali commerciali
          commercialTag: commercialResult.tagResult.tag as CommercialTag,
          commercialTagReason: commercialResult.tagResult.tagReason,
          commercialSignals: commercialResult.signals as unknown as Prisma.InputJsonValue,
          commercialPriority: commercialResult.tagResult.priority,
          isCallable: commercialResult.tagResult.isCallable,

          // Pipeline: routing a qualificazione
          pipelineStage: newPipelineStage,
        },
      });
    });

    return {
      leadId,
      score: result.opportunityScore,
      issues: result.issues.length,
      commercialTag: commercialResult.tagResult.tag,
      isCallable: commercialResult.tagResult.isCallable,
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
          name: true,
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
          brandName: lead.name, // Passa il nome per la ricerca SERP
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
