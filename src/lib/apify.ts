import { ApifyClient } from "apify-client";
import { db } from "./db";
import type { GoogleMapsResult } from "@/types";
import { generateMockResults, simulateApiDelay, isMockMode } from "./apify-mock";

const apifyClient = new ApifyClient({
  token: process.env.APIFY_TOKEN,
});

// Actor ID per Google Places Scraper
const GOOGLE_PLACES_ACTOR = "compass/crawler-google-places";

interface SearchInput {
  query: string;
  location: string;
  limit?: number;
}

interface ApifyRunResult {
  runId: string;
  searchId: string;
}

/**
 * Avvia una ricerca su Google Maps tramite Apify
 * In modalità mock (senza token), genera dati di test
 */
export async function startGoogleMapsSearch({
  query,
  location,
  limit = 50,
}: SearchInput): Promise<ApifyRunResult> {
  // Crea record search nel database
  const search = await db.search.create({
    data: {
      query,
      location,
      status: "RUNNING",
    },
  });

  // MOCK MODE: Se non c'è token Apify, usa dati mock
  if (isMockMode()) {
    console.log("[MOCK MODE] Generazione dati mock per:", query, location);

    // Simula delay API
    await simulateApiDelay(1500);

    // Genera risultati mock
    const mockResults = generateMockResults(query, location, limit);

    // Importa risultati direttamente
    const importResult = await importSearchResults(search.id, mockResults);

    console.log("[MOCK MODE] Importati:", importResult);

    return {
      runId: `mock_run_${search.id}`,
      searchId: search.id,
    };
  }

  // PRODUZIONE: Usa Apify reale
  try {
    // Configura input per l'actor
    const input = {
      searchStringsArray: [`${query} ${location}`],
      maxCrawledPlacesPerSearch: limit,
      language: "it",
      includeWebResults: false,
      includeHistogram: false,
      includeOpeningHours: false,
      includePeopleAlsoSearch: false,
    };

    // Avvia l'actor
    const run = await apifyClient.actor(GOOGLE_PLACES_ACTOR).call(input);

    // Aggiorna search con run ID
    await db.search.update({
      where: { id: search.id },
      data: { apifyRunId: run.id },
    });

    return {
      runId: run.id,
      searchId: search.id,
    };
  } catch (error) {
    // Aggiorna search come fallita
    await db.search.update({
      where: { id: search.id },
      data: {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      },
    });
    throw error;
  }
}

/**
 * Recupera i risultati di una ricerca Apify completata
 * In mock mode, i risultati sono già importati durante startGoogleMapsSearch
 */
export async function getSearchResults(runId: string): Promise<GoogleMapsResult[]> {
  // MOCK MODE: I risultati sono già nel database
  if (isMockMode() || runId.startsWith("mock_run_")) {
    console.log("[MOCK MODE] Risultati già importati per run:", runId);
    return []; // I risultati sono già nel DB
  }

  // PRODUZIONE: Recupera da Apify
  const run = await apifyClient.run(runId).get();

  if (!run) {
    throw new Error("Run not found");
  }

  if (run.status !== "SUCCEEDED") {
    throw new Error(`Run status: ${run.status}`);
  }

  const dataset = await apifyClient
    .dataset(run.defaultDatasetId)
    .listItems();

  return dataset.items.map((item) => ({
    title: item.title as string,
    address: item.address as string,
    phone: (item.phone as string) || null,
    website: (item.website as string) || null,
    totalScore: (item.totalScore as number) || null,
    reviewsCount: (item.reviewsCount as number) || null,
    placeId: item.placeId as string,
    url: item.url as string,
    categoryName: (item.categoryName as string) || null,
  }));
}

/**
 * Importa i risultati della ricerca nel database
 */
export async function importSearchResults(
  searchId: string,
  results: GoogleMapsResult[]
): Promise<{ imported: number; updated: number; withWebsite: number }> {
  let imported = 0;
  let updated = 0;
  let withWebsite = 0;

  for (const result of results) {
    // Determina audit status basato su presenza website
    const auditStatus = result.website ? "PENDING" : "NO_WEBSITE";

    if (result.website) {
      withWebsite++;
    }

    // Upsert lead usando placeId come chiave
    const existingLead = result.placeId
      ? await db.lead.findUnique({ where: { placeId: result.placeId } })
      : null;

    if (existingLead) {
      // Aggiorna dati esistenti
      await db.lead.update({
        where: { id: existingLead.id },
        data: {
          googleRating: result.totalScore,
          googleReviewsCount: result.reviewsCount,
          // Non sovrascrivere website se gia presente e il nuovo e null
          ...(result.website && { website: result.website }),
        },
      });
      updated++;
    } else {
      // Crea nuovo lead
      await db.lead.create({
        data: {
          name: result.title,
          address: result.address,
          phone: result.phone,
          website: result.website,
          category: result.categoryName,
          googleRating: result.totalScore,
          googleReviewsCount: result.reviewsCount,
          googleMapsUrl: result.url,
          placeId: result.placeId,
          searchId,
          auditStatus,
          source: "google_maps",
        },
      });
      imported++;
    }
  }

  // Aggiorna statistiche search
  await db.search.update({
    where: { id: searchId },
    data: {
      status: "COMPLETED",
      leadsFound: results.length,
      leadsWithWebsite: withWebsite,
      completedAt: new Date(),
    },
  });

  return { imported, updated, withWebsite };
}

/**
 * Controlla lo stato di una run Apify
 * In mock mode, ritorna sempre SUCCEEDED
 */
export async function checkRunStatus(runId: string): Promise<string> {
  // MOCK MODE: Run sempre completata
  if (isMockMode() || runId.startsWith("mock_run_")) {
    return "SUCCEEDED";
  }

  // PRODUZIONE: Controlla stato reale
  const run = await apifyClient.run(runId).get();
  return run?.status || "UNKNOWN";
}
