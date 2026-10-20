/**
 * Il cruscotto della settimana (Motore 121): gli 11 numeri da guardare, con obiettivo, allarme e
 * cosa fare. Le soglie sono una prima taratura (docs/motore-121.html): si correggono dopo le prime
 * 4 settimane. `valuta` è pura; `misureSettimana` legge il database.
 */
import { db } from "@/lib/db";
import { settimanaDi } from "./bni-regole";
import { KIND_MESSAGGIO_BNI } from "./bni";
import { AGENTI_LINKEDIN, bloccoLinkedin } from "./motore-121";
import { collegamentoDaFindings } from "./motore";

export type Stato = "ok" | "attenzione" | "allarme" | "nd";

export interface Misura {
  chiave: string;
  nome: string;
  valore: number | null;
  /** Come si legge il valore: un numero, una percentuale, "per 121". */
  unita: "n" | "%" | "per121";
  obiettivo: string;
  allarme: string;
  azione: string;
  stato: Stato;
  dettaglio?: string;
}

export interface Grezzi {
  richiesteMandate: number;
  richiesteValutate: number;
  richiesteAccettate: number;
  fatti121: number;
  vocaliInTempo: number;
  pontiConfermati: number;
  presentazioniOttenute: number;
  presentazioniDueSettimane: number;
  segnalazioniDate: number;
  incontri: number;
  proposte: number;
  clienti: number;
  invitiInviati: number;
  invitiAccettati: number;
  bloccoLinkedin: boolean;
  aziendeVerificate: number;
  aziendeConPonte: number;
}

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : null);
const per = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 10) / 10 : null);

/** Gli 11 numeri con il loro stato. Pura: si prova con i test. */
export function valuta(g: Grezzi): Misura[] {
  const accettate = pct(g.richiesteAccettate, g.richiesteValutate);
  const vocali = pct(g.vocaliInTempo, g.fatti121);
  const ponti = per(g.pontiConfermati, g.fatti121);
  const segnalati = per(g.segnalazioniDate, g.fatti121);
  const inviti = pct(g.invitiAccettati, g.invitiInviati);
  const serbatoio = pct(g.aziendeConPonte, g.aziendeVerificate);
  return [
    {
      chiave: "richieste", nome: "Richieste di 121 mandate", valore: g.richiesteMandate, unita: "n", obiettivo: "20", allarme: "meno di 15",
      azione: "Si controlla se mancano membri da contattare o se la Cassetta resta indietro.",
      stato: g.richiesteMandate >= 20 ? "ok" : g.richiesteMandate >= 15 ? "attenzione" : "allarme",
    },
    {
      chiave: "accettate", nome: "Richieste accettate", valore: accettate, unita: "%", obiettivo: "circa 50%", allarme: "sotto il 30%",
      azione: "Si cambia il messaggio di richiesta.",
      stato: accettate === null ? "nd" : accettate >= 45 ? "ok" : accettate >= 30 ? "attenzione" : "allarme",
      dettaglio: g.richiesteValutate ? `${g.richiesteAccettate} su ${g.richiesteValutate} mandate nelle 3 settimane prima` : "Ancora nessuna richiesta di almeno 7 giorni fa",
    },
    {
      chiave: "fatti", nome: "121 fatti", valore: g.fatti121, unita: "n", obiettivo: "8-12", allarme: "meno di 6",
      azione: "Si guarda dove si ferma: risposte, agenda o rinvii.",
      stato: g.fatti121 >= 8 ? "ok" : g.fatti121 >= 6 ? "attenzione" : "allarme",
    },
    {
      chiave: "vocali", nome: "Vocale entro 24 ore", valore: vocali, unita: "%", obiettivo: "100%", allarme: "sotto l'80%",
      azione: "Promemoria più insistente.",
      stato: vocali === null ? "nd" : vocali >= 100 ? "ok" : vocali >= 80 ? "attenzione" : "allarme",
    },
    {
      chiave: "ponti", nome: "Ponti confermati nel 121 (\"lo conosco bene\")", valore: ponti, unita: "per121", obiettivo: "almeno 1 per 121", allarme: "meno di 1 ogni 3",
      azione: "Si rivedono i punti di contatto.",
      stato: ponti === null ? "nd" : ponti >= 1 ? "ok" : ponti >= 1 / 3 ? "attenzione" : "allarme",
    },
    {
      chiave: "presentazioni", nome: "Presentazioni ottenute", valore: g.presentazioniOttenute, unita: "n", obiettivo: "almeno 4", allarme: "0 per 2 settimane",
      azione: "Si rivede come si chiede nel 121.",
      stato: g.presentazioniOttenute >= 4 ? "ok" : g.presentazioniDueSettimane === 0 ? "allarme" : "attenzione",
    },
    {
      chiave: "segnalati", nome: "Contatti segnalati ai membri", valore: segnalati, unita: "per121", obiettivo: "almeno 1 per 121", allarme: "nessuno",
      azione: "Si guarda il serbatoio: mancano aziende utili ai mestieri dei membri.",
      stato: segnalati === null ? "nd" : segnalati >= 1 ? "ok" : g.segnalazioniDate > 0 ? "attenzione" : "allarme",
      dettaglio: `${g.segnalazioniDate} contatti segnalati`,
    },
    {
      chiave: "incontri", nome: "Incontri con contatti presentati", valore: g.incontri, unita: "n", obiettivo: "almeno 2", allarme: "nessuno",
      azione: "Si rivedono i 3 ganci.",
      stato: g.incontri >= 2 ? "ok" : g.incontri === 1 ? "attenzione" : "allarme",
    },
    {
      chiave: "proposte", nome: "Proposte e clienti", valore: g.proposte, unita: "n", obiettivo: "si contano", allarme: "—",
      azione: "Dicono quali capitoli e quali membri portano lavoro.",
      stato: "nd", dettaglio: `${g.proposte} proposte, ${g.clienti} clienti`,
    },
    {
      chiave: "inviti", nome: "Inviti LinkedIn accettati", valore: inviti, unita: "%", obiettivo: "almeno 50%", allarme: "blocco di LinkedIn",
      azione: "Stop di 48 ore, poi metà ritmo.",
      stato: g.bloccoLinkedin ? "allarme" : inviti === null ? "nd" : inviti >= 50 ? "ok" : "attenzione",
      dettaglio: g.bloccoLinkedin ? "LinkedIn ha bloccato o chiesto una verifica: lavori fermi 48 ore" : `${g.invitiAccettati} su ${g.invitiInviati} inviti`,
    },
    {
      chiave: "serbatoio", nome: "Aziende nel serbatoio con un ponte", valore: serbatoio, unita: "%", obiettivo: "circa 50%", allarme: "sotto il 25%",
      azione: "Si stringe la ricerca su Maps alla nicchia.",
      stato: serbatoio === null ? "nd" : serbatoio >= 40 ? "ok" : serbatoio >= 25 ? "attenzione" : "allarme",
      dettaglio: g.aziendeVerificate ? `${g.aziendeConPonte} su ${g.aziendeVerificate} controllate negli ultimi 30 giorni` : undefined,
    },
  ];
}

/** I numeri grezzi della settimana di `oggi` (da lunedì). */
export async function grezziSettimana(oggi = new Date()): Promise<Grezzi & { inizio: Date; fine: Date }> {
  const { inizio, fine } = settimanaDi(oggi);
  const fino = fine < oggi ? fine : oggi;
  const nella = { gte: inizio, lt: fine };

  const [mandate, valutabili, fatti, presentazioni, prima, segnalazioni, inviti, blocchi, dm] = await Promise.all([
    db.approvalItem.count({ where: { kind: KIND_MESSAGGIO_BNI, status: "APPROVATO", decidedAt: nella } }),
    // Accettate: le richieste mandate fra 28 e 7 giorni fa, con un 121 fissato o fatto dopo.
    db.approvalItem.findMany({
      where: { kind: KIND_MESSAGGIO_BNI, status: "APPROVATO", decidedAt: { gte: new Date(fino.getTime() - 28 * 86400_000), lt: new Date(fino.getTime() - 7 * 86400_000) }, bniMembroId: { not: null } },
      select: { decidedAt: true, bniMembro: { select: { next121At: true, oneToOnes: { select: { date: true } } } } },
    }),
    db.oneToOne.findMany({ where: { date: nella }, select: { date: true, createdAt: true, trascrizione: true } }),
    db.bniPresentazione.findMany({
      where: { OR: [{ presentatoAt: nella }, { incontroAt: nella }, { propostaAt: nella }, { clienteAt: nella }, { updatedAt: nella, confermata: true }] },
      select: { presentatoAt: true, incontroAt: true, propostaAt: true, clienteAt: true, confermata: true, updatedAt: true },
    }),
    db.bniPresentazione.count({ where: { presentatoAt: { gte: new Date(inizio.getTime() - 7 * 86400_000), lt: fine } } }),
    db.bniSegnalazione.count({ where: { stato: "DATA", dataAt: nella } }),
    db.bniMembro.groupBy({ by: ["linkedinStato"], where: { status: "ATTIVO", linkedinStato: { in: ["RICHIESTA_INVIATA", "COLLEGATI"] } }, _count: { _all: true } }),
    db.agentRun.findMany({ where: { agent: { in: AGENTI_LINKEDIN }, status: "FALLITO", finishedAt: nella }, select: { error: true } }),
    db.agentReport.findMany({ where: { agent: "decision_maker", collectedAt: { gte: new Date(fino.getTime() - 30 * 86400_000) } }, select: { leadId: true, findings: true }, orderBy: { collectedAt: "desc" } }),
  ]);

  const accettate = valutabili.filter((v) => {
    const t = v.decidedAt!.getTime();
    return (v.bniMembro?.next121At && v.bniMembro.next121At.getTime() > t) || v.bniMembro?.oneToOnes.some((o) => o.date.getTime() > t);
  }).length;
  const conteggio = (k: string) => inviti.find((x) => x.linkedinStato === k)?._count._all ?? 0;
  const inRange = (d: Date | null) => !!d && d >= inizio && d < fine;
  const visti = new Set<string>();
  const ultimiDm = dm.filter((r) => r.leadId && !visti.has(r.leadId) && visti.add(r.leadId));

  return {
    inizio, fine,
    richiesteMandate: mandate,
    richiesteValutate: valutabili.length,
    richiesteAccettate: accettate,
    fatti121: fatti.length,
    vocaliInTempo: fatti.filter((f) => !!f.trascrizione && f.createdAt.getTime() - f.date.getTime() <= 24 * 3600_000).length,
    pontiConfermati: presentazioni.filter((p) => p.confermata && inRange(p.updatedAt)).length,
    presentazioniOttenute: presentazioni.filter((p) => inRange(p.presentatoAt)).length,
    presentazioniDueSettimane: prima,
    segnalazioniDate: segnalazioni,
    incontri: presentazioni.filter((p) => inRange(p.incontroAt)).length,
    proposte: presentazioni.filter((p) => inRange(p.propostaAt)).length,
    clienti: presentazioni.filter((p) => inRange(p.clienteAt)).length,
    invitiInviati: conteggio("RICHIESTA_INVIATA") + conteggio("COLLEGATI"),
    invitiAccettati: conteggio("COLLEGATI"),
    bloccoLinkedin: blocchi.some((b) => bloccoLinkedin(b.error)),
    aziendeVerificate: ultimiDm.length,
    aziendeConPonte: ultimiDm.filter((r) => collegamentoDaFindings(r.findings).collegata).length,
  };
}

export async function cruscottoSettimana(oggi = new Date()): Promise<{ inizio: Date; fine: Date; misure: Misura[]; allarmi: number }> {
  const g = await grezziSettimana(oggi);
  const misure = valuta(g);
  return { inizio: g.inizio, fine: g.fine, misure, allarmi: misure.filter((m) => m.stato === "allarme").length };
}
