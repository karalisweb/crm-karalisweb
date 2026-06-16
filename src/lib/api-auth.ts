/**
 * Helper di autorizzazione per gli handler API (difesa in profondità).
 *
 * Il middleware (`src/middleware.ts`) è la PRIMA barriera e protegge già tutte
 * le rotte /api richiedendo una sessione. Questi helper aggiungono una SECONDA
 * barriera dentro l'handler, così una eventuale regressione del matcher del
 * middleware non espone da sola dati o azioni sensibili.
 *
 * Uso tipico:
 *   const gate = await requireSession();
 *   if (!gate.ok) return gate.response;
 *   // ... gate.userId, gate.role disponibili
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

export type Gate =
  | { ok: true; userId: string; role: string }
  | { ok: false; response: NextResponse };

/** Richiede una sessione valida. Ritorna l'utente o una NextResponse 401. */
export async function requireSession(): Promise<Gate> {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true, userId: user.id, role: user.role ?? "USER" };
}

/** Richiede sessione + ruolo ADMIN. Ritorna l'utente o 401/403. */
export async function requireAdmin(): Promise<Gate> {
  const gate = await requireSession();
  if (!gate.ok) return gate;
  if (gate.role !== "ADMIN") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return gate;
}

/**
 * Rate-limit per-utente su un'azione costosa. Ritorna una NextResponse 429 se il
 * limite è superato, altrimenti null (la richiesta può proseguire).
 *
 *   const limited = enforceUserRateLimit("search", gate.userId, 15, 10 * 60_000);
 *   if (limited) return limited;
 */
export function enforceUserRateLimit(
  scope: string,
  userId: string,
  max: number,
  windowMs: number
): NextResponse | null {
  const rl = rateLimit(`${scope}:${userId}`, max, windowMs);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Troppe richieste. Riprova tra poco." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }
  return null;
}
