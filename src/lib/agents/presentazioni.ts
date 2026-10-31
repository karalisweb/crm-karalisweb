/**
 * Le presentazioni da chiedere (v3.68.0) — la parte che lavora sul database. Le regole sono in
 * presentazioni-regole.ts. Due domande, una per lato:
 *
 *   - Da una persona (prima del 121, o quando la senti): quali membri del suo capitolo e quali aziende
 *     farsi presentare, con la frase pronta.
 *   - Da un'azienda (ricerca dal territorio): chi Alessio conosce nella sua zona che può presentargliela.
 */
import type { PipelineStage } from "@prisma/client";
import { db } from "@/lib/db";
import { KIND_FASCICOLO_BASE } from "./turno";
import { nomeConfrontabile, stessoNome } from "@/lib/ricerca/regole";
import {
  ORDINE_PERSONE, SETTORI_CALDI, daChiedereOra, gruppiSettore, domandaAzienda, domandaMembro, ordinaAziende, ordinaMembri, settoreDi, stessaZona, tipoPersona, zonaDa,
  type AziendaDaPresentare, type GruppoSettore, type MembroDaPresentare, type Settori, type TipoPersona, type Zona,
} from "./presentazioni-regole";

const termini = (j: unknown): string[] => (Array.isArray(j) ? j.filter((x): x is string => typeof x === "string") : []);

/** I settori di Alessio: quelli dei casi studio attivi, poi i settori caldi (i suoi e quelli larghi dei casi). */
export async function settoriAlessio(): Promise<Settori> {
  const casi = await db.casoStudio.findMany({ where: { stato: "ATTIVO" }, select: { settore: true, termini: true, terminiSettore: true } });
  return {
    caso: casi.flatMap((c) => [...termini(c.termini), ...(c.settore ? [c.settore] : [])]),
    interesse: [...Object.values(SETTORI_CALDI).flat(), ...casi.flatMap((c) => termini(c.terminiSettore))],
  };
}

/** I settori con il nome (il caso studio per nome, o il settore caldo), per dire ad Alessio quale. */
export async function settoriConNome(): Promise<GruppoSettore[]> {
  const casi = await db.casoStudio.findMany({ where: { stato: "ATTIVO" }, orderBy: { createdAt: "asc" }, select: { titolo: true, aziendaNome: true, settore: true, termini: true, terminiSettore: true } });
  return gruppiSettore(casi.map((c) => ({ nome: c.aziendaNome ?? c.titolo.split(":")[0].trim(), settore: c.settore, termini: termini(c.termini), terminiSettore: termini(c.terminiSettore) })));
}

/** La zona di un membro: l'indirizzo della sua azienda, la città nelle note, la città del capitolo. */
export async function zonaMembro(m: { notes: string | null; chapter: string | null; leadId: string | null }): Promise<Zona> {
  const [lead, capitolo] = await Promise.all([
    m.leadId ? db.lead.findUnique({ where: { id: m.leadId }, select: { address: true } }) : null,
    m.chapter ? db.bniChapter.findFirst({ where: { name: { equals: m.chapter, mode: "insensitive" } }, select: { city: true, provincia: true } }) : null,
  ]);
  const z = zonaDa(lead?.address, m.notes?.match(/citt[aà]:\s*([^·\n]+)/i)?.[1], capitolo?.city);
  return { citta: z.citta, provincia: z.provincia ?? capitolo?.provincia?.toUpperCase() ?? null };
}

const nonInLavoro: PipelineStage[] = ["NON_TARGET", "CLIENTE", "PERSO", "ARCHIVIATO"];

/** Chi decide, dall'ultimo referto (il primo nome). */
async function decisoriDi(leadIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!leadIds.length) return out;
  const referti = await db.agentReport.findMany({ where: { leadId: { in: leadIds }, agent: "decision_maker" }, orderBy: { collectedAt: "desc" }, select: { leadId: true, findings: true } });
  for (const r of referti) {
    if (!r.leadId || out.has(r.leadId)) continue;
    const persone = (r.findings as { persone?: { nome?: unknown }[] } | null)?.persone;
    const nome = Array.isArray(persone) ? persone.map((p) => (typeof p?.nome === "string" ? p.nome.trim() : "")).find(Boolean) : undefined;
    if (nome) out.set(r.leadId, nome);
  }
  return out;
}

/** Le aziende del serbatoio (trovate dai casi studio) nei settori di Alessio, con la loro zona. */
async function serbatoioNeiSettori(s: Settori) {
  const leads = await db.lead.findMany({
    where: {
      ritrovamenti: { some: {} },
      bniOriginType: null,
      pipelineStage: { notIn: nonInLavoro },
      approvalItems: { none: { kind: KIND_FASCICOLO_BASE, status: "SCARTATO" } },
      // Già presentata o già in mano a un altro ponte: non si chiede due volte.
      OR: [{ lavorazione: null }, { lavorazione: { is: { fase: "MAPPATA" } } }],
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, category: true, address: true },
    take: 600,
  });
  return leads
    .map((l) => ({ ...l, settore: settoreDi(`${l.category ?? ""} ${l.name}`, s), zona: zonaDa(l.address) }))
    .filter((l) => l.settore);
}

export interface DaChiedere {
  tipo: TipoPersona;
  zona: Zona;
  membri: (MembroDaPresentare & { domanda: string })[];
  aziende: (AziendaDaPresentare & { domanda: string })[];
  /** Cosa chiedere questa volta (al massimo 3). */
  ora: { membri: string[]; aziende: string[] };
}

export const chiaveAzienda = (a: AziendaDaPresentare) => a.presentazioneId ?? a.leadId ?? a.azienda;

/** Le due liste per una persona: i membri del suo capitolo da farsi presentare e le aziende. */
export async function daChiedereA(membroId: string): Promise<DaChiedere | null> {
  const m = await db.bniMembro.findUnique({ where: { id: membroId }, select: { id: true, name: true, profession: true, company: true, chapter: true, notes: true, leadId: true } });
  if (!m) return null;
  const [s, zona] = await Promise.all([settoriAlessio(), zonaMembro(m)]);

  // 1) I membri del suo capitolo che Alessio non ha ancora sentito (niente 121, nessuna richiesta in corso).
  const colleghi = m.chapter
    ? await db.bniMembro.findMany({
        where: {
          chapter: { equals: m.chapter, mode: "insensitive" }, id: { not: m.id }, status: "ATTIVO",
          conosciutoAt: null, oneToOneCount: 0, next121At: null, bniStage: { notIn: ["RICHIESTA_121", "FATTO_121"] },
        },
        select: { id: true, name: true, profession: true, company: true, partnerScore: true },
      })
    : [];
  const membri = ordinaMembri(colleghi.map((c) => ({ id: c.id, nome: c.name, categoria: c.profession, azienda: c.company, tipo: tipoPersona(c.profession, c.company, s), punteggio: c.partnerScore }))).slice(0, 8);

  // 2) Le aziende: quelle già segnate per lui (LinkedIn o rapporti stretti), poi quelle della sua zona.
  const segnate = await db.bniPresentazione.findMany({
    where: { membroId, stato: { in: ["DA_CHIEDERE", "CHIESTA"] }, presentatoAt: null, OR: [{ confermata: null }, { confermata: true }] },
    include: { persona: { select: { aziendaNome: true } }, membro: { select: { id: true } } },
    orderBy: [{ forza: "desc" }, { createdAt: "asc" }],
    take: 10,
  });
  const leadSegnati = await db.lead.findMany({ where: { id: { in: segnate.map((p) => p.leadId).filter((x): x is string => !!x) } }, select: { id: true, name: true, category: true, address: true } });
  const leadDi = new Map(leadSegnati.map((l) => [l.id, l]));
  const aziende: AziendaDaPresentare[] = segnate.map((p) => {
    const l = p.leadId ? leadDi.get(p.leadId) : undefined;
    const rapporto = /^rapporto stretto/i.test(p.perche ?? "");
    // Senza azienda nota resta solo la persona (azienda vuota): si chiede di lei.
    const azienda = l?.name ?? p.persona?.aziendaNome ?? (rapporto ? p.ruolo : p.ruolo?.split(" · ").pop()) ?? "";
    // Il nome della presentazione è chi decide, salvo quando è l'azienda stessa (rapporto stretto senza persona).
    const decisore = p.nome && p.nome !== azienda ? p.nome : null;
    return { presentazioneId: p.id, leadId: p.leadId, azienda, decisore, fonte: rapporto ? "RAPPORTO" : "LINKEDIN", settore: settoreDi(`${l?.category ?? ""} ${azienda} ${p.ruolo ?? ""}`, s), citta: zonaDa(l?.address).citta };
  });
  if (zona.provincia || zona.citta) {
    const gia = new Set(aziende.map((a) => a.leadId).filter(Boolean));
    const vicine = (await serbatoioNeiSettori(s)).filter((l) => !gia.has(l.id) && l.id !== m.leadId && stessaZona(zona, l.zona));
    const decisori = await decisoriDi(vicine.map((l) => l.id));
    for (const l of vicine) aziende.push({ presentazioneId: null, leadId: l.id, azienda: l.name, decisore: decisori.get(l.id) ?? null, fonte: "ZONA", settore: l.settore, citta: l.zona.citta, stessaCitta: !!zona.citta && l.zona.citta === zona.citta });
  }
  const ordinate = ordinaAziende(aziende).slice(0, 8);
  const ora = daChiedereOra(membri, ordinate);
  return {
    tipo: tipoPersona(m.profession, m.company, s),
    zona,
    membri: membri.map((x) => ({ ...x, domanda: domandaMembro(x) })),
    aziende: ordinate.map((x) => ({ ...x, domanda: domandaAzienda(x) })),
    ora: { membri: ora.membri.map((x) => x.id), aziende: ora.aziende.map(chiaveAzienda) },
  };
}

// ─── Dal lato dell'azienda: chi la conosce in zona ─────────────────────────

export interface PonteInZona {
  membroId: string;
  membro: string;
  tipo: TipoPersona;
  capitolo: string | null;
  conosciuto: boolean;
}

interface MembroConZona {
  membroId: string;
  membro: string;
  leadId: string | null;
  tipo: TipoPersona;
  capitolo: string | null;
  conosciuto: boolean;
  punteggio: number;
  zona: Zona;
}

/** I membri con la loro zona: il turno della rete lo chiede per centinaia di aziende, si tiene un minuto. */
let cache: { at: number; membri: MembroConZona[] } | null = null;

async function membriConZona(): Promise<MembroConZona[]> {
  if (cache && Date.now() - cache.at < 60_000) return cache.membri;
  const [s, membri, capitoli] = await Promise.all([
    settoriAlessio(),
    db.bniMembro.findMany({
      where: { status: "ATTIVO" },
      select: { id: true, name: true, profession: true, company: true, chapter: true, notes: true, leadId: true, conosciutoAt: true, oneToOneCount: true, partnerScore: true },
    }),
    db.bniChapter.findMany({ select: { name: true, city: true, provincia: true } }),
  ]);
  const capitoloDi = new Map(capitoli.map((c) => [c.name.toLowerCase(), c]));
  const leadMembri = await db.lead.findMany({ where: { id: { in: membri.map((m) => m.leadId).filter((x): x is string => !!x) } }, select: { id: true, address: true } });
  const indirizzo = new Map(leadMembri.map((x) => [x.id, x.address]));
  const out = membri.map((m) => {
    const c = m.chapter ? capitoloDi.get(m.chapter.toLowerCase()) : undefined;
    const z = zonaDa(m.leadId ? indirizzo.get(m.leadId) : null, m.notes?.match(/citt[aà]:\s*([^·\n]+)/i)?.[1], c?.city);
    return {
      membroId: m.id, membro: m.name, leadId: m.leadId, tipo: tipoPersona(m.profession, m.company, s), capitolo: m.chapter,
      conosciuto: !!m.conosciutoAt || m.oneToOneCount > 0, punteggio: m.partnerScore,
      zona: { citta: z.citta, provincia: z.provincia ?? c?.provincia?.toUpperCase() ?? null },
    };
  });
  cache = { at: Date.now(), membri: out };
  return out;
}

// Chi presenta un'azienda: stesso ordine delle persone (colleghi, acceleratori, casi studio, settori caldi).
const ORDINE_PONTE = ORDINE_PERSONE;

/**
 * I membri BNI della zona dell'azienda, prima quelli che Alessio ha già incontrato (possono chiedere
 * subito), poi gli altri (prima serve il 121). Prima la stessa città, poi colleghi, acceleratori, casi studio, settori caldi.
 */
export async function pontiInZona(leadId: string): Promise<PonteInZona[]> {
  const l = await db.lead.findUnique({ where: { id: leadId }, select: { address: true } });
  const zona = zonaDa(l?.address);
  if (!zona.provincia && !zona.citta) return [];
  return (await membriConZona())
    .filter((m) => m.leadId !== leadId && stessaZona(zona, m.zona))
    // Chi è della stessa città dell'azienda prima di chi è solo nella provincia.
    .sort((a, b) => Number(b.conosciuto) - Number(a.conosciuto) || Number(b.zona.citta === zona.citta) - Number(a.zona.citta === zona.citta) || ORDINE_PONTE[a.tipo] - ORDINE_PONTE[b.tipo] || b.punteggio - a.punteggio)
    .map((m) => ({ membroId: m.membroId, membro: m.membro, tipo: m.tipo, capitolo: m.capitolo, conosciuto: m.conosciuto }));
}

// ─── Dal vocale dopo il 121 ─────────────────────────────────────────────────

/** L'azienda già nel CRM con lo stesso nome (senza forme societarie), se c'è. */
export async function trovaAzienda(nome: string): Promise<{ id: string; name: string; category: string | null; address: string | null } | null> {
  const parole = nomeConfrontabile(nome).split(" ").filter((p) => p.length >= 3);
  if (!parole.length) return null;
  const simili = await db.lead.findMany({
    where: { AND: parole.slice(0, 3).map((p) => ({ name: { contains: p, mode: "insensitive" as const } })) },
    select: { id: true, name: true, category: true, address: true },
    take: 20,
  });
  return simili.find((l) => stessoNome(l.name, nome)) ?? (simili.length === 1 ? simili[0] : null);
}

/**
 * Un'azienda che il membro ti segnala al 121 entra subito nel CRM (Alessio, 2026-10-31: Laura ha
 * segnalato Piscine Arcobaleno e il CRM non lo sapeva). Se c'è già si collega; se è nei settori dei
 * casi studio lo si scrive, così si sa che vale.
 */
export async function aziendaSegnalata(
  membro: { id: string; name: string },
  a: { azienda: string; citta?: string | null; settore?: string | null; persona?: string | null },
  quando: Date,
): Promise<{ leadId: string; nuova: boolean; settore: "CASO" | "INTERESSE" | null }> {
  const s = await settoriAlessio();
  const settore = settoreDi(`${a.azienda} ${a.settore ?? ""}`, s);
  const esiste = await trovaAzienda(a.azienda);
  if (esiste) return { leadId: esiste.id, nuova: false, settore: settore ?? settoreDi(`${esiste.category ?? ""} ${esiste.name}`, s) };
  const giorno = quando.toISOString().slice(0, 10);
  const l = await db.lead.create({
    data: {
      name: a.azienda.trim().slice(0, 200),
      address: a.citta?.trim() || null,
      category: a.settore?.trim().slice(0, 100) || null,
      source: "bni_segnalata",
      bniOriginType: "PRESENTAZIONE",
      pipelineStage: "BNI_DA_LAVORARE",
      referredByMembroId: membro.id,
      notes: [
        `Segnalata da ${membro.name} (BNI) al 121 del ${giorno}${a.persona ? `: ${a.persona}` : ""}.`,
        settore === "CASO" ? "È nel settore di un caso studio." : settore === "INTERESSE" ? "È in un tuo settore caldo." : null,
      ].filter(Boolean).join(" "),
    },
    select: { id: true },
  });
  return { leadId: l.id, nuova: true, settore };
}
