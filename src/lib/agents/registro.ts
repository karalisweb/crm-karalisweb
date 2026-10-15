/**
 * Registro della squadra: tutti gli agenti previsti in PROGETTO-AGENTI.md,
 * anche quelli non ancora costruiti, così la pagina Squadra mostra il quadro intero.
 */
import { agenteTecnico } from "./agenti/tecnico";
import { agenteSeo } from "./agenti/seo";
import { agenteBlog } from "./agenti/blog";
import { agenteTracciamenti } from "./agenti/tracciamenti";
import type { AgenteEseguibile } from "./tipi";

export type Famiglia = "server" | "browser" | "sintesi";
export type Squadra = "commerciale" | "bni" | "vendita";
export type StatoAgente = "attivo" | "da_costruire" | "esistente_altrove";

export interface SchedaAgente {
  chiave: string;
  numero: string;
  nome: string;
  compito: string;
  famiglia: Famiglia;
  squadra: Squadra;
  stato: StatoAgente;
  nota?: string;
}

export const SQUADRA: SchedaAgente[] = [
  { chiave: "esploratore", numero: "1", nome: "Esploratore", compito: "Trova aziende su Google Maps, Google Search e LinkedIn", famiglia: "server", squadra: "commerciale", stato: "esistente_altrove", nota: "Google Maps funziona dalle Ricerche; Search e LinkedIn da costruire" },
  { chiave: "lettore", numero: "2", nome: "Lettore del sito", compito: "Cosa dice il sito e come lo dice", famiglia: "sintesi", squadra: "commerciale", stato: "da_costruire" },
  { chiave: "tecnico", numero: "2.5", nome: "Tecnico", compito: "Con che cosa è fatto il sito, se è aggiornato, da quando è fermo", famiglia: "server", squadra: "commerciale", stato: "attivo" },
  { chiave: "seo", numero: "3", nome: "SEO", compito: "Ottimizzazione della pagina (le posizioni su Google arrivano dopo)", famiglia: "server", squadra: "commerciale", stato: "attivo" },
  { chiave: "blog", numero: "3.5", nome: "Blog", compito: "Esiste un blog, ultimo articolo, di cosa parla", famiglia: "server", squadra: "commerciale", stato: "attivo" },
  { chiave: "google_ads", numero: "4", nome: "Google Ads", compito: "Inserzioni su Ads Transparency e tag nel sito", famiglia: "server", squadra: "commerciale", stato: "da_costruire", nota: "Il tag nel sito lo legge già l'agente Tracciamenti" },
  { chiave: "tracciamenti", numero: "5", nome: "Tracciamenti", compito: "Analytics, Tag Manager, pixel", famiglia: "server", squadra: "commerciale", stato: "attivo" },
  { chiave: "social", numero: "6", nome: "Social", compito: "Presenza, ultimo post, di cosa parlano, coerenza col sito", famiglia: "browser", squadra: "commerciale", stato: "da_costruire" },
  { chiave: "meta_ads", numero: "7", nome: "Meta Ad Library", compito: "Inserzioni attive e passate, coerenza con social e sito", famiglia: "browser", squadra: "commerciale", stato: "da_costruire" },
  { chiave: "linkedin_azienda", numero: "8", nome: "LinkedIn azienda", compito: "Pagina aziendale e ultimo post", famiglia: "browser", squadra: "commerciale", stato: "da_costruire" },
  { chiave: "decision_maker", numero: "9", nome: "Decision maker", compito: "Chi decide in azienda", famiglia: "browser", squadra: "commerciale", stato: "da_costruire" },
  { chiave: "aggancio", numero: "10", nome: "Aggancio", compito: "Prepara il messaggio al decision maker (lo mandi tu)", famiglia: "sintesi", squadra: "commerciale", stato: "da_costruire" },
  { chiave: "coerenza", numero: "11", nome: "Coerenza", compito: "Confronta tutti i segnali fra loro", famiglia: "sintesi", squadra: "commerciale", stato: "da_costruire" },
  { chiave: "scheda_leve", numero: "12", nome: "Scheda leve", compito: "Su cosa fare leva nel contatto, con le prove", famiglia: "sintesi", squadra: "commerciale", stato: "da_costruire" },
  { chiave: "regista_video", numero: "13", nome: "Regista del video", compito: "Cosa mostrare nel video di analisi", famiglia: "sintesi", squadra: "commerciale", stato: "da_costruire" },
  { chiave: "cartografo_bni", numero: "B1", nome: "Cartografo capitoli", compito: "Capitoli, formato, membri e dirigenza su BNI Connect", famiglia: "browser", squadra: "bni", stato: "da_costruire" },
  { chiave: "stratega_bni", numero: "B2", nome: "Stratega di capitolo", compito: "Copertura, collaborazione, visita o 121 con la dirigenza", famiglia: "sintesi", squadra: "bni", stato: "da_costruire" },
  { chiave: "preparatore_121", numero: "B3", nome: "Preparatore 121", compito: "Richiesta e memo per il 121", famiglia: "sintesi", squadra: "bni", stato: "da_costruire" },
  { chiave: "copertura_sardegna", numero: "B4", nome: "Copertura Sardegna", compito: "Chi conosci e chi manca, capitolo per capitolo", famiglia: "server", squadra: "bni", stato: "da_costruire" },
];

/** Gli agenti che oggi il regista può far lavorare. */
export const AGENTI_ESEGUIBILI: Record<string, AgenteEseguibile> = {
  tecnico: agenteTecnico,
  seo: agenteSeo,
  blog: agenteBlog,
  tracciamenti: agenteTracciamenti,
};
