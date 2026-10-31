/**
 * Avvisi di settore (v3.69.0). Alessio, 2026-10-31: "se ci sono aziende dei miei casi studio o dei miei settori
 * in BNI o su contatti LinkedIn me lo devi dire". Piscine Arcobaleno era nel CRM dal 18/10 (fra i contatti
 * LinkedIn legati a IEM Piscine) ma era finita fra le eliminate senza che lui lo sapesse.
 *
 * A ogni turno si cercano le aziende nei settori dei casi studio e nei settori caldi (SETTORI_CALDI):
 *   - fra i membri BNI (l'azienda del membro è del settore);
 *   - fra le persone viste su LinkedIn (la loro azienda è del settore);
 *   - fra le aziende eliminate (del settore di un caso studio): si possono rimettere in gioco con un sì.
 * Ognuna diventa una voce in Cassetta, una volta sola; in Oggi si vedono in cima.
 */
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { settoriAlessio } from "./presentazioni";
import { settoreDi, tipoPersona, zonaDa } from "./presentazioni-regole";
import { stessaPersona } from "./rete-regole";
import { nomeConfrontabile } from "@/lib/ricerca/regole";

export const KIND_AVVISO_SETTORE = "AVVISO_SETTORE";

/** Voci nuove al massimo per turno: prima le persone BNI, poi LinkedIn, poi le eliminate; casi studio prima dei caldi. */
const AVVISI_PER_TURNO = 15;
const SIGLE_SARDEGNA = ["CA", "SU", "SS", "NU", "OR"];

export type DoveAvviso = "BNI" | "LINKEDIN" | "ELIMINATA";

export interface Avviso {
  chiave: string;
  dove: DoveAvviso;
  /** Tutti i posti dove l'azienda è stata vista (BNI, LinkedIn, eliminate), una riga ciascuno. */
  righe: string[];
  /** Se è fra le eliminate: il sì la rimette in gioco. */
  eliminataId: string | null;
  azienda: string;
  persona: string | null;
  settore: "CASO" | "INTERESSE";
  zona: string | null;
  come: string;
  cosaFare: string;
  link: string;
  leadId: string | null;
  membroId: string | null;
  sardegna: boolean;
}

const sarda = (provincia: string | null) => !!provincia && SIGLE_SARDEGNA.includes(provincia);

/** Tutte le aziende dei settori di Alessio che stanno in BNI, su LinkedIn o fra le eliminate. */
export async function cercaAvvisi(): Promise<Avviso[]> {
  const s = await settoriAlessio();
  if (!s.caso.length && !s.interesse.length) return [];
  const out: Avviso[] = [];

  // 1) Membri BNI la cui azienda è del settore.
  const membri = await db.bniMembro.findMany({
    where: { status: "ATTIVO" },
    select: { id: true, name: true, company: true, profession: true, chapter: true, notes: true, conosciutoAt: true, oneToOneCount: true, lead: { select: { address: true } } },
  });
  for (const m of membri) {
    // Colleghi e acceleratori si incontrano comunque (prima di tutti): qui solo chi lavora nei settori.
    const tipo = tipoPersona(m.profession, m.company, s);
    if (tipo !== "SETTORE_CASO" && tipo !== "SETTORE_INTERESSE") continue;
    const settore = tipo === "SETTORE_CASO" ? "CASO" : "INTERESSE";
    const z = zonaDa(m.lead?.address, m.notes?.match(/citt[aà]:\s*([^·\n]+)/i)?.[1]);
    const conosciuto = !!m.conosciutoAt || m.oneToOneCount > 0;
    out.push({
      chiave: `bni:${m.id}`, dove: "BNI", righe: [], eliminataId: null, azienda: m.company ?? m.name, persona: m.name, settore, zona: z.citta ?? z.provincia,
      come: `${m.name} è membro BNI${m.chapter ? ` del capitolo ${m.chapter}` : ""}${m.profession ? ` (${m.profession.toLowerCase()})` : ""}`,
      cosaFare: conosciuto ? "Lo conosci già: raccontagli il caso studio e chiedigli chi conosce nel suo settore." : "Chiedigli un 121: è nel tuo settore, raccontagli il caso studio.",
      link: `/bni/membri/${m.id}`, leadId: null, membroId: m.id, sardegna: sarda(z.provincia),
    });
  }

  // 2) Persone viste su LinkedIn (rete di un membro, ricerca, chi decide) la cui azienda è del settore.
  const persone = await db.persona.findMany({
    where: { OR: [{ aziendaNome: { not: null } }, { ruolo: { not: null } }, { leadId: { not: null } }] },
    select: { id: true, nome: true, ruolo: true, aziendaNome: true, localita: true, contattoInComune: true, fonte: true, leadId: true, lead: { select: { name: true, category: true, address: true, pipelineStage: true } }, bniMembro: { select: { id: true, name: true } } },
  });
  for (const p of persone) {
    // Il membro stesso, visto su LinkedIn: c'è già l'avviso BNI.
    if (p.bniMembro && stessaPersona(p.nome, p.bniMembro.name)) continue;
    const azienda = p.lead?.name ?? p.aziendaNome ?? null;
    const settore = settoreDi(`${azienda ?? ""} ${p.ruolo ?? ""} ${p.lead?.category ?? ""}`, s);
    if (!settore || !azienda) continue;
    const z = zonaDa(p.lead?.address, p.localita);
    const tramite = p.bniMembro ? `fra i contatti LinkedIn di ${p.bniMembro.name} (BNI)` : p.contattoInComune ? `su LinkedIn, in comune con te: ${p.contattoInComune.split(",").slice(0, 3).join(",").trim()}` : "su LinkedIn";
    out.push({
      chiave: `linkedin:${p.id}`, dove: "LINKEDIN", righe: [], eliminataId: null, azienda, persona: p.nome, settore, zona: z.citta ?? z.provincia ?? p.localita,
      come: `${p.nome}${p.ruolo ? ` (${p.ruolo})` : ""} di ${azienda}: è ${tramite}`,
      cosaFare: p.bniMembro ? `Chiedi a ${p.bniMembro.name} di presentartelo.` : p.contattoInComune ? "Chiedi una presentazione a chi avete in comune." : "Collegati e guarda chi avete in comune.",
      link: p.leadId ? `/aziende-trovate/${p.leadId}` : p.bniMembro ? `/bni/membri/${p.bniMembro.id}` : "/aziende-trovate",
      leadId: p.leadId, membroId: p.bniMembro?.id ?? null, sardegna: sarda(z.provincia),
    });
  }

  // 3) Aziende eliminate nel settore di un caso studio: forse non le hai tolte tu.
  const eliminate = await db.lead.findMany({
    where: { pipelineStage: "ARCHIVIATO", ritrovamenti: { some: {} } },
    select: { id: true, name: true, category: true, address: true, approvalItems: { where: { kind: "FASCICOLO_BASE", status: "SCARTATO" }, select: { note: true }, take: 1 } },
  });
  // Se la stessa azienda c'è già attiva (un doppione), quella eliminata non va rimessa in gioco.
  const attive = new Set(
    (await db.lead.findMany({ where: { pipelineStage: { not: "ARCHIVIATO" }, ritrovamenti: { some: {} } }, select: { name: true } }))
      .map((l) => nomeConfrontabile(l.name).replace(/\bsrl\b/g, "").trim()),
  );
  for (const l of eliminate) {
    if (settoreDi(`${l.category ?? ""} ${l.name}`, s) !== "CASO") continue;
    if (attive.has(nomeConfrontabile(l.name).replace(/\bsrl\b/g, "").trim())) continue;
    const motivo = l.approvalItems[0]?.note;
    const z = zonaDa(l.address);
    out.push({
      chiave: `eliminata:${l.id}`, dove: "ELIMINATA", righe: [], eliminataId: l.id, azienda: l.name, persona: null, settore: "CASO", zona: z.citta ?? z.provincia ?? l.address,
      come: motivo ? `È fra le eliminate (motivo: ${motivo})` : "È fra le eliminate, senza un motivo scritto: forse non l'hai tolta tu",
      cosaFare: "Sì = la rimetto in gioco. No = resta fuori.",
      link: `/aziende-trovate/${l.id}`, leadId: l.id, membroId: null, sardegna: sarda(z.provincia),
    });
  }

  // Un avviso per azienda: i posti dove si vede diventano righe (prima BNI, poi LinkedIn, poi le eliminate).
  const ordine: Record<DoveAvviso, number> = { BNI: 0, LINKEDIN: 1, ELIMINATA: 2 };
  const perAzienda = new Map<string, Avviso>();
  for (const a of out.sort((x, y) => ordine[x.dove] - ordine[y.dove])) {
    const k = nomeConfrontabile(a.azienda).replace(/\bsrl\b/g, "").trim() || a.chiave;
    const c = perAzienda.get(k);
    if (!c) {
      perAzienda.set(k, { ...a, chiave: `azienda:${k}`, righe: [a.come] });
      continue;
    }
    if (!c.righe.includes(a.come)) c.righe.push(a.come);
    c.eliminataId ??= a.eliminataId;
    c.leadId ??= a.leadId;
    c.membroId ??= a.membroId;
    c.sardegna ||= a.sardegna;
    c.zona ??= a.zona;
  }
  return [...perAzienda.values()]
    .map((a) => (a.eliminataId && a.dove !== "ELIMINATA" ? { ...a, cosaFare: `${a.cosaFare} Ed è fra le eliminate: con il sì la rimetto in gioco.` } : a))
    // Prima le persone BNI (ci si relaziona), poi LinkedIn, poi le eliminate; dentro, casi studio prima dei settori caldi.
    .sort((a, b) => ordine[a.dove] - ordine[b.dove] || Number(a.settore !== "CASO") - Number(b.settore !== "CASO") || Number(!a.sardegna) - Number(!b.sardegna) || a.azienda.localeCompare(b.azienda));
}

/** Le voci nuove in Cassetta (una volta sola per chiave, anche se poi scartata). */
export async function avvisaSettori(): Promise<number> {
  const avvisi = await cercaAvvisi();
  if (!avvisi.length) return 0;
  const gia = new Set(
    (await db.approvalItem.findMany({ where: { kind: KIND_AVVISO_SETTORE }, select: { payload: true } }))
      .map((v) => (v.payload as { chiave?: string } | null)?.chiave)
      .filter(Boolean),
  );
  let creati = 0;
  for (const a of avvisi) {
    if (gia.has(a.chiave)) continue;
    if (creati >= AVVISI_PER_TURNO) break;
    await db.approvalItem.create({
      data: {
        kind: KIND_AVVISO_SETTORE,
        agent: "avvisi_settore",
        leadId: a.leadId,
        bniMembroId: a.membroId,
        title: `${a.settore === "CASO" ? "Nel settore del tuo caso studio" : "In un tuo settore caldo"}: ${a.azienda}`,
        payload: a as unknown as Prisma.InputJsonValue,
      },
    });
    creati++;
  }
  return creati;
}

/** Il sì su un avviso: un'azienda eliminata torna in gioco (da analizzare). */
export async function decisioneAvviso(voceId: string): Promise<void> {
  const v = await db.approvalItem.findUnique({ where: { id: voceId }, select: { payload: true } });
  const p = (v?.payload ?? {}) as { eliminataId?: string | null };
  if (p.eliminataId) {
    await db.lead.updateMany({ where: { id: p.eliminataId, pipelineStage: "ARCHIVIATO" }, data: { pipelineStage: "DA_ANALIZZARE" } });
  }
}
