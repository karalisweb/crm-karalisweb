/** Etichette comuni alle pagine della fase di ricerca. */
export const MOTIVI: Record<string, string> = {
  STESSO_RUOLO: "fa il tuo mestiere",
  DIRIGENZA: "dirigenza",
  PRESIDENTE: "presidente",
  INDICATO: "indicato dal presidente",
  ALTRI: "da conoscere",
};

export const GRUPPI: Record<string, string> = {
  STESSO_RUOLO: "1 · Chi fa il tuo mestiere (per rispetto, prima di tutti)",
  DIRIGENZA: "2 · Presidente e formazione / eventi",
  PRESIDENTE: "1 · Il presidente (nessuno fa il tuo mestiere): chiedigli chi sono i più attivi",
  INDICATO: "Indicati dal presidente",
  ALTRI: "Tutti gli altri",
};

export const FORMATI: Record<string, string> = { PRESENZA: "In presenza", ONLINE: "Online", IBRIDO: "Ibrido" };

export const STATI_PRESENTAZIONE: Record<string, string> = {
  DA_CHIEDERE: "da chiedere",
  CHIESTA: "chiesta",
  PRESENTATO: "presentato",
  NO: "no",
};

export function dataOra(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("it-IT", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function data(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}

export const STATI_CASO: Record<string, string> = { DA_CONFERMARE: "da confermare", ATTIVO: "attivo", SCADUTO: "spento" };

export const CANALI: Record<string, string> = { maps: "Google Maps", google: "Google", facebook: "Facebook", instagram: "Instagram", linkedin: "LinkedIn" };
