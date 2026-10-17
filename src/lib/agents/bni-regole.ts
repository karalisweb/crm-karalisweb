/**
 * Squadra BNI — le regole di Alessio, in funzioni pure (niente DB). Vedi PROGETTO-AGENTI.md, Fase 1.
 *
 * Si incontrano TUTTI i membri, in Sardegna e nel resto d'Italia, con lo stesso ordine dentro
 * ogni capitolo:
 *   1. chi ha il ruolo di Alessio (marketing e simili) — rispetto e convenienza;
 *   2. presidente e responsabile formazione / eventi;
 *   3. se nessuno ha il ruolo di Alessio: prima il presidente, poi quelli che il presidente
 *      indica al 121 come i più attivi;
 *   4. tutti gli altri.
 * Obiettivo: 10 121 a settimana. La visita al capitolo quando ne hai conosciuto un terzo.
 */

export type Formato = "PRESENZA" | "ONLINE" | "IBRIDO";
export type Dirigenza = "PRESIDENTE" | "VICEPRESIDENTE" | "FORMAZIONE" | "EVENTI";

/** Il ruolo di Alessio: chi fa siti, marketing digitale, comunicazione. */
const MIO_RUOLO = [
  /\bweb\b/, /siti\b|\bsito\b|sviluppo web|web design|web agency/, /marketing/, /comunicazion/,
  /social media|\bsocial\b/, /\bseo\b/, /digital/, /pubblicit|advertising/, /grafic/, /e-?commerce/,
];

export function norm(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Il membro fa il mio stesso mestiere (un "collega" nel capitolo)? */
export function stessoRuolo(categoria: string | null | undefined, azienda?: string | null): boolean {
  const t = `${norm(categoria)} ${norm(azienda)}`;
  return MIO_RUOLO.some((r) => r.test(t));
}

export function eSardo(c: { regioneItaliana?: string | null; region?: string | null }): boolean {
  return norm(c.regioneItaliana) === "sardegna" || norm(c.region).startsWith("sardegna");
}

export function formatoDa(s: string | null | undefined): Formato {
  const t = norm(s);
  if (/ibrid|hybrid/.test(t)) return "IBRIDO";
  if (/online|virtual|remoto|zoom/.test(t)) return "ONLINE";
  return "PRESENZA";
}

export function dirigenzaDa(s: string | null | undefined): Dirigenza | null {
  const t = norm(s);
  if (!t) return null;
  if (/vice/.test(t)) return "VICEPRESIDENTE";
  if (/presiden/.test(t)) return "PRESIDENTE";
  if (/formazion|education|educazion/.test(t)) return "FORMAZIONE";
  if (/event/.test(t)) return "EVENTI";
  return null;
}

// ─── L'ordine dentro il capitolo ────────────────────────────────────────────

export const OBIETTIVO_121_SETTIMANA = 10;
/** Richieste di 121 tenute aperte: qualcuno non risponde o rimanda. */
export const RICHIESTE_APERTE = 15;
/** Capitoli lavorati insieme, per arrivare presto a un terzo di ciascuno. */
export const CAPITOLI_IN_CORSO = 2;
/** Dopo quanti giorni una richiesta senza risposta non blocca più chi viene dopo. */
export const GIORNI_SENZA_RISPOSTA = 7;
/** La visita al capitolo si propone quando hai conosciuto questa parte dei membri. */
export const SOGLIA_VISITA = 1 / 3;

export interface MembroPerRegole {
  id: string;
  name: string;
  profession: string | null;
  company: string | null;
  phone: string | null;
  leadershipRole: string | null;
  conosciuto: boolean;
  /** Indicato dal presidente come attivo o interessante. */
  indicato: boolean;
  /** Ultima richiesta di 121 preparata (in cassetta o già mandata). */
  richiestaAt: Date | null;
  /** 121 in calendario. */
  fissato121At: Date | null;
  /** Alessio ha scartato la richiesta di recente ("non ora"): non si ripropone e non blocca gli altri. */
  rinviato: boolean;
}

export type Motivo = "STESSO_RUOLO" | "DIRIGENZA" | "PRESIDENTE" | "INDICATO" | "ALTRI";

export interface Gruppo {
  motivo: Motivo;
  membri: MembroPerRegole[];
}

const DIRIGENZA_PRIMA: string[] = ["PRESIDENTE", "FORMAZIONE", "EVENTI"];

function perNome(a: MembroPerRegole, b: MembroPerRegole): number {
  // Prima chi ha un telefono (gli si può scrivere), poi in ordine alfabetico.
  if (!!a.phone !== !!b.phone) return a.phone ? -1 : 1;
  return a.name.localeCompare(b.name, "it");
}

/**
 * I gruppi del capitolo, nell'ordine in cui vanno incontrati. Ogni membro compare una volta sola,
 * nel primo gruppo che lo riguarda; i gruppi vuoti si tolgono.
 *
 * Se la dirigenza non è nota (il capitolo non è mai stato letto da BNI Connect) l'ordine non si
 * può rispettare: si può solo partire da chi fa il mestiere di Alessio, poi si aspetta la mappa.
 */
export function gruppiCapitolo(membri: MembroPerRegole[], dirigenzaNota = true): Gruppo[] {
  const usati = new Set<string>();
  const prendi = (motivo: Motivo, filtro: (m: MembroPerRegole) => boolean): Gruppo => {
    const scelti = membri.filter((m) => !usati.has(m.id) && filtro(m)).sort(perNome);
    scelti.forEach((m) => usati.add(m.id));
    return { motivo, membri: scelti };
  };
  const haRuolo = membri.some((m) => stessoRuolo(m.profession, m.company));
  if (!dirigenzaNota) {
    return [prendi("STESSO_RUOLO", (m) => stessoRuolo(m.profession, m.company))].filter((g) => g.membri.length);
  }
  const gruppi = haRuolo
    ? [
        prendi("STESSO_RUOLO", (m) => stessoRuolo(m.profession, m.company)),
        prendi("DIRIGENZA", (m) => DIRIGENZA_PRIMA.includes(m.leadershipRole ?? "")),
        prendi("INDICATO", (m) => m.indicato),
        prendi("ALTRI", () => true),
      ]
    : [
        prendi("PRESIDENTE", (m) => m.leadershipRole === "PRESIDENTE"),
        prendi("INDICATO", (m) => m.indicato),
        prendi("ALTRI", () => true),
      ];
  return gruppi.filter((g) => g.membri.length);
}

/** Un gruppo è "chiuso" quando ognuno è conosciuto o non ha risposto entro 7 giorni. */
function gruppoChiuso(g: Gruppo, oggi: Date): boolean {
  const limite = oggi.getTime() - GIORNI_SENZA_RISPOSTA * 86400_000;
  return g.membri.every((m) => m.conosciuto || m.rinviato || (m.richiestaAt && m.richiestaAt.getTime() <= limite && !m.fissato121At));
}

export interface ProssimoMembro {
  membro: MembroPerRegole;
  motivo: Motivo;
}

/**
 * Le prossime persone a cui chiedere un 121 in questo capitolo: quelle del primo gruppo non
 * ancora chiuso, a cui non è già stata chiesta. Chi viene dopo aspetta: prima il collega o il
 * presidente, poi gli altri. Gli "indicati" non esistono finché il presidente non li ha nominati.
 */
export function prossimiDelCapitolo(membri: MembroPerRegole[], oggi: Date, dirigenzaNota = true): ProssimoMembro[] {
  for (const g of gruppiCapitolo(membri, dirigenzaNota)) {
    if (gruppoChiuso(g, oggi)) continue;
    return g.membri
      .filter((m) => !m.conosciuto && !m.rinviato && !m.richiestaAt && !m.fissato121At)
      .map((m) => ({ membro: m, motivo: g.motivo }));
  }
  return [];
}

// ─── Copertura, capitoli in corso, visita ───────────────────────────────────

export interface Copertura {
  totale: number;
  conosciuti: number;
  percentuale: number;
}

export function coperturaCapitolo(membri: Pick<MembroPerRegole, "conosciuto">[]): Copertura {
  const conosciuti = membri.filter((m) => m.conosciuto).length;
  return { totale: membri.length, conosciuti, percentuale: membri.length ? Math.round((conosciuti / membri.length) * 100) : 0 };
}

export interface CapitoloPerScelta {
  id: string;
  nome: string;
  sardo: boolean;
  mio: boolean;
  conosciuti: number;
  totale: number;
  /** Ha qualcuno a cui chiedere adesso. */
  daChiedere: number;
}

/**
 * I capitoli da lavorare adesso: prima la Sardegna; dentro, prima quelli già iniziati, poi il
 * capitolo di Alessio, poi gli altri. Restano fuori quelli finiti o senza nessuno da chiedere.
 */
export function capitoliInCorso(capitoli: CapitoloPerScelta[], n = CAPITOLI_IN_CORSO): CapitoloPerScelta[] {
  const rango = (c: CapitoloPerScelta) => (c.sardo ? 0 : 3) + (c.conosciuti > 0 ? 0 : c.mio ? 1 : 2);
  return capitoli
    .filter((c) => c.totale > 0 && c.conosciuti < c.totale && c.daChiedere > 0)
    .sort((a, b) => rango(a) - rango(b) || b.conosciuti / b.totale - a.conosciuti / a.totale || a.nome.localeCompare(b.nome, "it"))
    .slice(0, n);
}

/** La dirigenza è nota se il capitolo è stato letto da BNI Connect o qualcuno ha un ruolo. */
export function dirigenzaNota(capitolo: { mappedAt: Date | null }, membri: Pick<MembroPerRegole, "leadershipRole">[]): boolean {
  return !!capitolo.mappedAt || membri.some((m) => !!m.leadershipRole);
}

/** La visita si propone a un terzo dei membri conosciuti; non al capitolo di Alessio (ne è membro). */
export function visitaDaProporre(c: { conosciuti: number; totale: number; visitStatus: string | null; mio?: boolean }): boolean {
  if (c.mio) return false;
  if (c.totale < 3) return false;
  if (c.visitStatus === "VISITA_PIANIFICATA" || c.visitStatus === "VISITATO") return false;
  return c.conosciuti / c.totale >= SOGLIA_VISITA;
}

/** Il formato del 121: dal formato del capitolo. */
export function formato121(f: Formato): "PRESENZA" | "ONLINE" | "A_SCELTA" {
  return f === "PRESENZA" ? "PRESENZA" : f === "ONLINE" ? "ONLINE" : "A_SCELTA";
}

// ─── La settimana ───────────────────────────────────────────────────────────

const FUSO = "Europe/Rome";

/** Mezzanotte (ora di Roma) del giorno di `oggi`, spostata di `giorni` (negativo = indietro). */
export function mezzanotteRoma(oggi: Date, giorni = 0): Date {
  const parti = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
      .formatToParts(oggi)
      .map((p) => [p.type, p.value])
  );
  const romaComeUtc = Date.UTC(+parti.year, +parti.month - 1, +parti.day, +parti.hour % 24, +parti.minute, +parti.second);
  const scarto = romaComeUtc - Math.floor(oggi.getTime() / 1000) * 1000;
  return new Date(Date.UTC(+parti.year, +parti.month - 1, +parti.day + giorni) - scarto);
}

/** Lunedì 00:00 (ora di Roma) della settimana di `oggi`, e il lunedì dopo. */
export function settimanaDi(oggi: Date): { inizio: Date; fine: Date } {
  const parti = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
      .formatToParts(oggi)
      .map((p) => [p.type, p.value])
  );
  const giorni = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(parti.weekday);
  // Differenza fra l'ora di Roma e UTC in questo momento.
  const romaComeUtc = Date.UTC(+parti.year, +parti.month - 1, +parti.day, +parti.hour % 24, +parti.minute, +parti.second);
  const scarto = romaComeUtc - Math.floor(oggi.getTime() / 1000) * 1000;
  const inizio = new Date(Date.UTC(+parti.year, +parti.month - 1, +parti.day - giorni) - scarto);
  return { inizio, fine: new Date(inizio.getTime() + 7 * 86400_000) };
}

/** Le regioni da mappare, nell'ordine: prima la Sardegna. */
export const REGIONI_ITALIA = [
  "Sardegna", "Lazio", "Lombardia", "Toscana", "Emilia-Romagna", "Veneto", "Piemonte", "Campania", "Sicilia",
  "Puglia", "Liguria", "Marche", "Umbria", "Abruzzo", "Friuli-Venezia Giulia", "Trentino-Alto Adige",
  "Calabria", "Basilicata", "Molise", "Valle d'Aosta",
] as const;

/** Ogni quanto si rilegge una regione su BNI Connect (i ruoli cambiano). */
export function giorniTraMappe(regione: string): number {
  return norm(regione) === "sardegna" ? 30 : 90;
}
