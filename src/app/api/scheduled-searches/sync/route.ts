import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/scheduled-searches/sync
// Genera la coda di ricerche programmate in ordine sequenziale:
//
// Ordine: subcluster priority → category order → location order
//
// Es: Infissi (pri 10) → Negozio di infissi × [Ferrara, Forlì, Modena...]
//                       → Negozio di serramenti × [Ferrara, Forlì, Modena...]
//     Edilizia Alto (pri 15) → Impresa edile × [Ferrara, Forlì, Modena...]
//     ...
//
// Wave 1: tutte le categorie attive
// Wave 2: solo subclusters con priority <= 20
// Wave 3: niente (distretti, solo ricerca manuale)

export async function POST() {
  try {
    const [categories, locations, existing] = await Promise.all([
      db.searchCategory.findMany({
        where: { active: true },
        select: { label: true, priority: true, subcluster: true, order: true },
        orderBy: [{ priority: "asc" }, { order: "asc" }],
      }),
      db.searchLocation.findMany({
        where: { active: true },
        select: { name: true, wave: true, region: true, order: true },
        orderBy: [{ wave: "asc" }, { region: "asc" }, { order: "asc" }],
      }),
      db.scheduledSearch.findMany({
        select: { id: true, query: true, location: true, status: true },
      }),
    ]);

    // Soglie priority per wave
    const wavePriorityThreshold: Record<number, number> = {
      1: 999, // Wave 1: tutte le categorie attive
      2: 20,  // Wave 2: solo infissi(10), edilizia_alto(15), impiantistica(20)
      3: 0,   // Wave 3: niente auto
    };

    // Separa location per wave
    const locationsByWave: Record<number, typeof locations> = {};
    for (const loc of locations) {
      const w = loc.wave || 1;
      if (!locationsByWave[w]) locationsByWave[w] = [];
      locationsByWave[w].push(loc);
    }

    // Genera la coda in ordine sequenziale
    // priority globale crescente: 1 = prima ricerca da eseguire
    const desiredCombos = new Map<string, { query: string; location: string; priority: number }>();
    let globalPriority = 1;

    // Per ogni categoria (già ordinata per subcluster priority → order)
    for (const cat of categories) {
      // Per ogni wave
      for (const wave of [1, 2, 3]) {
        const threshold = wavePriorityThreshold[wave] || 0;
        if (cat.priority > threshold) continue;

        const waveLocs = locationsByWave[wave] || [];
        for (const loc of waveLocs) {
          const key = `${cat.label}|||${loc.name}`;
          if (!desiredCombos.has(key)) {
            desiredCombos.set(key, {
              query: cat.label,
              location: loc.name,
              priority: globalPriority++,
            });
          }
        }
      }
    }

    // Diff con esistenti
    const existingKeys = new Set(existing.map((s) => `${s.query}|||${s.location}`));
    const toRemove = existing.filter((s) => !desiredCombos.has(`${s.query}|||${s.location}`));
    const toAdd: { query: string; location: string; priority: number }[] = [];
    for (const [key, combo] of desiredCombos) {
      if (!existingKeys.has(key)) {
        toAdd.push(combo);
      }
    }

    // Anche aggiorna le priority di quelle esistenti che rimangono
    const toUpdatePriority: { id: string; priority: number }[] = [];
    for (const ex of existing) {
      const key = `${ex.query}|||${ex.location}`;
      const desired = desiredCombos.get(key);
      if (desired) {
        toUpdatePriority.push({ id: ex.id, priority: desired.priority });
      }
    }

    // Execute
    if (toRemove.length > 0) {
      await db.scheduledSearch.deleteMany({
        where: { id: { in: toRemove.map((s) => s.id) } },
      });
    }

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

    // Update priorities (batch — max 50 per query to avoid timeout)
    for (let i = 0; i < toUpdatePriority.length; i += 50) {
      const batch = toUpdatePriority.slice(i, i + 50);
      await Promise.all(
        batch.map((u) =>
          db.scheduledSearch.update({
            where: { id: u.id },
            data: { priority: u.priority },
          })
        )
      );
    }

    const remaining = desiredCombos.size;

    return NextResponse.json({
      removed: toRemove.length,
      added: toAdd.length,
      updated: toUpdatePriority.length,
      remaining,
      removedDetails: toRemove.slice(0, 5).map((s) => `${s.query} — ${s.location}`),
      addedDetails: toAdd.slice(0, 5).map((c) => `${c.query} — ${c.location}`),
      queuePreview: Array.from(desiredCombos.values())
        .sort((a, b) => a.priority - b.priority)
        .slice(0, 10)
        .map((c, i) => `${i + 1}. ${c.query} — ${c.location}`),
    });
  } catch (error) {
    console.error("Error syncing scheduled searches:", error);
    return NextResponse.json(
      { error: "Errore nella sincronizzazione" },
      { status: 500 }
    );
  }
}
