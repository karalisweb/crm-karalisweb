/**
 * Canary Test per verificare disponibilità Apify prima di ogni chiamata.
 * Lightweight: chiama solo actor.get() con timeout 5s.
 */

import { ApifyClient } from "apify-client";

interface CanaryResult {
  available: boolean;
  reason?: string;
}

const CANARY_TIMEOUT_MS = 5000;

export async function canaryTestApify(): Promise<CanaryResult> {
  const token = process.env.APIFY_TOKEN;

  if (!token) {
    return { available: false, reason: "APIFY_TOKEN non configurato" };
  }

  try {
    const client = new ApifyClient({ token });

    // Usa AbortController per timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CANARY_TIMEOUT_MS);

    try {
      // Verifica che il token sia valido e l'account accessibile
      const actor = await client.actor("apify/google-search-scraper").get();
      clearTimeout(timeout);

      if (!actor) {
        return { available: false, reason: "Actor non trovato" };
      }

      return { available: true };
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);

    if (/abort|timeout/i.test(msg)) {
      return { available: false, reason: "Timeout — Apify non risponde" };
    }
    if (/401|unauthorized/i.test(msg)) {
      return { available: false, reason: "Token Apify non valido" };
    }
    if (/402|billing|payment/i.test(msg)) {
      return { available: false, reason: "Crediti Apify esauriti" };
    }
    if (/429|rate/i.test(msg)) {
      return { available: false, reason: "Rate limit Apify raggiunto" };
    }

    return { available: false, reason: msg };
  }
}
