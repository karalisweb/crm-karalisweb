import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  startGoogleMapsSearch,
  getSearchResults,
  importSearchResults,
  checkRunStatus,
} from "@/lib/apify";
import { isMockMode } from "@/lib/apify-mock";
import { processBatchAudits } from "@/lib/background-jobs";

/**
 * POST /api/cron/scheduled-searches
 *
 * Endpoint cron: esegue le ricerche programmate in coda.
 * Chiamato da crontab VPS ogni ora: 0 * * * *
 * Protetto da CRON_SECRET.
 */
export async function POST(request: NextRequest) {
  // Verifica autenticazione cron
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.CRON_SECRET;

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Leggi configurazione dal DB
    const settings = await db.settings.findUnique({
      where: { id: "default" },
    });

    const config = {
      searchesPerRun: settings?.scheduledSearchesPerRun ?? 1,
      hour: settings?.scheduledSearchHour ?? 2,
      leadsPerSearch: settings?.scheduledLeadsPerSearch ?? 50,
    };

    // 2. Controlla se e' l'ora giusta (ora italiana CET/CEST)
    const currentHour = new Date().getUTCHours();
    const italianHourCET = (currentHour + 1) % 24;
    const italianHourCEST = (currentHour + 2) % 24;

    if (italianHourCET !== config.hour && italianHourCEST !== config.hour) {
      return NextResponse.json({
        executed: 0,
        message: `Skip: ora corrente IT ~${italianHourCET}/${italianHourCEST}, configurata ${config.hour}:00`,
      });
    }

    // 3. Trova ricerche in coda
    const searches = await db.scheduledSearch.findMany({
      where: { status: "QUEUED" },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      take: config.searchesPerRun,
    });

    if (searches.length === 0) {
      return NextResponse.json({ executed: 0, message: "Nessuna ricerca in coda" });
    }

    const results: Array<{
      id: string;
      query: string;
      location: string;
      success: boolean;
      leadsFound?: number;
      error?: string;
    }> = [];

    // 4. Esegui ogni ricerca sequenzialmente
    for (const scheduled of searches) {
      // Marca come RUNNING
      await db.scheduledSearch.update({
        where: { id: scheduled.id },
        data: { status: "RUNNING" },
      });

      try {
        // Avvia ricerca Google Maps
        const { runId, searchId } = await startGoogleMapsSearch({
          query: scheduled.query,
          location: scheduled.location,
          limit: config.leadsPerSearch,
        });

        // Mock mode: risultati gia' importati
        if (isMockMode() || runId.startsWith("mock_run_")) {
          const search = await db.search.findUnique({ where: { id: searchId } });

          await db.scheduledSearch.update({
            where: { id: scheduled.id },
            data: {
              status: "COMPLETED",
              lastRunAt: new Date(),
              searchId,
            },
          });

          results.push({
            id: scheduled.id,
            query: scheduled.query,
            location: scheduled.location,
            success: true,
            leadsFound: search?.leadsFound || 0,
          });
          continue;
        }

        // Produzione: polling status Apify
        let apifyStatus = "RUNNING";
        let attempts = 0;
        const maxAttempts = 30; // 30 * 10s = 5 min max

        while (apifyStatus === "RUNNING" && attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 10000));
          apifyStatus = await checkRunStatus(runId);
          attempts++;
        }

        if (apifyStatus !== "SUCCEEDED") {
          throw new Error(`Apify run terminata con stato: ${apifyStatus}`);
        }

        // Importa risultati
        const items = await getSearchResults(runId);
        const stats = await importSearchResults(searchId, items);

        // Marca come completata
        await db.scheduledSearch.update({
          where: { id: scheduled.id },
          data: {
            status: "COMPLETED",
            lastRunAt: new Date(),
            searchId,
          },
        });

        results.push({
          id: scheduled.id,
          query: scheduled.query,
          location: scheduled.location,
          success: true,
          leadsFound: stats.imported + stats.updated,
        });
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : "Errore sconosciuto";

        await db.scheduledSearch.update({
          where: { id: scheduled.id },
          data: {
            status: "FAILED",
            errorMessage: errMsg,
          },
        });

        results.push({
          id: scheduled.id,
          query: scheduled.query,
          location: scheduled.location,
          success: false,
          error: errMsg,
        });
      }
    }

    console.log(
      `[SCHEDULED SEARCH] Eseguite ${results.length} ricerche:`,
      results.map((r) => `${r.query} ${r.location}: ${r.success ? "OK" : "FAIL"}`)
    );

    return NextResponse.json({
      executed: results.length,
      results,
    });
  } catch (error) {
    console.error("[CRON] Errore scheduled searches:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore interno" },
      { status: 500 }
    );
  }
}
