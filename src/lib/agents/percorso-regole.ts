/**
 * Il percorso (v3.62, Alessio 2026-10-27): ogni azienda sta in UNO dei 4 passi e mostra UNA cosa da fare.
 *
 *   1. Trovate             il CRM la analizza, controlla se chi decide è collegato, tu decidi se approfondire
 *   2. Chi me la presenta  la conosci tu / un ponte forte della cerchia te la presenta
 *   3. In riscaldamento    nessun ponte: commenti sulla pagina dell'azienda, 7 sulla stessa piattaforma
 *   4. Contatto            scrivi a chi decide (o fissi l'incontro se te l'hanno presentata)
 *
 * Se conosci tu la proprietà si salta dal passo 1 al 4. Dopo il contatto l'azienda esce dal percorso
 * (incontro, proposta, cliente: vanno in Trattative). Funzione pura: si prova con i test.
 */
import { COMMENTI_PER_CONTATTO, GIORNI_PROMEMORIA, NOMI_PIATTAFORMA, type Piattaforma } from "./rete-regole";

export type Passo = 1 | 2 | 3 | 4;

export const PASSI: { n: Passo; nome: string; spiega: string }[] = [
  { n: 1, nome: "Trovate", spiega: "il CRM le analizza, tu decidi quali approfondire" },
  { n: 2, nome: "Chi me la presenta", spiega: "la conosci tu o un ponte forte te la presenta" },
  { n: 3, nome: "In riscaldamento", spiega: `nessun ponte: ${COMMENTI_PER_CONTATTO} commenti sulla stessa piattaforma` },
  { n: 4, nome: "Contatto", spiega: "scrivi a chi decide o fissi l'incontro" },
];

/** Chi deve muoversi: tu (c'è un pulsante), il CRM (lavora da solo), qualcun altro (si aspetta). */
export type Tocca = "te" | "crm" | "attesa";

export type Azione =
  | { tipo: "decidi" } // approfondisci / scarta
  | { tipo: "cassetta"; voceId: string; si: string; no: string; testo: string | null; link: string | null }
  | { tipo: "conosco"; nomi: string[] }
  | { tipo: "presentato" } // il ponte me l'ha presentata
  | { tipo: "incontro" }; // incontro fissato: esce dal percorso

export interface Voce {
  id: string;
  kind: string;
  payload: Record<string, unknown> | null;
}

export interface Stato {
  /** FASCICOLO_BASE: null = analisi veloce in corso. */
  decisione: "IN_ATTESA" | "APPROVATO" | "SCARTATO" | null;
  collegata: boolean;
  lav: {
    fase: string;
    strada: string | null;
    ponte: string | null;
    decisore: string | null;
    chiestaAt: Date | null;
    presentatoAt: Date | null;
  } | null;
  /** La piattaforma con più commenti fatti, e quanti. */
  commenti: { piattaforma: Piattaforma; fatti: number } | null;
  /** Le voci della Cassetta ancora da decidere per quest'azienda. */
  voci: Voce[];
  daConfermare: string[];
}

export type Esito =
  | { dentro: true; passo: Passo; tocca: Tocca; cosa: string; azione: Azione | null }
  | { dentro: false; perche: "fuori" | "pausa" | "dopo" };

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

function daCassetta(v: Voce, si: string, no: string): Azione {
  const p = v.payload ?? {};
  return { tipo: "cassetta", voceId: v.id, si, no, testo: str(p.messaggio) ?? str(p.commento), link: str(p.post) };
}

const giorniDa = (d: Date, oggi: Date) => Math.max(0, Math.floor((oggi.getTime() - d.getTime()) / 86400_000));
const nomeDi = (s: Stato) => s.lav?.decisore ?? "chi decide";

export function passoDi(s: Stato, oggi: Date): Esito {
  const voce = (k: string) => s.voci.find((v) => v.kind === k);
  const l = s.lav;

  if (!l) {
    if (s.decisione === "SCARTATO") return { dentro: false, perche: "fuori" };
    if (s.decisione === "IN_ATTESA" && s.collegata) return { dentro: true, passo: 1, tocca: "te", cosa: "Decidi: la approfondisci?", azione: { tipo: "decidi" } };
    if (s.decisione === "APPROVATO") return { dentro: true, passo: 1, tocca: "crm", cosa: "Approfondita: entra al passo 2 appena si libera un posto", azione: null };
    if (s.decisione === "IN_ATTESA") return { dentro: true, passo: 1, tocca: "crm", cosa: "Il CRM controlla se chi decide è collegato a te", azione: null };
    return { dentro: true, passo: 1, tocca: "crm", cosa: "Il CRM la sta analizzando", azione: null };
  }

  if (["INCONTRO", "PROPOSTA", "CLIENTE"].includes(l.fase)) return { dentro: false, perche: "dopo" };
  if (l.fase === "PAUSA") return { dentro: false, perche: "pausa" };

  // Passo 4 — Contatto.
  const contatto = voce("RETE_CONTATTO");
  if (contatto) return { dentro: true, passo: 4, tocca: "te", cosa: `${COMMENTI_PER_CONTATTO} commenti fatti: scrivi a ${nomeDi(s)}`, azione: daCassetta(contatto, "Mandato", "Non ora") };
  const diretto = voce("RETE_DIRETTO");
  if (diretto) return { dentro: true, passo: 4, tocca: "te", cosa: `Scrivi a ${nomeDi(s)}: lo conosci tu`, azione: daCassetta(diretto, "Mandato", "Non ora") };
  const conPonte = l.strada === "BNI" || l.strada === "CERCHIA";
  if (l.fase === "CHIESTA" && conPonte && l.presentatoAt) return { dentro: true, passo: 4, tocca: "te", cosa: `${l.ponte ?? "Il ponte"} te l'ha presentata: fissa l'incontro con ${nomeDi(s)}`, azione: { tipo: "incontro" } };
  if (l.fase === "CHIESTA" && !conPonte) return { dentro: true, passo: 4, tocca: "attesa", cosa: `Hai scritto a ${nomeDi(s)}: aspetti la risposta`, azione: { tipo: "incontro" } };
  if (l.fase === "PONTE_SCELTO" && !conPonte) return { dentro: true, passo: 4, tocca: "crm", cosa: `Il CRM prepara il messaggio per ${nomeDi(s)}`, azione: null };

  // Passo 3 — In riscaldamento.
  if (l.fase === "MAPPATA" && l.strada === "SCALDARE") {
    const pagina = voce("RETE_PAGINA");
    if (pagina) return { dentro: true, passo: 3, tocca: "te", cosa: "Chi decide non si sa: scrivi alla pagina per arrivare a lui", azione: daCassetta(pagina, "Mandato", "Non serve") };
    const c = s.commenti;
    const conto = c ? `${c.fatti} di ${COMMENTI_PER_CONTATTO} su ${NOMI_PIATTAFORMA[c.piattaforma]}` : `0 di ${COMMENTI_PER_CONTATTO}`;
    const commento = voce("COMMENTO_LINKEDIN");
    if (commento) return { dentro: true, passo: 3, tocca: "te", cosa: `Commenta il post (${conto})`, azione: daCassetta(commento, "Commentato", "Salta") };
    return { dentro: true, passo: 3, tocca: "crm", cosa: `Commenti: ${conto}. Il CRM cerca il prossimo post`, azione: null };
  }

  // Passo 2 — Chi me la presenta.
  if (l.fase === "MAPPATA" && l.strada === "DA_CONFERMARE" && s.daConfermare.length) {
    return { dentro: true, passo: 2, tocca: "te", cosa: "Conosci davvero qualcuno di questi?", azione: { tipo: "conosco", nomi: s.daConfermare } };
  }
  if (l.fase === "MAPPATA" && l.strada === "IN_ATTESA_PONTE") return { dentro: true, passo: 2, tocca: "attesa", cosa: "Il ponte giusto sta già presentando un'altra azienda: un favore alla volta", azione: null };
  if (l.fase === "MAPPATA") return { dentro: true, passo: 2, tocca: "crm", cosa: "Il CRM cerca chi te la può presentare", azione: null };
  const ponte = voce("RETE_PONTE");
  if (ponte) return { dentro: true, passo: 2, tocca: "te", cosa: `Chiedi a ${l.ponte ?? "il ponte"} di presentarti ${nomeDi(s)}`, azione: daCassetta(ponte, "Mandato", "Non ora: prova un altro") };
  const promemoria = voce("RETE_PROMEMORIA");
  if (promemoria) return { dentro: true, passo: 2, tocca: "te", cosa: `${l.ponte ?? "Il ponte"} non ha ancora risposto: mandagli il promemoria`, azione: daCassetta(promemoria, "Mandato", "Non serve") };
  if (l.fase === "CHIESTA") {
    const g = l.chiestaAt ? giorniDa(l.chiestaAt, oggi) : 0;
    return { dentro: true, passo: 2, tocca: "attesa", cosa: `Aspetti ${l.ponte ?? "il ponte"} (${g} ${g === 1 ? "giorno" : "giorni"}; promemoria al ${GIORNI_PROMEMORIA}°)`, azione: { tipo: "presentato" } };
  }
  return { dentro: true, passo: 2, tocca: "crm", cosa: "Il CRM prepara il messaggio per il ponte", azione: null };
}

/**
 * Il passo di oggi: le aziende dove tocca a te, prima quelle più vicine al contatto (lì ci sono i soldi),
 * a parità le più vecchie. Al massimo `quante`.
 */
export function passoDiOggi<T extends { esito: Esito; da: number }>(aziende: T[], quante = 5): T[] {
  return aziende
    .filter((a) => a.esito.dentro && a.esito.tocca === "te")
    .sort((a, b) => (b.esito.dentro && a.esito.dentro ? b.esito.passo - a.esito.passo : 0) || a.da - b.da)
    .slice(0, quante);
}
