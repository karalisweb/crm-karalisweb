import { inngest } from "../client";
import { db } from "@/lib/db";
import { isGeminiConfigured } from "@/lib/gemini";
import { runGeminiAnalysis } from "@/lib/gemini-analysis";
import { Prisma } from "@prisma/client";
import type { AuditData } from "@/types";

/**
 * Funzione Inngest per eseguire l'analisi Gemini automatica dopo l'audit.
 * Genera il prompt HeyGen per i lead DA_QUALIFICARE.
 */
export const runGeminiFunction = inngest.createFunction(
  {
    id: "run-gemini-analysis",
    name: "Run Gemini Analysis",
    concurrency: {
      limit: 3, // Rate limit Gemini API
    },
    retries: 2,
  },
  { event: "gemini/analyze" },
  async ({ event, step }) => {
    const { leadId } = event.data;

    // Step 1: Verifica se Gemini è configurato
    const canRun = await step.run("check-config", async () => {
      if (!isGeminiConfigured()) {
        return { skip: true, reason: "Gemini API key non configurata" };
      }
      return { skip: false, reason: null };
    });

    if (canRun.skip) {
      return { leadId, skipped: true, reason: canRun.reason };
    }

    // Step 2: Carica dati lead dal DB
    const lead = await step.run("load-lead", async () => {
      return db.lead.findUnique({
        where: { id: leadId },
        select: {
          id: true,
          name: true,
          website: true,
          category: true,
          auditStatus: true,
          auditData: true,
          qualificationData: true,
          opportunityScore: true,
          commercialTag: true,
          googleRating: true,
          googleReviewsCount: true,
          geminiAnalysis: true,
        },
      });
    });

    if (!lead) {
      return { leadId, skipped: true, reason: "Lead non trovato" };
    }

    // Skip se audit non completato o sito mancante
    if (lead.auditStatus !== "COMPLETED" || !lead.auditData || !lead.website) {
      return { leadId, skipped: true, reason: "Audit non completato o sito mancante" };
    }

    // Skip se analisi Gemini già presente
    if (lead.geminiAnalysis) {
      return { leadId, skipped: true, reason: "Analisi Gemini già presente" };
    }

    // Step 3: Esegui analisi Gemini
    const analysis = await step.run("run-analysis", async () => {
      const auditData = lead.auditData as unknown as AuditData;

      return await runGeminiAnalysis({
        leadName: lead.name,
        website: lead.website!,
        category: lead.category,
        auditData,
        qualificationData: lead.qualificationData as Record<string, unknown> | null,
        opportunityScore: lead.opportunityScore,
        commercialTag: lead.commercialTag,
        googleRating: lead.googleRating ? Number(lead.googleRating) : null,
        googleReviewsCount: lead.googleReviewsCount,
      });
    });

    // Step 4: Salva risultato nel DB
    await step.run("save-analysis", async () => {
      await db.lead.update({
        where: { id: leadId },
        data: {
          geminiAnalysis: analysis as unknown as Prisma.InputJsonValue,
          geminiAnalyzedAt: new Date(),
        },
      });
    });

    return {
      leadId,
      skipped: false,
      model: analysis.model,
      hasHeygenPrompt: !!analysis.heygenPrompt,
    };
  }
);
