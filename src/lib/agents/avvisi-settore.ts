/**
 * Avvisi di settore (v3.69.0). Alessio, 2026-10-31: "se ci sono aziende dei miei casi studio o dei miei settori
 * in BNI o su contatti LinkedIn me lo devi dire". Piscine Arcobaleno era nel CRM dal 18/10 (fra i contatti
 * LinkedIn legati a IEM Piscine) ma era finita fra le eliminate senza che lui lo sapesse.
 *
 * A ogni turno si cercano le aziende nei settori dei casi studio e nei settori caldi (SETTORI_CALDI):
 *   - fra i membri BNI (l'azienda del membro è del settore);
 *   - fra le persone viste su LinkedIn (la loro azienda è del settore);
 *   - fra le aziende eliminate (del settore di un caso studio): si possono rimettere in gioco con un sì.
 * Ognuna diventa una voce (approval_items), una volta sola; si vede solo in Oggi (v3.71).
 *
 * v3.72 (Alessio: "Me ne occupo che vuol dire? Il mio caso studio quale?"): ogni avviso dice il settore per nome
 * (il caso studio o il settore caldo) e ha un'azione sola, che il sì fa davvero:
 *   - "121": è un membro BNI → si prepara la richiesta di 121 (in Oggi, fra le richieste BNI da mandare);
 *   - "AZIENDA": è un'azienda vista su LinkedIn o fra le eliminate → entra in lavorazione, cioè fra
 *     "Le aziende di oggi", con il messaggio pronto e a chi mandarlo.
 */
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { aziendaSegnalata, settoriAlessio, settoriConNome, trovaAzienda } from "./presentazioni";
import { qualeSettore, settoreDi, tipoPersona, zonaDa, type GruppoSettore } from "./presentazioni-regole";
import { stessaPersona } from "./rete-regole";
import { eSardo } from "./bni-regole";
import { indirizzoSardo } from "./motore";
import { nomeConfrontabile } from "@/lib/ricerca/regole";

export const KIND_AVVISO_SETTORE = "AVVISO_SETTORE";

/** Voci nuove al massimo per turno: prima le persone BNI, poi LinkedIn, poi le eliminate; casi studio prima dei caldi. */
const AVVISI_PER_TURNO = 15;
/** v3.90 (Alessio: "una volta che ho cliccato 5 sì, scrivimi il messaggio non deve continuare"): richieste di 121 dagli avvisi al giorno. */
export const MESSAGGI_121_AL_GIORNO = 5;
const SIGLE_SARDEGNA = ["CA", "SU", "SS", "NU", "OR"];

export type DoveAvviso = "BNI" | "LINKEDIN" | "ELIMINATA";
export type AzioneAvviso = "121" | "AZIENDA";

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
  /** Il settore per nome: "piscine, come il caso IEM Piscine" o "casa (edilizia, impianti…)". */
  perche: string;
  azione: AzioneAvviso;
  /** Il testo del pulsante del sì: dice cosa succede. */
  bottone: string;
  zona: string | null;
  come: string;
  cosaFare: string;
  link: string;
  leadId: string | null;
  membroId: string | null;
  sardegna: boolean;
}

const COSA_AZIENDA = "Perché: è un'azienda sarda del tuo settore. Sì = entra nel Percorso: il CRM cerca chi c'è dietro e chi te la può presentare; se non c'è nessuno, la scaldi con i commenti.";

const sarda = (provincia: string | null) => !!provincia && SIGLE_SARDEGNA.includes(provincia);
/** v3.76 (Alessio: "hai mischiato Sardegna e Lazio"): gli avvisi sono solo per la Sardegna. */
const inSardegna = (provincia: string | null, ...testi: (string | null | undefined)[]) => sarda(provincia) || testi.some((t) => /sardegna|sardinia/i.test(t ?? ""));

/** Tutte le aziende dei settori di Alessio che stanno in BNI, su LinkedIn o fra le eliminate. */
export async function cercaAvvisi(): Promise<Avviso[]> {
  const [s, gruppi] = await Promise.all([settoriAlessio(), settoriConNome()]);
  if (!s.caso.length && !s.interesse.length) return [];
  const perche = (testo: string) => (qualeSettore(testo, gruppi) as GruppoSettore | null)?.nome ?? "uno dei tuoi settori";
  const out: Avviso[] = [];

  // 1) Membri BNI la cui azienda è del settore.
  const [membri, mieiCapitoli, cerchia, presentati, richiesteAperte] = await Promise.all([
    db.bniMembro.findMany({
      where: { status: "ATTIVO" },
      select: { id: true, name: true, company: true, profession: true, chapter: true, notes: true, conosciutoAt: true, oneToOneCount: true, isCustomer: true, bniStage: true, lead: { select: { address: true } } },
    }),
    db.bniChapter.findMany({ select: { name: true, isMine: true, region: true, regioneItaliana: true } }),
    db.cerchiaContatto.findMany({ where: { rimossoAt: null }, select: { nome: true } }),
    db.bniPresentazione.findMany({ where: { stato: "PRESENTATO" }, select: { nome: true } }),
    db.approvalItem.findMany({ where: { kind: "MESSAGGIO_BNI", status: "IN_ATTESA", bniMembroId: { not: null } }, select: { bniMembroId: true } }),
  ]);
  // v3.73 (Alessio: "Giorgio Fodde è nel mio capitolo e ho già fatto 121, Claudio Conti me lo hanno presentato"):
  // a chi conosci già non si chiede un 121 da qui. Conosciuto = 121 fatto, segnato conosciuto, cliente, del tuo
  // capitolo, già oltre "da avvicinare", nella cerchia, presentato da qualcuno, o con una richiesta già pronta.
  const mio = new Set(mieiCapitoli.filter((c) => c.isMine).map((c) => c.name));
  const capitoliSardi = new Set(mieiCapitoli.filter((c) => eSardo(c)).map((c) => c.name));
  const nomiNoti = [...cerchia.map((c) => c.nome), ...presentati.map((x) => x.nome)];
  const giaInviato = new Set(richiesteAperte.map((r) => r.bniMembroId));
  const aziendeNote = new Set<string>();
  for (const m of membri) {
    // Colleghi e acceleratori si incontrano comunque (prima di tutti): qui solo chi lavora nei settori.
    const tipo = tipoPersona(m.profession, m.company, s);
    if (tipo !== "SETTORE_CASO" && tipo !== "SETTORE_INTERESSE") continue;
    if (!m.chapter || !capitoliSardi.has(m.chapter)) continue;
    const conosciuto = !!m.conosciutoAt || m.oneToOneCount > 0 || m.isCustomer || (!!m.chapter && mio.has(m.chapter))
      || m.bniStage !== "DA_AVVICINARE" || giaInviato.has(m.id) || nomiNoti.some((n) => stessaPersona(n, m.name));
    if (conosciuto) {
      if (m.company) aziendeNote.add(nomeConfrontabile(m.company).replace(/\bsrl\b/g, "").trim());
      continue;
    }
    const settore = tipo === "SETTORE_CASO" ? "CASO" : "INTERESSE";
    const z = zonaDa(m.lead?.address, m.notes?.match(/citt[aà]:\s*([^·\n]+)/i)?.[1]);
    out.push({
      chiave: `bni:${m.id}`, dove: "BNI", righe: [], eliminataId: null, azienda: m.company ?? m.name, persona: m.name, settore, zona: z.citta ?? z.provincia,
      perche: perche(`${m.profession ?? ""} ${m.company ?? ""}`), azione: "121",
      bottone: "Sì, scrivimi il messaggio",
      come: `${m.name} è membro BNI${m.chapter ? ` del capitolo ${m.chapter}` : ""}${m.profession ? ` (${m.profession.toLowerCase()})` : ""}: non vi conoscete ancora`,
      cosaFare: `Perché: la sua azienda è nel tuo settore, in Sardegna, e lui è in BNI: la relazione parte da lì, con un incontro a due (121). Sì = il CRM scrive il messaggio WhatsApp per chiederglielo; non parte niente da solo, lo trovi in Oggi fra le richieste BNI e lo mandi tu.`,
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
    if (!inSardegna(z.provincia, p.lead?.address, p.localita)) continue;
    const tramite = p.bniMembro ? `fra i contatti LinkedIn di ${p.bniMembro.name} (BNI)` : p.contattoInComune ? `su LinkedIn, in comune con te: ${p.contattoInComune.split(",").slice(0, 3).join(",").trim()}` : "su LinkedIn";
    out.push({
      chiave: `linkedin:${p.id}`, dove: "LINKEDIN", righe: [], eliminataId: null, azienda, persona: p.nome, settore, zona: z.citta ?? z.provincia ?? p.localita,
      perche: perche(`${azienda} ${p.ruolo ?? ""} ${p.lead?.category ?? ""}`), azione: "AZIENDA", bottone: "Sì, contattala",
      come: `${p.nome}${p.ruolo ? ` (${p.ruolo})` : ""} di ${azienda}: è ${tramite}`,
      cosaFare: COSA_AZIENDA,
      link: p.leadId ? `/aziende-trovate/${p.leadId}` : p.bniMembro ? `/bni/membri/${p.bniMembro.id}` : "/aziende-trovate",
      leadId: p.leadId, membroId: p.bniMembro?.id ?? null, sardegna: sarda(z.provincia),
    });
  }

  // 3) Aziende eliminate nel settore di un caso studio: forse non le hai tolte tu.
  const eliminate = await db.lead.findMany({
    where: { pipelineStage: "ARCHIVIATO", ritrovamenti: { some: {} } },
    select: { id: true, name: true, category: true, address: true, phone: true, approvalItems: { where: { kind: "FASCICOLO_BASE", status: "SCARTATO" }, select: { note: true }, take: 1 } },
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
    // Città da sola = spesso solo la zona della ricerca: serve una prova vera (v3.84).
    if (!indirizzoSardo(l.address, { telefono: l.phone, nome: l.name })) continue;
    out.push({
      chiave: `eliminata:${l.id}`, dove: "ELIMINATA", righe: [], eliminataId: l.id, azienda: l.name, persona: null, settore: "CASO", zona: z.citta ?? z.provincia ?? l.address,
      perche: perche(`${l.category ?? ""} ${l.name}`), azione: "AZIENDA", bottone: "Sì, contattala",
      come: motivo ? `È fra le eliminate (motivo: ${motivo})` : "È fra le eliminate, senza un motivo scritto: forse non l'hai tolta tu",
      cosaFare: COSA_AZIENDA,
      link: `/aziende-trovate/${l.id}`, leadId: l.id, membroId: null, sardegna: sarda(z.provincia),
    });
  }

  // Un avviso per azienda: i posti dove si vede diventano righe (prima BNI, poi LinkedIn, poi le eliminate).
  const ordine: Record<DoveAvviso, number> = { BNI: 0, LINKEDIN: 1, ELIMINATA: 2 };
  const perAzienda = new Map<string, Avviso>();
  for (const a of out.sort((x, y) => ordine[x.dove] - ordine[y.dove])) {
    const k = nomeConfrontabile(a.azienda).replace(/\bsrl\b/g, "").trim() || a.chiave;
    // L'azienda di un membro che conosci già: la relazione c'è, non serve l'avviso.
    if (aziendeNote.has(k)) continue;
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
    // Prima le persone BNI (ci si relaziona), poi LinkedIn, poi le eliminate; dentro, casi studio prima dei settori caldi.
    .sort((a, b) => ordine[a.dove] - ordine[b.dove] || Number(a.settore !== "CASO") - Number(b.settore !== "CASO") || Number(!a.sardegna) - Number(!b.sardegna) || a.azienda.localeCompare(b.azienda));
}

const titolo = (a: Avviso) => `${a.azienda} · ${a.perche}`;

/** Le voci nuove in Cassetta (una volta sola per chiave, anche se poi scartata). */
export async function avvisaSettori(): Promise<number> {
  const avvisi = await cercaAvvisi();
  const voci = await db.approvalItem.findMany({ where: { kind: KIND_AVVISO_SETTORE }, select: { id: true, status: true, payload: true } });
  const gia = new Map(voci.map((v) => [(v.payload as { chiave?: string } | null)?.chiave, v]));
  // Quelle ancora da decidere che non valgono più (es. il membro ora lo conosci) si tolgono da Oggi.
  const valide = new Set(avvisi.map((a) => a.chiave));
  const superate = voci.filter((v) => v.status === "IN_ATTESA" && !valide.has((v.payload as { chiave?: string } | null)?.chiave ?? ""));
  if (superate.length) {
    await db.approvalItem.updateMany({ where: { id: { in: superate.map((v) => v.id) } }, data: { status: "SCARTATO", decidedAt: new Date(), decidedBy: "avvisi_settore", note: "Non serve più: lo conosci già" } });
  }
  let creati = 0;
  for (const a of avvisi) {
    const v = gia.get(a.chiave);
    // Quelle ancora da decidere si riscrivono con le parole e i dati di oggi.
    if (v?.status === "IN_ATTESA") await db.approvalItem.update({ where: { id: v.id }, data: { title: titolo(a), payload: a as unknown as Prisma.InputJsonValue, leadId: a.leadId ?? a.eliminataId, bniMembroId: a.membroId } });
    if (v) continue;
    if (creati >= AVVISI_PER_TURNO) continue;
    await db.approvalItem.create({
      data: {
        kind: KIND_AVVISO_SETTORE,
        agent: "avvisi_settore",
        leadId: a.leadId ?? a.eliminataId,
        bniMembroId: a.membroId,
        title: titolo(a),
        payload: a as unknown as Prisma.InputJsonValue,
      },
    });
    creati++;
  }
  return creati;
}

/**
 * Il sì su un avviso fa l'azione scritta sul pulsante:
 *   - "121": la richiesta di 121 al membro, scritta e pronta da mandare (come l'invito dalla sua scheda);
 *   - "AZIENDA": l'azienda (trovata o creata) torna in gioco se era eliminata ed entra in lavorazione:
 *     il CRM sceglie chi te la presenta e prepara il messaggio, come per le altre aziende di oggi.
 */
export async function decisioneAvviso(voceId: string, oggi = new Date()): Promise<void> {
  const v = await db.approvalItem.findUnique({ where: { id: voceId }, select: { payload: true } });
  const p = (v?.payload ?? {}) as Partial<Avviso>;
  const azione: AzioneAvviso = p.azione ?? (p.dove === "BNI" ? "121" : "AZIENDA");
  if (azione === "121" && p.membroId) {
    const { invitoManuale } = await import("./bni");
    await invitoManuale(p.membroId, oggi);
    return;
  }
  let leadId = p.leadId ?? p.eliminataId ?? (p.azienda ? (await trovaAzienda(p.azienda))?.id : null) ?? null;
  if (!leadId && p.azienda && p.membroId) {
    const m = await db.bniMembro.findUnique({ where: { id: p.membroId }, select: { id: true, name: true } });
    if (m) leadId = (await aziendaSegnalata(m, { azienda: p.azienda, citta: p.zona, persona: p.persona }, oggi)).leadId;
  }
  if (!leadId && p.azienda) {
    leadId = (await db.lead.create({
      data: { name: p.azienda.slice(0, 200), address: p.zona ?? null, source: "avviso_settore", pipelineStage: "DA_ANALIZZARE", notes: `Dagli avvisi nei tuoi settori (${p.perche ?? ""}): ${(p.righe ?? []).join(" · ")}` },
      select: { id: true },
    })).id;
  }
  if (!leadId) return;
  await db.lead.updateMany({ where: { id: leadId, pipelineStage: { in: ["ARCHIVIATO", "NON_TARGET"] } }, data: { pipelineStage: "DA_ANALIZZARE" } });
  if (await db.lavorazione.findUnique({ where: { leadId }, select: { id: true } })) return;
  const { avanzaMappata } = await import("./rete");
  const l = await db.lavorazione.create({ data: { leadId } });
  await avanzaMappata(l.id, undefined, oggi);
}
