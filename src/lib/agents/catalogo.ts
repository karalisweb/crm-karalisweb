/**
 * Il catalogo degli agenti dell'analisi di un'azienda: una riga per agente, in ordine di scheda.
 *
 *   dove    — "server": gira nel CRM, sempre acceso, senza permessi;
 *             "mac":    serve il Chrome di Alessio (LinkedIn), quindi il Mac acceso.
 *   momento — "trovata": analisi veloce, appena l'azienda è trovata;
 *             "approfondisci": analisi completa, quando Alessio preme Approfondisci;
 *             "sintesi": le frasi per il telefono, quando arriva un dato nuovo.
 *   modo    — "auto": parte da sola al suo momento; "mano": solo con il suo pulsante nella scheda.
 *             Alessio lo cambia nella pagina Agenti (settings.agenti_modo).
 */
import { db } from "@/lib/db";

export type Dove = "server" | "mac";
export type Momento = "trovata" | "approfondisci" | "sintesi";
export type Modo = "auto" | "mano";

export interface VoceCatalogo {
  chiave: string;
  nome: string;
  cosa: string;
  dove: Dove;
  momento: Momento;
  modo: Modo;
  costo: string;
  /** Legge il sito: senza sito non può partire (gli altri lavorano col nome, la scheda Maps, i social). */
  serveSito?: boolean;
}

export const CATALOGO: VoceCatalogo[] = [
  { chiave: "trova_sito", nome: "Trova sito", cosa: "Trova il sito e guarda se cercando il nome su Google esce", dove: "server", momento: "trovata", modo: "auto", costo: "meno di 1 centesimo" },
  { chiave: "posizioni", nome: "Ti trovano su Google?", cosa: "Dove esce cercando il servizio + città", dove: "server", momento: "trovata", modo: "auto", costo: "meno di 1 centesimo" , serveSito: true },
  { chiave: "sito_visto", nome: "Il sito visto", cosa: "Foto su telefono e computer, velocità, se sembra vecchio", dove: "server", momento: "trovata", modo: "auto", costo: "circa 1 centesimo" , serveSito: true },
  { chiave: "contatto", nome: "Dal cliente al contatto", cosa: "Telefono cliccabile, WhatsApp, modulo, quanti clic per un preventivo", dove: "server", momento: "trovata", modo: "auto", costo: "gratis" , serveSito: true },
  { chiave: "lettore", nome: "Cosa dice il sito", cosa: "Offerta, a chi parla, a quali domande del cliente risponde", dove: "server", momento: "trovata", modo: "auto", costo: "circa 1 centesimo" , serveSito: true },
  { chiave: "recensioni", nome: "Recensioni Google", cosa: "Voto, ultima recensione, se rispondono, cosa lodano e di cosa si lamentano", dove: "server", momento: "trovata", modo: "auto", costo: "circa 1 centesimo" },
  { chiave: "concorrenti", nome: "Concorrenti su Google Maps", cosa: "I 3 che escono prima, con stelle e recensioni", dove: "server", momento: "approfondisci", modo: "auto", costo: "meno di 1 centesimo" },
  { chiave: "tracciamenti", nome: "Codici sul sito", cosa: "Analytics, Tag Manager, pixel di Facebook", dove: "server", momento: "approfondisci", modo: "auto", costo: "gratis" , serveSito: true },
  { chiave: "google_ads", nome: "Google Ads", cosa: "Se fanno pubblicità su Google, da quando, quanti annunci", dove: "server", momento: "approfondisci", modo: "auto", costo: "circa 1 centesimo" , serveSito: true },
  { chiave: "meta_ads", nome: "Inserzioni Facebook e Instagram", cosa: "Se fanno inserzioni, da quando, cosa promettono (libreria pubblica di Meta)", dove: "server", momento: "approfondisci", modo: "auto", costo: "gratis" },
  { chiave: "social", nome: "Facebook e Instagram", cosa: "Se ci sono, ultimo post, quanto pubblicano, di cosa parlano", dove: "server", momento: "approfondisci", modo: "auto", costo: "gratis" },
  { chiave: "linkedin_azienda", nome: "LinkedIn dell'azienda", cosa: "Pagina, follower, ultimo post", dove: "mac", momento: "approfondisci", modo: "mano", costo: "il tuo LinkedIn (max 20 al giorno)" },
  { chiave: "decision_maker", nome: "Chi decide", cosa: "Azienda su LinkedIn → dipendenti → CEO/titolare → contatti in comune con te", dove: "mac", momento: "approfondisci", modo: "mano", costo: "il tuo LinkedIn (max 20 al giorno)" },
  { chiave: "ganci", nome: "Cosa dirgli al telefono", cosa: "Le 3 frasi con i numeri e la frase per aprire", dove: "server", momento: "sintesi", modo: "auto", costo: "circa 1 centesimo" },
];

export function voce(chiave: string): VoceCatalogo | undefined {
  return CATALOGO.find((v) => v.chiave === chiave);
}

/** Il modo di ogni agente: quello scelto da Alessio, altrimenti quello del catalogo. */
export async function modiAgenti(): Promise<Record<string, Modo>> {
  const s = await db.settings.findUnique({ where: { id: "default" }, select: { agentiModo: true } });
  const scelti = (s?.agentiModo ?? {}) as Record<string, unknown>;
  return Object.fromEntries(CATALOGO.map((v) => [v.chiave, scelti[v.chiave] === "auto" || scelti[v.chiave] === "mano" ? (scelti[v.chiave] as Modo) : v.modo]));
}

/**
 * Approfondisci = tutti gli agenti dell'analisi (veloce e completa), qualunque sia il loro modo:
 * per Alessio un'azienda approfondita ha tutte le ricerche fatte. Senza sito si saltano solo quelle
 * che leggono il sito; Trova sito resta del giro veloce.
 */
export function agentiApprofondimento(dove: Dove, conSito: boolean): string[] {
  return CATALOGO.filter((v) => v.momento !== "sintesi" && v.chiave !== "trova_sito" && v.dove === dove && (conSito || !v.serveSito)).map((v) => v.chiave);
}

/** Gli agenti che partono da soli in quel momento, divisi per dove girano. */
export function automatici(modi: Record<string, Modo>, momento: Momento, dove?: Dove): string[] {
  return CATALOGO.filter((v) => v.momento === momento && modi[v.chiave] === "auto" && (!dove || v.dove === dove)).map((v) => v.chiave);
}
