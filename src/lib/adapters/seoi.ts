import { leggiSqlite } from "./sqlite";
import { prova, type DatiSeoi, type EsitoModulo } from "./types";

export async function leggiSeoi(dominio: string | null): Promise<EsitoModulo<DatiSeoi | null>> {
  const file = process.env.ADAPTER_SEOI_DB;
  return prova(!!file && !!dominio, async () =>
    leggiSqlite(file!, (q) => {
      // SEOI si aggancia per dominio: e la sua chiave naturale.
      const clienti = q(
        `SELECT id, name, domain FROM clients
          WHERE lower(replace(replace(replace(domain,'https://',''),'http://',''),'www.','')) = ?
          LIMIT 1`, dominio!.toLowerCase()) as Array<{ id: number; name: string; domain: string }>;
      if (!clienti.length) return null;
      const c = clienti[0];

      const kw = q(`SELECT count(*) n FROM keywords WHERE client_id = ? AND active = 1`,
                   c.id) as Array<{ n: number }>;

      // Ultima rilevazione per ciascuna keyword del cliente.
      const pos = q(
        `SELECT avg(r.position) media,
                sum(CASE WHEN r.position <= 10 THEN 1 ELSE 0 END) top10,
                max(r.date) ultima
           FROM rank_history r
           JOIN keywords k ON k.id = r.keyword_id
          WHERE k.client_id = ?
            AND r.date = (SELECT max(r2.date) FROM rank_history r2 WHERE r2.keyword_id = r.keyword_id)
            AND r.position IS NOT NULL`,
        c.id) as Array<{ media: number | null; top10: number | null; ultima: string | null }>;

      const audit = q(
        `SELECT technical_score FROM site_audits
          WHERE client_id = ? AND technical_score IS NOT NULL
          ORDER BY created_at DESC LIMIT 1`, c.id) as Array<{ technical_score: number }>;

      return {
        clientId: c.id,
        nome: c.name,
        dominio: c.domain,
        keywordMonitorate: kw[0]?.n ?? 0,
        posizioneMedia: pos[0]?.media != null ? Number(pos[0].media) : null,
        inTopDieci: Number(pos[0]?.top10 ?? 0),
        ultimaRilevazione: pos[0]?.ultima ?? null,
        punteggioTecnico: audit[0]?.technical_score ?? null,
      } satisfies DatiSeoi;
    }));
}
