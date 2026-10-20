/**
 * La rete al centro (v3.53.0) — le regole in funzioni pure (niente DB). Vedi PROGETTO-AGENTI.md
 * "La rete al centro". Casi studio + relazione: la rete di Alessio vince sempre, BNI è un potenziatore.
 *
 *   - Un ponte vale solo se è nella cerchia stretta (membri BNI con un 121 fatto + "lo conosco").
 *   - Le strade, in ordine: membro BNI della cerchia → altro contatto della cerchia → chi decide è nella
 *     cerchia (contatto diretto) → contatto scaldato. Senza strade si chiede "lo conosci?" sui nomi visti.
 *   - Il seguito: promemoria dopo 5 giorni, ponte successivo dopo 10, pausa di 3 mesi dopo 3 tentativi.
 */
import { norm } from "./bni-regole";

// ─── Quante aziende in lavorazione ──────────────────────────────────────────

/** 15 il primo mese, 30 dal secondo (decisione di Alessio del 2026-10-20). */
export const INIZIO_RETE = new Date("2026-10-20T00:00:00+02:00");
export function capienzaLavorazione(oggi: Date): number {
  return oggi.getTime() < INIZIO_RETE.getTime() + 30 * 86400_000 ? 15 : 30;
}

/** Le fasi che occupano un posto fra le 15 (30): con l'incontro l'azienda esce ed entra la prossima. */
export const FASI_ATTIVE = ["MAPPATA", "PONTE_SCELTO", "CHIESTA"] as const;
export const FASI = [...FASI_ATTIVE, "INCONTRO", "PROPOSTA", "CLIENTE", "PAUSA"] as const;
export type Fase = (typeof FASI)[number];

export const ETICHETTE_FASE: Record<Fase, string> = {
  MAPPATA: "mappata",
  PONTE_SCELTO: "ponte scelto",
  CHIESTA: "presentazione chiesta",
  INCONTRO: "incontro",
  PROPOSTA: "proposta",
  CLIENTE: "cliente",
  PAUSA: "in pausa",
};

export const GIORNI_PROMEMORIA = 5;
export const GIORNI_CAMBIO_PONTE = 10;
export const MAX_TENTATIVI = 3;
export const GIORNI_PAUSA = 90;

// ─── La cerchia ─────────────────────────────────────────────────────────────

const parole = (s: string) => norm(s).split(/[^a-z]+/).filter((p) => p.length >= 2);

/** Due nomi sono la stessa persona se le parole del più corto (almeno nome e cognome) stanno nell'altro. */
export function stessaPersona(a: string, b: string): boolean {
  const pa = parole(a);
  const pb = parole(b);
  if (pa.length < 2 || pb.length < 2) return false;
  const [corto, lungo] = pa.length <= pb.length ? [pa, pb] : [pb, pa];
  return corto.every((p) => lungo.includes(p));
}

export function nellaCerchia(nome: string, cerchia: string[]): boolean {
  return cerchia.some((c) => stessaPersona(nome, c));
}

// ─── Le strade verso un'azienda ─────────────────────────────────────────────

export type Strada = "BNI" | "CERCHIA" | "DIRETTO" | "SCALDATO";

export interface Ponte {
  strada: Strada;
  /** Chi chiede la presentazione (BNI/CERCHIA) o chi si contatta direttamente (DIRETTO/SCALDATO). */
  nome: string;
  decisore: string;
  membroId?: string | null;
}

export interface DatiAzienda {
  decisori: { nome: string; grado: number | null; contattiInComune: string[] }[];
  /** Ponti BNI già trovati (incrocio, chi decide): membro e decisore. */
  pontiBni: { membroId: string; membro: string; decisore: string }[];
  scaldata: boolean;
}

/**
 * Le strade possibili, nell'ordine in cui provarle, senza quelle già provate. Un membro BNI vale solo se
 * è nella cerchia (ci ha fatto un 121); un contatto in comune solo se Alessio l'ha segnato "lo conosco".
 */
export function strade(a: DatiAzienda, cerchia: string[], provati: string[] = [], occupati: string[] = []): Ponte[] {
  const out: Ponte[] = [];
  // Un favore alla volta: un ponte che sta già presentando un'altra azienda aspetta (non vale per i contatti diretti).
  const gia = (nome: string) => provati.some((p) => stessaPersona(p, nome)) || out.some((o) => stessaPersona(o.nome, nome));
  const occupato = (nome: string) => occupati.some((p) => stessaPersona(p, nome));
  for (const b of a.pontiBni) if (nellaCerchia(b.membro, cerchia) && !gia(b.membro) && !occupato(b.membro)) out.push({ strada: "BNI", nome: b.membro, decisore: b.decisore, membroId: b.membroId });
  for (const d of a.decisori) {
    for (const c of d.contattiInComune) if (nellaCerchia(c, cerchia) && !gia(c) && !occupato(c)) out.push({ strada: "CERCHIA", nome: c, decisore: d.nome });
  }
  for (const d of a.decisori) if (nellaCerchia(d.nome, cerchia) && !gia(d.nome)) out.push({ strada: "DIRETTO", nome: d.nome, decisore: d.nome });
  if (a.scaldata) for (const d of a.decisori) if (!gia(d.nome) && !out.some((o) => o.nome === d.nome)) out.push({ strada: "SCALDATO", nome: d.nome, decisore: d.nome });
  return out;
}

/** I nomi su cui chiedere "lo conosci?": contatti in comune e decisori già collegati, non ancora in cerchia. */
export function nomiDaConfermare(a: DatiAzienda, cerchia: string[], scartati: string[] = []): string[] {
  const out: string[] = [];
  const add = (n: string) => {
    if (!n || nellaCerchia(n, cerchia) || scartati.some((s) => stessaPersona(s, n)) || out.some((o) => stessaPersona(o, n))) return;
    out.push(n);
  };
  for (const d of a.decisori) if (d.grado === 1) add(d.nome);
  for (const d of a.decisori) d.contattiInComune.forEach(add);
  for (const b of a.pontiBni) add(b.membro);
  return out.slice(0, 6);
}

/** Più alto = da lavorare prima. Serve a scegliere quale azienda entra quando si libera un posto. */
export function forzaAzienda(a: DatiAzienda, cerchia: string[]): number {
  const s = strade(a, cerchia);
  if (s.some((x) => x.strada === "BNI")) return 4;
  if (s.some((x) => x.strada === "CERCHIA")) return 3;
  if (s.some((x) => x.strada === "DIRETTO")) return 3;
  if (s.length) return 2;
  return nomiDaConfermare(a, cerchia).length ? 1 : 0;
}

// ─── Il seguito ─────────────────────────────────────────────────────────────

export type Azione = "NIENTE" | "PROMEMORIA" | "CAMBIA_PONTE" | "PAUSA" | "RIENTRA";

/** Cosa fare oggi su un'azienda in lavorazione. */
export function prossimaAzione(l: { fase: string; chiestaAt: Date | null; promemoriaAt: Date | null; tentativi: number; pausaFino: Date | null; presentatoAt?: Date | null }, oggi: Date): Azione {
  const giorni = (d: Date) => (oggi.getTime() - d.getTime()) / 86400_000;
  if (l.fase === "PAUSA") return l.pausaFino && l.pausaFino <= oggi ? "RIENTRA" : "NIENTE";
  // Presentato: la palla è ad Alessio (fissare l'incontro), niente promemoria al ponte.
  if (l.fase !== "CHIESTA" || !l.chiestaAt || l.presentatoAt) return "NIENTE";
  if (giorni(l.chiestaAt) >= GIORNI_CAMBIO_PONTE) return l.tentativi + 1 >= MAX_TENTATIVI ? "PAUSA" : "CAMBIA_PONTE";
  if (giorni(l.chiestaAt) >= GIORNI_PROMEMORIA && !l.promemoriaAt) return "PROMEMORIA";
  return "NIENTE";
}

// ─── L'agenda in avanti ─────────────────────────────────────────────────────

/** 121 BNI a settimana; altri 2 posti restano per gli incontri con i presentati. */
export const TETTO_121_BNI = 8;
export const POSTI_PRESENTATI = 2;

/**
 * La settimana in cui atterra chi accetta oggi: la prima, fra questa e le prossime due, che ha ancora posto.
 * null = le tre settimane sono piene: le richieste si fermano. (Con l'agenda piena per due settimane, chi
 * accetta oggi si incontra fra due.)
 */
export function settimanaConPosto(fissatiPerSettimana: number[], tetto = TETTO_121_BNI): number | null {
  for (let i = 0; i < Math.min(3, fissatiPerSettimana.length); i++) if (fissatiPerSettimana[i] < tetto) return i;
  return null;
}

// ─── I messaggi (testo di riserva, se l'AI non risponde) ────────────────────

const nomeProprio = (n: string) => n.trim().split(/\s+/)[0] ?? n;

/**
 * Come si nomina chi decide nel messaggio: "Mario Rossi di Azienda", oppure, se si conosce solo il ruolo
 * (profilo intestato all'azienda, es. "Accadueo Sardegna (socio)"), "il socio di Azienda".
 */
export function chiDecideTesto(decisore: string, azienda: string): string {
  const ruolo = decisore.match(/\(([^)]+)\)/)?.[1]?.trim();
  if (ruolo) return `il ${ruolo.toLowerCase()} di ${azienda}`;
  return `${decisore} di ${azienda}`;
}

export function testoRichiestaPonte(ponte: string, decisore: string, azienda: string, motivo: string | null): string {
  return `Ciao ${nomeProprio(ponte)}, una domanda veloce: conosci ${chiDecideTesto(decisore, azienda)}? ${motivo ? `${motivo} ` : ""}Se ti va di presentarci con un messaggio a tre, poi ci penso io. Grazie! Alessio`;
}

export function testoContattoDiretto(decisore: string, azienda: string, motivo: string | null): string {
  return `Ciao ${nomeProprio(decisore)}, ti scrivo perché ${motivo ?? `lavoro con aziende come ${azienda}`}. Ti va di sentirci 20 minuti? Ti racconto cosa abbiamo fatto. Alessio`;
}

export function testoPromemoria(ponte: string, decisore: string): string {
  return `Ciao ${nomeProprio(ponte)}, ti riscrivo solo per sapere se sei riuscito a sentire ${decisore}. Nessuna fretta, e se non è il momento va benissimo. Alessio`;
}
