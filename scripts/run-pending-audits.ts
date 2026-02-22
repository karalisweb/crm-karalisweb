/**
 * Script per eseguire audit su tutti i lead PENDING
 * Esegui con: npx tsx scripts/run-pending-audits.ts
 */

import { PrismaClient, Prisma, CommercialTag } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Load env
import { config } from "dotenv";
config();

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

const prisma = createPrismaClient();

// Pattern per riconoscere link social/non-siti-veri
const SOCIAL_PATTERNS = [
  /facebook\.com/i,
  /fb\.com/i,
  /instagram\.com/i,
  /linkedin\.com/i,
  /twitter\.com/i,
  /x\.com/i,
  /tiktok\.com/i,
  /youtube\.com/i,
  /wa\.me/i,
  /whatsapp\.com/i,
  /t\.me/i,
  /example\.com/i,
  /example\d*\.com/i,
];

function isSocialLink(url: string): boolean {
  return SOCIAL_PATTERNS.some(pattern => pattern.test(url));
}

interface CommercialSignals {
  adsEvidence: "strong" | "medium" | "weak" | "none";
  adsEvidenceReason: string;
  trackingPresent: boolean;
  consentModeV2: "yes" | "no" | "uncertain";
  ctaClear: boolean;
  offerFocused: boolean;
  analyzedAt: string;
  errors?: string[];
}

async function detectCommercialSignals(html: string, domain: string): Promise<CommercialSignals> {
  const signals: CommercialSignals = {
    adsEvidence: "none",
    adsEvidenceReason: "Nessuna evidenza di ads rilevata",
    trackingPresent: false,
    consentModeV2: "uncertain",
    ctaClear: false,
    offerFocused: false,
    analyzedAt: new Date().toISOString(),
  };

  // Check tracking
  const hasGA = /google-analytics\.com|gtag|GA-|G-\d|UA-\d/i.test(html);
  const hasGTM = /googletagmanager\.com|GTM-/i.test(html);
  const hasFBPixel = /connect\.facebook\.net|fbq\(|facebook\.com\/tr/i.test(html);
  const hasGoogleAds = /googleads\.g\.doubleclick\.net|AW-\d|gclid/i.test(html);

  signals.trackingPresent = hasGA || hasGTM || hasFBPixel;

  // Ads evidence
  if (hasGoogleAds || hasFBPixel) {
    signals.adsEvidence = "medium";
    signals.adsEvidenceReason = `Tracking pixel trovati: ${[
      hasGoogleAds && "Google Ads",
      hasFBPixel && "Facebook Pixel"
    ].filter(Boolean).join(", ")}`;
  }

  // Consent Mode
  if (/gtag.*consent|consent.*mode/i.test(html)) {
    signals.consentModeV2 = "yes";
  } else if (hasGTM || hasGA) {
    signals.consentModeV2 = "no";
  }

  // CTA
  const hasCTA = /contatt|prenota|richiedi|chiamaci|scrivi|info@|tel:|phone/i.test(html);
  signals.ctaClear = hasCTA;

  // Offer focused
  const hasOffer = /promo|offerta|sconto|gratis|free|speciale/i.test(html);
  signals.offerFocused = hasOffer;

  return signals;
}

function assignCommercialTag(signals: CommercialSignals): {
  tag: CommercialTag;
  tagReason: string;
  isCallable: boolean;
  priority: 1 | 2 | 3 | 4;
} {
  // ADS_ATTIVE_CONTROLLO_ASSENTE: hanno pixel ma non consent mode
  if (signals.adsEvidence !== "none" && signals.consentModeV2 !== "yes") {
    return {
      tag: "ADS_ATTIVE_CONTROLLO_ASSENTE",
      tagReason: `${signals.adsEvidenceReason}. Consent Mode V2 non configurato.`,
      isCallable: true,
      priority: 1,
    };
  }

  // TRAFFICO_SENZA_DIREZIONE: hanno tracking ma CTA deboli
  if (signals.trackingPresent && !signals.ctaClear) {
    return {
      tag: "TRAFFICO_SENZA_DIREZIONE",
      tagReason: "Tracking presente ma CTA non chiare o assenti",
      isCallable: true,
      priority: 2,
    };
  }

  // STRUTTURA_OK_NON_PRIORITIZZATA: struttura ok ma non prioritaria
  if (signals.trackingPresent && signals.ctaClear) {
    return {
      tag: "STRUTTURA_OK_NON_PRIORITIZZATA",
      tagReason: "Struttura base presente, non urgente",
      isCallable: true,
      priority: 3,
    };
  }

  // NON_TARGET: niente tracking
  return {
    tag: "NON_TARGET",
    tagReason: "Nessun tracking o advertising rilevato",
    isCallable: false,
    priority: 4,
  };
}

async function runAuditForLead(lead: { id: string; name: string | null; website: string; googleRating: Prisma.Decimal | null; googleReviewsCount: number | null }) {
  console.log(`\n[AUDIT] Processing: ${lead.name || lead.id} - ${lead.website}`);

  // Check social link
  if (isSocialLink(lead.website)) {
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        auditStatus: "NO_WEBSITE",
        auditData: {
          error: "Link social - non è un sito web aziendale",
          originalUrl: lead.website,
        },
      },
    });
    console.log(`  → Marcato come NO_WEBSITE (link social)`);
    return { status: "parked", reason: "social_link" };
  }

  // Marca come running
  await prisma.lead.update({
    where: { id: lead.id },
    data: { auditStatus: "RUNNING" },
  });

  let html = "";
  let fetchError: string | null = null;

  // Try to fetch
  try {
    let url = lead.website;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    const response = await fetch(url, {
      signal: AbortSignal.timeout(20000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (response.ok) {
      html = await response.text();
    } else {
      fetchError = `HTTP ${response.status}`;
    }
  } catch (error) {
    fetchError = error instanceof Error ? error.message : "Fetch failed";
    console.log(`  → Errore fetch: ${fetchError}`);
  }

  // Analisi commerciale (anche con HTML vuoto)
  let signals: CommercialSignals;
  let tagResult: ReturnType<typeof assignCommercialTag>;

  if (html) {
    const domain = new URL(lead.website.startsWith("http") ? lead.website : `https://${lead.website}`).hostname;
    signals = await detectCommercialSignals(html, domain);
    tagResult = assignCommercialTag(signals);
  } else {
    signals = {
      adsEvidence: "none",
      adsEvidenceReason: fetchError ? `Sito non raggiungibile: ${fetchError}` : "Analisi non completata",
      trackingPresent: false,
      consentModeV2: "uncertain",
      ctaClear: false,
      offerFocused: false,
      analyzedAt: new Date().toISOString(),
    };
    tagResult = {
      tag: "NON_TARGET",
      tagReason: fetchError ? `Sito non raggiungibile: ${fetchError}` : "Analisi non completata",
      isCallable: false,
      priority: 4,
    };
  }

  // Genera issues
  const issues: string[] = [];
  if (fetchError) {
    issues.push(`⚠️ Sito lento/non raggiungibile: ${fetchError}`);
  }

  // Salva risultati - SEMPRE completa
  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      auditStatus: "COMPLETED",
      auditCompletedAt: new Date(),
      opportunityScore: html ? 50 : 30, // Score più basso se non raggiungibile
      auditData: {
        partial: !html,
        error: fetchError,
        hasHtml: !!html,
      },
      talkingPoints: issues.length > 0 ? issues : ["Audit completato"],
      commercialTag: tagResult.tag,
      commercialTagReason: tagResult.tagReason,
      commercialSignals: signals as unknown as Prisma.InputJsonValue,
      commercialPriority: tagResult.priority,
      isCallable: tagResult.isCallable,
      // Pipeline MSD
      pipelineStage: tagResult.tag === "NON_TARGET"
        ? "NON_TARGET"
        : tagResult.isCallable
        ? "DA_QUALIFICARE"
        : "DA_QUALIFICARE",
    },
  });

  console.log(`  → Completato: tag=${tagResult.tag}, callable=${tagResult.isCallable}`);
  return { status: "completed", tag: tagResult.tag, fetchError };
}

async function main() {
  console.log("=== AUDIT BATCH RUNNER ===\n");

  // Trova lead PENDING
  const leads = await prisma.lead.findMany({
    where: {
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

  console.log(`Trovati ${leads.length} lead da processare\n`);

  if (leads.length === 0) {
    console.log("Nessun lead da processare.");
    return;
  }

  let completed = 0;
  let parked = 0;
  let withErrors = 0;

  for (const lead of leads) {
    if (!lead.website) continue;

    const result = await runAuditForLead({
      ...lead,
      website: lead.website,
    });

    if (result.status === "parked") {
      parked++;
    } else {
      completed++;
      if (result.fetchError) withErrors++;
    }

    // Delay tra audit per non sovraccaricare
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log("\n=== RISULTATI ===");
  console.log(`Completati: ${completed}`);
  console.log(`Parcheggiati (social): ${parked}`);
  console.log(`Con errori di fetch: ${withErrors}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
