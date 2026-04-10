import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/scheduled-searches/sync
//
// Solo Wave 1. Alterna cluster Casa ↔ Microturismo ↔ Persona per subcluster.
//
// Es: Infissi (Casa, pri 10)
//       → Negozio di infissi × [Ferrara, Forlì, Modena...]
//       → Negozio di serramenti × [Ferrara, Forlì, Modena...]
//       → Fornitore di porte e finestre × [...]
//       → Installatore di finestre × [...]
//     Property Manager (Micro, pri 10)
//       → Gestore di proprietà × [Ferrara, Forlì, Modena...]
//       → Servizi gestione affitti × [...]
//       → ...
//     Edilizia Alto (Casa, pri 15)
//       → Impresa edile × [...]
//       → ...
//     Agenzie Immobiliari (Micro, pri 20)
//       → ...
//     Impiantistica (Casa, pri 20)
//       → ...
//     Strutture Ricettive (Micro, pri 30)
//       → ...
//     Arredo (Casa, pri 25)  ← micro esaurito, continua solo casa
//     Pavimenti (Casa, pri 30)
//     ...

export async function POST() {
  try {
    const [categories, locations, existing] = await Promise.all([
      db.searchCategory.findMany({
        where: { active: true },
        select: { label: true, priority: true, subcluster: true, cluster: true, order: true },
        orderBy: [{ priority: "asc" }, { order: "asc" }],
      }),
      db.searchLocation.findMany({
        where: { active: true, wave: 1 },
        select: { name: true, region: true, order: true },
        orderBy: [{ region: "asc" }, { order: "asc" }],
      }),
      db.scheduledSearch.findMany({
        select: { id: true, query: true, location: true, status: true },
      }),
    ]);

    // Raggruppa categorie per cluster → subcluster (ordinati per priority)
    type CatInfo = { label: string; order: number };
    type SubclusterBlock = { subcluster: string; cluster: string; priority: number; categories: CatInfo[] };

    const subMap = new Map<string, SubclusterBlock>();
    for (const cat of categories) {
      const key = `${cat.cluster}:${cat.subcluster}`;
      if (!subMap.has(key)) {
        subMap.set(key, {
          subcluster: cat.subcluster,
          cluster: cat.cluster,
          priority: cat.priority,
          categories: [],
        });
      }
      subMap.get(key)!.categories.push({ label: cat.label, order: cat.order });
    }

    // Ordina categorie dentro ogni subcluster per order
    for (const block of subMap.values()) {
      block.categories.sort((a, b) => a.order - b.order);
    }

    // Separa per cluster e ordina per priority
    const clusterNames = ["casa", "microturismo", "persona"];
    const clusterSubs: SubclusterBlock[][] = clusterNames.map((name) =>
      Array.from(subMap.values())
        .filter((b) => b.cluster === name)
        .sort((a, b) => a.priority - b.priority)
    );

    // Alterna tra tutti i cluster (round-robin interleave)
    const orderedBlocks: SubclusterBlock[] = [];
    const indices = clusterSubs.map(() => 0);
    let hasMore = true;
    while (hasMore) {
      hasMore = false;
      for (let c = 0; c < clusterSubs.length; c++) {
        if (indices[c] < clusterSubs[c].length) {
          orderedBlocks.push(clusterSubs[c][indices[c]++]);
          hasMore = true;
        }
      }
    }

    // Genera coda sequenziale
    const desiredCombos = new Map<string, { query: string; location: string; priority: number }>();
    let globalPriority = 1;

    for (const block of orderedBlocks) {
      for (const cat of block.categories) {
        for (const loc of locations) {
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

    // Aggiorna priority di quelle esistenti
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

    // Update priorities in batches
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

    // Preview: mostra i primi della coda con indicazione cluster
    const preview = Array.from(desiredCombos.values())
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 15)
      .map((c, i) => `${i + 1}. ${c.query} — ${c.location}`);

    // Riepilogo blocchi
    const blockSummary = orderedBlocks.map((b) =>
      `${b.cluster === "casa" ? "🏠" : b.cluster === "microturismo" ? "🏡" : "👤"} ${b.subcluster} (${b.categories.length} cat × ${locations.length} loc = ${b.categories.length * locations.length})`
    );

    return NextResponse.json({
      removed: toRemove.length,
      added: toAdd.length,
      updated: toUpdatePriority.length,
      remaining,
      blockSummary,
      queuePreview: preview,
    });
  } catch (error) {
    console.error("Error syncing scheduled searches:", error);
    return NextResponse.json(
      { error: "Errore nella sincronizzazione" },
      { status: 500 }
    );
  }
}
