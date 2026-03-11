import { inngest } from "../client";
import { db } from "@/lib/db";
import {
  startGoogleMapsSearch,
  getSearchResults,
  importSearchResults,
  checkRunStatus,
} from "@/lib/apify";
import { isMockMode } from "@/lib/apify-mock";

const SEARCHES_PER_NIGHT = 2;

/**
 * Cron notturno: esegue N ricerche programmate dalla coda.
 * Ogni notte alle 2:00, prende le prime SEARCHES_PER_NIGHT ricerche QUEUED
 * e le esegue tramite Apify (Google Maps Scraper).
 */
export const runScheduledSearchesFunction = inngest.createFunction(
  {
    id: "run-scheduled-searches",
    name: "Run Scheduled Searches (Nightly)",
    retries: 1,
  },
  { cron: "0 2 * * *" },
  async ({ step }) => {
    // Step 1: Trova le prossime ricerche da eseguire
    const searches = await step.run("find-queued-searches", async () => {
      return db.scheduledSearch.findMany({
        where: { status: "QUEUED" },
        orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
        take: SEARCHES_PER_NIGHT,
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

    // Step 2: Esegui ogni ricerca sequenzialmente
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
              limit: 50,
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
