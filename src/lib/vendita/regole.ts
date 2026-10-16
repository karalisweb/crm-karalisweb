/**
 * Pipeline di vendita — le regole, in funzioni pure (niente DB, niente UI).
 *
 *   Call di vendita → follow-up o lettera strategica → recall o incarico → exit o nurturing.
 *
 * Il primo incarico che si propone è il Metodo SD (percorso strategico); sito e servizi
 * operativi vengono dopo, come conseguenza del Documento Strategico.
 */

export const STADI = {
  CALL_FISSATA: { label: "Call fissata", icona: "📅", aperto: true },
  CALL_FATTA: { label: "Call fatta", icona: "🎙️", aperto: true },
  FOLLOW_UP: { label: "Follow-up", icona: "↩️", aperto: true },
  LETTERA_INVIATA: { label: "Lettera inviata", icona: "✉️", aperto: true },
  RECALL: { label: "Recall", icona: "📞", aperto: true },
  INCARICO: { label: "Incarico", icona: "🏆", aperto: false },
  EXIT: { label: "Exit", icona: "🚪", aperto: false },
  NURTURING: { label: "Nurturing", icona: "🌱", aperto: true },
} as const;

export type Stadio = keyof typeof STADI;
export const ORDINE_STADI = Object.keys(STADI) as Stadio[];

export const ORIGINI = {
  squadra: "Squadra (ricerca)",
  bni: "BNI",
  opportunita: "Opportunità",
  passaparola: "Passaparola",
  sito: "Dal sito",
  cliente: "Cliente esistente",
} as const;
export type Origine = keyof typeof ORIGINI;

export const MOTIVI_USCITA = [
  "Non interessato",
  "Nessun budget",
  "Non si è presentato alla call",
  "Sparito dopo la lettera",
  "Ha scelto un altro",
  "Non è il momento",
  "Fuori target",
  "Altro",
] as const;

/** Da dove si può andare dove. Incarico ed Exit sono la fine della trattativa. */
export const TRANSIZIONI: Record<Stadio, Stadio[]> = {
  CALL_FISSATA: ["CALL_FATTA", "EXIT"],
  CALL_FATTA: ["FOLLOW_UP", "LETTERA_INVIATA", "INCARICO", "NURTURING", "EXIT"],
  FOLLOW_UP: ["LETTERA_INVIATA", "RECALL", "INCARICO", "NURTURING", "EXIT"],
  LETTERA_INVIATA: ["RECALL", "INCARICO", "NURTURING", "EXIT"],
  RECALL: ["FOLLOW_UP", "LETTERA_INVIATA", "INCARICO", "NURTURING", "EXIT"],
  NURTURING: ["CALL_FISSATA", "EXIT"],
  INCARICO: [],
  EXIT: [],
};

export function puoPassare(da: Stadio, a: Stadio): boolean {
  return TRANSIZIONI[da].includes(a);
}

/** Giorni di attesa prima del passo successivo, per stadio. */
export const ATTESA_GIORNI: Partial<Record<Stadio, number>> = {
  FOLLOW_UP: 3,
  LETTERA_INVIATA: 7,
  RECALL: 7,
  NURTURING: 45,
};

/** Cosa si aspetta in ogni stadio, se non lo dice Alessio o un agente. */
export const PASSO_DEFAULT: Partial<Record<Stadio, string>> = {
  CALL_FISSATA: "Call di vendita",
  CALL_FATTA: "Incollare la trascrizione e mandare la lettera",
  FOLLOW_UP: "Risposta al follow-up",
  LETTERA_INVIATA: "Risposta alla lettera strategica",
  RECALL: "Risposta al recall",
  NURTURING: "Prossimo messaggio di nurturing",
};

/** Dopo quanti recall senza risposta si propone il nurturing. */
export const RECALL_MASSIMI = 2;
/** Quanto prima della call il Preparatore la prepara. */
export const PREPARAZIONE_ORE_PRIMA = 36;
/** Sotto questa lunghezza la trascrizione non basta al Dopo-call. */
export const TRASCRIZIONE_MINIMA = 200;

export function prossimaDataDefault(stadio: Stadio, oggi: Date): Date | null {
  const g = ATTESA_GIORNI[stadio];
  return g ? new Date(oggi.getTime() + g * 86400_000) : null;
}

export type AgenteVendita = "preparazione_call" | "dopo_call" | "recall" | "nurturing";

export interface TrattativaPerRegole {
  stadio: Stadio;
  callAt: Date | null;
  trascrizione: string | null;
  prossimaData: Date | null;
  recallFatti: number;
  ultimoNurturingAt: Date | null;
  /** Quando è entrata nello stadio attuale. */
  stadioDal: Date;
  /** Agenti che hanno già un lavoro aperto (voce in cassetta da decidere) o già fatto per questo passo. */
  giaFatto: Set<AgenteVendita>;
}

/** Quale agente deve lavorare adesso su questa trattativa (al massimo uno). */
export function agenteDaFare(t: TrattativaPerRegole, oggi: Date): AgenteVendita | null {
  const ora = oggi.getTime();
  switch (t.stadio) {
    case "CALL_FISSATA":
      if (t.callAt && !t.giaFatto.has("preparazione_call")) {
        const mancano = t.callAt.getTime() - ora;
        if (mancano <= PREPARAZIONE_ORE_PRIMA * 3600_000 && mancano > -2 * 3600_000) return "preparazione_call";
      }
      return null;
    case "CALL_FATTA":
      if ((t.trascrizione?.trim().length ?? 0) >= TRASCRIZIONE_MINIMA && !t.giaFatto.has("dopo_call")) return "dopo_call";
      return null;
    case "FOLLOW_UP":
    case "LETTERA_INVIATA":
    case "RECALL":
      if (t.prossimaData && t.prossimaData.getTime() <= ora && !t.giaFatto.has("recall")) return "recall";
      return null;
    case "NURTURING": {
      const da = t.ultimoNurturingAt ?? t.stadioDal;
      if (ora - da.getTime() >= (ATTESA_GIORNI.NURTURING ?? 45) * 86400_000 && !t.giaFatto.has("nurturing")) return "nurturing";
      return null;
    }
    default:
      return null;
  }
}

/** La trattativa aspetta Alessio da troppo? (per evidenziarla in rosso) */
export function inRitardo(t: { stadio: Stadio; prossimaData: Date | null; callAt: Date | null }, oggi: Date): boolean {
  if (!STADI[t.stadio].aperto) return false;
  if (t.stadio === "CALL_FISSATA") return !!t.callAt && t.callAt.getTime() < oggi.getTime() - 24 * 3600_000;
  return !!t.prossimaData && t.prossimaData.getTime() < oggi.getTime();
}

/** Cosa fare dopo l'approvazione del Dopo-call, a seconda della sua raccomandazione. */
export const DOPO_CALL_A_STADIO: Record<string, Stadio> = {
  LETTERA: "LETTERA_INVIATA",
  FOLLOW_UP: "FOLLOW_UP",
  NURTURING: "NURTURING",
  EXIT: "EXIT",
};
