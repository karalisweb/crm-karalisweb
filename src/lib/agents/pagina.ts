import { safeFetch } from "@/lib/safe-fetch";
import type { PaginaScaricata } from "./tipi";

/** Massimo HTML accettato prima del parsing (come nel resto dell'app). */
const MAX_HTML_BYTES = 5 * 1024 * 1024;

// Header da browser vero: alcuni hosting (SiteGround, Cloudflare) bloccano i client "nudi".
// Stesso set dell'audit storico (src/lib/audit/index.ts): con meno header il 35% dei siti
// risponde 403 (misurato su 20 aziende reali il 2026-10-15).
export const HEADERS_BROWSER: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  "Sec-Ch-Ua": '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"macOS"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
};

/**
 * Header minimi, come un fetch qualunque: alcuni siti (firewall dell'hosting) chiudono la connessione
 * a chi manda gli header "da browser" completi ma rispondono a una richiesta semplice
 * (Sardegna Piscine, 2026-10-18). Si usano come secondo tentativo.
 */
const HEADERS_SEMPLICI: Record<string, string> = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36",
  Accept: "text/html,*/*",
  "Accept-Language": "it-IT,it;q=0.9",
};

/** Una GET con gli header da browser e, se la connessione cade, di nuovo con quelli semplici. */
async function scaricaConRipiego(url: string, timeoutMs: number): Promise<Response> {
  try {
    return await safeFetch(url, { signal: AbortSignal.timeout(timeoutMs), headers: HEADERS_BROWSER });
  } catch {
    return safeFetch(url, { signal: AbortSignal.timeout(timeoutMs), headers: HEADERS_SEMPLICI });
  }
}

export function normalizzaSito(website: string): string {
  const w = website.trim();
  return /^https?:\/\//i.test(w) ? w : `https://${w}`;
}

/**
 * Scarica la homepage di un'azienda (SSRF-safe), con ripiego su http se https
 * non risponde. Lancia un errore leggibile se il sito non è raggiungibile.
 */
export async function scaricaPagina(website: string): Promise<PaginaScaricata> {
  let url = normalizzaSito(website);
  let res: Response;
  try {
    res = await scaricaConRipiego(url, 15000);
  } catch (err) {
    if (!url.startsWith("https://")) throw err;
    url = url.replace("https://", "http://");
    res = await scaricaConRipiego(url, 15000);
  }
  if (!res.ok) throw new Error(`Il sito risponde ${res.status}`);

  const html = await res.text();
  if (html.length > MAX_HTML_BYTES) throw new Error("Homepage troppo grande (> 5 MB)");

  const headers: Record<string, string> = {};
  res.headers.forEach((v, k) => {
    headers[k.toLowerCase()] = v;
  });
  // Indirizzo finale dopo i reindirizzamenti: un http:// salvato che porta a https:// è sicuro.
  const finale = res.url || url;
  return { url: finale, origin: new URL(finale).origin, html, headers };
}

/** GET di una risorsa secondaria del sito (feed, API WordPress). Null se non c'è. */
export async function scaricaTesto(url: string, timeoutMs = 10000): Promise<string | null> {
  try {
    const res = await scaricaConRipiego(url, timeoutMs);
    if (!res.ok) return null;
    const text = await res.text();
    return text.length > MAX_HTML_BYTES ? null : text;
  } catch {
    return null;
  }
}
