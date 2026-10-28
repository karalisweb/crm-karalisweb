/**
 * Il percorso (v3.62) — la parte che legge il database. Le regole sono in percorso-regole.ts.
 * Mette insieme quello che prima stava su tre pagine (Aziende trovate, In lavorazione, Cassetta):
 * per ogni azienda il passo, chi deve muoversi e la cosa da fare.
 */
import { db } from "@/lib/db";
import { siglaIndirizzo } from "@/lib/ricerca/regole";
import { collegamentoDaFindings } from "./motore";
import { mezzanotteRoma } from "./bni-regole";
import { KIND_FASCICOLO_BASE } from "./turno";
import { KIND_COMMENTO, KINDS_RETE, SCARTATA_DAL_CRM, cerchiaNomi, datiAzienda } from "./rete";
import { nomiDaConfermare, piattaformaPiuCommentata } from "./rete-regole";
import { AL_GIORNO, PASSI, STATI, coseDiOggi, ordineStato, passoDi, type Azione, type Cosa, type Esito, type Passo, type Stato, type Tocca } from "./percorso-regole";

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
  /** Le 3 cose di oggi: al massimo 2 da contattare, 3 da scaldare, 5 da validare (quelle che restano). */
  oggi: Record<Cosa, AziendaNelPercorso[]>;
  /** Quante ne hai già fatte oggi per ogni cosa, e quante ne toccano al giorno. */
  fatte: Record<Cosa, number>;
  alGiorno: Record<Cosa, number>;
  aziende: AziendaNelPercorso[];
  dopo: number;
  inPausa: number;
}

/** Quale voce della Cassetta, approvata, conta come cosa fatta. */
const COSA_DELLA_VOCE: Record<string, Cosa> = {
  RETE_CONTATTO: "contatta", RETE_DIRETTO: "contatta", RETE_PONTE: "contatta", RETE_PROMEMORIA: "contatta",
  [KIND_COMMENTO]: "scalda", RETE_PAGINA: "scalda",
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
    db.approvalItem.count({ where: { kind: KIND_FASCICOLO_BASE, status: { in: ["APPROVATO", "SCARTATO"] }, decidedAt: { gte: mezzanotte }, OR: [{ decidedBy: null }, { decidedBy: { not: SCARTATA_DAL_CRM } }] } }),
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
    oggi: Object.fromEntries(Object.entries(coseDiOggi(righe, fatte)).map(([c, r]) => [c, r.map(scheda)])) as Percorso["oggi"],
    fatte,
    alGiorno: AL_GIORNO,
    aziende,
    dopo,
    inPausa,
  };
}
