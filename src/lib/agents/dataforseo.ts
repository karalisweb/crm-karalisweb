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

/** Errori passeggeri di Google lato DataForSEO ("Internal SE Server Error"): si riprova. */
function passeggero(err: unknown): boolean {
  return err instanceof Error && /\((40101|50000|50301)\)|Internal SE Server Error|risponde 5\d\d/.test(err.message);
}

/**
 * v3.135 (2026-11-19): dall'8 novembre i risultati di Google arrivano con link "google.com/goto?url=…" invece
 * dell'indirizzo vero. Il CRM non riconosceva più nessun profilo LinkedIn/Instagram (aziende mollate per "nessun
 * profilo"), né il sito di un'azienda. Il link si segue fino all'indirizzo vero.
 */
export const linkDiGoogle = (url: string) => /^https?:\/\/(www\.)?google\.[a-z.]+\/(goto|url)\?/i.test(url);

/** L'indirizzo vero dietro un link di Google; null se non si riesce a seguirlo. */
export async function linkVero(url: string): Promise<string | null> {
  let u = url;
  for (let salto = 0; salto < 4 && linkDiGoogle(u); salto++) {
    // "/url?q=https://…": l'indirizzo è già scritto nel link.
    const q = new URL(u).searchParams;
    const scritto = [q.get("q"), q.get("url")].find((x) => !!x && /^https?:\/\//i.test(x));
    if (scritto) { u = scritto; continue; }
    try {
      const r = await fetch(u, { redirect: "manual", headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" }, signal: AbortSignal.timeout(8000) });
      const dove = r.headers.get("location");
      if (!dove) return null;
      u = new URL(dove, u).toString();
    } catch {
      return null;
    }
  }
  return linkDiGoogle(u) ? null : u;
}

/** Nei risultati organici sostituisce i link di Google con l'indirizzo vero (url e dominio). */
export async function sistemaLinkGoogle(result: unknown): Promise<void> {
  const items = (result as { items?: unknown } | null)?.items;
  if (!Array.isArray(items)) return;
  await Promise.all(items.map(async (it: { url?: unknown; domain?: unknown }) => {
    if (typeof it?.url !== "string" || !linkDiGoogle(it.url)) return;
    const vero = await linkVero(it.url);
    if (!vero) return;
    it.url = vero;
    it.domain = new URL(vero).hostname;
  }));
}

export async function chiamaDataForSeo<T>(percorso: string, task: Record<string, unknown>): Promise<EsitoDataForSeo<T>> {
  for (let tentativo = 1; ; tentativo++) {
    try {
      const esito = await chiamaUnaVolta<T>(percorso, task);
      if (percorso.includes("/serp/google/organic/")) await sistemaLinkGoogle(esito.result);
      return esito;
    } catch (err) {
      if (tentativo >= 3 || !passeggero(err)) throw err;
      await new Promise((r) => setTimeout(r, 2000 * tentativo));
    }
  }
}

async function chiamaUnaVolta<T>(percorso: string, task: Record<string, unknown>): Promise<EsitoDataForSeo<T>> {
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
  // Risultati parziali (alcune pagine di Google non lette): si usa quello che è arrivato.
  if (t && t.status_code !== 20000 && t.status_code !== 40102 && t.result?.[0] && /partial results/i.test(t.status_message ?? "")) {
    return { result: t.result[0] as T, costCents: usdInCentesimiEuro(Number(t.cost) || 0) };
  }
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
