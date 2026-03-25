import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/scheduled-searches/sync
// Sincronizza ricerche programmate con categorie × location:
// - Wave 1 location × categorie con priority <= 25 (top subclusters)
// - Wave 2 location × categorie con priority <= 15 (solo le più importanti)
// - Wave 3: nessuna ricerca automatica
// Rimuove combo non più valide, aggiunge quelle mancanti
export async function POST() {
  try {
    const [categories, locations, existing] = await Promise.all([
      db.searchCategory.findMany({
        where: { active: true },
        select: { label: true, priority: true, subcluster: true },
        orderBy: { priority: "asc" },
      }),
      db.searchLocation.findMany({
        where: { active: true },
        select: { name: true, wave: true },
      }),
      db.scheduledSearch.findMany({
        select: { id: true, query: true, location: true, status: true },
      }),
    ]);

    // Build desired combos based on wave × priority
    const desiredCombos = new Set<string>();
    const comboList: { query: string; location: string; priority: number }[] = [];

    // Per wave, definiamo la soglia di priority massima
    const wavePriorityThreshold: Record<number, number> = {
      1: 25,  // Wave 1: infissi(10), edilizia_alto(15), impiantistica(20), arredo(25) + microturismo top
      2: 15,  // Wave 2: solo infissi(10) e edilizia_alto(15)
      3: 0,   // Wave 3: nessuna ricerca automatica
    };

    // Deduplica categorie per subcluster: prendi solo la prima (più rappresentativa) per subcluster
    const seenSubclusters = new Set<string>();
    const representativeCategories: typeof categories = [];
    for (const cat of categories) {
      if (!seenSubclusters.has(cat.subcluster)) {
        seenSubclusters.add(cat.subcluster);
        representativeCategories.push(cat);
      }
    }

    for (const loc of locations) {
      const threshold = wavePriorityThreshold[loc.wave] || 0;
      if (threshold === 0) continue;

      for (const cat of representativeCategories) {
        if (cat.priority <= threshold) {
          const key = `${cat.label}|||${loc.name}`;
          if (!desiredCombos.has(key)) {
            desiredCombos.add(key);
            comboList.push({ query: cat.label, location: loc.name, priority: cat.priority });
          }
        }
      }
    }

    // Find what to remove (exists but not desired)
    const existingKeys = new Set(existing.map((s) => `${s.query}|||${s.location}`));
    const toRemove = existing.filter((s) => !desiredCombos.has(`${s.query}|||${s.location}`));

    // Find what to add (desired but not exists)
    const toAdd = comboList.filter((c) => !existingKeys.has(`${c.query}|||${c.location}`));

    // Execute removals
    if (toRemove.length > 0) {
      await db.scheduledSearch.deleteMany({
        where: { id: { in: toRemove.map((s) => s.id) } },
      });
    }

    // Execute additions
    if (toAdd.length > 0) {
      await db.scheduledSearch.createMany({
        data: toAdd.map((c) => ({
          query: c.query,
          location: c.location,
          status: "QUEUED" as const,
          priority: c.priority,
        })),
      });
    }

    const remaining = existing.length - toRemove.length + toAdd.length;

    return NextResponse.json({
      removed: toRemove.length,
      added: toAdd.length,
      remaining,
      removedDetails: toRemove.slice(0, 10).map((s) => `${s.query} — ${s.location}`),
      addedDetails: toAdd.slice(0, 10).map((c) => `${c.query} — ${c.location}`),
    });
  } catch (error) {
    console.error("Error syncing scheduled searches:", error);
    return NextResponse.json(
      { error: "Errore nella sincronizzazione" },
      { status: 500 }
    );
  }
}
