/**
 * Quanto spende la squadra e quanto può spendere.
 *
 * Ogni lavoro registra il suo costo esterno in centesimi di euro (agent_runs.cost_cents).
 * DataForSEO dichiara il costo vero di ogni chiamata (in dollari); per l'AI il costo è
 * calcolato dai token con il listino qui sotto. Il cambio dollaro→euro è un'ASSUNZIONE
 * fissa, modificabile con AGENTI_EUR_PER_USD.
 */
import { db } from "@/lib/db";

/** Tetto mensile per gli agenti (euro). Il vincolo storico è 100 €/mese per tutto il CRM. */
export function budgetMensileEuro(): number {
  const v = Number(process.env.AGENTI_BUDGET_EUR);
  return Number.isFinite(v) && v > 0 ? v : 70;
}

export function eurPerUsd(): number {
  const v = Number(process.env.AGENTI_EUR_PER_USD);
  return Number.isFinite(v) && v > 0 ? v : 0.92;
}

export function usdInCentesimiEuro(usd: number): number {
  return Math.round(usd * eurPerUsd() * 100 * 100) / 100; // centesimi, due decimali
}

/** Listino per milione di token (USD). Claude: listino Anthropic; Gemini: listino pubblico Google. */
export const LISTINO_AI: Record<string, { input: number; output: number }> = {
  "claude-opus-5-5": { input: 4, output: 20 },
  "gemini-2.5-flash": { input: 0.3, output: 2.5 },
  "gemini-2.5-pro": { input: 1.25, output: 10 },
};

export function costoAiCentesimi(modello: string, tokenIn: number, tokenOut: number): number {
  const p = LISTINO_AI[modello] ?? LISTINO_AI["claude-opus-5-5"]; // modello sconosciuto: stima prudente (la più cara)
  return usdInCentesimiEuro((tokenIn * p.input + tokenOut * p.output) / 1_000_000);
}

export function inizioMese(oggi = new Date()): Date {
  return new Date(oggi.getFullYear(), oggi.getMonth(), 1);
}

/** Euro spesi dagli agenti nel mese in corso. */
export async function spesaMeseEuro(oggi = new Date()): Promise<number> {
  const r = await db.agentRun.aggregate({
    where: { queuedAt: { gte: inizioMese(oggi) } },
    _sum: { costCents: true },
  });
  return (r._sum.costCents ?? 0) / 100;
}

/** C'è ancora budget per un lavoro a pagamento? */
export async function budgetDisponibile(oggi = new Date()): Promise<{ ok: boolean; spesi: number; tetto: number }> {
  const spesi = await spesaMeseEuro(oggi);
  const tetto = budgetMensileEuro();
  return { ok: spesi < tetto, spesi, tetto };
}
