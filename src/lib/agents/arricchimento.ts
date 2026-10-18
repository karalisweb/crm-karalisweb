/**
 * Fase 2 — Arricchimento (definita con Alessio il 2026-10-18). Due giri, una sola decisione:
 *
 *   1. GIRO VELOCE, da solo, su ogni azienda trovata dalla ricerca: trova sito, ti trovano?,
 *      sito visto, dal cliente al contatto, lettore, recensioni. Costa centesimi.
 *   2. Alessio decide (mail delle 7, scheda azienda, home): Approfondisci o Scarta.
 *   3. GIRO COMPLETO solo con "Approfondisci": concorrenti, pubblicità, tracciamenti, i lavori di
 *      browser (social, Meta, LinkedIn, decision maker) e alla fine i 3 ganci.
 *
 * La decisione è una voce `FASCICOLO_BASE` in approval_items (IN_ATTESA → APPROVATO / SCARTATO).
 */
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { scaricaPagina } from "./pagina";
import { AGENTI_ESEGUIBILI } from "./registro";
import { AGENTI_SINTESI, agentiDaEseguire } from "./regista";
import { CATALOGO, automatici, modiAgenti, voce } from "./catalogo";
import {
  KIND_FASCICOLO_BASE, aziendaContesto, cittaDaIndirizzo, eseguiAgenti, lavoraSuApprovate, ricercaDaChiave, sbloccaLavori,
  statoAzienda, type RiepilogoTurno,
} from "./turno";
import type { AziendaContesto, ContestoAgente, PaginaScaricata } from "./tipi";
import { siglaIndirizzo } from "@/lib/ricerca/regole";
import { refertiValidi } from "./turno";

/** Aziende al massimo in un giro veloce (le 5 al giorno della ricerca, più quelle aggiunte a mano). */
export const GIRO_VELOCE_PER_TURNO = 8;

const STADI_ESCLUSI = ["NON_TARGET", "CLIENTE", "PERSO", "ARCHIVIATO"];

const SELEZIONE = {
  id: true, name: true, website: true, category: true, address: true, phone: true, googleRating: true,
  googleReviewsCount: true, placeId: true, socialUrl: true, search: { select: { location: true } },
  ritrovamenti: { orderBy: { createdAt: "asc" as const }, take: 1, select: { chiave: { select: { tipo: true, valore: true, termini: true } } } },
} satisfies Prisma.LeadSelect;

/** Un agente ha chiuso: referto valido, oppure fallito (non si aspetta all'infinito). */
function chiuso(s: { validoFino: Date | null; fallimentiDiFila: number; inCorso: boolean } | undefined, oggi: Date): boolean {
  if (!s) return false;
  return (!!s.validoFino && s.validoFino > oggi) || (s.fallimentiDiFila > 0 && !s.inCorso);
}

/**
 * Un'azienda della nicchia nella provincia del cliente del caso è un suo concorrente diretto:
 * non si analizza (regola di Alessio, 2026-10-18). Vale per quelle trovate prima della regola.
 */
export async function concorrenteDelCliente(leadId: string): Promise<boolean> {
  const l = await db.lead.findUnique({
    where: { id: leadId },
    select: { address: true, ritrovamenti: { select: { chiave: { select: { tipo: true, casoStudio: { select: { provincia: true } } } } } } },
  });
  if (!l) return false;
  const sigla = siglaIndirizzo(l.address);
  // Escluso solo se TUTTI i ritrovamenti sono di nicchia nella provincia del cliente.
  return !!sigla && l.ritrovamenti.length > 0 && l.ritrovamenti.every((r) => r.chiave.tipo === "AZIENDA" && r.chiave.casoStudio?.provincia === sigla);
}

/** Le aziende da passare al giro veloce: trovate dalla ricerca, non ancora proposte ad Alessio. */
async function daGiroVeloce(limit: number) {
  const candidati = await db.lead.findMany({
    where: {
      // Anche quelle trovate su LinkedIn (titolari simili al caso studio, reti dei membri BNI).
      ritrovamenti: { some: {} },
      pipelineStage: { notIn: STADI_ESCLUSI as never },
      approvalItems: { none: { kind: KIND_FASCICOLO_BASE } },
    },
    orderBy: { createdAt: "desc" },
    take: limit * 3,
    select: SELEZIONE,
  });
  const ok = [];
  for (const l of candidati) {
    if (ok.length >= limit) break;
    if (!(await concorrenteDelCliente(l.id))) ok.push(l);
  }
  return ok;
}

/** Il giro veloce su un'azienda: prima il sito (se manca si cerca e si salva), poi il resto. */
export async function giroVeloce(leadId: string, oggi = new Date()): Promise<{ fatti: number; falliti: number; proposta: boolean }> {
  const l = await db.lead.findUnique({ where: { id: leadId }, select: SELEZIONE });
  if (!l) return { fatti: 0, falliti: 0, proposta: false };
  let fatti = 0;
  let falliti = 0;

  const modi = await modiAgenti();
  const veloci = automatici(modi, "trovata");

  // 1) Trova sito: lavora anche senza sito (è proprio il suo mestiere).
  const stati0 = await statoAzienda(l.id);
  if (veloci.includes("trova_sito") && agentiDaEseguire(stati0, oggi, ["trova_sito"]).length) {
    const base: AziendaContesto = {
      id: l.id, name: l.name, website: l.website ?? "", category: l.category, address: l.address, phone: l.phone,
      googleRating: l.googleRating != null ? Number(l.googleRating) : null, googleReviewsCount: l.googleReviewsCount,
      citta: cittaDaIndirizzo(l.address) ?? l.search?.location ?? null, placeId: l.placeId, socialUrl: l.socialUrl, ricerca: ricercaDaChiave(l.ritrovamenti[0]?.chiave ?? null),
    };
    const e = await eseguiAgenti(base, ["trova_sito"], oggi);
    fatti += e.fatti;
    falliti += e.falliti;
    const r = await db.agentReport.findFirst({ where: { leadId: l.id, agent: "trova_sito" }, orderBy: { collectedAt: "desc" }, select: { findings: true } });
    const sito = (r?.findings as { sito?: string | null } | null)?.sito;
    if (sito && !l.website) {
      await db.lead.update({ where: { id: l.id }, data: { website: sito } });
      l.website = sito;
    }
  }

  // 2) Il resto del giro veloce, se c'è un sito.
  const azienda = aziendaContesto(l);
  if (azienda) {
    const piano = agentiDaEseguire(await statoAzienda(l.id), oggi, veloci.filter((a) => a !== "trova_sito"));
    if (piano.length) {
      const e = await eseguiAgenti(azienda, piano, oggi);
      fatti += e.fatti;
      falliti += e.falliti;
    }
  }

  // 3) Tutti hanno chiuso (o non c'è sito): si propone ad Alessio, una volta sola.
  const stati = new Map((await statoAzienda(l.id)).map((s) => [s.agente, s]));
  const finito = l.website ? veloci.every((a) => chiuso(stati.get(a), oggi)) : !veloci.includes("trova_sito") || chiuso(stati.get("trova_sito"), oggi);
  let proposta = false;
  if (finito && !(await db.approvalItem.findFirst({ where: { leadId: l.id, kind: KIND_FASCICOLO_BASE }, select: { id: true } }))) {
    const referti = await refertiValidi(l.id, oggi);
    const leve = referti.flatMap((r) => r.levers);
    await db.approvalItem.create({
      data: {
        leadId: l.id,
        kind: KIND_FASCICOLO_BASE,
        agent: "giro_veloce",
        title: `${l.name}: ${leve.length} cose trovate`,
        payload: { sito: l.website, riepiloghi: Object.fromEntries(referti.map((r) => [r.agent, r.summary])), leve } as unknown as Prisma.InputJsonValue,
      },
    });
    proposta = true;
  }
  return { fatti, falliti, proposta };
}

/** Le frasi si rifanno quando arriva un dato più recente (un agente rilanciato, la parte dal Mac). */
async function ganciDaRifare(oggi: Date): Promise<number> {
  const approvate = await db.lead.findMany({
    where: { approvalItems: { some: { kind: KIND_FASCICOLO_BASE, status: "APPROVATO" } }, agentReports: { some: { agent: "ganci" } } },
    select: { id: true },
    take: 50,
  });
  let rifatti = 0;
  for (const { id } of approvate) {
    const [ganci, browser] = await Promise.all([
      db.agentReport.findFirst({ where: { leadId: id, agent: "ganci" }, orderBy: { collectedAt: "desc" }, select: { collectedAt: true } }),
      db.agentReport.findFirst({ where: { leadId: id, agent: { not: "ganci" } }, orderBy: { collectedAt: "desc" }, select: { collectedAt: true } }),
    ]);
    if (!ganci || !browser || browser.collectedAt <= ganci.collectedAt) continue;
    const l = await db.lead.findUnique({ where: { id }, select: SELEZIONE });
    const azienda = l && aziendaContesto(l);
    if (!azienda) continue;
    await eseguiAgenti(azienda, [...AGENTI_SINTESI], oggi, { catena: true });
    rifatti++;
  }
  return rifatti;
}

export interface RiepilogoArricchimento extends RiepilogoTurno {
  giroVeloce: number;
  proposte: number;
  ganciRifatti: number;
}

/** Il turno: sblocca, approfondisce le approvate, fa il giro veloce sulle nuove. */
export async function eseguiTurnoArricchimento(oggi = new Date()): Promise<RiepilogoArricchimento> {
  const inizio = Date.now();
  const r: RiepilogoArricchimento = {
    aziende: 0, lavoriFatti: 0, lavoriFalliti: 0, nuoviInCassetta: 0, accodatiBrowser: 0, sbloccati: 0, saltatiPerBudget: 0, durataMs: 0,
    giroVeloce: 0, proposte: 0, ganciRifatti: 0,
  };
  r.sbloccati = await sbloccaLavori(oggi);
  await lavoraSuApprovate(5, oggi, r);
  r.ganciRifatti = await ganciDaRifare(oggi);
  for (const l of await daGiroVeloce(GIRO_VELOCE_PER_TURNO)) {
    const e = await giroVeloce(l.id, oggi);
    r.giroVeloce++;
    r.lavoriFatti += e.fatti;
    r.lavoriFalliti += e.falliti;
    if (e.proposta) r.proposte++;
  }
  r.durataMs = Date.now() - inizio;
  return r;
}

/** "Approfondisci": il giro completo parte subito su questa azienda (senza aspettare il turno). */
export async function approfondisci(leadId: string, oggi = new Date()): Promise<void> {
  const r: RiepilogoTurno = { aziende: 0, lavoriFatti: 0, lavoriFalliti: 0, nuoviInCassetta: 0, accodatiBrowser: 0, sbloccati: 0, saltatiPerBudget: 0, durataMs: 0 };
  await lavoraSuApprovate(1, oggi, r, leadId);
}

// Contesto per gli agenti quando serve fuori dal turno (prove, script).
export function contestoPer(azienda: AziendaContesto, oggi = new Date()): ContestoAgente {
  let pagina: Promise<PaginaScaricata> | null = null;
  return { lead: azienda, pagina: () => (pagina ??= scaricaPagina(azienda.website)), referti: () => refertiValidi(azienda.id, oggi), oggi };
}

export { AGENTI_ESEGUIBILI };


/**
 * Il pulsante "Lancia" / "Rifai" della scheda: un agente su un'azienda, subito.
 * Server: gira adesso (e poi si rifanno le frasi). Mac: va in coda per l'agente sul Mac.
 */
export async function lanciaAgente(leadId: string, chiave: string, oggi = new Date()): Promise<{ dove: "server" | "mac"; messaggio: string }> {
  const v = voce(chiave);
  if (!v) throw new Error("Agente sconosciuto");
  const l = await db.lead.findUnique({ where: { id: leadId }, select: SELEZIONE });
  if (!l) throw new Error("Azienda non trovata");
  const attivo = await db.agentRun.findFirst({ where: { leadId, agent: chiave, status: { in: ["IN_CODA", "IN_CORSO"] } }, select: { id: true } });
  if (attivo) return { dove: v.dove, messaggio: "Già in corso" };

  if (v.dove === "mac") {
    await db.agentRun.create({ data: { leadId, agent: chiave, status: "IN_CODA" } });
    return { dove: "mac", messaggio: "In coda per l'agente sul Mac: entro mezz'ora" };
  }
  const azienda = chiave === "trova_sito"
    ? { ...(aziendaContesto({ ...l, website: l.website || "x" }) as AziendaContesto), website: l.website ?? "" }
    : aziendaContesto(l);
  if (!azienda) throw new Error("Serve prima il sito: lancia Trova sito");
  void (async () => {
    await eseguiAgenti(azienda, [chiave], oggi);
    if (chiave === "trova_sito") {
      const r = await db.agentReport.findFirst({ where: { leadId, agent: "trova_sito" }, orderBy: { collectedAt: "desc" }, select: { findings: true } });
      const sito = (r?.findings as { sito?: string | null } | null)?.sito;
      if (sito && !l.website) await db.lead.update({ where: { id: leadId }, data: { website: sito } });
    }
    // Le frasi per il telefono tengono conto del dato nuovo (se ci sono già o se è approvata).
    if (chiave !== "ganci" && (await db.agentReport.findFirst({ where: { leadId, agent: "ganci" }, select: { id: true } }))) {
      await eseguiAgenti(azienda, ["ganci"], new Date());
    }
  })().catch((e) => console.error("[lancia] fallito:", e));
  return { dove: "server", messaggio: "Partito: tra un minuto trovi il risultato" };
}

export { CATALOGO };

/**
 * "Cambia sito": Alessio scrive l'indirizzo giusto. Si salva e ripartono subito, sul server, le
 * ricerche che dipendono dal sito (quelle dell'analisi veloce e, se è approfondita, anche le altre),
 * poi le frasi per il telefono. Le ricerche su LinkedIn restano come sono.
 */
export async function cambiaSito(leadId: string, sito: string, oggi = new Date()): Promise<void> {
  await db.lead.update({ where: { id: leadId }, data: { website: sito } });
  const l = await db.lead.findUnique({ where: { id: leadId }, select: SELEZIONE });
  const azienda = l && aziendaContesto(l);
  if (!azienda) return;
  const approvata = !!(await db.approvalItem.findFirst({ where: { leadId, kind: KIND_FASCICOLO_BASE, status: "APPROVATO" }, select: { id: true } }));
  const piano = CATALOGO.filter((v) => v.dove === "server" && v.momento !== "sintesi" && (v.momento === "trovata" || approvata)).map((v) => v.chiave);
  void (async () => {
    await eseguiAgenti(azienda, piano, oggi);
    if (approvata || (await db.agentReport.findFirst({ where: { leadId, agent: "ganci" }, select: { id: true } }))) await eseguiAgenti(azienda, ["ganci"], new Date());
  })().catch((e) => console.error("[cambia sito] fallito:", e));
}
