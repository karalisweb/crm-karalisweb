/**
 * API di Test - Solo in Development
 * Endpoint per testare le funzionalità del CRM senza autenticazione
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { startGoogleMapsSearch } from "@/lib/apify";
import { runFullAudit } from "@/lib/audit";
import { generateMSDTalkingPoints, generateMSDCallOpener } from "@/lib/audit/talking-points";
import { isMockMode } from "@/lib/apify-mock";
import { detectCommercialSignals, assignCommercialTag } from "@/lib/commercial";

export async function GET() {
  // Solo in development
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Only available in development" }, { status: 403 });
  }

  try {
    // Statistiche generali
    const [leadsCount, searchesCount, usersCount] = await Promise.all([
      db.lead.count(),
      db.search.count(),
      db.user.count(),
    ]);

    // Ultimi lead
    const recentLeads = await db.lead.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        website: true,
        auditStatus: true,
        opportunityScore: true,
        pipelineStage: true,
      },
    });

    return NextResponse.json({
      status: "ok",
      mockMode: isMockMode(),
      database: {
        connected: true,
        leads: leadsCount,
        searches: searchesCount,
        users: usersCount,
      },
      recentLeads,
      endpoints: {
        "POST /api/test/search": "Esegue una ricerca mock",
        "POST /api/test/audit": "Esegue un audit su un sito",
        "GET /api/test/leads": "Lista tutti i lead",
      },
    });
  } catch (error) {
    return NextResponse.json({
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

/**
 * POST /api/test - Esegue test specifici
 */
export async function POST(request: NextRequest) {
  // Solo in development
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Only available in development" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case "search": {
        // Esegue una ricerca mock
        const { query = "Ristoranti", location = "Milano", limit = 5 } = params;
        const result = await startGoogleMapsSearch({ query, location, limit });

        // Recupera la search con i lead creati
        const search = await db.search.findUnique({
          where: { id: result.searchId },
          include: {
            leads: {
              take: 10,
              select: {
                id: true,
                name: true,
                website: true,
                googleRating: true,
                auditStatus: true,
              },
            },
          },
        });

        return NextResponse.json({
          action: "search",
          result,
          search,
        });
      }

      case "audit": {
        // Esegue un audit su un sito specifico
        const { website = "https://example.com" } = params;

        const auditResult = await runFullAudit({
          website,
          googleRating: 4.2,
          googleReviewsCount: 50,
        });

        // Analisi segnali commerciali - riusa HTML già scaricato dall'audit
        let commercialSignals = null;
        let commercialTag = null;
        try {
          commercialSignals = await detectCommercialSignals({
            html: auditResult.html,
            domain: auditResult.domain,
            brandName: auditResult.domain.split(".")[0],
            skipSerp: true,
          });
          commercialTag = assignCommercialTag({ signals: commercialSignals });
        } catch (e) {
          console.error("Commercial signals error:", e);
        }

        // Genera MSD talking points
        const msdTalkingPoints = generateMSDTalkingPoints(commercialSignals, auditResult.auditData);
        const msdCallOpener = generateMSDCallOpener("Lead", commercialSignals, auditResult.auditData);

        return NextResponse.json({
          action: "audit",
          website,
          score: auditResult.opportunityScore,
          issues: auditResult.issues,
          // === NUOVO: MSD Talking Points ===
          msd: {
            callOpener: msdCallOpener,
            mainHook: msdTalkingPoints.mainHook,
            strategicQuestions: msdTalkingPoints.strategicQuestions,
            observations: msdTalkingPoints.observations,
            pitch: msdTalkingPoints.msdPitch,
          },
          // === Legacy talking points (deprecati) ===
          legacyTalkingPoints: auditResult.talkingPoints.slice(0, 5),
          commercialSignals,
          commercialTag: commercialTag ? {
            tag: commercialTag.tag,
            reason: commercialTag.tagReason,
            isCallable: commercialTag.isCallable,
            priority: commercialTag.priority,
          } : null,
          auditData: {
            tracking: auditResult.auditData.tracking,
            social: auditResult.auditData.social,
            content: auditResult.auditData.content,
          },
        });
      }

      case "leads": {
        // Lista tutti i lead
        const { limit = 20, stage } = params;

        const leads = await db.lead.findMany({
          take: limit,
          where: stage ? { pipelineStage: stage } : undefined,
          orderBy: { opportunityScore: "desc" },
          select: {
            id: true,
            name: true,
            website: true,
            category: true,
            googleRating: true,
            googleReviewsCount: true,
            auditStatus: true,
            opportunityScore: true,
            pipelineStage: true,
            talkingPoints: true,
          },
        });

        return NextResponse.json({
          action: "leads",
          count: leads.length,
          leads,
        });
      }

      case "pipeline": {
        // Statistiche pipeline
        const stages = await db.lead.groupBy({
          by: ["pipelineStage"],
          _count: true,
        });

        return NextResponse.json({
          action: "pipeline",
          stages: stages.map(s => ({
            stage: s.pipelineStage,
            count: s._count,
          })),
        });
      }

      default:
        return NextResponse.json({
          error: "Unknown action",
          availableActions: ["search", "audit", "leads", "pipeline"],
        }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
