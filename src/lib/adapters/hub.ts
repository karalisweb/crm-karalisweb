import { leggiSqlite } from "./sqlite";
import { prova, type DatiHub, type EsitoModulo } from "./types";

export async function leggiHub(dominio: string | null): Promise<EsitoModulo<DatiHub | null>> {
  const file = process.env.ADAPTER_HUB_DB;
  return prova(!!file && !!dominio, async () =>
    leggiSqlite(file!, (q) => {
      // `hub.projects` e una Company/Subject, non un Project (piano, 3.3).
      // Si aggancia per dominio del sito WordPress.
      const progetti = q(
        `SELECT id, name FROM projects
          WHERE lower(replace(replace(replace(coalesce(wp_url,''),'https://',''),'http://',''),'www.','')) LIKE ?
          LIMIT 1`, `${dominio!.toLowerCase()}%`) as Array<{ id: number; name: string }>;
      if (!progetti.length) return null;
      const p = progetti[0];

      const art = q(
        `SELECT count(*) tot,
                sum(CASE WHEN a.wp_post_id IS NOT NULL THEN 1 ELSE 0 END) pubblicati,
                max(a.wp_published_at) ultima
           FROM articles a
           JOIN collections c ON c.id = a.collection_id
          WHERE c.project_id = ?`, p.id) as Array<{ tot: number; pubblicati: number | null; ultima: string | null }>;

      const der = q(
        `SELECT count(*) n FROM derived_contents d
           JOIN articles a ON a.id = d.article_id
           JOIN collections c ON c.id = a.collection_id
          WHERE c.project_id = ?`, p.id) as Array<{ n: number }>;

      return {
        projectId: p.id,
        nome: p.name,
        articoli: art[0]?.tot ?? 0,
        articoliPubblicati: Number(art[0]?.pubblicati ?? 0),
        contenutiDerivati: der[0]?.n ?? 0,
        ultimaPubblicazione: art[0]?.ultima ?? null,
      } satisfies DatiHub;
    }));
}
