/**
 * Regole pure della coda dei lavori di browser (niente DB): quali lavori si prendono e in che ordine.
 */

/** I lavori BNI passano davanti: i 121 vengono prima di tutto. */
export const BROWSER_BNI = ["cartografo_bni", "rete_membro", "linkedin_membri"];

/**
 * I lavori che agiscono a nome di Alessio (commento, collegamento/segui, messaggio). v3.134: l'agente
 * sul server lavora anche di notte, ma di notte prende solo i lavori che leggono: un commento alle 3
 * sembra un robot.
 */
export const AZIONI_BROWSER = ["scalda", "collega", "contatta_persona"];

/** Quali agenti di browser si possono prendere: tutti, oppure (di notte) solo quelli che leggono. */
export function agentiPrendibili(tutti: readonly string[], soloLettura: boolean): { bni: string[]; altri: string[] } {
  const ok = tutti.filter((k) => !soloLettura || !AZIONI_BROWSER.includes(k));
  return { bni: ok.filter((k) => BROWSER_BNI.includes(k)), altri: ok.filter((k) => !BROWSER_BNI.includes(k)) };
}
