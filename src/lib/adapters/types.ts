/**
 * Adapter di sola lettura verso gli altri tre moduli (piano, criticità 2,
 * soluzione di riserva: «accesso in sola lettura al DB delle app... in attesa
 * dell'API. Mai in scrittura»).
 *
 * Regole valide per tutti gli adapter di questa cartella:
 *  - SOLO letture. Nessuna scrittura, mai, per nessun motivo.
 *  - Ogni adapter è opzionale: se la sua configurazione manca, restituisce
 *    `non configurato` e la pagina lo dice. Non solleva e non blocca gli altri.
 *  - Un errore di un modulo non deve far cadere la scheda: viene riportato
 *    accanto al modulo, non propagato.
 */

export type EsitoModulo<T> =
  | { stato: "ok"; dati: T }
  | { stato: "non_configurato" }
  | { stato: "errore"; messaggio: string };

export interface DatiGads {
  accountId: string;
  customerId: string;
  customerName: string | null;
  attivo: boolean;
  ultimaImportazione: Date | null;
  campagne: number;
  costoTotaleEuro: number;
  conversioni: number;
  modifichePendenti: number;
}

export interface DatiSeoi {
  clientId: number;
  nome: string;
  dominio: string;
  keywordMonitorate: number;
  posizioneMedia: number | null;
  inTopDieci: number;
  ultimaRilevazione: string | null;
  punteggioTecnico: number | null;
}

export interface DatiHub {
  projectId: number;
  nome: string;
  articoli: number;
  articoliPubblicati: number;
  contenutiDerivati: number;
  ultimaPubblicazione: string | null;
}

/** Avvolge una lettura in modo che un modulo rotto non ne trascini altri. */
export async function prova<T>(
  configurato: boolean,
  fn: () => Promise<T | null>,
): Promise<EsitoModulo<T | null>> {
  if (!configurato) return { stato: "non_configurato" };
  try {
    return { stato: "ok", dati: await fn() };
  } catch (e) {
    return { stato: "errore", messaggio: e instanceof Error ? e.message : "Errore sconosciuto" };
  }
}
