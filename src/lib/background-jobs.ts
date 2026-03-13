import PQueue from "p-queue";
import { db } from "@/lib/db";
import { runFullAudit } from "@/lib/audit";
import { detectCommercialSignals, assignCommercialTag } from "@/lib/commercial";
import { qualificaProspect } from "@/lib/qualification";
import { isGeminiConfigured } from "@/lib/gemini";
import { runGeminiAnalysis } from "@/lib/gemini-analysis";
import { Prisma, CommercialTag, PipelineStage } from "@prisma/client";
import type { AuditData } from "@/types";

// Code singleton per concurrency control - sopravvivono nel processo Node
const auditQueue = new PQueue({ concurrency: 10 });
const geminiQueue = new PQueue({ concurrency: 3 });

interface LeadForAudit {
  id: string;
  name: string;
  website: string | null;
  googleRating: Prisma.Decimal | null;
  googleReviewsCount: number | null;
}

/**
 * Avvia audit in batch per tutti i lead di una ricerca (fire-and-forget).
 * Sostituisce runAuditBatchFunction di Inngest.
 */
export async function processBatchAudits(searchId: string): Promise<void> {
  const leads = await db.lead.findMany({
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

  if (leads.length === 0) {
    console.log(`[BATCH AUDIT] Nessun lead da auditare per ricerca ${searchId}`);
    return;
  }

  console.log(`[BATCH AUDIT] Accodati ${leads.length} lead per ricerca ${searchId}`);

  for (const lead of leads) {
    auditQueue.add(() => processLeadAudit(lead)).catch((err) => {
      console.error(`[AUDIT] Errore per ${lead.name}:`, err);
    });
  }
}

/**
 * Esegue l'audit completo di un singolo lead.
 * Sostituisce runAuditFunction di Inngest.
 */
async function processLeadAudit(lead: LeadForAudit): Promise<void> {
  const { id: leadId, website, name: brandName } = lead;

  if (!website) return;

  const googleRating = lead.googleRating ? Number(lead.googleRating) : null;
  const googleReviewsCount = lead.googleReviewsCount;

  // 1. Marca come RUNNING
  await db.lead.update({
    where: { id: leadId },
    data: { auditStatus: "RUNNING" },
  });

  // 2. Audit tecnico
  let result;
  try {
    result = await runFullAudit({
      website,
      googleRating,
      googleReviewsCount,
    });
  } catch (error) {
    await db.lead.update({
      where: { id: leadId },
      data: {
        auditStatus: "FAILED",
        auditData: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      },
    });
    console.error(`[AUDIT] Audit tecnico fallito per ${brandName}:`, error);
    return;
  }

  // 3. Segnali commerciali
  let commercialResult;
  try {
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

    const signals = await detectCommercialSignals({
      html,
      domain,
      brandName: brandName || domain.split(".")[0],
      skipSerp: false,
    });

    const tagResult = assignCommercialTag({ signals });

    commercialResult = { signals, tagResult };
  } catch (error) {
    console.error("[COMMERCIAL] Errore rilevamento segnali:", error);
    commercialResult = {
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

  // 4. Qualifica prospect
  let qualificationResult = null;
  try {
    let dominio = website;
    if (dominio.startsWith("http://") || dominio.startsWith("https://")) {
      dominio = new URL(dominio).hostname;
    }
    dominio = dominio.replace(/^www\./, "");
    qualificationResult = await qualificaProspect(brandName || dominio, dominio);
  } catch (error) {
    console.error("[AUDIT] Errore qualifica prospect:", error);
  }

  // 5. Salva risultati
  let newPipelineStage: PipelineStage;
  if (commercialResult.tagResult.tag === "NON_TARGET") {
    newPipelineStage = PipelineStage.NON_TARGET;
  } else if (commercialResult.tagResult.isCallable) {
    newPipelineStage = PipelineStage.DA_QUALIFICARE;
  } else {
    newPipelineStage = PipelineStage.DA_QUALIFICARE;
  }

  await db.lead.update({
    where: { id: leadId },
    data: {
      auditStatus: "COMPLETED",
      auditCompletedAt: new Date(),
      opportunityScore: result.opportunityScore,
      auditData: result.auditData as unknown as Prisma.InputJsonValue,
      talkingPoints: result.talkingPoints,

      commercialTag: commercialResult.tagResult.tag as CommercialTag,
      commercialTagReason: commercialResult.tagResult.tagReason,
      commercialSignals: commercialResult.signals as unknown as Prisma.InputJsonValue,
      commercialPriority: commercialResult.tagResult.priority,
      isCallable: commercialResult.tagResult.isCallable,

      pipelineStage: newPipelineStage,

      ...(qualificationResult
        ? {
            qualificationScore: qualificationResult.punteggio_qualifica,
            qualificationPriority: qualificationResult.priorita,
            angoloLoom: qualificationResult.angolo_loom,
            googleAdsActive: qualificationResult.google_ads_attive,
            googleAdsCount: qualificationResult.google_ads_numero,
            metaAdsActive: qualificationResult.meta_ads_attive,
            metaAdsCount: qualificationResult.meta_ads_numero,
            metaPageName: qualificationResult.meta_pagina,
            qualificationData: qualificationResult as unknown as Prisma.InputJsonValue,
            qualificationErrors: qualificationResult.errori,
            qualificationAt: new Date(),
          }
        : {}),
    },
  });

  console.log(
    `[AUDIT] Completato: ${brandName} | Score: ${result.opportunityScore} | Tag: ${commercialResult.tagResult.tag}`
  );

  // 6. Trigger Gemini se DA_QUALIFICARE
  if (newPipelineStage === PipelineStage.DA_QUALIFICARE) {
    geminiQueue.add(() => processGeminiAnalysis(leadId)).catch((err) => {
      console.error(`[GEMINI] Errore per ${brandName}:`, err);
    });
  }
}

/**
 * Esegue l'analisi Gemini per un lead.
 * Sostituisce runGeminiFunction di Inngest.
 */
async function processGeminiAnalysis(leadId: string): Promise<void> {
  if (!isGeminiConfigured()) {
    return;
  }

  const lead = await db.lead.findUnique({
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

  if (!lead) return;
  if (lead.auditStatus !== "COMPLETED" || !lead.auditData || !lead.website) return;
  if (lead.geminiAnalysis) return;

  const auditData = lead.auditData as unknown as AuditData;

  const analysis = await runGeminiAnalysis({
    leadName: lead.name,
    website: lead.website,
    category: lead.category,
    auditData,
    qualificationData: lead.qualificationData as Record<string, unknown> | null,
    opportunityScore: lead.opportunityScore,
    commercialTag: lead.commercialTag,
    googleRating: lead.googleRating ? Number(lead.googleRating) : null,
    googleReviewsCount: lead.googleReviewsCount,
  });

  await db.lead.update({
    where: { id: leadId },
    data: {
      geminiAnalysis: analysis as unknown as Prisma.InputJsonValue,
      geminiAnalyzedAt: new Date(),
    },
  });

  console.log(`[GEMINI] Analisi completata per ${lead.name}`);
}
