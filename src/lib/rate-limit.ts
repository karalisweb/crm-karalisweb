/**
 * Rate limiter in-memory, semplice e riutilizzabile.
 *
 * NB: lo stato è per-processo. Con una sola istanza PM2 (setup attuale) va bene
 * come freno ad abusi/brute-force. Per più istanze servirebbe uno store condiviso
 * (es. Redis) — vedi ROADMAP.
 */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/**
 * Registra un colpo sulla chiave `key`. Consentiti `max` colpi ogni `windowMs`.
 * Ritorna ok=false quando il limite è superato, con i secondi di attesa.
 */
export function rateLimit(
  key: string,
  max: number,
  windowMs: number
): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const b = buckets.get(key);

  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    // pulizia occasionale per non far crescere la mappa all'infinito
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) if (now > v.resetAt) buckets.delete(k);
    }
    return { ok: true, retryAfterSec: 0 };
  }

  b.count++;
  if (b.count > max) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  }
  return { ok: true, retryAfterSec: 0 };
}
