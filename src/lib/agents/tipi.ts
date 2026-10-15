/**
 * Squadra di agenti — tipi comuni.
 *
 * Un agente lavora su un'azienda e consegna un REFERTO: che cosa ha trovato,
 * le LEVE commerciali (cosa possiamo vendere e perché) e le PROVE che le
 * sostengono. Niente dati inventati: se un agente non trova, lo scrive.
 * Vedi PROGETTO-AGENTI.md.
 */

/** I servizi che Karalisweb vende: ogni leva punta a uno di questi. */
export const SERVIZI = {
  sito: "Sito web",
  seo: "SEO",
  google_ads: "Google Ads",
  meta_ads: "Meta Ads",
  social: "Social",
  contenuti: "Contenuti",
  tracciamento: "Tracciamento e dati",
} as const;

export type Servizio = keyof typeof SERVIZI;

/** Una leva commerciale: il gancio per la chiamata, con la sua prova. */
export interface Leva {
  servizio: Servizio;
  testo: string;
  prova: string;
}

/** Una prova: che cosa si è visto, dove, con la citazione esatta se c'è. */
export interface Prova {
  cosa: string;
  fonte: string;
  citazione?: string;
}

export type Fiducia = "ALTA" | "MEDIA" | "BASSA";

/** Quello che un agente consegna alla fine del suo lavoro. */
export interface Referto {
  summary: string;
  findings: Record<string, unknown>;
  levers: Leva[];
  evidence: Prova[];
  confidence: Fiducia;
  costCents?: number;
}

/** La homepage scaricata una volta sola e condivisa fra gli agenti. */
export interface PaginaScaricata {
  url: string;
  origin: string;
  html: string;
  headers: Record<string, string>;
}

export interface ContestoAgente {
  lead: { id: string; name: string; website: string; category: string | null };
  /** Scarica la homepage alla prima richiesta, poi la riusa. */
  pagina(): Promise<PaginaScaricata>;
  oggi: Date;
}

export interface AgenteEseguibile {
  chiave: string;
  /** Dopo quanti giorni il referto va rifatto. */
  validitaGiorni: number;
  esegui(ctx: ContestoAgente): Promise<Referto>;
}
