/**
 * Motore 121 — le regole del flusso BNI-first deciso con Alessio il 2026-10-20, in funzioni pure
 * (niente DB). Vedi PROGETTO-AGENTI.md "Il flusso, riprogettato" e docs/motore-121.html.
 *
 *   - 20 richieste di 121 a settimana, preparate alle 14 dei giorni feriali e mandate al pomeriggio;
 *     tetto di 12 121 fissati a settimana.
 *   - LinkedIn: 10-15 inviti al giorno (max 100 a settimana), al massimo 25 letture al giorno fra
 *     tutti gli agenti di browser; dopo un blocco o un CAPTCHA, 48 ore di stop.
 *   - Un'azienda va avanti solo se chi decide è collegato ad Alessio (contatto diretto o almeno un
 *     contatto in comune). I punti di contatto pesano un ponte.
 */
import { mezzanotteRoma } from "./bni-regole";
import { TETTO_121_BNI, settimanaConPosto } from "./rete-regole";

// ─── Le richieste di 121 ────────────────────────────────────────────────────

export const RICHIESTE_SETTIMANA = 20;
/** 121 BNI a settimana (v3.53: 8, più 2 posti per gli incontri con i presentati; prima erano 12). */
export const TETTO_121_SETTIMANA = TETTO_121_BNI;
/** Le richieste arrivano in Cassetta a quest'ora (Roma) e si mandano fra le 15 e le 18. */
export const ORA_RICHIESTE = 14;

const FUSO = "Europe/Rome";

function giornoSettimana(oggi: Date): number {
  const g = new Intl.DateTimeFormat("en-US", { timeZone: FUSO, weekday: "short" }).format(oggi);
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(g);
}

export function oraRoma(oggi: Date): number {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: FUSO, hour: "2-digit", hour12: false }).format(oggi)) % 24;
}

export function feriale(oggi: Date): boolean {
  return giornoSettimana(oggi) < 5;
}

/** Giorni feriali che restano nella settimana, oggi compreso (0 nel fine settimana). */
export function ferialiRimasti(oggi: Date): number {
  const g = giornoSettimana(oggi);
  return g < 5 ? 5 - g : 0;
}

export interface StatoRichieste {
  /** Richieste preparate dal Pianificatore da lunedì (anche quelle ancora in Cassetta). */
  preparateSettimana: number;
  /** 121 fatti + fissati questa settimana. */
  questaSettimana: number;
  /** 121 già fissati la settimana prossima. */
  prossimaSettimana: number;
  /** 121 già fissati fra due settimane (l'agenda può essere piena per due settimane). */
  fraDueSettimane?: number;
}

/**
 * Quante richieste preparare oggi: le 20 della settimana divise sui giorni feriali che restano.
 * Zero nel fine settimana e quando il tetto (8 121 BNI) è pieno in tutte e tre le settimane davanti:
 * il tetto si guarda in avanti, perché chi accetta oggi si incontra fra una o due settimane.
 */
export function richiesteDaPreparare(s: StatoRichieste, oggi: Date): number {
  const giorni = ferialiRimasti(oggi);
  if (!giorni) return 0;
  if (settimanaConPosto([s.questaSettimana, s.prossimaSettimana, s.fraDueSettimane ?? 0], TETTO_121_SETTIMANA) === null) return 0;
  const restanti = Math.max(0, RICHIESTE_SETTIMANA - s.preparateSettimana);
  return Math.ceil(restanti / giorni);
}

// ─── LinkedIn: inviti e letture ─────────────────────────────────────────────

export const INVITI_LINKEDIN_GIORNO = 12;
export const INVITI_LINKEDIN_SETTIMANA = 100;
export const LETTURE_LINKEDIN_GIORNO = 25;
export const ORE_STOP_LINKEDIN = 48;
/** Profili dei membri da cercare al giorno (prima erano 20: ora il budget è comune). */
export const PROFILI_MEMBRI_GIORNO = 8;

/** Quante "letture" LinkedIn costa un lavoro di browser (una lettura ≈ una ricerca o un profilo aperto). */
export function lettureDi(agente: string, input?: unknown): number {
  switch (agente) {
    case "linkedin_membri": {
      const membri = (input as { membri?: unknown[] } | null)?.membri;
      return Array.isArray(membri) ? membri.length : PROFILI_MEMBRI_GIORNO;
    }
    case "rete_membro": {
      const aziende = (input as { aziendeDaCercare?: unknown[] } | null)?.aziendeDaCercare;
      return 3 + (Array.isArray(aziende) ? Math.ceil(aziende.length / 2) : 0);
    }
    case "decision_maker":
    case "linkedin_azienda":
      return 2;
    case "cerca_linkedin":
      return 6;
    case "scalda": {
      const d = (input as { decisori?: unknown[] } | null)?.decisori;
      return Array.isArray(d) ? d.length : 5;
    }
    default:
      return 0;
  }
}

export const AGENTI_LINKEDIN = ["linkedin_membri", "rete_membro", "decision_maker", "linkedin_azienda", "cerca_linkedin", "scalda"];

/** Un errore di un lavoro LinkedIn che vuol dire "LinkedIn ci ha notato": si ferma tutto per 48 ore. */
export function bloccoLinkedin(errore: string | null | undefined): boolean {
  return /captcha|bloccat|blocco|verifica (di sicurezza|dell.identit|dell.account)|security (check|verification)|unusual activity|attivit. insolita|limite (di ricerca|di ricerche|commercial|di uso)|commercial use limit|restrict|sospes/i.test(errore ?? "");
}

/** Letture LinkedIn ancora disponibili oggi. */
export function lettureDisponibili(usateOggi: number, bloccoRecente: boolean): number {
  return bloccoRecente ? 0 : Math.max(0, LETTURE_LINKEDIN_GIORNO - usateOggi);
}

/** Inviti di collegamento che Alessio può ancora mandare oggi (solo nei giorni feriali). */
export function invitiDisponibili(oggiInviati: number, settimanaInviati: number, oggi: Date, bloccoRecente = false): number {
  if (!feriale(oggi) || bloccoRecente) return 0;
  return Math.max(0, Math.min(INVITI_LINKEDIN_GIORNO - oggiInviati, INVITI_LINKEDIN_SETTIMANA - settimanaInviati));
}

export function inizioGiorno(oggi: Date): Date {
  return mezzanotteRoma(oggi);
}

// ─── I punti di contatto ────────────────────────────────────────────────────

export const PUNTI = {
  COLLEGAMENTO_DIRETTO: { peso: 3, etichetta: "è già un tuo contatto diretto" },
  MEMBRO_BNI: { peso: 3, etichetta: "il ponte è un membro BNI" },
  STESSA_AZIENDA: { peso: 3, etichetta: "hanno lavorato nella stessa azienda" },
  COMMENTI_RECIPROCI: { peso: 3, etichetta: "si commentano i post" },
  STESSO_GRUPPO: { peso: 2, etichetta: "stesso capitolo o associazione" },
  STESSA_CITTA: { peso: 1, etichetta: "stessa città" },
  STESSA_SCUOLA: { peso: 1, etichetta: "stessa scuola o università" },
} as const;

export type PuntoContatto = keyof typeof PUNTI;

const SINONIMI: [RegExp, PuntoContatto][] = [
  [/diretto|1°|primo grado|gia collegat|già collegat/i, "COLLEGAMENTO_DIRETTO"],
  [/bni/i, "MEMBRO_BNI"],
  [/stessa azienda|lavorato insieme|colleg(hi|a) di lavoro|ex collega|azienda/i, "STESSA_AZIENDA"],
  [/comment|reazion|like|interag/i, "COMMENTI_RECIPROCI"],
  [/capitolo|associazion|gruppo|club|confartigianato|confcommercio|ordine/i, "STESSO_GRUPPO"],
  [/scuola|universit|liceo|istituto|master/i, "STESSA_SCUOLA"],
  [/citt|paese|comune|zona|stessa local/i, "STESSA_CITTA"],
];

/** I punti di contatto scritti dall'agente (codici o parole) diventano i codici, senza doppioni. */
export function puntiDa(raw: unknown): PuntoContatto[] {
  const lista = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(/[,;]/) : [];
  const out = new Set<PuntoContatto>();
  for (const x of lista) {
    if (typeof x !== "string" || !x.trim()) continue;
    const codice = x.trim().toUpperCase().replace(/[\s-]+/g, "_");
    if (codice in PUNTI) {
      out.add(codice as PuntoContatto);
      continue;
    }
    const s = SINONIMI.find(([re]) => re.test(x));
    if (s) out.add(s[1]);
  }
  return [...out];
}

/** La forza di un ponte: la somma dei pesi dei suoi punti di contatto (1 se non se ne conosce nessuno). */
export function forzaPonte(punti: PuntoContatto[]): number {
  if (!punti.length) return 1;
  return punti.reduce((s, p) => s + PUNTI[p].peso, 0);
}

export function etichettePunti(punti: unknown): string[] {
  return puntiDa(punti).map((p) => PUNTI[p].etichetta);
}

// ─── Il collegamento di un'azienda ──────────────────────────────────────────

export interface DecisoreLetto {
  grado?: number | null;
  contattiInComune: string[];
  numeroInComune?: number | null;
}

/**
 * Un'azienda è collegata se chi decide è un contatto diretto di Alessio o ha almeno un contatto in
 * comune con lui. Un dipendente collegato non basta: l'agente riporta solo chi decide.
 */
export function collegamentoDa(decisori: DecisoreLetto[]): { collegata: boolean; inComune: number; diretto: boolean } {
  const diretto = decisori.some((d) => d.grado === 1);
  const inComune = Math.max(0, ...decisori.map((d) => Math.max(d.contattiInComune.length, d.numeroInComune ?? 0)));
  return { collegata: diretto || inComune > 0, inComune, diretto };
}

/** Aziende in attesa (giro veloce o controllo del collegamento) oltre le quali Maps si ferma. */
export const SERBATOIO_MAX = 40;
/** Un'azienda senza collegamento si ricontrolla dopo un nuovo 121, ma non prima di 30 giorni. */
export const GIORNI_RICONTROLLO = 30;

// ─── I messaggi senza AI ────────────────────────────────────────────────────

const nomeProprio = (n: string) => n.trim().split(/\s+/)[0] ?? n;

/** Il messaggio WhatsApp con cui Alessio chiede a un membro la presentazione promessa al 121. */
export function messaggioPresentazione(membro: string, persona: string, azienda: string | null): string {
  return `Ciao ${nomeProprio(membro)}, grazie ancora per il 121. Come ci eravamo detti, mi presenteresti ${persona}${azienda ? ` di ${azienda}` : ""}? Basta un messaggio a tre, poi ci penso io. Grazie! Alessio`;
}
