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

export interface AziendaContesto {
  id: string;
  name: string;
  website: string;
  category: string | null;
  address: string | null;
  phone: string | null;
  googleRating: number | null;
  googleReviewsCount: number | null;
  /** Città della ricerca che l'ha trovata (Google Maps o Search), se nota. */
  citta: string | null;
  /** Google Place ID (dalla scheda Maps): serve alle recensioni e ai concorrenti. */
  placeId?: string | null;
  /** Come la cercherebbe un cliente, senza città ("costruzione piscine"): dalla chiave che l'ha trovata. */
  ricerca?: string | null;
  /** Link social salvato sull'azienda (dalla ricerca), se c'è. */
  socialUrl?: string | null;
}

/** Un referto già consegnato da un altro agente, letto dagli agenti di sintesi. */
export interface RefertoLetto {
  agent: string;
  summary: string;
  findings: Record<string, unknown>;
  levers: Leva[];
  evidence: Prova[];
  confidence: Fiducia;
  collectedAt: Date;
}

export interface ContestoAgente {
  lead: AziendaContesto;
  /** Scarica la homepage alla prima richiesta, poi la riusa. */
  pagina(): Promise<PaginaScaricata>;
  /** I referti validi degli altri agenti su questa azienda (il più recente per agente). */
  referti(): Promise<RefertoLetto[]>;
  oggi: Date;
}

/**
 * Le fasi dell'imbuto: la raccolta economica gira su tutte le aziende; l'approfondimento
 * solo dopo che Alessio ha detto "Approfondisci" in cassetta; la sintesi quando
 * l'approfondimento è finito.
 */
export type Fase = "base" | "approfondimento" | "sintesi";

export interface AgenteEseguibile {
  chiave: string;
  fase: Fase;
  /** Dopo quanti giorni il referto va rifatto. */
  validitaGiorni: number;
  /** Usa servizi a pagamento (DataForSEO, AI): soggetto al tetto di spesa. */
  aPagamento: boolean;
  esegui(ctx: ContestoAgente): Promise<Referto>;
}
