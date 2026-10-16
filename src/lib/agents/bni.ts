/**
 * Squadra BNI — la parte che lavora sul database.
 *
 *   B1 Cartografo        → lavoro di browser (BNI Connect); qui si importa quello che porta.
 *   B2 Stratega          → per ogni capitolo decide l'azione (regole in bni-regole.ts) e la
 *                          mette in cassetta.
 *   B3 Preparatore 121   → per ogni azione approvata scrive il messaggio a ciascun
 *                          destinatario (in cassetta: lo manda Alessio).
 *   B4 Copertura Sardegna→ quanti membri sardi conosci, capitolo per capitolo.
 */
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { classifyMembro } from "@/lib/bni/member-classifier";
import { chiediJSON, REGOLE_COMUNI, type Schema } from "./ai";
import { budgetDisponibile } from "./costi";
import {
  azioneCapitolo,
  coperturaCapitolo,
  dirigenzaDa,
  eSardo,
  formatoDa,
  norm,
  REGIONI_ITALIA,
  type AzioneCapitolo,
  type MembroPerRegole,
} from "./bni-regole";

export const KIND_AZIONE_BNI = "AZIONE_BNI";
export const KIND_MESSAGGIO_BNI = "MESSAGGIO_BNI";
/** Fuori Sardegna un capitolo si rivaluta ogni 60 giorni; in Sardegna (copertura) ogni 7. */
const GIORNI_TRA_AZIONI = 60;
const GIORNI_TRA_AZIONI_SARDEGNA = 7;
const GIORNI_TRA_MAPPE = 90;

// ─── B1: importazione della mappa portata dal Cartografo ────────────────────

export interface EsitoMappa {
  capitoliNuovi: number;
  capitoliAggiornati: number;
  membriNuovi: number;
  membriAggiornati: number;
}

interface MembroMappa {
  nome?: unknown;
  azienda?: unknown;
  categoria?: unknown;
  telefono?: unknown;
  dirigenza?: unknown;
}
interface CapitoloMappa {
  nome?: unknown;
  citta?: unknown;
  provincia?: unknown;
  formato?: unknown;
  giorno?: unknown;
  ora?: unknown;
  url?: unknown;
  membri?: unknown;
}

const testo = (v: unknown, max = 200): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

/**
 * Salva capitoli e membri letti da BNI Connect. Non cancella nulla: aggiunge i nuovi e
 * completa i campi vuoti (dirigenza, formato, telefono) di quelli che già esistono.
 */
export async function importaMappaBni(findings: Record<string, unknown>, oggi = new Date()): Promise<EsitoMappa> {
  const esito: EsitoMappa = { capitoliNuovi: 0, capitoliAggiornati: 0, membriNuovi: 0, membriAggiornati: 0 };
  const regione = testo(findings.regione, 60);
  const capitoli = Array.isArray(findings.capitoli) ? (findings.capitoli as CapitoloMappa[]) : [];

  for (const c of capitoli.slice(0, 200)) {
    const nome = testo(c.nome, 120);
    if (!nome) continue;
    const dati = {
      city: testo(c.citta, 80),
      provincia: testo(c.provincia, 40),
      regioneItaliana: regione,
      mode: formatoDa(testo(c.formato)),
      meetingDay: testo(c.giorno, 30),
      meetingTime: testo(c.ora, 10),
      bniConnectUrl: testo(c.url, 500),
      mappedAt: oggi,
    };
    const esistente = await db.bniChapter.findUnique({ where: { name: nome } });
    if (esistente) {
      await db.bniChapter.update({
        where: { id: esistente.id },
        data: {
          ...dati,
          city: esistente.city ?? dati.city,
          // La regione interna (sardegna_nord/centro/sud) la decide Alessio: non si tocca.
          region: esistente.region ?? (norm(regione) === "sardegna" ? null : "altro"),
        },
      });
      esito.capitoliAggiornati++;
    } else {
      await db.bniChapter.create({ data: { name: nome, ...dati, region: norm(regione) === "sardegna" ? null : "altro" } });
      esito.capitoliNuovi++;
    }

    const membri = Array.isArray(c.membri) ? (c.membri as MembroMappa[]) : [];
    for (const m of membri.slice(0, 120)) {
      const nomeM = testo(m.nome, 120);
      if (!nomeM) continue;
      const azienda = testo(m.azienda, 160);
      const categoria = testo(m.categoria, 160);
      const telefono = testo(m.telefono, 40);
      const dirigenza = dirigenzaDa(testo(m.dirigenza));
      const gia = await db.bniMembro.findFirst({
        where: { chapter: { equals: nome, mode: "insensitive" }, name: { equals: nomeM, mode: "insensitive" } },
      });
      if (gia) {
        await db.bniMembro.update({
          where: { id: gia.id },
          data: {
            company: gia.company ?? azienda,
            profession: gia.profession ?? categoria,
            phone: gia.phone ?? telefono,
            leadershipRole: dirigenza,
          },
        });
        esito.membriAggiornati++;
      } else {
        const cl = classifyMembro({ profession: categoria, company: azienda });
        await db.bniMembro.create({
          data: {
            name: nomeM,
            company: azienda,
            profession: categoria,
            phone: telefono,
            chapter: nome,
            leadershipRole: dirigenza,
            buyerPersona: cl.buyerPersona,
            memberRole: cl.memberRole,
            clientScore: cl.clientScore,
            partnerScore: cl.partnerScore,
            personasServed: cl.personasServed.join(",") || null,
            classifiedAt: oggi,
          },
        });
        esito.membriNuovi++;
      }
    }
  }
  return esito;
}

// ─── Lettura dei capitoli con i loro membri ────────────────────────────────

async function capitoliConMembri() {
  const [capitoli, membri] = await Promise.all([
    db.bniChapter.findMany(),
    db.bniMembro.findMany({
      where: { status: "ATTIVO" },
      select: {
        id: true, name: true, profession: true, company: true, phone: true, chapter: true, leadershipRole: true,
        conosciutoAt: true, oneToOneCount: true, isCustomer: true, clientScore: true, partnerScore: true,
      },
    }),
  ]);
  return capitoli.map((c) => ({
    capitolo: c,
    membri: membri
      .filter((m) => norm(m.chapter) === norm(c.name))
      .map<MembroPerRegole>((m) => ({
        id: m.id,
        name: m.name,
        profession: m.profession,
        company: m.company,
        phone: m.phone,
        leadershipRole: m.leadershipRole,
        conosciuto: !!m.conosciutoAt || m.oneToOneCount > 0 || m.isCustomer,
        priorita: Math.max(m.clientScore, m.partnerScore),
      })),
  }));
}

async function salvaRefertoCapitolo(chapterId: string, agent: string, summary: string, findings: unknown, giorni: number, oggi: Date, costCents = 0) {
  const run = await db.agentRun.create({
    data: { bniChapterId: chapterId, agent, status: "FATTO", attempts: 1, startedAt: oggi, finishedAt: new Date(), costCents },
  });
  await db.agentReport.create({
    data: {
      bniChapterId: chapterId,
      agent,
      runId: run.id,
      summary,
      findings: findings as Prisma.InputJsonValue,
      confidence: "ALTA",
      collectedAt: oggi,
      validUntil: new Date(oggi.getTime() + giorni * 86400_000),
    },
  });
}

// ─── Il turno BNI ──────────────────────────────────────────────────────────

export interface RiepilogoBni {
  capitoliValutati: number;
  azioniInCassetta: number;
  messaggiInCassetta: number;
  mappeAccodate: number;
  saltatiPerBudget: number;
  coperturaSardegna: { capitoli: number; membri: number; conosciuti: number; percentuale: number } | null;
}

export async function eseguiTurnoBni(oggi = new Date()): Promise<RiepilogoBni> {
  const r: RiepilogoBni = { capitoliValutati: 0, azioniInCassetta: 0, messaggiInCassetta: 0, mappeAccodate: 0, saltatiPerBudget: 0, coperturaSardegna: null };
  const tutti = await capitoliConMembri();
  const daMappare = new Set<string>();

  // B4 — Copertura Sardegna (ogni giorno: è un conteggio, non costa nulla).
  const sardi = tutti.filter((t) => eSardo(t.capitolo));
  let membriSardi = 0;
  let conosciutiSardi = 0;
  for (const { capitolo, membri } of sardi) {
    const cop = coperturaCapitolo(membri);
    membriSardi += cop.totale;
    conosciutiSardi += cop.conosciuti;
    await salvaRefertoCapitolo(capitolo.id, "copertura_sardegna", `${capitolo.name}: conosci ${cop.conosciuti} su ${cop.totale} (${cop.percentuale}%)`, cop, 1, oggi);
  }
  if (sardi.length) {
    r.coperturaSardegna = {
      capitoli: sardi.length,
      membri: membriSardi,
      conosciuti: conosciutiSardi,
      percentuale: membriSardi ? Math.round((conosciutiSardi / membriSardi) * 100) : 0,
    };
  }

  // B2 — Stratega: un'azione per capitolo in cassetta (Sardegna ogni 7 giorni, altrove ogni 60).
  for (const { capitolo, membri } of tutti) {
    const giorni = eSardo(capitolo) ? GIORNI_TRA_AZIONI_SARDEGNA : GIORNI_TRA_AZIONI;
    const limite = new Date(oggi.getTime() - giorni * 86400_000);
    if (!membri.length) {
      if (capitolo.regioneItaliana) daMappare.add(capitolo.regioneItaliana);
      continue;
    }
    const aperta = await db.approvalItem.findFirst({
      where: { bniChapterId: capitolo.id, kind: KIND_AZIONE_BNI, OR: [{ status: "IN_ATTESA" }, { decidedAt: { gt: limite } }] },
    });
    if (aperta) continue;
    r.capitoliValutati++;
    const azione = azioneCapitolo({
      nome: capitolo.name,
      sardo: eSardo(capitolo),
      formato: formatoDa(capitolo.mode),
      giorno: capitolo.meetingDay,
      ora: capitolo.meetingTime,
      membri,
    });
    await salvaRefertoCapitolo(capitolo.id, "stratega_bni", azione.motivo, azione, 30, oggi);
    if (azione.tipo === "MAPPARE") {
      if (capitolo.regioneItaliana) daMappare.add(capitolo.regioneItaliana);
      continue;
    }
    if (azione.tipo === "COPERTURA" && azione.destinatari.length === 0) continue; // tutti conosciuti
    await db.approvalItem.create({
      data: {
        bniChapterId: capitolo.id,
        kind: KIND_AZIONE_BNI,
        agent: "stratega_bni",
        title: `${capitolo.name}: ${TITOLI[azione.tipo]}`,
        payload: {
          ...azione,
          capitolo: { nome: capitolo.name, citta: capitolo.city, formato: capitolo.mode, giorno: capitolo.meetingDay, ora: capitolo.meetingTime },
        } as unknown as Prisma.InputJsonValue,
      },
    });
    r.azioniInCassetta++;
  }

  // B1 — Cartografo: una regione per volta, prima quelle che servono, poi la Sardegna e il resto.
  r.mappeAccodate = await accodaMappa([...daMappare], oggi);

  // B3 — Preparatore 121: messaggi per le azioni approvate.
  const m = await preparaMessaggi(oggi);
  r.messaggiInCassetta = m.creati;
  r.saltatiPerBudget = m.saltatiPerBudget;
  return r;
}

const TITOLI: Record<AzioneCapitolo["tipo"], string> = {
  COPERTURA: "prossimi membri da conoscere",
  COLLABORAZIONE: "proponi una collaborazione al collega",
  VISITA: "partecipa alla riunione",
  "121_DIRIGENZA": "121 con la dirigenza",
  MAPPARE: "da mappare",
};

async function accodaMappa(prioritarie: string[], oggi: Date): Promise<number> {
  const attivo = await db.agentRun.findFirst({ where: { agent: "cartografo_bni", status: { in: ["IN_CODA", "IN_CORSO"] } } });
  if (attivo) return 0;
  const dopo = new Date(oggi.getTime() - GIORNI_TRA_MAPPE * 86400_000);
  const recenti = await db.agentRun.findMany({ where: { agent: "cartografo_bni", queuedAt: { gt: dopo } }, select: { input: true } });
  const fatte = new Set(recenti.map((x) => norm((x.input as { regione?: string } | null)?.regione)));
  const regione = [...prioritarie, ...REGIONI_ITALIA].find((g) => !fatte.has(norm(g)));
  if (!regione) return 0;
  await db.agentRun.create({ data: { agent: "cartografo_bni", status: "IN_CODA", input: { regione } } });
  return 1;
}

// ─── B3: Preparatore 121 ───────────────────────────────────────────────────

interface RispostaMessaggio {
  messaggio: string;
  nota_per_alessio: string;
}

const SCHEMA_MESSAGGIO: Schema = {
  type: "object",
  properties: {
    messaggio: { type: "string", description: "Messaggio WhatsApp di massimo 5 righe, in italiano, tono cordiale fra membri BNI, firmato Alessio" },
    nota_per_alessio: { type: "string", description: "Una riga per Alessio: cosa chiedere o portare al 121" },
  },
  required: ["messaggio", "nota_per_alessio"],
};

const SCOPI: Record<string, string> = {
  COPERTURA: "chiedere un 121 per conoscersi: in Sardegna Alessio vuole conoscere tutti i membri BNI",
  COLLABORAZIONE: "proporre una collaborazione a un collega che fa il suo stesso mestiere in un altro capitolo (scambio di lavoro, non concorrenza)",
  VISITA: "chiedere di poter partecipare come ospite alla prossima riunione del capitolo",
  "121_DIRIGENZA": "chiedere un 121 a chi guida il capitolo, per presentarsi: nel capitolo nessuno fa il suo mestiere",
};

async function preparaMessaggi(oggi: Date): Promise<{ creati: number; saltatiPerBudget: number }> {
  const approvate = await db.approvalItem.findMany({
    where: { kind: KIND_AZIONE_BNI, status: "APPROVATO", decidedAt: { gt: new Date(oggi.getTime() - 30 * 86400_000) } },
    include: { bniChapter: true },
  });
  let creati = 0;
  let saltatiPerBudget = 0;
  for (const voce of approvate) {
    const azione = voce.payload as unknown as AzioneCapitolo;
    for (const d of azione.destinatari ?? []) {
      const gia = await db.approvalItem.findFirst({ where: { kind: KIND_MESSAGGIO_BNI, bniMembroId: d.membroId, createdAt: { gt: voce.createdAt } } });
      if (gia) continue;
      if (!(await budgetDisponibile(oggi)).ok) {
        saltatiPerBudget++;
        continue;
      }
      const membro = await db.bniMembro.findUnique({ where: { id: d.membroId } });
      if (!membro) continue;
      const run = await db.agentRun.create({ data: { bniMembroId: membro.id, agent: "preparatore_121", status: "IN_CORSO", attempts: 1, startedAt: new Date() } });
      try {
        const ai = await chiediJSON<RispostaMessaggio>({
          sistema: `${REGOLE_COMUNI}\n\nSei il Preparatore 121 della squadra BNI di Alessio Loi (Karalisweb, siti web e marketing digitale con il Metodo SD, capitolo BNI Atlantide di Cagliari). Scrivi il messaggio WhatsApp che Alessio manderà a un membro BNI. Breve, personale (usa il nome e il mestiere del membro), niente vendita: lo scopo è solo l'incontro.`,
          testo: [
            `SCOPO: ${SCOPI[azione.tipo] ?? "presentarsi"}`,
            `PERCHÉ: ${azione.motivo}`,
            `MEMBRO: ${membro.name}${membro.company ? `, ${membro.company}` : ""}${membro.profession ? ` (${membro.profession})` : ""}`,
            `CAPITOLO: ${voce.bniChapter?.name ?? membro.chapter ?? "?"}${voce.bniChapter?.city ? `, ${voce.bniChapter.city}` : ""}`,
            d.ruolo ? `RUOLO NEL CAPITOLO: ${d.ruolo}` : null,
            membro.seeking ? `COSA CERCA (il suo cliente ideale): ${membro.seeking}` : null,
          ].filter(Boolean).join("\n"),
          schema: SCHEMA_MESSAGGIO,
        });
        await db.$transaction([
          db.agentReport.create({
            data: {
              bniMembroId: membro.id,
              agent: "preparatore_121",
              runId: run.id,
              summary: `Messaggio per ${membro.name} (${azione.tipo})`,
              findings: { ...ai.dati, motoreAI: `${ai.motore} ${ai.modello}` } as Prisma.InputJsonValue,
              confidence: "MEDIA",
              collectedAt: oggi,
              validUntil: new Date(oggi.getTime() + 30 * 86400_000),
            },
          }),
          db.agentRun.update({ where: { id: run.id }, data: { status: "FATTO", finishedAt: new Date(), costCents: ai.costCents } }),
          db.approvalItem.create({
            data: {
              bniMembroId: membro.id,
              bniChapterId: voce.bniChapterId,
              kind: KIND_MESSAGGIO_BNI,
              agent: "preparatore_121",
              title: `Messaggio a ${membro.name}`,
              payload: { ...ai.dati, tipo: azione.tipo, telefono: membro.phone, capitolo: voce.bniChapter?.name ?? membro.chapter } as Prisma.InputJsonValue,
            },
          }),
        ]);
        creati++;
      } catch (err) {
        await db.agentRun.update({
          where: { id: run.id },
          data: { status: "FALLITO", finishedAt: new Date(), error: (err instanceof Error ? err.message : String(err)).slice(0, 500) },
        });
      }
    }
  }
  return { creati, saltatiPerBudget };
}
