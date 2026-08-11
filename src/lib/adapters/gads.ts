import { Pool } from "pg";
import { prova, type DatiGads, type EsitoModulo } from "./types";

/** Sola lettura sul database del modulo di rendimento. */
let pool: Pool | null = null;
function getPool(): Pool | null {
  const url = process.env.ADAPTER_GADS_URL;
  if (!url) return null;
  if (!pool) pool = new Pool({ connectionString: url, max: 2, idleTimeoutMillis: 10_000 });
  return pool;
}

export async function leggiGads(
  customerName: string | null, dominio: string | null,
): Promise<EsitoModulo<DatiGads | null>> {
  const p = getPool();
  return prova(!!p, async () => {
    // GADS non ha né place_id né dominio: si aggancia per ragione sociale
    // (vedi docs/inventory/gads.md, S-05). È un aggancio debole e dichiarato.
    if (!customerName) return null;
    const acc = await p!.query(
      `SELECT id, customer_id, customer_name, is_active
         FROM google_ads_accounts
        WHERE lower(customer_name) = lower($1)
        LIMIT 1`, [customerName]);
    if (!acc.rowCount) return null;
    const a = acc.rows[0];

    const [camp, mod, run] = await Promise.all([
      p!.query(
        `SELECT count(*)::int n,
                coalesce(sum(cost_micros),0)::bigint costo,
                coalesce(sum(conversions),0)::numeric conv
           FROM campaigns WHERE account_id = $1`, [a.id]),
      p!.query(
        `SELECT count(*)::int n FROM modifications
          WHERE account_id = $1 AND status = 'pending'`, [a.id]),
      p!.query(
        `SELECT max(started_at) ultima FROM import_runs WHERE account_id = $1`, [a.id]),
    ]);

    return {
      accountId: a.id,
      customerId: a.customer_id,
      customerName: a.customer_name,
      attivo: a.is_active,
      ultimaImportazione: run.rows[0]?.ultima ?? null,
      campagne: camp.rows[0]?.n ?? 0,
      costoTotaleEuro: Number(camp.rows[0]?.costo ?? 0) / 1_000_000,
      conversioni: Number(camp.rows[0]?.conv ?? 0),
      modifichePendenti: mod.rows[0]?.n ?? 0,
    } satisfies DatiGads;
  });
}
