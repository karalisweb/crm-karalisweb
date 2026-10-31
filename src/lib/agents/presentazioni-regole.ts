/**
 * Le presentazioni da chiedere (v3.68.0) — le regole in funzioni pure (niente DB). Confermate da Alessio
 * il 2026-10-31, dopo il 121 con Laura Uleri (Maestrale) che gli ha segnalato Piscine Arcobaleno da sola:
 * il CRM doveva arrivarci prima.
 *
 *   - Per ogni persona due liste separate: i MEMBRI del suo capitolo da farsi presentare (diventano 121)
 *     e le AZIENDE da farsi presentare (diventano possibili clienti).
 *   - Aziende, in ordine: quelle viste fra i suoi collegamenti LinkedIn, poi i suoi rapporti stretti
 *     (detti al 121), poi quelle della sua zona nei settori dei casi studio (più forti) o che interessano.
 *   - Che persona è: digital (un collega), nei settori dei casi studio, nei settori che interessano,
 *     acceleratore (avvocato, commercialista…: conosce tante aziende) o altro.
 *   - Si chiede per nome di chi decide, non per categoria; al massimo 3 richieste per conversazione.
 */
import { norm, stessoRuolo } from "./bni-regole";
import { ZONE, siglaIndirizzo, siglaZona } from "@/lib/ricerca/regole";

// ─── Che persona è ──────────────────────────────────────────────────────────

export type TipoPersona = "DIGITAL" | "ACCELERATORE" | "SETTORE_CASO" | "SETTORE_INTERESSE" | "ALTRO";

export const ETICHETTE_TIPO: Record<TipoPersona, string> = {
  DIGITAL: "digital, un collega",
  ACCELERATORE: "acceleratore: conosce tante aziende",
  SETTORE_CASO: "settore dei casi studio",
  SETTORE_INTERESSE: "settore che interessa",
  ALTRO: "altro",
};

/** Chi per mestiere vede tante aziende: vale di più come ponte. */
const ACCELERATORI = [
  /commercialist|ragionier|tributarist|consulente fiscal|studio contabil/, /avvocat|studio legal/, /notai/,
  /consulente del lavoro|paghe/, /finanza agevolat|bandi|incentiv/, /assicuraz|assicurativ|broker/,
  /mediatore creditiz|credito|finanziament|\bbanc/, /consulenza aziendal|consulente aziendal|business coach/,
  /sicurezza sul lavoro|rspp/, /immobiliar/,
];

/** Le parole dei settori: dai casi studio (termini) e dai settori più larghi (termini del settore). */
export interface Settori {
  caso: string[];
  interesse: string[];
}

/** "piscine" trova "piscina": si confronta la radice di ogni parola lunga del termine. */
function radici(termine: string): string[] {
  return norm(termine)
    .split(/[^a-z]+/)
    .filter((p) => p.length >= 5 && !["costruzione", "manutenzione", "installazione", "riparazione", "accessori", "servizi", "centri"].includes(p))
    .map((p) => p.slice(0, -1));
}

export function nelSettore(testo: string | null | undefined, termini: string[]): boolean {
  const t = norm(testo);
  if (!t) return false;
  return termini.some((x) => {
    const r = radici(x);
    return r.length > 0 && r.every((p) => t.includes(p));
  });
}

export function settoreDi(testo: string | null | undefined, s: Settori): "CASO" | "INTERESSE" | null {
  if (nelSettore(testo, s.caso)) return "CASO";
  if (nelSettore(testo, s.interesse)) return "INTERESSE";
  return null;
}

/** Conta la categoria BNI (il mestiere); il nome dell'azienda aiuta solo per i settori. */
export function tipoPersona(categoria: string | null | undefined, azienda: string | null | undefined, s: Settori): TipoPersona {
  if (stessoRuolo(categoria)) return "DIGITAL";
  const t = norm(categoria);
  if (ACCELERATORI.some((r) => r.test(t))) return "ACCELERATORE";
  const settore = settoreDi(`${categoria ?? ""} ${azienda ?? ""}`, s);
  if (settore === "CASO") return "SETTORE_CASO";
  if (settore === "INTERESSE") return "SETTORE_INTERESSE";
  return "ALTRO";
}

// ─── La zona ────────────────────────────────────────────────────────────────

export interface Zona {
  citta: string | null;
  provincia: string | null;
}

/** La zona scritta in un testo (indirizzo, note, città del capitolo): la sigla e una delle città note. */
export function zonaDa(...testi: (string | null | undefined)[]): Zona {
  let citta: string | null = null;
  let provincia: string | null = null;
  for (const testo of testi) {
    if (!testo) continue;
    provincia ??= siglaIndirizzo(testo);
    const t = norm(testo);
    // Prima le città con il nome più lungo ("Porto Torres" prima di "Torres").
    const trovata = [...ZONE].sort((a, b) => b.length - a.length).find((z) => new RegExp(`\\b${norm(z).replace(/[^a-z ]/g, ".")}\\b`).test(t));
    if (trovata) {
      citta ??= trovata;
      provincia ??= siglaZona(trovata);
    }
    if (citta && provincia) break;
  }
  return { citta, provincia };
}

export function stessaZona(a: Zona, b: Zona): boolean {
  if (a.provincia && b.provincia) return a.provincia === b.provincia;
  return !!a.citta && !!b.citta && a.citta === b.citta;
}

// ─── Le due liste ───────────────────────────────────────────────────────────

/** Un membro del capitolo che Alessio non ha ancora sentito. */
export interface MembroDaPresentare {
  id: string;
  nome: string;
  categoria: string | null;
  azienda: string | null;
  tipo: TipoPersona;
  punteggio: number;
}

export type FonteAzienda = "LINKEDIN" | "RAPPORTO" | "ZONA";

export const ETICHETTE_FONTE: Record<FonteAzienda, string> = {
  LINKEDIN: "è fra i suoi collegamenti LinkedIn",
  RAPPORTO: "ci ha un rapporto stretto",
  ZONA: "è nella sua zona",
};

export interface AziendaDaPresentare {
  /** La presentazione già segnata (LinkedIn o rapporto stretto); null per quelle trovate dalla zona. */
  presentazioneId: string | null;
  leadId: string | null;
  azienda: string;
  decisore: string | null;
  fonte: FonteAzienda;
  settore: "CASO" | "INTERESSE" | null;
  citta: string | null;
  /** Nella stessa città della persona (non solo nella provincia). */
  stessaCitta?: boolean;
}

/** Prima chi porta clienti (acceleratori e settori dei casi), poi gli altri; i colleghi digital alla fine. */
const ORDINE_MEMBRI: Record<TipoPersona, number> = { ACCELERATORE: 0, SETTORE_CASO: 1, SETTORE_INTERESSE: 2, ALTRO: 3, DIGITAL: 4 };

export function ordinaMembri(m: MembroDaPresentare[]): MembroDaPresentare[] {
  return [...m].sort((a, b) => ORDINE_MEMBRI[a.tipo] - ORDINE_MEMBRI[b.tipo] || b.punteggio - a.punteggio || a.nome.localeCompare(b.nome));
}

const ORDINE_FONTE: Record<FonteAzienda, number> = { LINKEDIN: 0, RAPPORTO: 1, ZONA: 2 };
const ORDINE_SETTORE = (s: AziendaDaPresentare["settore"]) => (s === "CASO" ? 0 : s === "INTERESSE" ? 1 : 2);

/** LinkedIn, poi rapporti stretti, poi la zona; a parità, i settori dei casi studio, la stessa città e chi ha il nome di chi decide. */
export function ordinaAziende(a: AziendaDaPresentare[]): AziendaDaPresentare[] {
  return [...a].sort(
    (x, y) => ORDINE_FONTE[x.fonte] - ORDINE_FONTE[y.fonte] || ORDINE_SETTORE(x.settore) - ORDINE_SETTORE(y.settore) || Number(!x.stessaCitta) - Number(!y.stessaCitta) || Number(!x.decisore) - Number(!y.decisore) || x.azienda.localeCompare(y.azienda),
  );
}

/** Al massimo 3 richieste per conversazione (Alessio, 2026-10-31). */
export const RICHIESTE_PER_CONVERSAZIONE = 3;

/**
 * Cosa chiedere questa volta: fino a 2 membri e il resto aziende, sempre almeno un'azienda se c'è
 * (i membri allargano la rete, le aziende portano i clienti).
 */
export function daChiedereOra<M, A>(membri: M[], aziende: A[]): { membri: M[]; aziende: A[] } {
  const quantiMembri = Math.min(membri.length, 2, aziende.length ? RICHIESTE_PER_CONVERSAZIONE - 1 : RICHIESTE_PER_CONVERSAZIONE);
  return { membri: membri.slice(0, quantiMembri), aziende: aziende.slice(0, RICHIESTE_PER_CONVERSAZIONE - quantiMembri) };
}

// ─── Le frasi pronte ────────────────────────────────────────────────────────

const ruoloDi = (decisore: string) => decisore.match(/\(([^)]+)\)/)?.[1]?.trim() ?? null;

/** Per nome di chi decide; senza il nome si chiede dell'azienda (vale meno). */
export function domandaAzienda(a: Pick<AziendaDaPresentare, "azienda" | "decisore">): string {
  if (a.decisore && !a.azienda) return `Conosci bene ${a.decisore}? Me lo presenti?`;
  if (a.decisore) {
    const ruolo = ruoloDi(a.decisore);
    return ruolo ? `Conosci il ${ruolo.toLowerCase()} di ${a.azienda}? Me lo presenti?` : `Conosci ${a.decisore} di ${a.azienda}? Me lo presenti?`;
  }
  return `Conosci qualcuno in ${a.azienda}? Chi decide lì?`;
}

export function domandaMembro(m: Pick<MembroDaPresentare, "nome" | "categoria">): string {
  return `Mi presenti ${m.nome}${m.categoria ? ` (${m.categoria.toLowerCase()})` : ""}? Nel tuo capitolo non l'ho ancora conosciuto.`;
}
