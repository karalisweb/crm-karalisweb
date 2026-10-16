/**
 * Squadra BNI — le regole di Alessio, in funzioni pure (niente DB).
 *
 *   Sardegna            → farsi conoscere da TUTTI i membri (copertura).
 *   Resto d'Italia, per capitolo:
 *     c'è un collega con il mio ruolo (web/marketing)  → contattarlo per collaborare;
 *     il mio ruolo è scoperto e il capitolo è online/ibrido → partecipare alla riunione;
 *     il mio ruolo è scoperto e il capitolo è in presenza  → 121 con presidente,
 *                                                             vicepresidente, resp. formazione.
 */

export type Formato = "PRESENZA" | "ONLINE" | "IBRIDO";
export type Dirigenza = "PRESIDENTE" | "VICEPRESIDENTE" | "FORMAZIONE";
export type TipoAzione = "COPERTURA" | "COLLABORAZIONE" | "VISITA" | "121_DIRIGENZA" | "MAPPARE";

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
  return null;
}

export interface MembroPerRegole {
  id: string;
  name: string;
  profession: string | null;
  company: string | null;
  phone: string | null;
  leadershipRole: string | null;
  conosciuto: boolean;
  /** Priorità per i 121 (punteggio cliente/partner): più alto = prima. */
  priorita: number;
}

export interface Copertura {
  totale: number;
  conosciuti: number;
  percentuale: number;
  mancanti: { id: string; name: string; profession: string | null }[];
}

export function coperturaCapitolo(membri: MembroPerRegole[]): Copertura {
  const conosciuti = membri.filter((m) => m.conosciuto).length;
  return {
    totale: membri.length,
    conosciuti,
    percentuale: membri.length ? Math.round((conosciuti / membri.length) * 100) : 0,
    mancanti: membri
      .filter((m) => !m.conosciuto)
      .sort((a, b) => b.priorita - a.priorita)
      .map((m) => ({ id: m.id, name: m.name, profession: m.profession })),
  };
}

export interface Destinatario {
  membroId: string;
  nome: string;
  ruolo: string;
  telefono: string | null;
}

export interface AzioneCapitolo {
  tipo: TipoAzione;
  motivo: string;
  destinatari: Destinatario[];
}

/** Quanti membri sardi proporre ogni volta per la copertura (per non sommergere la cassetta). */
export const COPERTURA_PER_VOLTA = 5;

export function azioneCapitolo(c: {
  nome: string;
  sardo: boolean;
  formato: Formato;
  giorno: string | null;
  ora: string | null;
  membri: MembroPerRegole[];
}): AzioneCapitolo {
  const dest = (m: MembroPerRegole, ruolo: string): Destinatario => ({ membroId: m.id, nome: m.name, ruolo, telefono: m.phone });

  if (c.sardo) {
    const cop = coperturaCapitolo(c.membri);
    const prossimi = c.membri
      .filter((m) => !m.conosciuto)
      .sort((a, b) => b.priorita - a.priorita)
      .slice(0, COPERTURA_PER_VOLTA);
    return {
      tipo: "COPERTURA",
      motivo: `${c.nome}: conosci ${cop.conosciuti} membri su ${cop.totale} (${cop.percentuale}%). In Sardegna l'obiettivo è conoscerli tutti: ecco i prossimi ${prossimi.length}.`,
      destinatari: prossimi.map((m) => dest(m, m.profession ?? "membro")),
    };
  }

  const colleghi = c.membri.filter((m) => stessoRuolo(m.profession, m.company));
  if (colleghi.length) {
    return {
      tipo: "COLLABORAZIONE",
      motivo: `${c.nome} ha già ${colleghi.length === 1 ? "un collega" : `${colleghi.length} colleghi`} con il tuo ruolo: proponigli una collaborazione invece di entrare in concorrenza.`,
      destinatari: colleghi.map((m) => dest(m, m.profession ?? "collega")),
    };
  }

  if (c.formato !== "PRESENZA") {
    const dirigenti = c.membri.filter((m) => m.leadershipRole);
    const quando = [c.giorno, c.ora].filter(Boolean).join(" alle ");
    return {
      tipo: "VISITA",
      motivo: `${c.nome} non ha nessuno con il tuo ruolo ed è ${c.formato === "ONLINE" ? "online" : "ibrido"}: partecipa alla riunione${quando ? ` (${quando})` : ""} come ospite.`,
      destinatari: dirigenti.map((m) => dest(m, m.leadershipRole!.toLowerCase())),
    };
  }

  const dirigenti = c.membri.filter((m) => m.leadershipRole);
  if (!dirigenti.length) {
    return {
      tipo: "MAPPARE",
      motivo: `${c.nome} è in presenza e il tuo ruolo è scoperto, ma non si sa chi è nella dirigenza: il Cartografo deve leggerla da BNI Connect.`,
      destinatari: [],
    };
  }
  return {
    tipo: "121_DIRIGENZA",
    motivo: `${c.nome} è in presenza e il tuo ruolo è scoperto: chiedi un 121 a presidente, vicepresidente e responsabile formazione.`,
    destinatari: dirigenti.map((m) => dest(m, m.leadershipRole!.toLowerCase())),
  };
}

/** Le regioni da mappare, nell'ordine: prima la Sardegna. */
export const REGIONI_ITALIA = [
  "Sardegna", "Lazio", "Lombardia", "Toscana", "Emilia-Romagna", "Veneto", "Piemonte", "Campania", "Sicilia",
  "Puglia", "Liguria", "Marche", "Umbria", "Abruzzo", "Friuli-Venezia Giulia", "Trentino-Alto Adige",
  "Calabria", "Basilicata", "Molise", "Valle d'Aosta",
] as const;
