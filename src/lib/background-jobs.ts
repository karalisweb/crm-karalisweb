import PQueue from "p-queue";
import { db } from "@/lib/db";
import { extractStrategicData } from "@/lib/audit/strategic-extractor";
import { extractWhatsAppNumber, normalizePhoneForWhatsApp } from "@/lib/audit/whatsapp-extractor";
import { isGeminiConfigured } from "@/lib/gemini";
import { runGeminiAnalysis } from "@/lib/gemini-analysis";
import { Prisma, PipelineStage } from "@prisma/client";
import { validatePublicUrl } from "@/lib/url-validator";

// Code singleton per concurrency control - sopravvivono nel processo Node
const auditQueue = new PQueue({ concurrency: 10 });
const geminiQueue = new PQueue({ concurrency: 3 });

interface LeadForAudit {
  id: string;
  name: string;
  website: string | null;
  phone: string | null;
}

/**
 * Avvia estrazione strategica in batch per tutti i lead di una ricerca (fire-and-forget).
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
      phone: true,
    },
  });

  if (leads.length === 0) {
    console.log(`[BATCH] Nessun lead da processare per ricerca ${searchId}`);
    return;
  }

  console.log(`[BATCH] Accodati ${leads.length} lead per ricerca ${searchId}`);

  for (const lead of leads) {
    auditQueue.add(() => processLeadAudit(lead)).catch((err) => {
      console.error(`[AUDIT] Errore per ${lead.name}:`, err);
    });
  }
}

/**
 * Esegue l'estrazione strategica di un singolo lead.
 */
async function processLeadAudit(lead: LeadForAudit): Promise<void> {
  const { id: leadId, website, name: brandName, phone } = lead;

  if (!website) return;

  // 1. Marca come RUNNING
  await db.lead.update({
    where: { id: leadId },
    data: { auditStatus: "RUNNING" },
  });

  // 2. Fetch HTML + estrazione strategica
  let url = website;
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }

  try {
    validatePublicUrl(url);

    const response = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const baseUrl = new URL(url).origin;

    const strategicData = await extractStrategicData(
      html,
      baseUrl,
      brandName || ""
    );

    // 3. Estrai WhatsApp dal sito (ricerca tenace)
    let whatsappNumber = extractWhatsAppNumber(html);
    let whatsappSource: string | null = null;
    if (whatsappNumber) {
      whatsappSource = "website";
    } else if (phone) {
      // Fallback: usa il telefono da Google Maps
      whatsappNumber = normalizePhoneForWhatsApp(phone);
      if (whatsappNumber) {
        whatsappSource = "google_maps";
      }
    }

    // 4. Salva risultati
    await db.lead.update({
      where: { id: leadId },
      data: {
        auditStatus: "COMPLETED",
        auditCompletedAt: new Date(),
        auditData: strategicData as unknown as Prisma.InputJsonValue,
        pipelineStage: PipelineStage.DA_ANALIZZARE,
        ...(whatsappNumber && { whatsappNumber, whatsappSource }),
      },
    });

    console.log(`[AUDIT] Completato: ${brandName}`);

    // 4. Trigger Gemini automatico
    geminiQueue.add(() => processGeminiAnalysis(leadId)).catch((err) => {
      console.error(`[GEMINI] Errore per ${brandName}:`, err);
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";

    await db.lead.update({
      where: { id: leadId },
      data: {
        auditStatus: "FAILED",
        auditData: { error: `Sito non raggiungibile: ${msg}` },
      },
    });

    console.error(`[AUDIT] Fallito per ${brandName}: ${msg}`);
  }
}

/**
 * Esegue l'analisi strategica Gemini per un lead.
 * Scarica HTML, estrae dati strategici, genera copione teleprompter.
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
      auditStatus: true,
      auditData: true,
      geminiAnalysis: true,
    },
  });

  if (!lead) return;
  if (lead.auditStatus !== "COMPLETED" || !lead.website) return;
  if (lead.geminiAnalysis) return; // Già analizzato

  // Usa i dati strategici già estratti dall'audit
  const auditData = lead.auditData as Record<string, unknown> | null;
  if (
    auditData &&
    typeof auditData === "object" &&
    "home_text" in auditData &&
    "company_name" in auditData
  ) {
    const analysis = await runGeminiAnalysis({
      company_name: auditData.company_name as string,
      home_text: auditData.home_text as string,
      about_text: (auditData.about_text as string) || null,
      services_text: (auditData.services_text as string) || null,
      ads_status: "PENDING",
    });

    await db.lead.update({
      where: { id: leadId },
      data: {
        geminiAnalysis: analysis as unknown as Prisma.InputJsonValue,
        geminiAnalyzedAt: new Date(),
      },
    });

    console.log(`[GEMINI] Analisi strategica completata per ${lead.name}`);
  }
}

/**
 * Recupera job bloccati in stato RUNNING da più di 30 minuti.
 * Resetta a PENDING per consentire un nuovo tentativo.
 */
export async function recoverStuckJobs(): Promise<number> {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

  const result = await db.lead.updateMany({
    where: {
      auditStatus: "RUNNING",
      updatedAt: { lt: thirtyMinutesAgo },
    },
    data: {
      auditStatus: "PENDING",
    },
  });

  if (result.count > 0) {
    console.log(`[RECOVERY] Recuperati ${result.count} job bloccati in RUNNING`);
  }

  return result.count;
}
