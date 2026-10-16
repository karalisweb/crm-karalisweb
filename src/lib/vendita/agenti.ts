/**
 * Gli agenti di vendita. Preparano, non mandano nulla: tutto finisce in cassetta.
 *
 *   V1 Preparatore call — la pagina da avere davanti durante la call di vendita.
 *   V2 Dopo-call        — dalla trascrizione di Google Meet: cosa è emerso, la lettera strategica
 *                         (o il follow-up) e il prossimo passo. Prezzi mai inventati: segnaposto.
 *   V3 Recall           — il richiamo quando la risposta non arriva, ripartendo dalle obiezioni.
 *   V4 Nurturing        — ogni 45 giorni un messaggio di valore per chi non ha detto un no definitivo.
 */
import { chiediJSON, REGOLE_COMUNI, type RispostaAI, type Schema } from "@/lib/agents/ai";
import { materialiDaReferti } from "@/lib/agents/materiali";
import { citazioneVera } from "@/lib/agents/materiali";
import type { RefertoLetto } from "@/lib/agents/tipi";
import { ORIGINI, STADI, type Origine, type Stadio } from "./regole";

export interface ContestoVendita {
  nome: string;
  origine: string;
  stadio: Stadio;
  referente: string | null;
  callAt: Date | null;
  trascrizione: string | null;
  /** Cosa sappiamo dell'azienda o della persona: referti della squadra, scheda BNI, note dell'opportunità. */
  conoscenza: string;
  /** Il diario della trattativa, dal più vecchio. */
  diario: string;
  /** Testi già prodotti dagli agenti di vendita (lettera, recall precedenti). */
  precedenti: string;
}

const METODO_SD = `Il primo incarico che Alessio propone è sempre il Metodo Strategico Digitale (Metodo SD): un'intervista strategica con il titolare da cui nasce il Documento Strategico (visione, posizionamento, proposta di valore, buyer personas, priorità e un piano). Sito e servizi operativi (Google Ads, SEO, Meta Ads, social, contenuti) vengono dopo, come conseguenza del Documento: prima la strategia, poi gli strumenti.`;

function materiale(c: ContestoVendita): string {
  return [
    `TRATTATIVA: ${c.nome} (origine: ${ORIGINI[c.origine as Origine] ?? c.origine}; stadio: ${STADI[c.stadio].label})`,
    c.referente ? `REFERENTE: ${c.referente}` : null,
    c.callAt ? `CALL: ${c.callAt.toLocaleString("it-IT", { dateStyle: "full", timeStyle: "short", timeZone: "Europe/Rome" })}` : null,
    `\nCOSA SAPPIAMO:\n${c.conoscenza || "(niente oltre al nome)"}`,
    c.diario ? `\nDIARIO DELLA TRATTATIVA:\n${c.diario}` : null,
    c.precedenti ? `\nGIÀ SCRITTO DAGLI AGENTI DI VENDITA:\n${c.precedenti}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function conoscenzaDaReferti(referti: RefertoLetto[]): string {
  // Per la vendita contano le sintesi: se ci sono, bastano quelle (meno rumore, meno costo).
  const sintesi = referti.filter((r) => ["scheda_leve", "coerenza", "decision_maker", "lettore", "aggancio"].includes(r.agent));
  return materialiDaReferti(sintesi.length ? sintesi : referti);
}

// ─── V1 Preparatore call ───────────────────────────────────────────────────

export interface Preparazione {
  obiettivo_call: string;
  cosa_sappiamo: string[];
  apertura: string;
  domande: { domanda: string; perche: string }[];
  leve: { leva: string; prova: string }[];
  obiezioni: { obiezione: string; risposta: string }[];
  ponte_metodo_sd: string;
  chiusura: string;
}

const SCHEMA_PREPARAZIONE: Schema = {
  type: "object",
  properties: {
    obiettivo_call: { type: "string", description: "L'obiettivo concreto della call in una frase (di solito: arrivare a fissare l'intervista strategica del Metodo SD)" },
    cosa_sappiamo: { type: "array", items: { type: "string" }, description: "3-6 fatti verificati da avere in testa" },
    apertura: { type: "string", description: "Le prime frasi della call" },
    domande: {
      type: "array",
      description: "5-7 domande per capire la loro strategia, nell'ordine in cui farle",
      items: { type: "object", properties: { domanda: { type: "string" }, perche: { type: "string" } }, required: ["domanda", "perche"] },
    },
    leve: { type: "array", items: { type: "object", properties: { leva: { type: "string" }, prova: { type: "string" } }, required: ["leva", "prova"] } },
    obiezioni: { type: "array", items: { type: "object", properties: { obiezione: { type: "string" }, risposta: { type: "string" } }, required: ["obiezione", "risposta"] } },
    ponte_metodo_sd: { type: "string", description: "Come passare dai loro problemi alla proposta del Metodo SD, in parole semplici" },
    chiusura: { type: "string", description: "Come chiudere la call con un passo concreto e una data" },
  },
  required: ["obiettivo_call", "cosa_sappiamo", "apertura", "domande", "leve", "obiezioni", "ponte_metodo_sd", "chiusura"],
};

export function preparaCall(c: ContestoVendita): Promise<RispostaAI<Preparazione>> {
  return chiediJSON<Preparazione>({
    sistema: `${REGOLE_COMUNI}\n\n${METODO_SD}\n\nSei il Preparatore call. Prepari ad Alessio la pagina da avere davanti durante la call di vendita: cosa sappiamo, come aprire, cosa chiedere, su cosa fare leva (solo con prova), le obiezioni probabili e come passare al Metodo SD. Una call di vendita serve ad ascoltare: più domande che affermazioni.`,
    testo: materiale(c),
    schema: SCHEMA_PREPARAZIONE,
  });
}

// ─── V2 Dopo-call ──────────────────────────────────────────────────────────

export interface DopoCall {
  sintesi: string;
  problemi: { problema: string; citazione: string }[];
  obiezioni: string[];
  temperatura: "calda" | "tiepida" | "fredda";
  raccomandazione: "LETTERA" | "FOLLOW_UP" | "NURTURING" | "EXIT";
  perche: string;
  lettera_titolo: string;
  lettera: string;
  email_accompagnamento: string;
  prossimo_passo: string;
  giorni_al_prossimo_passo: number;
  motivo_uscita: string;
}

const SCHEMA_DOPO_CALL: Schema = {
  type: "object",
  properties: {
    sintesi: { type: "string", description: "Cosa è successo in call, in 3-4 frasi" },
    problemi: {
      type: "array",
      description: "I problemi detti DAL CLIENTE, ognuno con una citazione copiata alla lettera dalla trascrizione",
      items: { type: "object", properties: { problema: { type: "string" }, citazione: { type: "string" } }, required: ["problema", "citazione"] },
    },
    obiezioni: { type: "array", items: { type: "string" }, description: "Dubbi o obiezioni emersi" },
    temperatura: { type: "string", enum: ["calda", "tiepida", "fredda"] },
    raccomandazione: {
      type: "string",
      enum: ["LETTERA", "FOLLOW_UP", "NURTURING", "EXIT"],
      description: "LETTERA se c'è interesse: si manda la lettera strategica; FOLLOW_UP se serve prima un passaggio (materiale, un'altra persona da sentire); NURTURING se non è il momento; EXIT se non c'è margine",
    },
    perche: { type: "string" },
    lettera_titolo: { type: "string" },
    lettera: {
      type: "string",
      description: "La lettera strategica (se raccomandazione LETTERA, altrimenti il messaggio di follow-up): 1-2 pagine in markdown. Struttura: cosa ci siamo detti, i problemi con le loro parole, perché nascono da una strategia che manca, il percorso proposto (Metodo SD come primo passo), cosa ottengono, investimento [INVESTIMENTO], prossimo passo con data. Mai scrivere cifre: usa il segnaposto [INVESTIMENTO].",
    },
    email_accompagnamento: { type: "string", description: "Email breve (5 righe) per mandare la lettera o il follow-up" },
    prossimo_passo: { type: "string" },
    giorni_al_prossimo_passo: { type: "integer", description: "Fra quanti giorni ricontattare se non rispondono" },
    motivo_uscita: { type: "string", description: "Solo se EXIT o NURTURING: il motivo in poche parole, altrimenti stringa vuota" },
  },
  required: ["sintesi", "problemi", "obiezioni", "temperatura", "raccomandazione", "perche", "lettera_titolo", "lettera", "email_accompagnamento", "prossimo_passo", "giorni_al_prossimo_passo", "motivo_uscita"],
};

export interface EsitoDopoCall extends RispostaAI<DopoCall> {
  citazioniScartate: number;
}

export async function dopoCall(c: ContestoVendita): Promise<EsitoDopoCall> {
  if (!c.trascrizione) throw new Error("Manca la trascrizione della call");
  const ai = await chiediJSON<DopoCall>({
    sistema: `${REGOLE_COMUNI}\n\n${METODO_SD}\n\nSei l'agente Dopo-call. Leggi la trascrizione della call di vendita (Google Meet o appunti di Gemini) e prepari quello che serve dopo: la sintesi, i problemi DETTI DAL CLIENTE con le sue parole, le obiezioni, e soprattutto la lettera strategica personale, scritta da Alessio in prima persona, che riprende la call e propone il Metodo SD come primo incarico. Non scrivere mai prezzi o cifre: dove serve metti [INVESTIMENTO]. Se nella trascrizione non c'è interesse, dillo e raccomanda NURTURING o EXIT.`,
    testo: `${materiale(c)}\n\nTRASCRIZIONE DELLA CALL:\n${c.trascrizione}`,
    schema: SCHEMA_DOPO_CALL,
    maxTokens: 16000,
  });
  const prima = ai.dati.problemi.length;
  ai.dati.problemi = ai.dati.problemi.filter((p) => citazioneVera(p.citazione, c.trascrizione!));
  return { ...ai, citazioniScartate: prima - ai.dati.problemi.length };
}

// ─── V3 Recall ─────────────────────────────────────────────────────────────

export interface Recall {
  canale: "telefono" | "whatsapp" | "email";
  messaggio: string;
  copione_telefono: string;
  obiezione_da_sciogliere: string;
}

const SCHEMA_RECALL: Schema = {
  type: "object",
  properties: {
    canale: { type: "string", enum: ["telefono", "whatsapp", "email"] },
    messaggio: { type: "string", description: "Il messaggio di richiamo (massimo 6 righe): riprende un punto della call, nessuna pressione, una domanda semplice" },
    copione_telefono: { type: "string", description: "Se si chiama: le 3-4 frasi da dire" },
    obiezione_da_sciogliere: { type: "string", description: "Il dubbio più probabile che li sta fermando" },
  },
  required: ["canale", "messaggio", "copione_telefono", "obiezione_da_sciogliere"],
};

export function preparaRecall(c: ContestoVendita, numero: number): Promise<RispostaAI<Recall>> {
  return chiediJSON<Recall>({
    sistema: `${REGOLE_COMUNI}\n\n${METODO_SD}\n\nSei l'agente Recall. La lettera o il follow-up sono stati mandati e la risposta non è arrivata. Prepari il richiamo numero ${numero}: breve, personale, senza pressione, che riparte da qualcosa che il cliente ha detto in call e prova a sciogliere il dubbio che lo ferma.`,
    testo: materiale(c),
    schema: SCHEMA_RECALL,
  });
}

// ─── V4 Nurturing ──────────────────────────────────────────────────────────

export interface Nurturing {
  canale: "whatsapp" | "email";
  oggetto: string;
  messaggio: string;
  spunto: string;
}

const SCHEMA_NURTURING: Schema = {
  type: "object",
  properties: {
    canale: { type: "string", enum: ["whatsapp", "email"] },
    oggetto: { type: "string" },
    messaggio: { type: "string", description: "Un messaggio di valore (massimo 8 righe): un'idea, un esempio, un dato utile per il loro problema. Nessuna richiesta di vendita; al massimo una porta aperta." },
    spunto: { type: "string", description: "Da quale loro problema nasce il messaggio" },
  },
  required: ["canale", "oggetto", "messaggio", "spunto"],
};

export function preparaNurturing(c: ContestoVendita): Promise<RispostaAI<Nurturing>> {
  return chiediJSON<Nurturing>({
    sistema: `${REGOLE_COMUNI}\n\n${METODO_SD}\n\nSei l'agente Nurturing. Questa trattativa non è chiusa con un no: non era il momento. Ogni 45 giorni prepari un messaggio che porta valore vero su uno dei loro problemi, così quando sarà il momento penseranno ad Alessio. Non vendere. Non ripetere i messaggi già mandati.`,
    testo: materiale(c),
    schema: SCHEMA_NURTURING,
  });
}
