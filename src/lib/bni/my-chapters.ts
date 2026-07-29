import { db } from "@/lib/db";

/**
 * Nomi dei capitoli "miei" (BniChapter.isMine), in minuscolo per confronto.
 * Serve alla classificazione: nel proprio capitolo i partner trasversali valgono
 * pieno (il collega di riferimento sono io), fuori restano moderati.
 */
export async function loadMyChapterNames(): Promise<Set<string>> {
  const rows = await db.bniChapter.findMany({ where: { isMine: true }, select: { name: true } });
  return new Set(rows.map((r) => r.name.trim().toLowerCase()));
}

export function isMyChapter(set: Set<string>, chapter?: string | null): boolean {
  return !!chapter && set.has(chapter.trim().toLowerCase());
}
