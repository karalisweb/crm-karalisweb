import { inngest } from "../client";
import { db } from "@/lib/db";
import {
  startGoogleMapsSearch,
  getSearchResults,
  importSearchResults,
  checkRunStatus,
} from "@/lib/apify";
import { isMockMode } from "@/lib/apify-mock";

/**
 * Cron orario: ogni ora controlla se è l'ora configurata per le ricerche.
 * Legge i parametri (quante ricerche, a che ora, quanti lead) dal DB Settings.
 */
export const runScheduledSearchesFunction = inngest.createFunction(
  {
    id: "run-scheduled-searches",
    name: "Run Scheduled Searches (Hourly Check)",
    retries: 1,
  },
  { cron: "0 * * * *" },
  async ({ step }) => {
    // Step 1: Leggi configurazione dal DB
    const config = await step.run("load-config", async () => {
      const settings = await db.settings.findUnique({
        where: { id: "default" },
      });
      return {
        searchesPerRun: settings?.scheduledSearchesPerRun ?? 1,
        hour: settings?.scheduledSearchHour ?? 2,
        leadsPerSearch: settings?.scheduledLeadsPerSearch ?? 50,
      };
    });

    // Step 2: Controlla se è l'ora giusta
    // Il server è in UTC, le ore configurate sono in fuso orario italiano (CET/CEST)
    const currentHour = new Date().getUTCHours();
    const italianHourCET = (currentHour + 1) % 24;
    const italianHourCEST = (currentHour + 2) % 24;

    if (italianHourCET !== config.hour && italianHourCEST !== config.hour) {
      return {
        executed: 0,
        message: `Skip: ora corrente IT ~${italianHourCET}/${italianHourCEST}, configurata ${config.hour}:00`,
      };
    }

    // Step 3: Trova le prossime ricerche da eseguire
    const searches = await step.run("find-queued-searches", async () => {
      return db.scheduledSearch.findMany({
        where: { status: "QUEUED" },
        orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
        take: config.searchesPerRun,
      });
    });

    if (searches.length === 0) {
      return { executed: 0, message: "Nessuna ricerca in coda" };
    }

    const results: Array<{
      id: string;
      query: string;
      location: string;
      success: boolean;
      leadsFound?: number;
      error?: string;
    }> = [];

    // Step 4: Esegui ogni ricerca sequenzialmente
    for (const scheduled of searches) {
      // Marca come RUNNING
      await step.run(`mark-running-${scheduled.id}`, async () => {
        await db.scheduledSearch.update({
          where: { id: scheduled.id },
          data: { status: "RUNNING" },
        });
      });

      try {
        // Avvia la ricerca su Google Maps
        const { runId, searchId } = await step.run(
          `start-search-${scheduled.id}`,
          async () => {
            return startGoogleMapsSearch({
              query: scheduled.query,
              location: scheduled.location,
              limit: config.leadsPerSearch,
            });
          }
        );

        // In mock mode i risultati sono gia importati
        if (isMockMode() || runId.startsWith("mock_run_")) {
          const search = await step.run(
            `get-mock-stats-${scheduled.id}`,
            async () => {
              return db.search.findUnique({ where: { id: searchId } });
            }
          );

          await step.run(`mark-completed-${scheduled.id}`, async () => {
            await db.scheduledSearch.update({
              where: { id: scheduled.id },
              data: {
                status: "COMPLETED",
                lastRunAt: new Date(),
                searchId,
              },
            });
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

        // Produzione: polling status Apify con step.sleep
        let apifyStatus = "RUNNING";
        let attempts = 0;
        const maxAttempts = 30; // 30 * 10s = 5 min max

        while (apifyStatus === "RUNNING" && attempts < maxAttempts) {
          await step.sleep(`wait-${scheduled.id}-${attempts}`, "10s");
          apifyStatus = await step.run(
            `check-status-${scheduled.id}-${attempts}`,
            async () => {
              return checkRunStatus(runId);
            }
          );
          attempts++;
        }

        if (apifyStatus !== "SUCCEEDED") {
          throw new Error(`Apify run terminata con stato: ${apifyStatus}`);
        }

        // Importa risultati
        const stats = await step.run(
          `import-results-${scheduled.id}`,
          async () => {
            const items = await getSearchResults(runId);
            return importSearchResults(searchId, items);
          }
        );

        // Marca come completata
        await step.run(`mark-completed-${scheduled.id}`, async () => {
          await db.scheduledSearch.update({
            where: { id: scheduled.id },
            data: {
              status: "COMPLETED",
              lastRunAt: new Date(),
              searchId,
            },
          });
        });

        results.push({
          id: scheduled.id,
          query: scheduled.query,
          location: scheduled.location,
          success: true,
          leadsFound: stats.imported + stats.updated,
        });
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : "Errore sconosciuto";

        await step.run(`mark-failed-${scheduled.id}`, async () => {
          await db.scheduledSearch.update({
            where: { id: scheduled.id },
            data: {
              status: "FAILED",
              errorMessage: errMsg,
            },
          });
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

    return {
      executed: results.length,
      results,
    };
  }
);
