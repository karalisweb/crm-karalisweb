/**
 * Il Regista — logica pura (niente DB): decide chi far lavorare su un'azienda
 * e quando il fascicolo merita di arrivare in cassetta.
 *
 * Imbuto: prima gli agenti economici (secondi, costo zero). Solo se trovano
 * abbastanza leve l'azienda va in cassetta, dove Alessio decide se spendere
 * per la raccolta approfondita.
 */
import type { Leva } from "./tipi";

/** Gli agenti della raccolta economica (passo 1). */
export const AGENTI_ECONOMICI = ["tecnico", "seo", "blog", "tracciamenti"] as const;

/** Leve minime perché il fascicolo arrivi in cassetta. */
export const SOGLIA_LEVE = 3;
/** Dopo tanti fallimenti di fila un agente smette di riprovare su quell'azienda. */
export const MAX_FALLIMENTI = 3;
/** Pausa minima prima di riprovare dopo un fallimento (un sito giù oggi può tornare domani). */
export const PAUSA_DOPO_FALLIMENTO_ORE = 20;
/** Oltre questo tempo un lavoro "in corso" è considerato bloccato (es. riavvio del server). */
export const LAVORO_BLOCCATO_MINUTI = 30;

export interface StatoAgenteSuAzienda {
  agente: string;
  /** Scadenza del referto più recente, null se non c'è un referto. */
  validoFino: Date | null;
  /** Fallimenti dopo l'ultimo successo. */
  fallimentiDiFila: number;
  ultimoFallimento: Date | null;
  inCorso: boolean;
}

/** Quali agenti devono lavorare ora su questa azienda. */
export function agentiDaEseguire(
  stati: StatoAgenteSuAzienda[],
  oggi: Date,
  agenti: readonly string[] = AGENTI_ECONOMICI
): string[] {
  const perAgente = new Map(stati.map((s) => [s.agente, s]));
  return agenti.filter((a) => {
    const s = perAgente.get(a);
    if (!s) return true;
    if (s.inCorso) return false;
    if (s.validoFino && s.validoFino > oggi) return false;
    if (s.fallimentiDiFila >= MAX_FALLIMENTI) return false;
    if (s.ultimoFallimento && oggi.getTime() - s.ultimoFallimento.getTime() < PAUSA_DOPO_FALLIMENTO_ORE * 3600_000) {
      return false;
    }
    return true;
  });
}

export interface RefertoBreve {
  agent: string;
  summary: string;
  levers: Leva[];
  validUntil: Date;
}

export interface EsitoFascicolo {
  /** Tutti gli agenti economici hanno un referto valido. */
  completo: boolean;
  leve: Leva[];
  /** Va in cassetta. */
  meritaCassetta: boolean;
}

/** Valuta il fascicolo base: è completo? Ha abbastanza leve da meritare la cassetta? */
export function valutaFascicolo(referti: RefertoBreve[], oggi: Date): EsitoFascicolo {
  const validi = new Map<string, RefertoBreve>();
  for (const r of referti) {
    if (r.validUntil <= oggi) continue;
    const prima = validi.get(r.agent);
    if (!prima || r.validUntil > prima.validUntil) validi.set(r.agent, r);
  }
  const completo = AGENTI_ECONOMICI.every((a) => validi.has(a));
  const leve = [...validi.values()].flatMap((r) => r.levers);
  return { completo, leve, meritaCassetta: completo && leve.length >= SOGLIA_LEVE };
}

/** Raggruppa le leve per servizio, nell'ordine in cui vanno presentate. */
export function levePerServizio(leve: Leva[]): Record<string, Leva[]> {
  const out: Record<string, Leva[]> = {};
  for (const l of leve) (out[l.servizio] ??= []).push(l);
  return out;
}
