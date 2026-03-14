/**
 * API di Test - Solo in Development
 * Endpoint per testare le funzionalità del CRM senza autenticazione
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { startGoogleMapsSearch } from "@/lib/apify";
import { isMockMode } from "@/lib/apify-mock";
import { extractStrategicData } from "@/lib/audit/strategic-extractor";

export async function GET() {
  // Solo in development
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Only available in development" }, { status: 403 });
  }

  try {
    const [leadsCount, searchesCount, usersCount] = await Promise.all([
      db.lead.count(),
      db.search.count(),
      db.user.count(),
    ]);

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
        "POST /api/test (action: search)": "Esegue una ricerca mock",
        "POST /api/test (action: audit)": "Esegue estrazione strategica su un sito",
        "POST /api/test (action: leads)": "Lista tutti i lead",
        "POST /api/test (action: pipeline)": "Statistiche pipeline",
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
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Only available in development" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case "search": {
        const { query = "Ristoranti", location = "Milano", limit = 5 } = params;
        const result = await startGoogleMapsSearch({ query, location, limit });

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

        return NextResponse.json({ action: "search", result, search });
      }

      case "audit": {
        // Esegue estrazione strategica su un sito
        const { website = "https://example.com", name = "Test Azienda" } = params;

        let url = website;
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
          url = "https://" + url;
        }

        const response = await fetch(url, {
          signal: AbortSignal.timeout(15000),
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const html = await response.text();
        const baseUrl = new URL(url).origin;

        const strategicData = await extractStrategicData(html, baseUrl, name);

        return NextResponse.json({
          action: "audit",
          website,
          strategicData,
        });
      }

      case "leads": {
        const { limit = 20, stage } = params;

        const leads = await db.lead.findMany({
          take: limit,
          where: stage ? { pipelineStage: stage } : undefined,
          orderBy: { createdAt: "desc" },
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
          },
        });

        return NextResponse.json({ action: "leads", count: leads.length, leads });
      }

      case "pipeline": {
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
