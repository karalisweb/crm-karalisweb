/**
 * Motore 121 — la parte che lavora sul database. Le regole sono in motore-121.ts.
 *
 *   - Budget LinkedIn comune a tutti gli agenti di browser (25 letture al giorno, 48 ore di stop dopo
 *     un blocco). I lavori BNI hanno la precedenza: gli altri ne usano al massimo 15.
 *   - Passo 4: lo studio dell'azienda del membro prima del 121 (agenti di server, niente LinkedIn).
 *   - Passo 5: i contatti da segnalare al membro (aziende del CRM utili al suo mestiere).
 *   - Strada aziende: un'azienda arriva ad Alessio solo se chi decide è collegato a lui.
 *   - Dopo il 121: il promemoria del vocale e le richieste di presentazione in Cassetta.
 */
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { chiediJSON, REGOLE_COMUNI, type Schema } from "./ai";
import { budgetDisponibile } from "./costi";
import { automatici, modiAgenti } from "./catalogo";
import { KIND_FASCICOLO_BASE, aziendaContesto, eseguiAgenti, statoAzienda } from "./turno";
import type { AziendaContesto } from "./tipi";
import { agentiDaEseguire } from "./regista";
import { mezzanotteRoma, norm } from "./bni-regole";
import {
  AGENTI_LINKEDIN, GIORNI_RICONTROLLO, ORE_STOP_LINKEDIN, SERBATOIO_MAX, bloccoLinkedin, collegamentoDa, lettureDi,
  lettureDisponibili, messaggioPresentazione, type DecisoreLetto,
} from "./motore-121";
import { siglaIndirizzo } from "@/lib/ricerca/regole";

export const KIND_DOPO_121 = "DOPO_121";
export const KIND_PRESENTAZIONE_BNI = "PRESENTAZIONE_BNI";

const AGENTI_LINKEDIN_BNI = ["linkedin_membri", "rete_membro"];
/** Letture al giorno che i lavori non BNI (chi decide, LinkedIn azienda) possono usare. */
const LETTURE_NON_BNI = 15;

// ─── Budget LinkedIn ────────────────────────────────────────────────────────

export interface StatoLinkedinOggi {
  usate: number;
  usateNonBni: number;
  blocco: boolean;
  bloccoFinoAl: Date | null;
  disponibili: number;
}

export async function statoLinkedinOggi(oggi = new Date()): Promise<StatoLinkedinOggi> {
  const [oggiRuns, blocchi] = await Promise.all([
    db.agentRun.findMany({ where: { agent: { in: AGENTI_LINKEDIN }, queuedAt: { gte: mezzanotteRoma(oggi) } }, select: { agent: true, input: true } }),
    db.agentRun.findMany({
      where: { agent: { in: AGENTI_LINKEDIN }, status: "FALLITO", finishedAt: { gte: new Date(oggi.getTime() - ORE_STOP_LINKEDIN * 3600_000) } },
      select: { error: true, finishedAt: true },
      orderBy: { finishedAt: "desc" },
    }),
  ]);
  const usate = oggiRuns.reduce((s, r) => s + lettureDi(r.agent, r.input), 0);
  const usateNonBni = oggiRuns.filter((r) => !AGENTI_LINKEDIN_BNI.includes(r.agent)).reduce((s, r) => s + lettureDi(r.agent, r.input), 0);
  const ultimo = blocchi.find((b) => bloccoLinkedin(b.error));
  const blocco = !!ultimo;
  return {
    usate,
    usateNonBni,
    blocco,
    bloccoFinoAl: ultimo?.finishedAt ? new Date(ultimo.finishedAt.getTime() + ORE_STOP_LINKEDIN * 3600_000) : null,
    disponibili: lettureDisponibili(usate, blocco),
  };
}

/** Si può accodare questo lavoro LinkedIn oggi? (Gli agenti che non usano LinkedIn passano sempre.) */
export async function linkedinPermette(agente: string, input: unknown, oggi = new Date()): Promise<boolean> {
  if (!AGENTI_LINKEDIN.includes(agente)) return true;
  const s = await statoLinkedinOggi(oggi);
  const costo = lettureDi(agente, input);
  if (s.disponibili < costo) return false;
  if (!AGENTI_LINKEDIN_BNI.includes(agente) && s.usateNonBni + costo > LETTURE_NON_BNI) return false;
  return true;
}

// ─── Passo 4: lo studio dell'azienda del membro ─────────────────────────────

const SELEZIONE_LEAD = {
  id: true, name: true, website: true, category: true, address: true, phone: true, googleRating: true,
  googleReviewsCount: true, placeId: true, socialUrl: true, search: { select: { location: true } },
  ritrovamenti: { orderBy: { createdAt: "asc" as const }, take: 1, select: { chiave: { select: { tipo: true, valore: true, termini: true } } } },
} satisfies Prisma.LeadSelect;

/** Giorni prima del 121 in cui si studia l'azienda del membro. */
const GIORNI_STUDIO = 4;
const AGENTI_ESCLUSI_STUDIO = ["ganci", "trova_sito"];

const dominio = (u: string) => u.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split(/[/?#]/)[0].toLowerCase();

/**
 * Il lead dell'azienda di un membro: quello già collegato, uno con lo stesso sito, oppure uno nuovo.
 * Un membro è un partner, non un cliente: il lead nuovo nasce "fuori target" (nessun invio a freddo)
 * e, se l'azienda era fra quelle trovate dalla ricerca, la sua decisione si chiude.
 */
export async function leadDelMembro(membroId: string): Promise<string | null> {
  const m = await db.bniMembro.findUnique({ where: { id: membroId }, select: { id: true, name: true, company: true, website: true, phone: true, profession: true, leadId: true } });
  if (!m) return null;
  if (m.leadId && (await db.lead.findUnique({ where: { id: m.leadId }, select: { id: true } }))) return m.leadId;
  const sito = m.website?.trim() ? (/^https?:\/\//i.test(m.website) ? m.website.trim() : `https://${m.website.trim()}`) : null;
  let leadId: string | null = null;
  if (sito) {
    const d = dominio(sito);
    const x = await db.lead.findFirst({ where: { website: { contains: d, mode: "insensitive" } }, select: { id: true } });
    leadId = x?.id ?? null;
  }
  if (!leadId) {
    if (!sito && !m.company) return null;
    const l = await db.lead.create({
      data: {
        name: (m.company || m.name).slice(0, 200),
        website: sito,
        phone: m.phone,
        category: m.profession?.slice(0, 100) ?? null,
        source: "bni_membro",
        bniOriginType: "MEMBRO",
        pipelineStage: "NON_TARGET",
        notes: `Azienda di ${m.name}, membro BNI: si studia per il 121, non si contatta a freddo.`,
      },
      select: { id: true },
    });
    leadId = l.id;
  } else {
    // Un membro non si vende: se l'azienda era fra quelle da decidere, la decisione si chiude.
    await db.approvalItem.updateMany({
      where: { leadId, kind: KIND_FASCICOLO_BASE, status: "IN_ATTESA" },
      data: { status: "SCARTATO", note: `È l'azienda di ${m.name}, membro BNI: non si vende ai membri`, decidedAt: new Date() },
    });
  }
  await db.bniMembro.update({ where: { id: m.id }, data: { leadId } });
  return leadId;
}

/** Studia le aziende dei membri con un 121 nei prossimi 4 giorni (al massimo `limite` per turno). */
export async function studiaMembri(oggi = new Date(), limite = 3): Promise<{ studiati: number; saltati: number }> {
  const membri = await db.bniMembro.findMany({
    where: {
      status: "ATTIVO",
      next121At: { gte: new Date(oggi.getTime() - 3600_000), lte: new Date(oggi.getTime() + GIORNI_STUDIO * 86400_000) },
      OR: [{ studiatoAt: null }, { studiatoAt: { lt: new Date(oggi.getTime() - 90 * 86400_000) } }],
    },
    orderBy: { next121At: "asc" },
    select: { id: true },
    take: limite,
  });
  const modi = await modiAgenti();
  const piano = [...automatici(modi, "trovata", "server"), ...automatici(modi, "approfondisci", "server")].filter((a) => !AGENTI_ESCLUSI_STUDIO.includes(a));
  let studiati = 0;
  let saltati = 0;
  for (const { id } of membri) {
    if (!(await budgetDisponibile(oggi)).ok) break;
    const leadId = await leadDelMembro(id);
    const l = leadId ? await db.lead.findUnique({ where: { id: leadId }, select: SELEZIONE_LEAD }) : null;
    // Senza sito si cerca prima il sito (come nel giro veloce): nome, dominio, scheda Google.
    if (l && !l.website && !(await db.agentReport.findFirst({ where: { leadId: l.id, agent: "trova_sito" }, select: { id: true } }))) {
      const base = { ...(aziendaContesto({ ...l, website: "x" }) as AziendaContesto), website: "" };
      await eseguiAgenti(base, ["trova_sito"], oggi);
      const r = await db.agentReport.findFirst({ where: { leadId: l.id, agent: "trova_sito" }, orderBy: { collectedAt: "desc" }, select: { findings: true } });
      const sito = (r?.findings as { sito?: string | null } | null)?.sito;
      if (sito) {
        await db.lead.update({ where: { id: l.id }, data: { website: sito } });
        await db.bniMembro.update({ where: { id }, data: { website: sito } });
        l.website = sito;
      }
    }
    const azienda = l && aziendaContesto(l);
    if (!azienda) {
      // Senza sito non c'è niente da studiare: si segna, così non si riprova ogni giorno.
      await db.bniMembro.update({ where: { id }, data: { studiatoAt: oggi } });
      saltati++;
      continue;
    }
    const daFare = agentiDaEseguire(await statoAzienda(azienda.id), oggi, piano);
    if (daFare.length) await eseguiAgenti(azienda, daFare, oggi);
    await db.bniMembro.update({ where: { id }, data: { studiatoAt: oggi } });
    studiati++;
  }
  return { studiati, saltati };
}

// ─── Passo 5: i contatti da segnalare al membro ─────────────────────────────

interface RispostaSegnalazioni {
  scelte: { numero: number; motivo: string }[];
}
const SCHEMA_SEGNALAZIONI: Schema = {
  type: "object",
  properties: {
    scelte: {
      type: "array",
      description: "Da 0 a 3 aziende dell'elenco che possono davvero servire al lavoro del membro (sue potenziali clienti o partner). Meglio nessuna che una forzata.",
      items: {
        type: "object",
        properties: {
          numero: { type: "integer", description: "Il numero dell'azienda nell'elenco" },
          motivo: { type: "string", description: "Una riga: perché questa azienda può servire al membro, concreta" },
        },
        required: ["numero", "motivo"],
      },
    },
  },
  required: ["scelte"],
};

/**
 * Fino a 3 contatti da segnalare al membro: aziende del CRM che possono servire al suo mestiere.
 * Si propongono una volta ogni 30 giorni; il primo 121 non vende, dà.
 */
export async function proponiSegnalazioni(membroId: string, oggi = new Date()): Promise<number> {
  const gia = await db.bniSegnalazione.count({ where: { membroId, createdAt: { gt: new Date(oggi.getTime() - 30 * 86400_000) } } });
  if (gia) return 0;
  if (!(await budgetDisponibile(oggi)).ok) return 0;
  const m = await db.bniMembro.findUnique({ where: { id: membroId }, select: { name: true, company: true, profession: true, cosaFa: true, seeking: true, chapter: true, leadId: true } });
  if (!m || (!m.profession && !m.cosaFa && !m.seeking)) return 0;
  const capitolo = m.chapter ? await db.bniChapter.findFirst({ where: { name: { equals: m.chapter, mode: "insensitive" } }, select: { city: true, provincia: true } }) : null;
  const giaDate = new Set((await db.bniSegnalazione.findMany({ where: { membroId }, select: { leadId: true } })).map((s) => s.leadId));
  const candidati = (
    await db.lead.findMany({
      where: {
        pipelineStage: { notIn: ["ARCHIVIATO", "PERSO"] },
        bniOriginType: null,
        category: { not: null },
        ...(m.leadId ? { id: { not: m.leadId } } : {}),
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, category: true, address: true },
      take: 300,
    })
  ).filter((l) => !giaDate.has(l.id));
  const vicino = (a: string | null) => {
    const s = siglaIndirizzo(a);
    return (!!capitolo?.provincia && s === capitolo.provincia.toUpperCase()) || (!!capitolo?.city && norm(a).includes(norm(capitolo.city)));
  };
  const elenco = [...candidati.filter((l) => vicino(l.address)), ...candidati.filter((l) => !vicino(l.address))].slice(0, 40);
  if (!elenco.length) return 0;
  const run = await db.agentRun.create({ data: { bniMembroId: membroId, agent: "segnalazioni", status: "IN_CORSO", attempts: 1, startedAt: new Date() } });
  try {
    const ai = await chiediJSON<RispostaSegnalazioni>({
      sistema: `${REGOLE_COMUNI}\n\nSei l'agente Segnalazioni della squadra BNI di Alessio Loi. In BNI si dà prima di chiedere: per il prossimo 121 Alessio vuole portare al membro 1-3 contatti utili al SUO lavoro (aziende che potrebbero diventare suoi clienti o partner). Scegli solo aziende dove il legame col mestiere del membro è chiaro. Non sono "referenze" verificate: sono contatti da segnalare.`,
      testo: [
        `MEMBRO: ${m.name}${m.company ? `, ${m.company}` : ""}${m.profession ? ` — mestiere: ${m.profession}` : ""}`,
        m.cosaFa ? `COSA FA: ${m.cosaFa}` : null,
        m.seeking ? `IL SUO CLIENTE IDEALE: ${m.seeking}` : null,
        capitolo?.city ? `ZONA: ${capitolo.city}` : null,
        "",
        "AZIENDE NEL CRM:",
        ...elenco.map((l, i) => `${i + 1}. ${l.name} — ${l.category}${l.address ? ` — ${l.address}` : ""}`),
      ].filter((x) => x !== null).join("\n"),
      schema: SCHEMA_SEGNALAZIONI,
    });
    const scelte = ai.dati.scelte.filter((s) => s.numero >= 1 && s.numero <= elenco.length).slice(0, 3);
    for (const s of scelte) {
      const l = elenco[s.numero - 1];
      await db.bniSegnalazione.create({ data: { membroId, leadId: l.id, nome: l.name, motivo: s.motivo.slice(0, 300) } });
    }
    await db.agentRun.update({ where: { id: run.id }, data: { status: "FATTO", finishedAt: new Date(), costCents: ai.costCents } });
    return scelte.length;
  } catch (err) {
    await db.agentRun.update({ where: { id: run.id }, data: { status: "FALLITO", finishedAt: new Date(), error: (err instanceof Error ? err.message : String(err)).slice(0, 500) } });
    return 0;
  }
}

// ─── Passo 5: le aziende da cercare nella rete del membro ───────────────────

/** Fino a 8 aziende del serbatoio da cercare fra i collegamenti di un membro: prima quelle senza ponte. */
export async function aziendeDaCercareNellaRete(membroId: string): Promise<{ leadId: string; nome: string; citta: string | null }[]> {
  const conPonte = new Set(
    (await db.bniPresentazione.findMany({ where: { leadId: { not: null } }, select: { leadId: true } })).map((p) => p.leadId)
  );
  const leads = await db.lead.findMany({
    where: {
      ritrovamenti: { some: {} },
      pipelineStage: { notIn: ["NON_TARGET", "CLIENTE", "PERSO", "ARCHIVIATO"] },
      // Fuori quelle scartate da Alessio; dentro quelle "senza collegamento" (sono proprio quelle da cercare).
      approvalItems: { none: { kind: KIND_FASCICOLO_BASE, status: "SCARTATO", OR: [{ note: null }, { NOT: { note: { startsWith: NOTA_SENZA } } }] } },
      bniOriginType: null,
      membriBni: { none: { id: membroId } },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, address: true },
    take: 60,
  });
  return leads
    .filter((l) => !conPonte.has(l.id))
    .slice(0, 8)
    .map((l) => ({ leadId: l.id, nome: l.name, citta: l.address }));
}

// ─── Strada aziende: il collegamento ────────────────────────────────────────

export type StatoCollegamento = "COLLEGATA" | "SENZA" | "IN_VERIFICA" | "DA_VERIFICARE";

const NOTA_SENZA = "Senza collegamento";

/** Il collegamento secondo l'ultimo referto di "chi decide" (se c'è). */
export async function collegamentoAzienda(leadId: string): Promise<{ stato: StatoCollegamento; inComune: number; diretto: boolean; verificatoAt: Date | null }> {
  const [r, attivo, falliti] = await Promise.all([
    db.agentReport.findFirst({ where: { leadId, agent: "decision_maker" }, orderBy: { collectedAt: "desc" }, select: { findings: true, collectedAt: true } }),
    db.agentRun.findFirst({ where: { leadId, agent: "decision_maker", status: { in: ["IN_CODA", "IN_CORSO"] } }, select: { id: true } }),
    db.agentRun.count({ where: { leadId, agent: "decision_maker", status: "FALLITO" } }),
  ]);
  if (r) {
    const c = collegamentoDaFindings(r.findings);
    return { stato: c.collegata ? "COLLEGATA" : "SENZA", inComune: c.inComune, diretto: c.diretto, verificatoAt: r.collectedAt };
  }
  if (attivo) return { stato: "IN_VERIFICA", inComune: 0, diretto: false, verificatoAt: null };
  if (falliti >= 2) return { stato: "SENZA", inComune: 0, diretto: false, verificatoAt: null };
  return { stato: "DA_VERIFICARE", inComune: 0, diretto: false, verificatoAt: null };
}

export function collegamentoDaFindings(findings: unknown): { collegata: boolean; inComune: number; diretto: boolean } {
  type C = { collegata?: boolean; inComune?: number; diretto?: boolean };
  const f = (findings ?? {}) as { persone?: unknown; collegamento?: C; importazione?: { collegamento?: C } };
  const c = f.importazione?.collegamento ?? f.collegamento;
  if (c && typeof c.collegata === "boolean") return { collegata: c.collegata, inComune: c.inComune ?? 0, diretto: !!c.diretto };
  return collegamentoDa(decisoriDa(f.persone));
}

export function decisoriDa(persone: unknown): DecisoreLetto[] {
  return (Array.isArray(persone) ? persone : []).slice(0, 2).map((p: Record<string, unknown>) => ({
    grado: typeof p?.grado === "number" ? p.grado : typeof p?.grado === "string" ? parseInt(p.grado, 10) || null : null,
    contattiInComune: (Array.isArray(p?.contattiInComune) ? p.contattiInComune : [])
      .map((x: unknown) => (typeof x === "string" ? x : typeof (x as { nome?: unknown })?.nome === "string" ? (x as { nome: string }).nome : null))
      .filter((x: string | null): x is string => !!x),
    numeroInComune: typeof p?.numeroInComune === "number" ? p.numeroInComune : null,
  }));
}

/** Accoda il controllo di "chi decide" se serve e se LinkedIn lo permette oggi. */
export async function verificaCollegamento(leadId: string, oggi = new Date()): Promise<StatoCollegamento> {
  const c = await collegamentoAzienda(leadId);
  if (c.stato === "COLLEGATA" || c.stato === "SENZA") {
    await dopoCollegamento(leadId);
    return c.stato;
  }
  if (c.stato === "IN_VERIFICA") return c.stato;
  if (!(await linkedinPermette("decision_maker", null, oggi))) return "DA_VERIFICARE";
  await db.agentRun.create({ data: { leadId, agent: "decision_maker", status: "IN_CODA" } });
  return "IN_VERIFICA";
}

/**
 * Dopo il controllo: un'azienda collegata va in "Da decidere" (se il giro veloce ha chiuso);
 * una non collegata esce da "Da decidere" con la nota "Senza collegamento" (si può ripristinare,
 * e torna da sola se un controllo successivo trova un ponte).
 */
export async function dopoCollegamento(leadId: string, giroVeloceFinito = true): Promise<void> {
  const c = await collegamentoAzienda(leadId);
  const voce = await db.approvalItem.findFirst({ where: { leadId, kind: KIND_FASCICOLO_BASE }, orderBy: { createdAt: "desc" } });
  if (c.stato === "COLLEGATA") {
    const ponte = c.diretto ? "chi decide è un tuo contatto diretto" : `chi decide ha ${c.inComune} ${c.inComune === 1 ? "contatto" : "contatti"} in comune con te`;
    if (!voce && giroVeloceFinito) {
      const l = await db.lead.findUnique({ where: { id: leadId }, select: { name: true, website: true } });
      if (!l) return;
      const referti = await db.agentReport.findMany({ where: { leadId, validUntil: { gt: new Date() } }, orderBy: { collectedAt: "desc" }, select: { agent: true, summary: true, levers: true } });
      const visti = new Set<string>();
      const ultimi = referti.filter((r) => !visti.has(r.agent) && visti.add(r.agent));
      const leve = ultimi.flatMap((r) => (Array.isArray(r.levers) ? (r.levers as unknown[]) : []));
      await db.approvalItem.create({
        data: {
          leadId,
          kind: KIND_FASCICOLO_BASE,
          agent: "giro_veloce",
          title: `${l.name}: ${leve.length} cose trovate`,
          payload: { sito: l.website, riepiloghi: Object.fromEntries(ultimi.map((r) => [r.agent, r.summary])), leve, collegamento: ponte } as unknown as Prisma.InputJsonValue,
        },
      });
    } else if (voce?.status === "SCARTATO" && voce.note?.startsWith(NOTA_SENZA)) {
      await db.approvalItem.update({ where: { id: voce.id }, data: { status: "IN_ATTESA", decidedAt: null, note: `Collegamento trovato: ${ponte}` } });
    }
    return;
  }
  if (c.stato === "SENZA" && voce?.status === "IN_ATTESA") {
    await db.approvalItem.update({ where: { id: voce.id }, data: { status: "SCARTATO", decidedAt: new Date(), note: `${NOTA_SENZA}: chi decide non è collegato a te (controllo automatico)` } });
  }
}

/** Le aziende in attesa di decisione senza controllo del collegamento, e i ricontrolli dopo un nuovo 121. */
export async function collegamentiDaVerificare(oggi = new Date(), limite = 6): Promise<{ accodati: number; ricontrolli: number }> {
  let accodati = 0;
  let ricontrolli = 0;
  const inAttesa = await db.approvalItem.findMany({
    where: { kind: KIND_FASCICOLO_BASE, status: "IN_ATTESA", leadId: { not: null }, lead: { agentReports: { none: { agent: "decision_maker" } } } },
    orderBy: { createdAt: "asc" },
    select: { leadId: true },
    take: 30,
  });
  for (const v of inAttesa) {
    if (accodati >= limite) break;
    const prima = await collegamentoAzienda(v.leadId!);
    if (prima.stato !== "DA_VERIFICARE") continue;
    if ((await verificaCollegamento(v.leadId!, oggi)) === "IN_VERIFICA") accodati++;
    else break; // LinkedIn non ne permette altri oggi
  }
  // Ricontrollo: la rete cresce con ogni 121. Una volta al mese al massimo per azienda.
  const ultimo121 = await db.oneToOne.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } });
  if (ultimo121) {
    const senza = await db.approvalItem.findMany({
      where: { kind: KIND_FASCICOLO_BASE, status: "SCARTATO", note: { startsWith: NOTA_SENZA }, leadId: { not: null } },
      select: { leadId: true },
      take: 50,
    });
    for (const s of senza) {
      if (accodati + ricontrolli >= limite) break;
      const r = await db.agentReport.findFirst({ where: { leadId: s.leadId!, agent: "decision_maker" }, orderBy: { collectedAt: "desc" }, select: { collectedAt: true } });
      if (!r || r.collectedAt > ultimo121.createdAt || r.collectedAt.getTime() > oggi.getTime() - GIORNI_RICONTROLLO * 86400_000) continue;
      if (await db.agentRun.findFirst({ where: { leadId: s.leadId!, agent: "decision_maker", status: { in: ["IN_CODA", "IN_CORSO"] } } })) continue;
      if (!(await linkedinPermette("decision_maker", null, oggi))) break;
      await db.agentRun.create({ data: { leadId: s.leadId!, agent: "decision_maker", status: "IN_CODA", input: { ricontrollo: true } } });
      ricontrolli++;
    }
  }
  return { accodati, ricontrolli };
}

/** Aziende in attesa (giro veloce o controllo del collegamento): oltre SERBATOIO_MAX la ricerca si ferma. */
export async function serbatoioPieno(): Promise<{ pieno: boolean; inAttesa: number }> {
  const inAttesa = await db.lead.count({
    where: {
      ritrovamenti: { some: {} },
      pipelineStage: { notIn: ["NON_TARGET", "CLIENTE", "PERSO", "ARCHIVIATO"] },
      OR: [
        { approvalItems: { none: { kind: KIND_FASCICOLO_BASE } } },
        { approvalItems: { some: { kind: KIND_FASCICOLO_BASE, status: "IN_ATTESA" } }, agentReports: { none: { agent: "decision_maker" } } },
      ],
    },
  });
  return { pieno: inAttesa >= SERBATOIO_MAX, inAttesa };
}

// ─── Dopo il 121 ────────────────────────────────────────────────────────────

/** Il 121 è passato da almeno 2 ore e non è registrato: un promemoria in Cassetta per il vocale. */
export async function promemoriaDopo121(oggi = new Date()): Promise<number> {
  const passati = await db.bniMembro.findMany({
    where: { next121At: { gte: new Date(oggi.getTime() - 72 * 3600_000), lte: new Date(oggi.getTime() - 2 * 3600_000) } },
    select: { id: true, name: true, next121At: true, chapter: true },
  });
  let creati = 0;
  for (const m of passati) {
    const quando = m.next121At!;
    const [registrato, gia] = await Promise.all([
      db.oneToOne.findFirst({ where: { membroId: m.id, date: { gte: new Date(quando.getTime() - 86400_000) } }, select: { id: true } }),
      db.approvalItem.findFirst({ where: { bniMembroId: m.id, kind: KIND_DOPO_121, createdAt: { gte: new Date(quando.getTime() - 86400_000) } }, select: { id: true } }),
    ]);
    if (registrato || gia) continue;
    await db.approvalItem.create({
      data: {
        bniMembroId: m.id,
        kind: KIND_DOPO_121,
        agent: "dopo_121",
        title: `Com'è andato il 121 con ${m.name}?`,
        payload: { quando: quando.toISOString(), capitolo: m.chapter, link: `/bni/membri/${m.id}` } as Prisma.InputJsonValue,
      },
    });
    creati++;
  }
  return creati;
}

/** Il 121 registrato: il promemoria non serve più. */
export async function chiudiPromemoria(membroId: string): Promise<void> {
  await db.approvalItem.updateMany({ where: { bniMembroId: membroId, kind: KIND_DOPO_121, status: "IN_ATTESA" }, data: { status: "APPROVATO", decidedAt: new Date(), note: "121 registrato" } });
}

/** Le presentazioni confermate al 121 vanno in Cassetta con il messaggio per il membro (lo manda Alessio). */
export async function richiestePresentazione(membroId: string): Promise<number> {
  const m = await db.bniMembro.findUnique({ where: { id: membroId }, select: { name: true, phone: true } });
  if (!m) return 0;
  const presentazioni = await db.bniPresentazione.findMany({
    // Solo quelle di cui si è parlato al 121: confermate ("lo conosco bene") o offerte dal membro.
    where: { membroId, chiestaAt: null, OR: [{ stato: "DA_CHIEDERE", confermata: true }, { stato: "CHIESTA", confermata: { not: false } }, { stato: "CHIESTA", confermata: null }] },
    orderBy: [{ forza: "desc" }, { createdAt: "asc" }],
    take: 3,
    include: { persona: { select: { aziendaNome: true } } },
  });
  let creati = 0;
  for (const p of presentazioni) {
    const gia = await db.approvalItem.findFirst({ where: { bniMembroId: membroId, kind: KIND_PRESENTAZIONE_BNI, payload: { path: ["presentazioneId"], equals: p.id } }, select: { id: true } });
    if (gia) continue;
    const azienda = p.persona?.aziendaNome ?? p.ruolo?.split(" · ").pop() ?? null;
    await db.approvalItem.create({
      data: {
        bniMembroId: membroId,
        kind: KIND_PRESENTAZIONE_BNI,
        agent: "dopo_121",
        title: `Chiedi a ${m.name} di presentarti ${p.nome}`,
        payload: { presentazioneId: p.id, messaggio: messaggioPresentazione(m.name, p.nome, azienda), telefono: m.phone, persona: p.nome, perche: p.perche } as Prisma.InputJsonValue,
      },
    });
    creati++;
  }
  return creati;
}

/** La richiesta di presentazione è partita (approvata in Cassetta). */
export async function presentazioneChiesta(voceId: string): Promise<void> {
  const v = await db.approvalItem.findUnique({ where: { id: voceId }, select: { payload: true } });
  const pid = (v?.payload as { presentazioneId?: string } | null)?.presentazioneId;
  if (pid) await db.bniPresentazione.updateMany({ where: { id: pid }, data: { stato: "CHIESTA", chiestaAt: new Date() } });
}

/**
 * La persona è stata presentata: diventa un primo contatto caldo. La sua azienda entra nel CRM
 * (se non c'è) come opportunità BNI e parte l'analisi completa con i 3 ganci.
 */
export async function presentato(presentazioneId: string, oggi = new Date()): Promise<string | null> {
  const p = await db.bniPresentazione.findUnique({ where: { id: presentazioneId }, include: { persona: true, membro: { select: { id: true, name: true } } } });
  if (!p) return null;
  let leadId = p.leadId ?? p.persona?.leadId ?? null;
  if (!leadId) {
    const nome = p.persona?.aziendaNome ?? p.ruolo?.split(" · ").pop() ?? null;
    if (nome) {
      const l = await db.lead.create({
        data: { name: nome.slice(0, 200), source: "bni_presentazione", bniOriginType: "PRESENTAZIONE", pipelineStage: "BNI_DA_LAVORARE", referredByMembroId: p.membro.id, notes: `Presentato da ${p.membro.name} (BNI): ${p.nome}.` },
        select: { id: true },
      });
      leadId = l.id;
      if (p.personaId) await db.persona.update({ where: { id: p.personaId }, data: { leadId } });
    }
  }
  await db.bniPresentazione.update({ where: { id: p.id }, data: { stato: "PRESENTATO", presentatoAt: p.presentatoAt ?? oggi, leadId } });
  if (leadId) {
    const l = await db.lead.findUnique({ where: { id: leadId }, select: { pipelineStage: true } });
    if (l && ["DA_ANALIZZARE", "HOT_LEAD", "WARM_LEAD", "COLD_LEAD", "NURTURING", "ARCHIVIATO"].includes(l.pipelineStage)) {
      await db.lead.update({ where: { id: leadId }, data: { pipelineStage: "BNI_DA_LAVORARE", referredByMembroId: p.membro.id } });
    }
    // L'analisi completa parte da sola: è un contatto presentato, non serve decidere.
    const voce = await db.approvalItem.findFirst({ where: { leadId, kind: KIND_FASCICOLO_BASE }, select: { id: true, status: true } });
    if (!voce) {
      await db.approvalItem.create({ data: { leadId, kind: KIND_FASCICOLO_BASE, agent: "alessio", title: `Presentato da ${p.membro.name}`, payload: { presentato: true } as Prisma.InputJsonValue, status: "APPROVATO", decidedAt: oggi } });
    } else if (voce.status !== "APPROVATO") {
      await db.approvalItem.update({ where: { id: voce.id }, data: { status: "APPROVATO", decidedAt: oggi, note: `Presentato da ${p.membro.name}` } });
    }
  }
  return leadId;
}
