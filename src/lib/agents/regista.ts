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

// ─── Approfondimento e sintesi ─────────────────────────────────────────────
// Partono solo dopo che Alessio ha detto "Approfondisci" in cassetta.

/** Agenti dell'approfondimento che lavorano sul server (a pagamento: DataForSEO / AI). */
export const AGENTI_APPROFONDIMENTO_SERVER = ["lettore", "posizioni", "google_ads"] as const;
/** Agenti dell'approfondimento che lavorano col browser di Alessio (Claude sul Mac). */
export const AGENTI_BROWSER_AZIENDA = ["social", "meta_ads", "linkedin_azienda", "decision_maker"] as const;
/** La catena di sintesi, nell'ordine: ognuno legge quello che hanno scritto i precedenti. */
export const AGENTI_SINTESI = ["coerenza", "regista_video", "scheda_leve", "aggancio"] as const;

/** Dopo quanti giorni un lavoro di browser mai preso in carico si considera perso. */
export const SCADENZA_BROWSER_GIORNI = 3;
/** Un lavoro di browser preso in carico ma mai chiuso: dopo quante ore si chiude come fallito. */
export const LAVORO_BROWSER_BLOCCATO_ORE = 3;

/**
 * Quali lavori di browser mettere in coda. Un lavoro di browser si accoda una volta:
 * se fallisce non si riprova da solo (lo fa il Mac di Alessio, che può essere spento),
 * si rifà solo quando un referto vecchio scade.
 */
export function browserDaAccodare(stati: StatoAgenteSuAzienda[], oggi: Date): string[] {
  const perAgente = new Map(stati.map((s) => [s.agente, s]));
  return AGENTI_BROWSER_AZIENDA.filter((a) => {
    const s = perAgente.get(a);
    if (!s) return true;
    if (s.inCorso || s.fallimentiDiFila > 0) return false;
    return !!s.validoFino && s.validoFino <= oggi;
  });
}

/** Un agente ha "chiuso" il suo lavoro: referto valido, oppure ci ha provato ed è fallito. */
function chiuso(s: StatoAgenteSuAzienda | undefined, oggi: Date): boolean {
  if (!s) return false;
  if (s.validoFino && s.validoFino > oggi) return true;
  return s.fallimentiDiFila > 0 && !s.inCorso;
}

/**
 * La sintesi parte quando tutti gli agenti dell'approfondimento hanno chiuso il loro
 * lavoro (anche fallendo: si sintetizza quello che c'è, e lo si dice).
 */
export function prontoPerSintesi(stati: StatoAgenteSuAzienda[], oggi: Date): boolean {
  const perAgente = new Map(stati.map((s) => [s.agente, s]));
  return [...AGENTI_APPROFONDIMENTO_SERVER, ...AGENTI_BROWSER_AZIENDA].every((a) => chiuso(perAgente.get(a), oggi));
}

/** La catena di sintesi va (ri)fatta se anche un solo anello manca o è scaduto. */
export function sintesiDaFare(stati: StatoAgenteSuAzienda[], oggi: Date): boolean {
  return agentiDaEseguire(stati, oggi, AGENTI_SINTESI).length > 0;
}
