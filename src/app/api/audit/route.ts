import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runFullAudit } from "@/lib/audit";
import { detectCommercialSignals, assignCommercialTag } from "@/lib/commercial";
import { Prisma, CommercialTag } from "@prisma/client";
import type { CommercialSignals, AdsEvidenceLevel } from "@/types/commercial";

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

    // Marca come running
    await db.lead.update({
      where: { id: leadId },
      data: { auditStatus: "RUNNING" },
    });

    try {
      // 1. Esegui audit tecnico
      const result = await runFullAudit({
        website: lead.website,
        googleRating: lead.googleRating ? Number(lead.googleRating) : null,
        googleReviewsCount: lead.googleReviewsCount,
      });

      // 2. Fetch HTML per analisi commerciale
      let commercialResult: {
        signals: CommercialSignals;
        tagResult: {
          tag: "ADS_ATTIVE_CONTROLLO_ASSENTE" | "TRAFFICO_SENZA_DIREZIONE" | "STRUTTURA_OK_NON_PRIORITIZZATA" | "NON_TARGET";
          tagReason: string;
          isCallable: boolean;
          priority: 1 | 2 | 3 | 4;
        };
      } = {
        signals: {
          adsEvidence: "none" as AdsEvidenceLevel,
          adsEvidenceReason: "Analisi non completata",
          trackingPresent: false,
          consentModeV2: "uncertain",
          ctaClear: false,
          offerFocused: false,
          analyzedAt: new Date().toISOString(),
        },
        tagResult: {
          tag: "NON_TARGET",
          tagReason: "Analisi non completata",
          isCallable: false,
          priority: 4,
        },
      };

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

          // Rileva segnali commerciali
          const signals = await detectCommercialSignals({
            html,
            domain,
            brandName: lead.name || domain.split(".")[0],
            skipSerp: true, // Skip SERP per velocità
          });

          // Assegna tag commerciale
          const tagResult = assignCommercialTag({ signals });

          commercialResult = { signals, tagResult };
        }
      } catch (commercialError) {
        console.error("[AUDIT] Errore analisi commerciale:", commercialError);
      }

      // 3. Salva tutto
      await db.lead.update({
        where: { id: leadId },
        data: {
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
          // Pipeline
          pipelineStage: commercialResult.tagResult.isCallable ? "TO_CALL" : "NEW",
        },
      });

      return NextResponse.json({
        success: true,
        leadId,
        score: result.opportunityScore,
        issues: result.issues,
        commercialTag: commercialResult.tagResult.tag,
        isCallable: commercialResult.tagResult.isCallable,
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

      return NextResponse.json(
        {
          error: "Audit failed",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }
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
      });
    }

    let processed = 0;
    let failed = 0;
    const results: Array<{ id: string; name: string; status: string; tag?: string }> = [];

    // Processa ogni lead in sequenza
    for (const lead of leads) {
      try {
        // Marca come running
        await db.lead.update({
          where: { id: lead.id },
          data: { auditStatus: "RUNNING" },
        });

        // Esegui audit tecnico
        const result = await runFullAudit({
          website: lead.website!,
          googleRating: lead.googleRating ? Number(lead.googleRating) : null,
          googleReviewsCount: lead.googleReviewsCount,
        });

        // Analisi commerciale
        let commercialResult: {
          signals: CommercialSignals;
          tagResult: {
            tag: "ADS_ATTIVE_CONTROLLO_ASSENTE" | "TRAFFICO_SENZA_DIREZIONE" | "STRUTTURA_OK_NON_PRIORITIZZATA" | "NON_TARGET";
            tagReason: string;
            isCallable: boolean;
            priority: 1 | 2 | 3 | 4;
          };
        } = {
          signals: {
            adsEvidence: "none" as AdsEvidenceLevel,
            adsEvidenceReason: "Analisi non completata",
            trackingPresent: false,
            consentModeV2: "uncertain",
            ctaClear: false,
            offerFocused: false,
            analyzedAt: new Date().toISOString(),
          },
          tagResult: {
            tag: "NON_TARGET",
            tagReason: "Analisi non completata",
            isCallable: false,
            priority: 4,
          },
        };

        try {
          let url = lead.website!;
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
        } catch {
          // Ignora errori commerciali, usa default
        }

        // Salva risultati
        await db.lead.update({
          where: { id: lead.id },
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
            pipelineStage: commercialResult.tagResult.isCallable ? "TO_CALL" : "NEW",
          },
        });

        processed++;
        results.push({
          id: lead.id,
          name: lead.name || "N/A",
          status: "completed",
          tag: commercialResult.tagResult.tag,
        });
      } catch (error) {
        failed++;
        await db.lead.update({
          where: { id: lead.id },
          data: { auditStatus: "FAILED" },
        });
        results.push({
          id: lead.id,
          name: lead.name || "N/A",
          status: "failed",
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${processed} leads, ${failed} failed`,
      processed,
      failed,
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
