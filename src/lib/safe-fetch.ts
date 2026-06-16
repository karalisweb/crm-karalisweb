/**
 * Fetch sicuro verso URL NON fidati (siti dei lead).
 *
 * Difesa SSRF completa in un solo punto:
 *  1. Valida l'URL con `assertPublicUrl` (risoluzione DNS: blocca host che
 *     risolvono a IP privati/loopback/link-local/metadata cloud).
 *  2. NON segue i redirect automaticamente (`redirect: "manual"`): ad ogni hop
 *     3xx ri-valida la nuova destinazione PRIMA di seguirla. Questo chiude il
 *     bypass classico "sito pubblico → 301 → http://169.254.169.254/...".
 *
 * Usare SEMPRE questo helper al posto di `fetch()` quando l'URL proviene,
 * direttamente o indirettamente, da un lead/sito esterno.
 */

import { assertPublicUrl } from "./url-validator";

const DEFAULT_MAX_REDIRECTS = 5;

export interface SafeFetchOptions {
  /** Numero massimo di redirect 3xx da seguire (default 5). */
  maxRedirects?: number;
}

/**
 * Come `fetch`, ma blindato contro la SSRF. Segue i redirect manualmente
 * rivalidando ogni hop. Tutti i chiamanti usano GET, quindi metodo/headers
 * vengono mantenuti invariati ad ogni hop.
 */
export async function safeFetch(
  url: string,
  init: RequestInit = {},
  options: SafeFetchOptions = {}
): Promise<Response> {
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  let currentUrl = url;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    // Blocca prima di OGNI richiesta (anche dopo un redirect).
    await assertPublicUrl(currentUrl);

    const res = await fetch(currentUrl, { ...init, redirect: "manual" });

    // Non è un redirect: è la risposta finale.
    if (res.status < 300 || res.status >= 400) {
      return res;
    }

    // Redirect: risolvi la Location (anche relativa) e ricomincia il ciclo,
    // così l'hop successivo passa di nuovo da `assertPublicUrl`.
    const location = res.headers.get("location");
    if (!location) {
      // 3xx senza Location: niente da seguire, restituisci com'è.
      return res;
    }
    currentUrl = new URL(location, currentUrl).toString();
  }

  throw new Error(`Troppi redirect (> ${maxRedirects}) seguendo ${url}`);
}
