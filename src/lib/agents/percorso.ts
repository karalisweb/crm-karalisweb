/**
 * Il percorso (v3.62) — la parte che legge il database. Le regole sono in percorso-regole.ts.
 * Mette insieme quello che prima stava su tre pagine (Aziende trovate, In lavorazione, Cassetta):
 * per ogni azienda il passo, chi deve muoversi e la cosa da fare.
 */
import { db } from "@/lib/db";
import { siglaIndirizzo } from "@/lib/ricerca/regole";
import { collegamentoDaFindings, statoLinkedinOggi } from "./motore";
import { mezzanotteRoma } from "./bni-regole";
import { KIND_FASCICOLO_BASE } from "./turno";
import { KIND_COMMENTO, KINDS_RETE, SCARTATA_DAL_CRM, cerchiaNomi, datiAzienda, turnoRete } from "./rete";
import { nomiDaConfermare, piattaformaPiuCommentata } from "./rete-regole";
import { PASSI, STATI, coseDiOggi, ordineStato, passoDi, type Azione, type Cosa, type Esito, type Passo, type Stato, type Tocca } from "./percorso-regole";

export interface AziendaNelPercorso {
  leadId: string;
  lavorazioneId: string | null;
  nome: string;
  zona: string | null;
  categoria: string | null;
  passo: Passo;
  tocca: Tocca;
  /** Lo stato nel passo e come si chiama: il Percorso le raggruppa così, nell'ordine di STATI. */
  stato: string;
  statoNome: string;
  cosa: string;
  azione: Azione | null;
}

export interface Percorso {
  passi: { n: Passo; nome: string; spiega: string; quante: number; toccaATe: number }[];
  /** Le 3 cose di oggi: tutte le aziende dove tocca a te, divise in contattare, scaldare, validare. */
  oggi: Record<Cosa, AziendaNelPercorso[]>;
  /** Quante ne hai già fatte oggi per ogni cosa. */
  fatte: Record<Cosa, number>;
  aziende: AziendaNelPercorso[];
  dopo: number;
  inPausa: number;
}

/** Quale voce della Cassetta, approvata, conta come cosa fatta. */
const COSA_DELLA_VOCE: Record<string, Cosa> = {
  RETE_CONTATTO: "contatta", RETE_DIRETTO: "contatta", RETE_PONTE: "contatta", RETE_PROMEMORIA: "contatta",
  [KIND_COMMENTO]: "scalda", RETE_PAGINA: "contatta", RETE_FOLLOWUP: "contatta",
};

export async function leggiPercorso(oggi = new Date()): Promise<Percorso> {
  const [lavorazioni, ritrovamenti] = await Promise.all([
    db.lavorazione.findMany({ include: { lead: { select: { id: true, name: true, address: true, category: true } } } }),
    db.ritrovamento.findMany({
      where: { leadId: { not: null }, lead: { pipelineStage: { notIn: ["NON_TARGET", "ARCHIVIATO"] }, lavorazione: null } },
      orderBy: { createdAt: "desc" },
      take: 300,
      select: {
        createdAt: true,
        chiave: { select: { tipo: true, casoStudio: { select: { provincia: true } } } },
        lead: {
          select: {
            id: true, name: true, address: true, category: true,
            approvalItems: { where: { kind: KIND_FASCICOLO_BASE }, orderBy: { createdAt: "desc" }, take: 1, select: { status: true, note: true } },
          },
        },
      },
    }),
  ]);

  // Le trovate fuori dal percorso: concorrenti di un cliente e "senza collegamento" (si ricontrollano dopo i 121).
  const viste = new Set<string>();
  const trovate = ritrovamenti.filter((r) => {
    const l = r.lead!;
    if (viste.has(l.id)) return false;
    viste.add(l.id);
    const fascicolo = l.approvalItems[0];
    if (fascicolo?.status === "SCARTATO") return false;
    const provincia = r.chiave.tipo === "AZIENDA" ? r.chiave.casoStudio?.provincia : null;
    if (provincia && siglaIndirizzo(l.address) === provincia) return false;
    return true;
  });

  const ids = [...lavorazioni.map((l) => l.leadId), ...trovate.map((t) => t.lead!.id)];
  const [dm, voci, commenti] = await Promise.all([
    db.agentReport.findMany({
      where: { leadId: { in: trovate.map((t) => t.lead!.id) }, agent: "decision_maker", validUntil: { gt: oggi } },
      orderBy: { collectedAt: "desc" },
      select: { leadId: true, findings: true },
    }),
    db.approvalItem.findMany({
      where: { leadId: { in: ids }, status: "IN_ATTESA", kind: { in: KINDS_RETE } },
      orderBy: { createdAt: "asc" },
      select: { id: true, leadId: true, kind: true, payload: true },
    }),
    db.approvalItem.findMany({ where: { leadId: { in: ids }, kind: KIND_COMMENTO, status: "APPROVATO" }, select: { leadId: true, payload: true } }),
  ]);

  const collegata = new Map<string, boolean>();
  for (const r of dm) if (!collegata.has(r.leadId!)) collegata.set(r.leadId!, collegamentoDaFindings(r.findings as Record<string, unknown>).collegata);
  const vociDi = new Map<string, Stato["voci"]>();
  for (const v of voci) vociDi.set(v.leadId!, [...(vociDi.get(v.leadId!) ?? []), { id: v.id, kind: v.kind, payload: v.payload as Record<string, unknown> | null }]);
  const commentiDi = new Map<string, { piattaforma?: unknown; post?: unknown }[]>();
  for (const c of commenti) commentiDi.set(c.leadId!, [...(commentiDi.get(c.leadId!) ?? []), (c.payload ?? {}) as { piattaforma?: unknown; post?: unknown }]);

  const cerchia = lavorazioni.some((l) => l.fase === "MAPPATA" && l.strada === "DA_CONFERMARE") ? await cerchiaNomi() : [];
  type Riga = { esito: Esito; da: number; commenti: number; leadId: string; lavorazioneId: string | null; nome: string; zona: string | null; categoria: string | null };
  const righe: Riga[] = [];
  let dopo = 0;
  let inPausa = 0;

  for (const l of lavorazioni) {
    const provati = Array.isArray(l.pontiProvati) ? (l.pontiProvati as string[]) : [];
    const daConfermare = l.fase === "MAPPATA" && l.strada === "DA_CONFERMARE" ? nomiDaConfermare(await datiAzienda(l.leadId, !!l.scaldataAt), cerchia, provati) : [];
    const giaCommentata = piattaformaPiuCommentata(commentiDi.get(l.leadId) ?? []);
    const esito = passoDi({
      decisione: "APPROVATO", collegata: true,
      lav: { fase: l.fase, strada: l.strada, ponte: l.ponteNome, decisore: l.decisore, chiestaAt: l.chiestaAt, presentatoAt: l.presentatoAt },
      commenti: giaCommentata,
      voci: vociDi.get(l.leadId) ?? [],
      daConfermare,
    }, oggi);
    if (!esito.dentro) {
      if (esito.perche === "dopo") dopo++;
      if (esito.perche === "pausa") inPausa++;
      continue;
    }
    righe.push({ esito, da: l.updatedAt.getTime(), commenti: giaCommentata?.fatti ?? 0, leadId: l.leadId, lavorazioneId: l.id, nome: l.lead.name, zona: l.lead.address, categoria: l.lead.category });
  }

  for (const t of trovate) {
    const l = t.lead!;
    const decisione = (l.approvalItems[0]?.status ?? null) as Stato["decisione"];
    const esito = passoDi({ decisione, collegata: collegata.get(l.id) ?? false, lav: null, commenti: null, voci: [], daConfermare: [] }, oggi);
    if (!esito.dentro) continue;
    righe.push({ esito, da: t.createdAt.getTime(), commenti: 0, leadId: l.id, lavorazioneId: null, nome: l.name, zona: l.address, categoria: l.category });
  }

  // Le cose fatte oggi: voci approvate da mezzanotte, incontri fissati, aziende validate (sì o no) e
  // persone che hai detto di conoscere (il "no" non lascia data: non si conta).
  const mezzanotte = mezzanotteRoma(oggi);
  const [vociFatte, incontri, validate, conosciuti] = await Promise.all([
    db.approvalItem.groupBy({ by: ["kind"], where: { kind: { in: Object.keys(COSA_DELLA_VOCE) }, status: "APPROVATO", decidedAt: { gte: mezzanotte } }, _count: true }),
    db.lavorazione.count({ where: { incontroAt: { gte: mezzanotte } } }),
    db.approvalItem.count({ where: { kind: KIND_FASCICOLO_BASE, status: { in: ["APPROVATO", "SCARTATO"] }, decidedAt: { gte: mezzanotte }, OR: [{ decidedBy: null }, { decidedBy: { notIn: [SCARTATA_DAL_CRM, "crm_scalda", "crm_concorrente"] } }] } }),
    db.cerchiaContatto.count({ where: { createdAt: { gte: mezzanotte } } }),
  ]);
  const fatte: Record<Cosa, number> = { contatta: incontri, scalda: 0, valida: validate + conosciuti };
  for (const v of vociFatte) fatte[COSA_DELLA_VOCE[v.kind]] += v._count;

  const scheda = (r: Riga): AziendaNelPercorso => {
    const e = r.esito as Extract<Esito, { dentro: true }>;
    return { leadId: r.leadId, lavorazioneId: r.lavorazioneId, nome: r.nome, zona: r.zona, categoria: r.categoria, passo: e.passo, tocca: e.tocca, stato: e.stato, statoNome: STATI[e.stato], cosa: e.cosa, azione: e.azione };
  };
  // Per stato (Alessio, 2026-10-28), che mette prima quelle dove tocca a lui; poi le già commentate (più commenti in alto).
  const stato = (r: Riga) => ordineStato((r.esito as Extract<Esito, { dentro: true }>).stato);
  const aziende = righe.sort((a, b) => stato(a) - stato(b) || b.commenti - a.commenti || a.da - b.da).map(scheda);
  return {
    passi: PASSI.map((p) => ({ ...p, quante: aziende.filter((a) => a.passo === p.n).length, toccaATe: aziende.filter((a) => a.passo === p.n && a.tocca === "te").length })),
    oggi: Object.fromEntries(Object.entries(coseDiOggi(righe)).map(([c, r]) => [c, r.map(scheda)])) as Percorso["oggi"],
    fatte,
    aziende,
    dopo,
    inPausa,
  };
}

/**
 * v3.99 (Alessio, 2026-11-05: "devo essere in grado di eliminare la richiesta di Contatto, Scaldare e approfondire"):
 * Elimina toglie l'azienda dal percorso per sempre, a qualunque passo. L'azienda va in Non target con il motivo, le
 * voci in attesa si chiudono e i lavori in coda per lei (messaggi LinkedIn, commenti, analisi) non partono.
 */
export const ELIMINATA_DA_ALESSIO = "alessio_elimina";

export async function eliminaDalPercorso(leadId: string): Promise<boolean> {
  const lead = await db.lead.findUnique({ where: { id: leadId }, select: { id: true, notes: true } });
  if (!lead) return false;
  const nota = `Eliminata da Alessio dal Percorso il ${new Date().toLocaleDateString("it-IT", { timeZone: "Europe/Rome" })}.`;
  await db.$transaction([
    db.lavorazione.updateMany({ where: { leadId }, data: { fase: "ELIMINATA" } }),
    db.lead.update({ where: { id: leadId }, data: { pipelineStage: "NON_TARGET", notes: lead.notes ? `${lead.notes}\n${nota}` : nota } }),
    db.approvalItem.updateMany({ where: { leadId, status: "IN_ATTESA" }, data: { status: "SCARTATO", decidedAt: new Date(), decidedBy: ELIMINATA_DA_ALESSIO, note: nota } }),
    db.agentRun.deleteMany({ where: { leadId, status: "IN_CODA" } }),
  ]);
  return true;
}

/**
 * v3.111 (Alessio, 2026-11-06: "un pulsante per forzare: analizza tutte le 40 in analisi, stesso discorso per chi
 * decide, chi me la presenta…"). Le sottosezioni dove lavora il CRM si possono spingere a mano:
 * - dove manca il controllo di chi decide (In analisi, Controllo del collegamento, Chi decide: da trovare): il
 *   controllo LinkedIn si accoda per TUTTE, senza il tetto dei 3 in coda e del budget del giorno. Resta solo lo stop
 *   se LinkedIn ha bloccato (48 ore): forzare lì vorrebbe dire rischiare l'account.
 * - le altre (cerca il ponte, prepara il messaggio, cerca il post…): il giro della rete parte adesso.
 * Il Mac le prende al suo giro (ogni ora, 10 lavori alla volta).
 */
const STATI_CHI_DECIDE = ["analisi", "collegamento", "chi_decide", "pronta"];

export interface EsitoForza {
  aziende: number;
  accodati: number;
  giaInCoda: number;
  bloccoLinkedin: boolean;
  giroRete: boolean;
}

export async function forzaSottosezione(passo: Passo, stato: string, oggi = new Date()): Promise<EsitoForza> {
  const p = await leggiPercorso(oggi);
  const ids = p.aziende.filter((a) => a.passo === passo && a.stato === stato && a.tocca === "crm").map((a) => a.leadId);
  const esito: EsitoForza = { aziende: ids.length, accodati: 0, giaInCoda: 0, bloccoLinkedin: false, giroRete: false };
  if (!ids.length) return esito;

  if (STATI_CHI_DECIDE.includes(stato)) {
    esito.bloccoLinkedin = (await statoLinkedinOggi(oggi)).blocco;
    if (!esito.bloccoLinkedin) {
      const [fatti, inCoda] = await Promise.all([
        db.agentReport.findMany({ where: { leadId: { in: ids }, agent: "decision_maker" }, distinct: ["leadId"], select: { leadId: true } }),
        db.agentRun.findMany({ where: { leadId: { in: ids }, agent: "decision_maker", status: { in: ["IN_CODA", "IN_CORSO"] } }, select: { leadId: true } }),
      ]);
      const conReferto = new Set(fatti.map((f) => f.leadId));
      const giaInCoda = new Set(inCoda.map((r) => r.leadId));
      for (const id of ids) {
        if (giaInCoda.has(id)) { esito.giaInCoda++; continue; }
        if (conReferto.has(id)) continue; // chi decide c'è già: lo porta avanti il giro della rete qui sotto
        await db.agentRun.create({ data: { leadId: id, agent: "decision_maker", status: "IN_CODA" } });
        esito.accodati++;
      }
    }
  }
  // In ogni caso il giro della rete adesso: fa entrare le approfondite, sceglie i ponti, prepara i messaggi.
  await turnoRete(oggi);
  esito.giroRete = true;
  return esito;
}
