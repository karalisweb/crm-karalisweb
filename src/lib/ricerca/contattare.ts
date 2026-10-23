/**
 * "Da contattare": le aziende pronte per il primo contatto. Entrano da sole quelle approfondite
 * in cui chi decide è collegato ad Alessio (o c'è un ponte BNI); Alessio ne aggiunge altre a mano
 * o ne toglie una. La scelta a mano è una voce DA_CONTATTARE (niente colonne nuove su Lead):
 * APPROVATO = aggiunta, SCARTATO = tolta.
 */
export const KIND_DA_CONTATTARE = "DA_CONTATTARE";

export type SceltaContatto = "AGGIUNTA" | "TOLTA" | null;

export function sceltaDaStato(status: string | null | undefined): SceltaContatto {
  return status === "APPROVATO" ? "AGGIUNTA" : status === "SCARTATO" ? "TOLTA" : null;
}

export function daContattare(a: { eliminata: boolean; approvata: boolean; collegata: boolean; scelta: SceltaContatto }): boolean {
  if (a.eliminata) return false;
  if (a.scelta) return a.scelta === "AGGIUNTA";
  return a.approvata && a.collegata;
}
