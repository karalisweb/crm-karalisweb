import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/scheduled-searches/sync
// Sincronizza le ricerche programmate con categorie e location attive:
// 1. Rimuove ricerche per categorie/location non più attive
// 2. Non aggiunge combo automaticamente (l'utente le aggiunge manualmente o via seed)
export async function POST() {
  try {
    // Get active categories and locations
    const [categories, locations] = await Promise.all([
      db.searchCategory.findMany({ where: { active: true }, select: { label: true } }),
      db.searchLocation.findMany({ where: { active: true }, select: { name: true } }),
    ]);

    const activeLabels = new Set(categories.map((c) => c.label));
    const activeLocations = new Set(locations.map((l) => l.name));

    // Get all scheduled searches
    const allSearches = await db.scheduledSearch.findMany({
      select: { id: true, query: true, location: true, status: true },
    });

    // Find searches to remove: category or location no longer active
    const toRemove = allSearches.filter(
      (s) => !activeLabels.has(s.query) || !activeLocations.has(s.location)
    );

    // Remove them
    if (toRemove.length > 0) {
      await db.scheduledSearch.deleteMany({
        where: { id: { in: toRemove.map((s) => s.id) } },
      });
    }

    return NextResponse.json({
      removed: toRemove.length,
      added: 0,
      remaining: allSearches.length - toRemove.length,
      removedDetails: toRemove.map((s) => `${s.query} — ${s.location}`),
    });
  } catch (error) {
    console.error("Error syncing scheduled searches:", error);
    return NextResponse.json(
      { error: "Errore nella sincronizzazione" },
      { status: 500 }
    );
  }
}
