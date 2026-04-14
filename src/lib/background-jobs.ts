import PQueue from "p-queue";
import { db } from "@/lib/db";
import { extractStrategicData } from "@/lib/audit/strategic-extractor";
import { extractWhatsAppNumber, normalizePhoneForWhatsApp } from "@/lib/audit/whatsapp-extractor";
import { isGeminiConfigured } from "@/lib/gemini";
import { runGeminiAnalysis } from "@/lib/gemini-analysis";
import { runAnalystPrompt } from "@/lib/gemini-analyst";
import { runScriptwriterPrompt } from "@/lib/gemini-scriptwriter";
import { generateReadingScriptForLead } from "@/lib/gemini-reading-script";
import { Prisma, PipelineStage } from "@prisma/client";
import { validatePublicUrl } from "@/lib/url-validator";

// Code singleton per concurrency control - sopravvivono nel processo Node
const auditQueue = new PQueue({ concurrency: 10 });
const geminiQueue = new PQueue({ concurrency: 3 });
const videoScriptQueue = new PQueue({ concurrency: 2 });

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
 * Esegue l'intera pipeline video-script per un lead:
 * 1. Analista (rianalizza il sito + pain points)
 * 2. Auto-approva l'analista
 * 3. Sceneggiatore (genera i 5 atti teleprompter)
 * 4. Auto-approva lo script
 *
 * Usata sia per auto-trigger all'ingresso in FARE_VIDEO, sia per
 * il bottone manuale "Rifai tutto".
 */
export async function processFullVideoScript(leadId: string): Promise<void> {
  if (!isGeminiConfigured()) {
    console.warn(`[VIDEO_SCRIPT] Gemini non configurato, skip lead ${leadId}`);
    return;
  }

  const lead = await db.lead.findUnique({
    where: { id: leadId },
    select: { id: true, name: true, website: true, auditStatus: true },
  });

  if (!lead) return;
  if (!lead.website) {
    console.warn(`[VIDEO_SCRIPT] ${lead.name} senza sito, skip`);
    return;
  }
  if (lead.auditStatus !== "COMPLETED") {
    console.warn(`[VIDEO_SCRIPT] ${lead.name} audit non completato (${lead.auditStatus}), skip`);
    return;
  }

  try {
    // 1. Analista
    console.log(`[VIDEO_SCRIPT] ${lead.name} — step 1: analista`);
    const analystOutput = await runAnalystPrompt(leadId);

    // 2. Auto-approva analista + salva pain points
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const analystData = analystOutput as any;
    await db.lead.update({
      where: { id: leadId },
      data: {
        analystOutput: analystOutput as unknown as Prisma.InputJsonValue,
        analystApprovedAt: new Date(),
        analystApprovedBy: "auto",
        puntoDoloreBreve: analystData?.punto_dolore_breve || null,
        puntoDoloreLungo: analystData?.punto_dolore_lungo || null,
        scriptApprovedAt: null,
        scriptApprovedBy: null,
      },
    });

    // 3. Scriptwriter
    console.log(`[VIDEO_SCRIPT] ${lead.name} — step 2: scriptwriter`);
    const scriptOutput = await runScriptwriterPrompt(leadId);

    // 4. Auto-approva script
    await db.lead.update({
      where: { id: leadId },
      data: {
        geminiAnalysis: scriptOutput as unknown as Prisma.InputJsonValue,
        geminiAnalyzedAt: new Date(),
        scriptApprovedAt: new Date(),
        scriptApprovedBy: "auto",
      },
    });

    // 5. Genera anche lo script di lettura per Tella (best-effort)
    try {
      console.log(`[VIDEO_SCRIPT] ${lead.name} — step 3: reading script Tella`);
      await generateReadingScriptForLead(leadId);
    } catch (err) {
      // Non bloccare il flusso se reading-script fallisce (es. quota Gemini)
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[VIDEO_SCRIPT] ${lead.name} — reading script fallito (non bloccante): ${errMsg}`);
    }

    console.log(`[VIDEO_SCRIPT] ${lead.name} — completato`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[VIDEO_SCRIPT] ${lead.name} fallito: ${msg}`);
    throw error;
  }
}

/**
 * Accoda il job video-script per un singolo lead (fire-and-forget).
 */
export function enqueueVideoScriptGeneration(leadId: string): void {
  videoScriptQueue.add(() => processFullVideoScript(leadId)).catch((err) => {
    console.error(`[VIDEO_SCRIPT] Errore accodato per ${leadId}:`, err);
  });
}

/**
 * Trova tutti i lead in FARE_VIDEO con audit completato ma senza
 * uno script teleprompter valido, e li accoda per la generazione.
 * Ritorna gli ID accodati.
 */
export async function processBatchVideoScripts(): Promise<string[]> {
  const candidates = await db.lead.findMany({
    where: {
      pipelineStage: PipelineStage.FARE_VIDEO,
      auditStatus: "COMPLETED",
      website: { not: null },
    },
    select: {
      id: true,
      name: true,
      geminiAnalysis: true,
    },
  });

  const toProcess = candidates.filter((c) => {
    const analysis = c.geminiAnalysis as Record<string, unknown> | null;
    // Manca del tutto
    if (!analysis) return true;
    // Manca il teleprompter_script (potrebbe avere solo vecchia analisi)
    if (
      typeof analysis !== "object" ||
      !("teleprompter_script" in analysis) ||
      !analysis.teleprompter_script
    ) {
      return true;
    }
    return false;
  });

  console.log(
    `[VIDEO_SCRIPT] Batch: ${toProcess.length}/${candidates.length} lead FARE_VIDEO da processare`
  );

  for (const lead of toProcess) {
    enqueueVideoScriptGeneration(lead.id);
  }

  return toProcess.map((l) => l.id);
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
