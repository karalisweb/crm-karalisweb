import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runFullAudit } from "@/lib/audit";
import { detectCommercialSignals, assignCommercialTag } from "@/lib/commercial";
import { Prisma, CommercialTag } from "@prisma/client";
import type { CommercialSignals, AdsEvidenceLevel, CommercialTagResult } from "@/types/commercial";

/**
 * Pattern per riconoscere link social/non-siti-veri
 */
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
  /t\.me/i,         // Telegram
  /example\.com/i,  // Dati test
  /example\d*\.com/i,
];

/**
 * Verifica se un URL è un link social invece che un sito vero
 */
function isSocialLink(url: string): boolean {
  return SOCIAL_PATTERNS.some(pattern => pattern.test(url));
}

/**
 * POST /api/audit
 * Avvia un audit SINCRONO per un lead specifico
 * Esegue audit tecnico + rilevamento segnali commerciali
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leadId } = body;

    if (!leadId) {
      return NextResponse.json(
        { error: "leadId is required" },
        { status: 400 }
      );
    }

    // Trova il lead
    const lead = await db.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    if (!lead.website) {
      return NextResponse.json(
        { error: "Lead has no website" },
        { status: 400 }
      );
    }

    // Controlla se è un link social
    if (isSocialLink(lead.website)) {
      await db.lead.update({
        where: { id: leadId },
        data: {
          auditStatus: "NO_WEBSITE",
          auditData: {
            error: "Link social - non è un sito web aziendale",
            originalUrl: lead.website,
          },
        },
      });
      return NextResponse.json({
        success: true,
        leadId,
        message: "Link social spostato in parcheggiati",
        isSocialLink: true,
      });
    }

    // Marca come running
    await db.lead.update({
      where: { id: leadId },
      data: { auditStatus: "RUNNING" },
    });

    // Variabili per raccogliere risultati parziali
    let auditResult: Awaited<ReturnType<typeof runFullAudit>> | null = null;
    let auditError: string | null = null;
    let fetchError: string | null = null;

    // 1. Prova audit tecnico (può fallire per timeout)
    try {
      auditResult = await runFullAudit({
        website: lead.website,
        googleRating: lead.googleRating ? Number(lead.googleRating) : null,
        googleReviewsCount: lead.googleReviewsCount,
      });
    } catch (error) {
      auditError = error instanceof Error ? error.message : "Unknown error";
      console.error("[AUDIT] Errore audit tecnico:", auditError);
    }

    // 2. Analisi commerciale (anche se audit tecnico fallisce, proviamo a prendere HTML)
    let commercialResult: {
      signals: CommercialSignals;
      tagResult: {
        tag: CommercialTag;
        tagReason: string;
        isCallable: boolean;
        priority: number;
      };
    } = {
      signals: {
        adsEvidence: "none" as AdsEvidenceLevel,
        adsEvidenceReason: auditError ? `Sito non raggiungibile: ${auditError}` : "Analisi non completata",
        trackingPresent: false,
        consentModeV2: "uncertain",
        ctaClear: false,
        offerFocused: false,
        analyzedAt: new Date().toISOString(),
      },
      tagResult: {
        tag: "NON_TARGET" as CommercialTag,
        tagReason: auditError ? `Sito non raggiungibile: ${auditError}` : "Analisi non completata",
        isCallable: false,
        priority: 4,
      },
    };

    // Prova fetch HTML se non abbiamo già i dati
    if (!auditResult) {
      try {
        let url = lead.website;
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
          url = "https://" + url;
        }

        const response = await fetch(url, {
          signal: AbortSignal.timeout(20000), // Aumentato a 20s
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });

        if (response.ok) {
          const html = await response.text();
          const domain = new URL(url).hostname;

          const signals = await detectCommercialSignals({
            html,
            domain,
            brandName: lead.name || domain.split(".")[0],
            skipSerp: true,
          });

          const tagResult = assignCommercialTag({ signals });
          commercialResult = { signals, tagResult };
        } else {
          fetchError = `HTTP ${response.status}`;
        }
      } catch (error) {
        fetchError = error instanceof Error ? error.message : "Fetch failed";
        console.error("[AUDIT] Errore fetch HTML:", fetchError);
      }
    } else {
      // Audit tecnico OK, facciamo analisi commerciale
      try {
        let url = lead.website;
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
          url = "https://" + url;
        }

        const response = await fetch(url, {
          signal: AbortSignal.timeout(15000),
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });

        if (response.ok) {
          const html = await response.text();
          const domain = new URL(url).hostname;

          const signals = await detectCommercialSignals({
            html,
            domain,
            brandName: lead.name || domain.split(".")[0],
            skipSerp: true,
          });

          const tagResult = assignCommercialTag({ signals });
          commercialResult = { signals, tagResult };
        }
      } catch (commercialError) {
        console.error("[AUDIT] Errore analisi commerciale:", commercialError);
      }
    }

    // 3. Salva risultati - SEMPRE completa, mai FAILED per errori di fetch
    const issues = auditResult?.issues || [];
    if (auditError) {
      issues.unshift(`⚠️ Sito lento/non raggiungibile: ${auditError}`);
    }
    if (fetchError && !auditError) {
      issues.unshift(`⚠️ Errore caricamento: ${fetchError}`);
    }

    await db.lead.update({
      where: { id: leadId },
      data: {
        auditStatus: "COMPLETED",
        auditCompletedAt: new Date(),
        opportunityScore: auditResult?.opportunityScore ?? 50, // Default medio se non disponibile
        auditData: (auditResult?.auditData ?? {
          error: auditError || fetchError,
          partial: true,
        }) as unknown as Prisma.InputJsonValue,
        talkingPoints: auditResult?.talkingPoints ?? issues,
        // Segnali commerciali
        commercialTag: commercialResult.tagResult.tag as CommercialTag,
        commercialTagReason: commercialResult.tagResult.tagReason,
        commercialSignals: commercialResult.signals as unknown as Prisma.InputJsonValue,
        commercialPriority: commercialResult.tagResult.priority,
        isCallable: commercialResult.tagResult.isCallable,
        // Pipeline MSD: routing in base a tag
        pipelineStage: commercialResult.tagResult.tag === "DA_APPROFONDIRE"
          ? "DA_VERIFICARE"
          : commercialResult.tagResult.tag === "NON_TARGET"
          ? "NON_TARGET"
          : commercialResult.tagResult.isCallable
          ? "DA_CHIAMARE"
          : "NEW",
      },
    });

    return NextResponse.json({
      success: true,
      leadId,
      score: auditResult?.opportunityScore ?? 50,
      issues,
      commercialTag: commercialResult.tagResult.tag,
      isCallable: commercialResult.tagResult.isCallable,
      hadErrors: !!(auditError || fetchError),
    });
  } catch (error) {
    console.error("Error starting audit:", error);
    return NextResponse.json(
      { error: "Failed to start audit" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/audit/batch
 * Avvia audit SINCRONI per tutti i lead PENDING
 * Può filtrare per searchId opzionalmente
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { searchId, limit = 50 } = body;

    // Trova lead da processare
    const leads = await db.lead.findMany({
      where: {
        ...(searchId ? { searchId } : {}),
        website: { not: null },
        auditStatus: "PENDING",
      },
      take: limit,
      select: {
        id: true,
        name: true,
        website: true,
        googleRating: true,
        googleReviewsCount: true,
      },
    });

    if (leads.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No leads to audit",
        processed: 0,
        failed: 0,
        parked: 0,
      });
    }

    let processed = 0;
    let parked = 0; // Link social spostati
    const results: Array<{ id: string; name: string; status: string; tag?: string; reason?: string }> = [];

    // Processa ogni lead in sequenza
    for (const lead of leads) {
      // Controlla se è un link social
      if (lead.website && isSocialLink(lead.website)) {
        await db.lead.update({
          where: { id: lead.id },
          data: {
            auditStatus: "NO_WEBSITE",
            auditData: {
              error: "Link social - non è un sito web aziendale",
              originalUrl: lead.website,
            },
          },
        });
        parked++;
        results.push({
          id: lead.id,
          name: lead.name || "N/A",
          status: "parked",
          reason: "Link social",
        });
        continue;
      }

      // Marca come running
      await db.lead.update({
        where: { id: lead.id },
        data: { auditStatus: "RUNNING" },
      });

      // Variabili per raccogliere risultati
      let auditResult: Awaited<ReturnType<typeof runFullAudit>> | null = null;
      let auditError: string | null = null;

      // Esegui audit tecnico
      try {
        auditResult = await runFullAudit({
          website: lead.website!,
          googleRating: lead.googleRating ? Number(lead.googleRating) : null,
          googleReviewsCount: lead.googleReviewsCount,
        });
      } catch (error) {
        auditError = error instanceof Error ? error.message : "Unknown error";
        console.error(`[AUDIT] Errore per ${lead.name}:`, auditError);
      }

      // Analisi commerciale
      let commercialResult: {
        signals: CommercialSignals;
        tagResult: {
          tag: CommercialTag;
          tagReason: string;
          isCallable: boolean;
          priority: number;
        };
      } = {
        signals: {
          adsEvidence: "none" as AdsEvidenceLevel,
          adsEvidenceReason: auditError ? `Sito non raggiungibile: ${auditError}` : "Analisi non completata",
          trackingPresent: false,
          consentModeV2: "uncertain",
          ctaClear: false,
          offerFocused: false,
          analyzedAt: new Date().toISOString(),
        },
        tagResult: {
          tag: "NON_TARGET" as CommercialTag,
          tagReason: auditError ? `Sito non raggiungibile: ${auditError}` : "Analisi non completata",
          isCallable: false,
          priority: 4,
        },
      };

      // Prova fetch HTML per analisi commerciale
      try {
        let url = lead.website!;
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
          const html = await response.text();
          const domain = new URL(url).hostname;

          const signals = await detectCommercialSignals({
            html,
            domain,
            brandName: lead.name || domain.split(".")[0],
            skipSerp: true,
          });

          const tagResult = assignCommercialTag({ signals });
          commercialResult = { signals, tagResult };
        }
      } catch {
        // Ignora errori fetch, usa default
      }

      // Genera issues
      const issues = auditResult?.issues || [];
      if (auditError) {
        issues.unshift(`⚠️ Sito lento/non raggiungibile: ${auditError}`);
      }

      // Salva risultati - SEMPRE completa
      await db.lead.update({
        where: { id: lead.id },
        data: {
          auditStatus: "COMPLETED",
          auditCompletedAt: new Date(),
          opportunityScore: auditResult?.opportunityScore ?? 50,
          auditData: (auditResult?.auditData ?? {
            error: auditError,
            partial: true,
          }) as unknown as Prisma.InputJsonValue,
          talkingPoints: auditResult?.talkingPoints ?? issues,
          commercialTag: commercialResult.tagResult.tag as CommercialTag,
          commercialTagReason: commercialResult.tagResult.tagReason,
          commercialSignals: commercialResult.signals as unknown as Prisma.InputJsonValue,
          commercialPriority: commercialResult.tagResult.priority,
          isCallable: commercialResult.tagResult.isCallable,
          // Pipeline MSD
          pipelineStage: commercialResult.tagResult.tag === "DA_APPROFONDIRE"
            ? "DA_VERIFICARE"
            : commercialResult.tagResult.tag === "NON_TARGET"
            ? "NON_TARGET"
            : commercialResult.tagResult.isCallable
            ? "DA_CHIAMARE"
            : "NEW",
        },
      });

      processed++;
      results.push({
        id: lead.id,
        name: lead.name || "N/A",
        status: auditError ? "completed_with_errors" : "completed",
        tag: commercialResult.tagResult.tag,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${processed} leads, ${parked} parked as social links`,
      processed,
      parked,
      results,
    });
  } catch (error) {
    console.error("Error in batch audit:", error);
    return NextResponse.json(
      { error: "Failed to run batch audit" },
      { status: 500 }
    );
  }
}
