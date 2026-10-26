/**
 * Il seguito del 121 con il Metodo Strategico Digitale™ (decisione di Alessio del 2026-10-26: "nessuno ha mai
 * ricevuto una proposta reale"). Dopo ogni 121 con interesse PER SÉ, nel perimetro MSD, la proposta scritta va in
 * Cassetta entro poche ore; Alessio la rilegge e la manda. Fuori target decide lui. Dopo una settimana senza
 * risposta, un solo richiamo con un contenuto nuovo, poi il membro resta "in attesa".
 * Le regole sono in `msd/scheda-msd.md` (dalla Carta Fondativa MSD v1.3) e in `msd-regole.ts`.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { chiediJSON, type Schema } from "./ai";
import { budgetDisponibile } from "./costi";
import { GIORNI_RICHIAMO_MSD, controllaTesto, richiamoDovuto, seguitoDopo121, type Interesse, type Target } from "./msd-regole";

export const KIND_PROPOSTA_MSD = "PROPOSTA_MSD";
export const KIND_MSD_FUORI_TARGET = "MSD_FUORI_TARGET";
export const KIND_RICHIAMO_MSD = "RICHIAMO_MSD";
export const KINDS_MSD = [KIND_PROPOSTA_MSD, KIND_MSD_FUORI_TARGET, KIND_RICHIAMO_MSD];

/** Il segnaposto del link per candidarsi: si sostituisce con MSD_CANDIDATURA_URL, se c'è. */
const LINK = "{LINK}";

let scheda: string | null = null;
function schedaMsd(): string {
  scheda ??= readFileSync(join(process.cwd(), "src/lib/agents/msd/scheda-msd.md"), "utf8");
  return scheda;
}

function linkCandidatura(): string | null {
  const u = process.env.MSD_CANDIDATURA_URL?.trim();
  return u && /^https?:\/\//.test(u) ? u : null;
}

/** Cosa ha capito l'agente Dopo-121 sull'interesse del membro (dal testo del 121). */
export interface LetturaInteresse {
  interesse: Interesse;
  target: Target;
  perche_target: string;
  richiesta: string;
  parole_sue: string;
  passo_fissato: string;
}

const nomeProprio = (n: string) => n.trim().split(/\s+/)[0] ?? n;

interface RispostaTesto {
  messaggio: string;
}
const SCHEMA_TESTO: Schema = {
  type: "object",
  properties: { messaggio: { type: "string", description: "Il testo da mandare, in prosa, firmato Alessio" } },
  required: ["messaggio"],
};

const sistemaMsd = (compito: string) =>
  `Scrivi per Alessio Loi (Karalisweb) un messaggio che lui rilegge e manda. Segui alla lettera questa scheda: in caso di dubbio non scrivere e segnalalo.\n\n${schedaMsd()}\n\nREGOLE IN PIÙ: usa SOLO quello che è detto nel 121 (non inventare fatti, nomi, numeri); dai del tu come in BNI; niente elenchi puntati; firma "Alessio". ${compito}`;

/** La proposta scritta (con un secondo tentativo se il primo testo non passa i controlli). */
async function scriviProposta(membro: { name: string; company: string | null; profession: string | null }, uno: { date: Date; riassunto: string | null; trascrizione: string | null }, lettura: LetturaInteresse | null) {
  const testo = [
    `MEMBRO: ${membro.name}${membro.company ? `, ${membro.company}` : ""}${membro.profession ? ` (${membro.profession})` : ""}. Chiamalo ${nomeProprio(membro.name)}.`,
    `121 DEL ${uno.date.toISOString().slice(0, 10)}`,
    lettura?.richiesta ? `COSA HA CHIESTO (domanda operativa): ${lettura.richiesta}` : null,
    lettura?.parole_sue ? `LE SUE PAROLE: "${lettura.parole_sue}"` : null,
    lettura?.passo_fissato ? `PASSO GIÀ FISSATO AL 121: ${lettura.passo_fissato} (il messaggio mantiene questo accordo)` : null,
    uno.riassunto ? `RIASSUNTO DEL 121: ${uno.riassunto}` : null,
    uno.trascrizione ? `TESTO DEL 121 (estratto):\n${uno.trascrizione.slice(0, 12_000)}` : null,
  ].filter(Boolean).join("\n");
  const compito = `Scrivi la proposta dopo il 121 (regole della sezione 7, tono dell'esempio della sezione 9). Il prezzo si scrive esattamente "2.000€ + IVA". Per la chiamata all'azione scrivi esattamente il segnaposto ${LINK} dove va il link per candidarsi.`;
  let costCents = 0;
  let messaggio = "";
  let avvisi: string[] = [];
  for (let tentativo = 0; tentativo < 2; tentativo++) {
    const ai = await chiediJSON<RispostaTesto>({
      sistema: sistemaMsd(compito + (tentativo ? ` Il testo precedente aveva questi problemi, correggili: ${avvisi.join("; ")}.` : "")),
      testo,
      schema: SCHEMA_TESTO,
    });
    costCents += ai.costCents;
    messaggio = ai.dati.messaggio.trim();
    avvisi = controllaTesto(messaggio.replace(LINK, "https://link"));
    if (!avvisi.length) break;
  }
  return { messaggio, avvisi, costCents };
}

function conLink(messaggio: string): { messaggio: string; avvisi: string[] } {
  const url = linkCandidatura();
  if (url) return { messaggio: messaggio.split(LINK).join(url), avvisi: [] };
  return { messaggio: messaggio.split(LINK).join("[link al tuo calendario]"), avvisi: ["Manca il link per candidarsi: mettilo tu al posto di [link al tuo calendario]"] };
}

/** La proposta MSD in Cassetta, una sola per 121. */
export async function propostaMsd(membroId: string, oneToOneId: string, lettura: LetturaInteresse | null, oggi = new Date()): Promise<boolean> {
  const gia = await db.approvalItem.findFirst({ where: { bniMembroId: membroId, kind: KIND_PROPOSTA_MSD, payload: { path: ["oneToOneId"], equals: oneToOneId } }, select: { id: true } });
  if (gia) return false;
  if (!(await budgetDisponibile(oggi)).ok) return false;
  const [membro, uno] = await Promise.all([
    db.bniMembro.findUnique({ where: { id: membroId }, select: { name: true, company: true, profession: true, phone: true, email: true } }),
    db.oneToOne.findUnique({ where: { id: oneToOneId }, select: { date: true, riassunto: true, trascrizione: true } }),
  ]);
  if (!membro || !uno) return false;
  const run = await db.agentRun.create({ data: { bniMembroId: membroId, agent: "proposta_msd", status: "IN_CORSO", attempts: 1, startedAt: new Date() } });
  try {
    const p = await scriviProposta(membro, uno, lettura);
    const finale = conLink(p.messaggio);
    await db.approvalItem.create({
      data: {
        bniMembroId: membroId,
        kind: KIND_PROPOSTA_MSD,
        agent: "proposta_msd",
        title: `Proposta Metodo Strategico Digitale™ a ${membro.name}`,
        payload: {
          oneToOneId,
          messaggio: finale.messaggio,
          avvisi: [...p.avvisi, ...finale.avvisi],
          richiesta: lettura?.richiesta ?? null,
          passoFissato: lettura?.passo_fissato || null,
          telefono: membro.phone,
          email: membro.email,
        } as Prisma.InputJsonValue,
      },
    });
    await db.agentRun.update({ where: { id: run.id }, data: { status: "FATTO", finishedAt: new Date(), costCents: p.costCents } });
    return true;
  } catch (err) {
    await db.agentRun.update({ where: { id: run.id }, data: { status: "FALLITO", finishedAt: new Date(), error: (err instanceof Error ? err.message : String(err)).slice(0, 500) } });
    return false;
  }
}

/**
 * Dopo il 121 (chiamato dall'agente Dopo-121): interesse per sé e nel perimetro → proposta; per sé ma fuori
 * perimetro o incerto → avviso ad Alessio, decide lui; interesse a segnalare o nessuno → niente (c'è già il
 * seguito delle presentazioni).
 */
export async function seguitoMsd(membroId: string, oneToOneId: string, lettura: LetturaInteresse, oggi = new Date()): Promise<"proposta" | "fuori_target" | "niente"> {
  const cosa = seguitoDopo121(lettura.interesse, lettura.target);
  if (cosa === "proposta") {
    await propostaMsd(membroId, oneToOneId, lettura, oggi);
  } else if (cosa === "fuori_target") {
    const membro = await db.bniMembro.findUnique({ where: { id: membroId }, select: { name: true } });
    const gia = await db.approvalItem.findFirst({ where: { bniMembroId: membroId, kind: KIND_MSD_FUORI_TARGET, payload: { path: ["oneToOneId"], equals: oneToOneId } }, select: { id: true } });
    if (membro && !gia) {
      await db.approvalItem.create({
        data: {
          bniMembroId: membroId,
          kind: KIND_MSD_FUORI_TARGET,
          agent: "proposta_msd",
          title: `${membro.name} ha mostrato interesse, ma ${lettura.target === "fuori" ? "è fuori target" : "non si sa se è in target"}: decidi tu`,
          payload: { oneToOneId, perche: lettura.perche_target, richiesta: lettura.richiesta, lettura } as unknown as Prisma.InputJsonValue,
        },
      });
    }
  }
  return cosa;
}

/** Effetto della decisione di Alessio in Cassetta sulle voci MSD. */
export async function decisioneMsd(voceId: string, decisione: "APPROVATO" | "SCARTATO", oggi = new Date()): Promise<void> {
  const v = await db.approvalItem.findUnique({ where: { id: voceId }, select: { kind: true, bniMembroId: true, payload: true } });
  if (!v?.bniMembroId || !KINDS_MSD.includes(v.kind)) return;
  const p = (v.payload ?? {}) as { oneToOneId?: string; lettura?: LetturaInteresse };
  if (v.kind === KIND_PROPOSTA_MSD && decisione === "APPROVATO") {
    // Mandata: il membro passa a "Offerta inviata" e fra una settimana, se non risponde, il richiamo.
    await db.bniMembro.update({ where: { id: v.bniMembroId }, data: { bniStage: "OFFERTA", nextRecallAt: new Date(oggi.getTime() + GIORNI_RICHIAMO_MSD * 86400_000) } });
  } else if (v.kind === KIND_MSD_FUORI_TARGET && decisione === "APPROVATO" && p.oneToOneId) {
    // "Fai la proposta lo stesso".
    await propostaMsd(v.bniMembroId, p.oneToOneId, p.lettura ?? null, oggi);
  } else if (v.kind === KIND_RICHIAMO_MSD) {
    // Dopo il richiamo (mandato o no) il membro resta in attesa: si riprende solo con un motivo vero.
    await db.bniMembro.update({ where: { id: v.bniMembroId }, data: { bniStage: "RECALL", nextRecallAt: null } });
  }
}

/** Ogni mattina: a una settimana dalla proposta mandata, se il membro è ancora in "Offerta inviata", il richiamo. */
export async function richiamiMsd(oggi = new Date()): Promise<number> {
  const mandate = await db.approvalItem.findMany({
    where: { kind: KIND_PROPOSTA_MSD, status: "APPROVATO", decidedAt: { lte: new Date(oggi.getTime() - GIORNI_RICHIAMO_MSD * 86400_000) }, bniMembro: { bniStage: "OFFERTA" } },
    select: { bniMembroId: true, decidedAt: true, payload: true },
    take: 20,
  });
  let creati = 0;
  for (const m of mandate) {
    if (!m.bniMembroId) continue;
    const gia = !!(await db.approvalItem.findFirst({ where: { bniMembroId: m.bniMembroId, kind: KIND_RICHIAMO_MSD, createdAt: { gte: m.decidedAt! } }, select: { id: true } }));
    if (!richiamoDovuto(m.decidedAt, gia, oggi) || !(await budgetDisponibile(oggi)).ok) continue;
    const p = (m.payload ?? {}) as { oneToOneId?: string; messaggio?: string };
    const [membro, uno] = await Promise.all([
      db.bniMembro.findUnique({ where: { id: m.bniMembroId }, select: { name: true, phone: true, email: true } }),
      p.oneToOneId ? db.oneToOne.findUnique({ where: { id: p.oneToOneId }, select: { riassunto: true, trascrizione: true } }) : null,
    ]);
    if (!membro) continue;
    try {
      const ai = await chiediJSON<RispostaTesto>({
        sistema: sistemaMsd(`Scrivi l'UNICO richiamo (sezione 8): la proposta è stata mandata una settimana fa e non ha risposto. Porta un contenuto nuovo: un dettaglio sulla sua situazione detto nel 121, non "hai visto il messaggio?". Breve, 3-4 frasi, niente prezzo, niente pressione: chi si candida è l'imprenditore.`),
        testo: [`MEMBRO: ${membro.name}. Chiamalo ${nomeProprio(membro.name)}.`, p.messaggio ? `PROPOSTA MANDATA:\n${p.messaggio}` : null, uno?.riassunto ? `RIASSUNTO DEL 121: ${uno.riassunto}` : null, uno?.trascrizione ? `TESTO DEL 121 (estratto):\n${uno.trascrizione.slice(0, 10_000)}` : null].filter(Boolean).join("\n\n"),
        schema: SCHEMA_TESTO,
      });
      const messaggio = ai.dati.messaggio.trim();
      await db.approvalItem.create({
        data: {
          bniMembroId: m.bniMembroId,
          kind: KIND_RICHIAMO_MSD,
          agent: "proposta_msd",
          title: `Richiamo a ${membro.name}: una settimana dalla proposta MSD`,
          payload: { oneToOneId: p.oneToOneId ?? null, messaggio, avvisi: controllaTesto(messaggio, "richiamo"), telefono: membro.phone, email: membro.email } as Prisma.InputJsonValue,
        },
      });
      creati++;
    } catch (err) {
      console.error("[msd] richiamo non scritto:", err);
    }
  }
  return creati;
}
