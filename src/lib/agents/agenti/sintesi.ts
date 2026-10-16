/**
 * La catena di sintesi: leggono i referti degli altri agenti e ragionano con l'AI.
 *
 *   11 Coerenza       — i segnali si contraddicono? (sito vs social vs ads vs tracciamenti vs blog)
 *   13 Regista video  — cosa mostrare nel video di analisi, in che ordine, con quale prova
 *   12 Scheda leve    — su cosa fare leva al contatto, servizio da proporre, apertura, obiezioni
 *   10 Aggancio       — il messaggio al decision maker (lo manda Alessio, dopo averlo approvato)
 *
 * Nessuno di loro scarica nulla: lavorano solo sui referti. Così non inventano fatti nuovi.
 */
import { checkCopy } from "@/lib/copy-guard";
import { chiediJSON, REGOLE_COMUNI, type Schema } from "../ai";
import { materialiDaReferti, schedaAzienda } from "../materiali";
import { SERVIZI, type AgenteEseguibile, type ContestoAgente, type Leva, type Prova, type RefertoLetto, type Servizio } from "../tipi";

const SERVIZI_ENUM = Object.keys(SERVIZI);
const comeServizio = (s: string): Servizio => (s in SERVIZI ? (s as Servizio) : "sito");

async function materiali(ctx: ContestoAgente, escludi: string[] = []): Promise<{ testo: string; referti: RefertoLetto[] }> {
  const referti = await ctx.referti();
  if (referti.length === 0) throw new Error("Nessun referto su cui ragionare");
  return { testo: `${schedaAzienda(ctx.lead)}\n\n${materialiDaReferti(referti, escludi)}`, referti };
}

// ─── 11 Coerenza ────────────────────────────────────────────────────────────

interface RispostaCoerenza {
  incoerenze: { cosa: string; canali: string[]; prova: string; servizio: string }[];
  coerenze: string[];
  canali_mancanti: string[];
  punteggio: number;
  giudizio: string;
}

const SCHEMA_COERENZA: Schema = {
  type: "object",
  properties: {
    incoerenze: {
      type: "array",
      description: "Contraddizioni fra canali. Es: pixel installato ma nessuna inserzione Meta; ads che promettono una cosa e il sito un'altra; social fermi e blog attivo.",
      items: {
        type: "object",
        properties: {
          cosa: { type: "string", description: "La contraddizione, in una frase chiara per il titolare" },
          canali: { type: "array", items: { type: "string" }, description: "I canali coinvolti (sito, social, Google Ads, Meta, blog, LinkedIn, Google Maps…)" },
          prova: { type: "string", description: "I dati dei referti che la dimostrano" },
          servizio: { type: "string", enum: SERVIZI_ENUM },
        },
        required: ["cosa", "canali", "prova", "servizio"],
      },
    },
    coerenze: { type: "array", items: { type: "string" }, description: "Cose che invece tornano fra i canali" },
    canali_mancanti: { type: "array", items: { type: "string" }, description: "Canali su cui non c'è nessun dato (agente fallito o assente)" },
    punteggio: { type: "integer", description: "Da 1 (canali scollegati) a 5 (presenza coerente)" },
    giudizio: { type: "string", description: "Due frasi di giudizio complessivo" },
  },
  required: ["incoerenze", "coerenze", "canali_mancanti", "punteggio", "giudizio"],
};

export const agenteCoerenza: AgenteEseguibile = {
  chiave: "coerenza",
  fase: "sintesi",
  validitaGiorni: 30,
  aPagamento: true,
  async esegui(ctx) {
    const { testo } = await materiali(ctx, ["coerenza", "regista_video", "scheda_leve", "aggancio"]);
    const ai = await chiediJSON<RispostaCoerenza>({
      sistema: `${REGOLE_COMUNI}\n\nSei l'agente Coerenza. Confronti i segnali raccolti dagli altri agenti su un'azienda e trovi dove si contraddicono: un'azienda che dice una cosa sul sito e un'altra sui social, che ha strumenti installati e non li usa, che investe in un canale e trascura quello che lo sostiene. Ogni incoerenza deve poggiare su dati presenti nei referti.`,
      testo,
      schema: SCHEMA_COERENZA,
    });
    const r = ai.dati;
    const levers: Leva[] = r.incoerenze.map((i) => ({ servizio: comeServizio(i.servizio), testo: i.cosa, prova: i.prova }));
    const evidence: Prova[] = r.incoerenze.map((i) => ({ cosa: i.cosa, fonte: i.canali.join(" ↔ ") }));
    return {
      summary: `Coerenza ${r.punteggio}/5 · ${r.incoerenze.length} incoerenze. ${r.giudizio}`,
      findings: { ...r, motoreAI: `${ai.motore} ${ai.modello}` },
      levers,
      evidence,
      confidence: r.canali_mancanti.length > 2 ? "BASSA" : "MEDIA",
      costCents: ai.costCents,
    };
  },
};

// ─── 13 Regista del video ──────────────────────────────────────────────────

interface RispostaVideo {
  titolo: string;
  apertura: string;
  scene: { ordine: number; cosa_mostrare: string; dove: string; cosa_dire: string; prova: string; secondi: number }[];
  chiusura: string;
}

const SCHEMA_VIDEO: Schema = {
  type: "object",
  properties: {
    titolo: { type: "string", description: "Titolo del video, personale per l'azienda" },
    apertura: { type: "string", description: "Prima frase del video (10 secondi): chi sei e perché li hai guardati" },
    scene: {
      type: "array",
      description: "Da 3 a 5 scene, la più forte per prima. Il video intero sta sotto i 3 minuti.",
      items: {
        type: "object",
        properties: {
          ordine: { type: "integer" },
          cosa_mostrare: { type: "string", description: "Cosa si vede a schermo (es. 'la homepage su smartphone', 'la ricerca Google per X')" },
          dove: { type: "string", description: "URL o ricerca da aprire durante la registrazione" },
          cosa_dire: { type: "string", description: "Cosa dire, in parole semplici, senza tono da venditore" },
          prova: { type: "string", description: "Il dato del referto che la scena mostra" },
          secondi: { type: "integer" },
        },
        required: ["ordine", "cosa_mostrare", "dove", "cosa_dire", "prova", "secondi"],
      },
    },
    chiusura: { type: "string", description: "Chiusura: l'invito a una call di 20 minuti per vedere insieme le soluzioni, nel Metodo SD" },
  },
  required: ["titolo", "apertura", "scene", "chiusura"],
};

export const agenteRegistaVideo: AgenteEseguibile = {
  chiave: "regista_video",
  fase: "sintesi",
  validitaGiorni: 30,
  aPagamento: true,
  async esegui(ctx) {
    const { testo } = await materiali(ctx, ["regista_video", "scheda_leve", "aggancio"]);
    const ai = await chiediJSON<RispostaVideo>({
      sistema: `${REGOLE_COMUNI}\n\nSei il Regista del video di analisi. Alessio registra lo schermo (2-3 minuti) mentre mostra all'azienda cosa ha trovato. Decidi cosa mostrare, in che ordine, dove andare e cosa dire. Mostra solo cose che si possono vedere davvero aprendo un indirizzo o facendo una ricerca, e che i referti provano. Lo scopo del video è ottenere una call, non spiegare tutto.`,
      testo,
      schema: SCHEMA_VIDEO,
    });
    const r = ai.dati;
    const scene = r.scene.slice().sort((a, b) => a.ordine - b.ordine);
    const durata = scene.reduce((s, x) => s + (x.secondi || 0), 0);
    return {
      summary: `Video "${r.titolo}": ${scene.length} scene, circa ${Math.round(durata / 60 * 10) / 10} minuti`,
      findings: { ...r, scene, durataSecondi: durata, motoreAI: `${ai.motore} ${ai.modello}` },
      levers: [],
      evidence: scene.map((s) => ({ cosa: `Scena ${s.ordine}: ${s.cosa_mostrare}`, fonte: s.dove, citazione: s.prova })),
      confidence: "MEDIA",
      costCents: ai.costCents,
    };
  },
};

// ─── 12 Scheda leve ────────────────────────────────────────────────────────

interface RispostaLeve {
  leve_principali: { servizio: string; leva: string; prova: string; perche_conta: string }[];
  servizio_da_proporre: string;
  apertura_chiamata: string;
  domande: string[];
  obiezione_probabile: string;
  risposta_obiezione: string;
  temperatura: string;
}

const SCHEMA_LEVE: Schema = {
  type: "object",
  properties: {
    leve_principali: {
      type: "array",
      description: "Le 3 leve più forti, dalla più forte. Solo leve con prova nei referti.",
      items: {
        type: "object",
        properties: {
          servizio: { type: "string", enum: SERVIZI_ENUM },
          leva: { type: "string", description: "La leva, detta come la direbbe Alessio al titolare" },
          prova: { type: "string" },
          perche_conta: { type: "string", description: "Cosa perde l'azienda (clienti, soldi, tempo) se non lo risolve" },
        },
        required: ["servizio", "leva", "prova", "perche_conta"],
      },
    },
    servizio_da_proporre: { type: "string", enum: SERVIZI_ENUM, description: "Il servizio da proporre per primo, dopo il Metodo SD" },
    apertura_chiamata: { type: "string", description: "Le prime due frasi della telefonata" },
    domande: { type: "array", items: { type: "string" }, description: "3 domande da fare al titolare per capire la sua strategia" },
    obiezione_probabile: { type: "string" },
    risposta_obiezione: { type: "string" },
    temperatura: { type: "string", enum: ["calda", "tiepida", "fredda"], description: "Quanto vale la pena chiamare, in base ai segnali" },
  },
  required: ["leve_principali", "servizio_da_proporre", "apertura_chiamata", "domande", "obiezione_probabile", "risposta_obiezione", "temperatura"],
};

export const agenteSchedaLeve: AgenteEseguibile = {
  chiave: "scheda_leve",
  fase: "sintesi",
  validitaGiorni: 30,
  aPagamento: true,
  async esegui(ctx) {
    const { testo } = await materiali(ctx, ["scheda_leve", "aggancio"]);
    const ai = await chiediJSON<RispostaLeve>({
      sistema: `${REGOLE_COMUNI}\n\nSei l'agente Scheda leve. Prepari Alessio a una telefonata con un'azienda: le tre leve più forti con la loro prova, il servizio da proporre per primo, come aprire la chiamata, cosa chiedere, l'obiezione probabile. Usa il lavoro dell'agente Coerenza e del Regista video se c'è. Una leva senza prova non entra.`,
      testo,
      schema: SCHEMA_LEVE,
    });
    const r = ai.dati;
    return {
      summary: `Temperatura: ${r.temperatura}. Proporre prima: ${SERVIZI[comeServizio(r.servizio_da_proporre)]}. ${r.leve_principali[0]?.leva ?? ""}`,
      findings: { ...r, motoreAI: `${ai.motore} ${ai.modello}` },
      levers: r.leve_principali.map((l) => ({ servizio: comeServizio(l.servizio), testo: l.leva, prova: l.prova })),
      evidence: r.leve_principali.map((l) => ({ cosa: l.perche_conta, fonte: "sintesi dei referti" })),
      confidence: "MEDIA",
      costCents: ai.costCents,
    };
  },
};

// ─── 10 Aggancio ───────────────────────────────────────────────────────────

interface RispostaAggancio {
  canale: string;
  destinatario: string;
  oggetto: string;
  messaggio: string;
  perche_questo_canale: string;
}

const SCHEMA_AGGANCIO: Schema = {
  type: "object",
  properties: {
    canale: { type: "string", enum: ["email", "linkedin", "whatsapp", "telefono"], description: "Il canale migliore per arrivare al decision maker, in base ai dati" },
    destinatario: { type: "string", description: "Nome e ruolo del decision maker se noti dai referti, altrimenti 'il titolare'" },
    oggetto: { type: "string", description: "Oggetto (per email) o prima riga del messaggio" },
    messaggio: { type: "string", description: "Il messaggio completo, massimo 120 parole: un fatto vero sulla loro azienda, il video di analisi, la richiesta di una call di 20 minuti" },
    perche_questo_canale: { type: "string" },
  },
  required: ["canale", "destinatario", "oggetto", "messaggio", "perche_questo_canale"],
};

export const agenteAggancio: AgenteEseguibile = {
  chiave: "aggancio",
  fase: "sintesi",
  validitaGiorni: 30,
  aPagamento: true,
  async esegui(ctx) {
    const { testo } = await materiali(ctx, ["aggancio"]);
    const ai = await chiediJSON<RispostaAggancio>({
      sistema: `${REGOLE_COMUNI}\n\nSei l'agente Aggancio. Scrivi il primo messaggio al decision maker dell'azienda per ottenere una call. Parti da un fatto vero e specifico su di loro (dalla Scheda leve), cita il video di analisi che Alessio ha registrato per loro, chiedi 20 minuti. Il messaggio NON parte da solo: Alessio lo legge, lo corregge e lo manda lui. Sul canale LinkedIn o WhatsApp il messaggio è più breve e diretto.`,
      testo,
      schema: SCHEMA_AGGANCIO,
    });
    const r = ai.dati;
    const controllo = checkCopy(`${r.oggetto}\n${r.messaggio}`);
    return {
      summary: `${r.canale} a ${r.destinatario}: "${r.oggetto}"`,
      findings: { ...r, avvisiCopy: controllo.violations ?? [], motoreAI: `${ai.motore} ${ai.modello}` },
      levers: [],
      evidence: [{ cosa: `Canale: ${r.canale}`, fonte: "agente Aggancio", citazione: r.perche_questo_canale }],
      confidence: "MEDIA",
      costCents: ai.costCents,
    };
  },
};
