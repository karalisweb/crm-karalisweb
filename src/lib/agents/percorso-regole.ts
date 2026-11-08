/**
 * Il percorso (v3.62, Alessio 2026-10-27): ogni azienda sta in UNO dei 4 passi e mostra UNA cosa da fare.
 *
 * v3.117 (Alessio, 2026-11-06: "chi me la presenta di fatto non serve"): la relazione si fa direttamente con chi decide.
 *
 *   1. Trovate           il CRM la analizza e cerca chi decide (LinkedIn e Instagram personali)
 *   2. Collegamento      il CRM gli chiede il collegamento su LinkedIn e lo segue su Instagram
 *   3. In riscaldamento  il CRM commenta i suoi post (3 sulla stessa piattaforma); se non pubblica si passa al 4
 *   4. Contatto          WhatsApp o mail col caso studio, poi il follow-up
 *
 * Se conosci tu chi decide si salta dal passo 1 al 4. Chi decide introvabile: l'azienda va in pausa 3 mesi. Dopo il contatto l'azienda esce dal percorso
 * (incontro, proposta, cliente: vanno in Trattative). Funzione pura: si prova con i test.
 */
import { COMMENTI_PER_CONTATTO, GIORNI_PROMEMORIA, NOMI_PIATTAFORMA, STRADA_COLLEGARE, type Piattaforma } from "./rete-regole";

export type Passo = 1 | 2 | 3 | 4;

export const PASSI: { n: Passo; nome: string; spiega: string }[] = [
  { n: 1, nome: "Trovate", spiega: "il CRM le analizza e cerca chi decide" },
  { n: 2, nome: "Collegamento", spiega: "il CRM chiede il collegamento su LinkedIn e segue chi decide su Instagram" },
  { n: 3, nome: "In riscaldamento", spiega: `il CRM commenta i post di chi decide (${COMMENTI_PER_CONTATTO} sulla stessa piattaforma)` },
  { n: 4, nome: "Contatto", spiega: "WhatsApp o mail a chi decide con il caso studio" },
];

/** Chi deve muoversi: tu (c'è un pulsante), il CRM (lavora da solo), qualcun altro (si aspetta). */
export type Tocca = "te" | "crm" | "attesa";

export type Azione =
  | { tipo: "decidi" } // approfondisci / scarta
  | { tipo: "cassetta"; voceId: string; si: string; no: string; testo: string | null; link: string | null; whatsapp?: string | null; email?: string | null; linkedin?: string | null; casoId?: string | null; pagina?: string | null; piattaforma?: string | null }
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

/**
 * Lo stato dell'azienda dentro il passo, nell'ordine in cui si mostrano (Alessio, 2026-10-28: "ordinate per
 * stato: prima tutte quelle dove devi trovare chi decide, poi quelle da analizzare…"). Prima quelli dove tocca a te.
 */
export const STATI = {
  decidi: "Da decidere",
  chi_decide: "Chi decide: da trovare",
  analisi: "In analisi",
  collegamento: "Il CRM cerca chi decide",
  pronta: "Pronte per il passo 2",
  collega: "Il CRM chiede il collegamento",
  conosco: "Conosci qualcuno?",
  ponte: "Da chiedere al ponte",
  promemoria: "Promemoria al ponte",
  aspetti: "Aspetti il ponte",
  occupato: "Il ponte è occupato",
  cerca_ponte: "Il CRM cerca chi te la presenta",
  prepara_ponte: "Il CRM prepara il messaggio al ponte",
  commenta: "Da commentare",
  cerca_post: "Il CRM commenta i post di chi decide",
  ha_risposto: "Ti ha risposto",
  caso: "Caso studio da mandare",
  scrivi: "Da contattare",
  pagina: "Da scrivere all'azienda (chi decide non si sa)",
  incontro: "Incontro da fissare",
  risposta: "Aspetti la risposta",
  followup: "Follow-up da mandare",
  prepara_contatto: "Il CRM prepara il messaggio",
} as const;
export type StatoNelPasso = keyof typeof STATI;
export const ordineStato = (s: StatoNelPasso) => Object.keys(STATI).indexOf(s);

export type Esito =
  | { dentro: true; passo: Passo; tocca: Tocca; stato: StatoNelPasso; cosa: string; azione: Azione | null }
  | { dentro: false; perche: "fuori" | "pausa" | "dopo" };

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

function daCassetta(v: Voce, si: string, no: string): Azione {
  const p = v.payload ?? {};
  // I canali per scrivere subito (v3.87): WhatsApp, mail e LinkedIn di chi decide o del ponte.
  return { tipo: "cassetta", voceId: v.id, si, no, testo: str(p.messaggio) ?? str(p.commento), link: str(p.post), whatsapp: str(p.telefono), email: str(p.email), linkedin: str(p.linkedin), casoId: str(p.casoId), pagina: str(p.pagina), piattaforma: str(p.piattaforma) };
}

const giorniDa = (d: Date, oggi: Date) => Math.max(0, Math.floor((oggi.getTime() - d.getTime()) / 86400_000));
const nomeDi = (s: Stato) => s.lav?.decisore ?? "chi decide";

export function passoDi(s: Stato, oggi: Date): Esito {
  const voce = (k: string) => s.voci.find((v) => v.kind === k);
  const l = s.lav;

  if (!l) {
    if (s.decisione === "SCARTATO") return { dentro: false, perche: "fuori" };
    if (s.decisione === "IN_ATTESA" && s.collegata) return { dentro: true, passo: 1, tocca: "te", stato: "decidi", cosa: "Decidi: la approfondisci?", azione: { tipo: "decidi" } };
    // I posti sono 60 (20 per passo): quello che manca di solito è "chi decide", non il posto.
    if (s.decisione === "APPROVATO") return { dentro: true, passo: 1, tocca: "crm", stato: s.collegata ? "pronta" : "chi_decide", cosa: s.collegata ? "Approfondita: entra al passo 2 al prossimo giro del CRM (alle 7 o alle 14)" : "Approfondita: il CRM cerca chi decide su LinkedIn e Instagram, poi entra al passo 2", azione: null };
    if (s.decisione === "IN_ATTESA") return { dentro: true, passo: 1, tocca: "crm", stato: "collegamento", cosa: "Il CRM cerca chi decide su LinkedIn e Instagram", azione: null };
    return { dentro: true, passo: 1, tocca: "crm", stato: "analisi", cosa: "Il CRM la sta analizzando", azione: null };
  }

  // v3.99: eliminata da Alessio (pulsante Elimina): fuori dal percorso per sempre.
  if (l.fase === "ELIMINATA") return { dentro: false, perche: "fuori" };
  if (["INCONTRO", "PROPOSTA", "CLIENTE"].includes(l.fase)) return { dentro: false, perche: "dopo" };
  if (l.fase === "PAUSA") return { dentro: false, perche: "pausa" };

  // Passo 4 — Contatto.
  // v3.124: una mail di risposta letta dalla casella viene prima di tutto.
  const risposta = voce("RETE_RISPOSTA");
  if (risposta) return { dentro: true, passo: 4, tocca: "te", stato: "ha_risposto", cosa: `${nomeDi(s)} ti ha risposto via mail: "${str(risposta.payload?.estratto) ?? ""}"`, azione: daCassetta(risposta, "La seguo io", "Non è interessato") };
  const contatto = voce("RETE_CONTATTO");
  if (contatto) return { dentro: true, passo: 4, tocca: "te", stato: "scrivi", cosa: `Scrivi a ${nomeDi(s)} con il caso studio (WhatsApp o mail)`, azione: daCassetta(contatto, "Mandato", "Non ora") };
  const diretto = voce("RETE_DIRETTO");
  if (diretto) {
    const inComune = str(diretto.payload?.inComune);
    const viaPonte = diretto.payload && "inComune" in diretto.payload;
    const cosa = inComune ? `Scrivi a ${nomeDi(s)}: avete in comune ${inComune}` : viaPonte ? `Scrivi a ${nomeDi(s)}, chi decide` : `Scrivi a ${nomeDi(s)}: lo conosci tu`;
    return { dentro: true, passo: 4, tocca: "te", stato: "scrivi", cosa, azione: daCassetta(diretto, "Mandato", "Non ora") };
  }
  // v3.107 (Alessio, 2026-11-06: "trovo aziende del 4 in 3"): scrivere alla pagina è un contatto, non un commento:
  // sta al passo 4 come in Oggi (dove era già fra i "contattare"). Prima restava al passo 3.
  const pagina = l.fase === "MAPPATA" && l.strada === "SCALDARE" ? voce("RETE_PAGINA") : undefined;
  if (pagina) return { dentro: true, passo: 4, tocca: "te", stato: "pagina", cosa: "Chi decide non si sa: scrivi all'azienda per arrivare a lui", azione: daCassetta(pagina, "Mandato", "Non serve") };
  // v3.116: ha risposto e vuole il caso studio.
  const caso = voce("RETE_CASO_STUDIO");
  if (caso) return { dentro: true, passo: 4, tocca: "te", stato: "caso", cosa: `Ha chiesto il caso studio: mandalo a ${nomeDi(s)}`, azione: daCassetta(caso, "Mandato", "Non serve") };
  // v3.103: nessuna risposta al contatto: il follow-up, sullo stesso canale.
  const followup = voce("RETE_FOLLOWUP");
  if (followup) return { dentro: true, passo: 4, tocca: "te", stato: "followup", cosa: `Non ha risposto: manda il follow-up a ${nomeDi(s)}`, azione: daCassetta(followup, "Mandato", "Non serve") };
  const conPonte = l.strada === "BNI" || l.strada === "CERCHIA";
  if (l.fase === "CHIESTA" && conPonte && l.presentatoAt) return { dentro: true, passo: 4, tocca: "te", stato: "incontro", cosa: `${l.ponte ?? "Il ponte"} te l'ha presentata: fissa l'incontro con ${nomeDi(s)}`, azione: { tipo: "incontro" } };
  if (l.fase === "CHIESTA" && !conPonte) return { dentro: true, passo: 4, tocca: "attesa", stato: "risposta", cosa: `Hai scritto a ${nomeDi(s)}: aspetti la risposta`, azione: { tipo: "incontro" } };
  if (l.fase === "PONTE_SCELTO" && !conPonte) return { dentro: true, passo: 4, tocca: "crm", stato: "prepara_contatto", cosa: `Il CRM prepara il messaggio per ${nomeDi(s)}`, azione: null };

  // Passo 3 — In riscaldamento: i commenti ai post di chi decide (v3.117: non più alla pagina dell'azienda).
  if (l.fase === "MAPPATA" && l.strada === "SCALDARE") {
    const c = s.commenti;
    const conto = c ? `${c.fatti} di ${COMMENTI_PER_CONTATTO} su ${NOMI_PIATTAFORMA[c.piattaforma]}` : `0 di ${COMMENTI_PER_CONTATTO}`;
    return { dentro: true, passo: 3, tocca: "crm", stato: "cerca_post", cosa: `Commenti ai post di ${nomeDi(s)}: ${conto}. Li pubblica il CRM`, azione: null };
  }

  // Passo 2 — Collegamento (v3.117): richiesta su LinkedIn e "segui" su Instagram, li manda il CRM.
  if (l.fase === "MAPPATA" && l.strada === STRADA_COLLEGARE) {
    return { dentro: true, passo: 2, tocca: "crm", stato: "collega", cosa: `Il CRM chiede il collegamento a ${nomeDi(s)} su LinkedIn e lo segue su Instagram`, azione: null };
  }

  // Passo 2 — Chi me la presenta.
  if (l.fase === "MAPPATA" && l.strada === "DA_CONFERMARE" && s.daConfermare.length) {
    return { dentro: true, passo: 2, tocca: "te", stato: "conosco", cosa: "Conosci davvero qualcuno di questi?", azione: { tipo: "conosco", nomi: s.daConfermare } };
  }
  if (l.fase === "MAPPATA" && l.strada === "IN_ATTESA_PONTE") return { dentro: true, passo: 2, tocca: "attesa", stato: "occupato", cosa: "Il ponte giusto sta già presentando un'altra azienda: un favore alla volta", azione: null };
  if (l.fase === "MAPPATA") return { dentro: true, passo: 2, tocca: "crm", stato: "collega", cosa: "Il CRM prepara il collegamento con chi decide", azione: null };
  const ponte = voce("RETE_PONTE");
  if (ponte) return { dentro: true, passo: 2, tocca: "te", stato: "ponte", cosa: `Chiedi a ${l.ponte ?? "il ponte"} di presentarti ${nomeDi(s)}`, azione: daCassetta(ponte, "Mandato", "Non ora: prova un altro") };
  const promemoria = voce("RETE_PROMEMORIA");
  if (promemoria) return { dentro: true, passo: 2, tocca: "te", stato: "promemoria", cosa: `${l.ponte ?? "Il ponte"} non ha ancora risposto: mandagli il promemoria`, azione: daCassetta(promemoria, "Mandato", "Non serve") };
  if (l.fase === "CHIESTA") {
    const g = l.chiestaAt ? giorniDa(l.chiestaAt, oggi) : 0;
    return { dentro: true, passo: 2, tocca: "attesa", stato: "aspetti", cosa: `Aspetti ${l.ponte ?? "il ponte"} (${g} ${g === 1 ? "giorno" : "giorni"}; promemoria al ${GIORNI_PROMEMORIA}°)`, azione: { tipo: "presentato" } };
  }
  return { dentro: true, passo: 2, tocca: "crm", stato: "prepara_ponte", cosa: "Il CRM prepara il messaggio per il ponte", azione: null };
}

/**
 * Le 3 cose di oggi: contattare = scrivere a chi decide o al ponte che te la presenta; scaldare = commentare la
 * pagina (solo se nessuno te la presenta: lo decide già passoDi); validare = dire sì o no. Nessun tetto al
 * giorno (Alessio, 2026-10-29: "servono soldi", si vedono tutte; prima erano 2/3/5).
 */
export type Cosa = "contatta" | "scalda" | "valida";

export const COSE: Cosa[] = ["contatta", "scalda", "valida"];

export function cosaDi(e: Esito): Cosa | null {
  if (!e.dentro || e.tocca !== "te") return null;
  if (e.passo === 4) return "contatta";
  // v3.99: scaldare lo fa il CRM; "scrivi alla pagina" è un messaggio: dalla v3.107 sta al passo 4.
  if (e.passo === 3) return "scalda";
  if (e.passo === 2) return e.azione?.tipo === "conosco" ? "valida" : "contatta";
  return "valida";
}

/** Per ogni cosa tutte le aziende dove tocca a te: prima le più vicine al contatto (lì ci sono i soldi), a parità le più vecchie. */
export function coseDiOggi<T extends { esito: Esito; da: number }>(aziende: T[]): Record<Cosa, T[]> {
  const ordinate = [...aziende].sort((a, b) => (b.esito.dentro && a.esito.dentro ? b.esito.passo - a.esito.passo : 0) || a.da - b.da);
  const fuori = {} as Record<Cosa, T[]>;
  for (const c of COSE) fuori[c] = ordinate.filter((a) => cosaDi(a.esito) === c);
  return fuori;
}
