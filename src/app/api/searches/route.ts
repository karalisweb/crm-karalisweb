import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { startGoogleMapsSearch, getSearchResults, importSearchResults, checkRunStatus } from "@/lib/apify";

export async function GET() {
  try {
    const searches = await db.search.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(searches);
  } catch (error) {
    console.error("Error fetching searches:", error);
    return NextResponse.json(
      { error: "Failed to fetch searches" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, location, limit = 50 } = body;

    if (!query || !location) {
      return NextResponse.json(
        { error: "Query and location are required" },
        { status: 400 }
      );
    }

    // La funzione startGoogleMapsSearch gestisce automaticamente
    // la modalità mock quando APIFY_TOKEN non è configurato

    // Avvia ricerca (reale o mock a seconda della configurazione)
    const { runId, searchId } = await startGoogleMapsSearch({
      query,
      location,
      limit,
    });

    // In mock mode, i risultati sono già importati da startGoogleMapsSearch
    // Controlliamo se è mock mode
    const isMock = runId.startsWith("mock_run_");

    if (isMock) {
      // Mock mode: risultati già importati, recupera stats dal database
      const search = await db.search.findUnique({
        where: { id: searchId },
      });

      return NextResponse.json({
        searchId,
        runId,
        results: {
          imported: search?.leadsFound || 0,
          updated: 0,
          withWebsite: search?.leadsWithWebsite || 0,
        },
        mock: true,
      });
    }

    // Produzione: Attendi completamento (polling semplice per MVP)
    // In produzione usare webhook
    let status = await checkRunStatus(runId);
    let attempts = 0;
    const maxAttempts = 60; // 5 minuti max

    while (status === "RUNNING" && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 5000)); // 5 secondi
      status = await checkRunStatus(runId);
      attempts++;
    }

    if (status !== "SUCCEEDED") {
      await db.search.update({
        where: { id: searchId },
        data: {
          status: "FAILED",
          errorMessage: `Apify run failed with status: ${status}`,
        },
      });

      return NextResponse.json(
        { error: `Search failed: ${status}` },
        { status: 500 }
      );
    }

    // Recupera e importa risultati
    const results = await getSearchResults(runId);
    const stats = await importSearchResults(searchId, results);

    return NextResponse.json({
      searchId,
      runId,
      results: stats,
    });
  } catch (error) {
    console.error("Error starting search:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start search" },
      { status: 500 }
    );
  }
}
