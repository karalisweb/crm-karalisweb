/**
 * Client DataForSEO (SERP organiche e Google Ads Transparency).
 * Ogni chiamata restituisce anche il costo dichiarato da DataForSEO, in centesimi di euro.
 */
import { usdInCentesimiEuro } from "./costi";

const BASE = "https://api.dataforseo.com/v3";
/** Italia, lingua italiana. */
export const LOCATION_ITALIA = 2380;

export function dataForSeoConfigurato(): boolean {
  return !!(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD);
}

export interface EsitoDataForSeo<T> {
  result: T | null;
  costCents: number;
}

export async function chiamaDataForSeo<T>(percorso: string, task: Record<string, unknown>): Promise<EsitoDataForSeo<T>> {
  if (!dataForSeoConfigurato()) throw new Error("DataForSEO non configurato (DATAFORSEO_LOGIN/PASSWORD)");
  const auth = Buffer.from(`${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`).toString("base64");
  const res = await fetch(`${BASE}${percorso}`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify([task]),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`DataForSEO risponde ${res.status}`);
  const data = await res.json();
  if (data?.status_code !== 20000) throw new Error(`DataForSEO: ${data?.status_message ?? "errore"} (${data?.status_code})`);
  const t = data.tasks?.[0];
  if (!t || (t.status_code !== 20000 && t.status_code !== 40102)) {
    // 40102 = "nessun risultato": non è un errore, il risultato è vuoto.
    throw new Error(`DataForSEO: ${t?.status_message ?? "task senza risposta"} (${t?.status_code})`);
  }
  return { result: (t.result?.[0] ?? null) as T | null, costCents: usdInCentesimiEuro(Number(t.cost) || 0) };
}

/** Dominio "nudo" per i confronti: senza schema, www e percorso. */
export function dominio(url: string): string {
  return url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split(/[/?#]/)[0];
}
