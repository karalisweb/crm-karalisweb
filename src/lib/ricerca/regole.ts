/**
 * Fase 1 Ricerca — regole pure (niente DB): le zone, la scelta della chiave, i doppioni,
 * la ricerca per bisogno fra i membri BNI. Vedi FASE-1-RICERCA.md.
 */
import { norm } from "@/lib/agents/bni-regole";

export const TIPI_CHIAVE = ["SETTORE", "AZIENDA", "PERSONA", "RETE_MEMBRO"] as const;
export type TipoChiave = (typeof TIPI_CHIAVE)[number];

export const ETICHETTE_CHIAVE: Record<TipoChiave, string> = {
  SETTORE: "Settore",
  AZIENDA: "Aziende simili",
  PERSONA: "Persone simili",
  RETE_MEMBRO: "Rete di un membro BNI",
};

/** Obiettivo del flusso clienti: aziende nuove al giorno. */
export const AZIENDE_AL_GIORNO = 5;
/** Ricerche al massimo in un turno (due turni al giorno). */
export const RICERCHE_PER_TURNO = 4;
/** Lavori LinkedIn al giorno (circa 10 profili ciascuno): il profilo di Alessio non va stressato. */
export const LAVORI_LINKEDIN_AL_GIORNO = 2;
/** Un caso studio resta valido per la ricerca almeno 6 mesi. */
export const MESI_VALIDITA_CASO = 6;
/** Una chiave nata dalla rete di un membro vale come un caso studio. */
export const MESI_VALIDITA_RETE = 6;

/** Prima la Sardegna (Sud, poi Nord e Centro), poi le città principali del resto d'Italia. */
export const ZONE: readonly string[] = [
  "Cagliari", "Quartu Sant'Elena", "Selargius", "Assemini", "Capoterra", "Iglesias", "Carbonia", "Sanluri", "Villacidro",
  "Sassari", "Olbia", "Alghero", "Porto Torres", "Tempio Pausania", "Arzachena", "Oristano", "Nuoro", "Tortolì",
  "Roma", "Milano", "Torino", "Bologna", "Firenze", "Napoli", "Bari", "Verona", "Padova", "Brescia", "Bergamo",
  "Genova", "Venezia", "Treviso", "Modena", "Parma", "Reggio Emilia", "Perugia", "Ancona", "Pescara", "Palermo",
  "Catania", "Lecce", "Salerno", "Trento", "Bolzano", "Udine", "Trieste",
];

export const ZONE_SARDEGNA = 18;

export function zonaDi(indice: number): string | null {
  return ZONE[indice] ?? null;
}

export interface ChiavePerScelta {
  id: string;
  tipo: string;
  attiva: boolean;
  scadeAt: Date | null;
  esauritaAt: Date | null;
  ultimoUsoAt: Date | null;
  createdAt: Date;
}

export function chiaveUsabile(c: ChiavePerScelta, oggi: Date): boolean {
  return c.attiva && !c.esauritaAt && (!c.scadeAt || c.scadeAt.getTime() > oggi.getTime());
}

/** La prossima chiave da usare fra quelle dei tipi richiesti: quella usata meno di recente. */
export function prossimaChiave<T extends ChiavePerScelta>(chiavi: T[], tipi: TipoChiave[], oggi: Date): T | null {
  const ok = chiavi.filter((c) => (tipi as string[]).includes(c.tipo) && chiaveUsabile(c, oggi));
  ok.sort((a, b) => {
    const ua = a.ultimoUsoAt?.getTime() ?? 0;
    const ub = b.ultimoUsoAt?.getTime() ?? 0;
    return ua - ub || a.createdAt.getTime() - b.createdAt.getTime();
  });
  return ok[0] ?? null;
}

/** Le parole da cercare per una chiave di aziende: il valore e i termini, senza doppioni. */
export function terminiDi(valore: string, termini: unknown): string[] {
  const lista = [valore, ...(Array.isArray(termini) ? termini : [])]
    .filter((t): t is string => typeof t === "string")
    .map((t) => t.trim())
    .filter((t) => t.length >= 3);
  const visti = new Set<string>();
  return lista.filter((t) => {
    const k = norm(t);
    if (visti.has(k)) return false;
    visti.add(k);
    return true;
  });
}

/**
 * Dove continuare: si alterna termine e zona. Con 3 termini e 46 zone: termine 0 a Cagliari,
 * termine 1 a Cagliari, termine 2 a Cagliari, termine 0 a Quartu…
 */
export function passoRicerca(termini: string[], indice: number): { termine: string; zona: string } | null {
  if (!termini.length) return null;
  const zona = zonaDi(Math.floor(indice / termini.length));
  if (!zona) return null;
  return { termine: termini[indice % termini.length], zona };
}

// ─── Doppioni ───────────────────────────────────────────────────────────────

/** Profilo LinkedIn in forma unica: https://www.linkedin.com/in/<nome> (senza parametri né barra finale). */
export function normalizzaLinkedin(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.trim().match(/linkedin\.com\/(in|company)\/([^/?#\s]+)/i);
  if (!m) return null;
  return `https://www.linkedin.com/${m[1].toLowerCase()}/${decodeURIComponent(m[2]).toLowerCase()}`;
}

/** Nome confrontabile: minuscolo, senza accenti, senza punteggiatura né forme societarie. */
export function nomeConfrontabile(s: string | null | undefined): string {
  return norm(s)
    .replace(/\b(s\.?r\.?l\.?s?|s\.?p\.?a\.?|s\.?n\.?c\.?|s\.?a\.?s\.?|srls|di|&|e)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function stessoNome(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = nomeConfrontabile(a);
  return !!x && x === nomeConfrontabile(b);
}

// ─── Ricerca per bisogno fra i membri ───────────────────────────────────────

const PAROLE_VUOTE = new Set([
  "mi", "serve", "servono", "cerco", "cerca", "un", "una", "uno", "per", "che", "chi", "con", "del", "della", "dei", "delle",
  "il", "lo", "la", "le", "gli", "di", "da", "in", "a", "e", "o", "conosce", "conosci", "qualcuno", "bravo", "brava",
]);

export function paroleDi(q: string): string[] {
  return norm(q)
    .split(/[^a-z0-9]+/)
    .filter((p) => p.length >= 3 && !PAROLE_VUOTE.has(p));
}

export interface MembroPerBisogno {
  name: string;
  profession: string | null;
  company: string | null;
  chapter: string | null;
  cosaFa: string | null;
  seeking: string | null;
  referenzePuoDare: string | null;
  conosciuto: boolean;
}

/** Quanto un membro risponde al bisogno: 0 = per niente. Il mestiere pesa più delle note. */
export function punteggioBisogno(q: string, m: MembroPerBisogno): number {
  const parole = paroleDi(q);
  if (!parole.length) return 0;
  const campi: [string | null, number][] = [
    [m.profession, 4],
    [m.cosaFa, 3],
    [m.referenzePuoDare, 3],
    [m.company, 2],
    [m.chapter, 1],
    [m.seeking, 1],
    [m.name, 1],
  ];
  let punti = 0;
  let trovate = 0;
  for (const p of parole) {
    // "commercialisti" trova "commercialista": si confronta la radice.
    const radice = p.length > 5 ? p.slice(0, -1) : p;
    let migliore = 0;
    for (const [testo, peso] of campi) if (testo && norm(testo).includes(radice)) migliore = Math.max(migliore, peso);
    if (migliore) trovate++;
    punti += migliore;
  }
  if (!trovate) return 0;
  return punti * trovate + (m.conosciuto ? 1 : 0);
}
