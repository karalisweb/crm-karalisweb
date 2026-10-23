/**
 * La rete al centro (v3.53.0) — la parte che lavora sul database. Le regole sono in rete-regole.ts.
 *
 *   - La cerchia stretta: i membri BNI con un 121 fatto + chi Alessio segna "lo conosco".
 *   - Le aziende in lavorazione (15 il primo mese, 30 dal secondo): entrano da sole fra le approfondite,
 *     prima quelle con il ponte più forte; ognuna ha la sua fase, la strada e il ponte.
 *   - I messaggi in Cassetta (li manda Alessio): "me lo presenti?" al ponte, il contatto diretto a chi decide,
 *     il promemoria dopo 5 giorni; dopo 10 giorni il ponte successivo, dopo 3 tentativi 3 mesi di pausa.
 *   - Scaldare chi decide: un lavoro di browser al giorno legge i suoi post e propone 1-2 commenti.
 */
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { chiediJSON, REGOLE_COMUNI, type Schema } from "./ai";
import { budgetDisponibile } from "./costi";
import { KIND_FASCICOLO_BASE } from "./turno";
import { mezzanotteRoma } from "./bni-regole";
import { RISERVA_SCALDA, feriale } from "./motore-121";
import { linkedinPermette } from "./motore";
import {
  FASI_ATTIVE, GIORNI_PAUSA, capienzaLavorazione, chiDecideTesto, forzaAzienda, nomiDaConfermare, prossimaAzione, strade,
  testoContattoDiretto, testoPromemoria, testoRichiestaPonte, type DatiAzienda, type Ponte,
} from "./rete-regole";

export const KIND_RETE_PONTE = "RETE_PONTE";
export const KIND_RETE_DIRETTO = "RETE_DIRETTO";
export const KIND_RETE_PROMEMORIA = "RETE_PROMEMORIA";
export const KIND_COMMENTO = "COMMENTO_LINKEDIN";
export const KINDS_RETE = [KIND_RETE_PONTE, KIND_RETE_DIRETTO, KIND_RETE_PROMEMORIA, KIND_COMMENTO];

/** Decisori al giorno da scaldare con i commenti (letture LinkedIn). */
const DECISORI_DA_SCALDARE = RISERVA_SCALDA;
/** Commenti proposti in Cassetta al giorno: 1-2, non di più. */
const COMMENTI_AL_GIORNO = 2;

// ─── La cerchia ─────────────────────────────────────────────────────────────

export async function cerchiaNomi(): Promise<string[]> {
  const [membri, altri] = await Promise.all([
    db.bniMembro.findMany({ where: { OR: [{ conosciutoAt: { not: null } }, { oneToOneCount: { gt: 0 } }] }, select: { name: true } }),
    db.cerchiaContatto.findMany({ where: { rimossoAt: null }, select: { nome: true } }),
  ]);
  return [...membri.map((m) => m.name), ...altri.map((c) => c.nome)];
}

// ─── I dati dell'azienda per le strade ──────────────────────────────────────

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

export async function datiAzienda(leadId: string, scaldata = false): Promise<DatiAzienda> {
  const [dm, ponti] = await Promise.all([
    db.agentReport.findFirst({ where: { leadId, agent: "decision_maker" }, orderBy: { collectedAt: "desc" }, select: { findings: true } }),
    db.bniPresentazione.findMany({ where: { leadId, stato: { not: "NO" } }, select: { membroId: true, nome: true, membro: { select: { name: true } } } }),
  ]);
  const persone = Array.isArray((dm?.findings as { persone?: unknown } | null)?.persone) ? ((dm!.findings as { persone: Record<string, unknown>[] }).persone) : [];
  return {
    decisori: persone.slice(0, 2).map((p) => ({
      nome: str(p.nome) ?? "",
      grado: typeof p.grado === "number" ? p.grado : null,
      contattiInComune: (Array.isArray(p.contattiInComune) ? p.contattiInComune : []).map((x) => (typeof x === "string" ? x : str((x as { nome?: unknown })?.nome))).filter((x): x is string => !!x),
    })).filter((d) => d.nome),
    pontiBni: ponti.map((p) => ({ membroId: p.membroId, membro: p.membro.name, decisore: p.nome })),
    scaldata,
  };
}

const provatiDi = (j: Prisma.JsonValue): string[] => (Array.isArray(j) ? j.filter((x): x is string => typeof x === "string") : []);

// ─── Il turno ───────────────────────────────────────────────────────────────

export interface RiepilogoRete {
  entrate: number;
  messaggi: number;
  promemoria: number;
  cambiPonte: number;
  inPausa: number;
  rientrate: number;
  scaldaAccodato: boolean;
  attive: number;
  capienza: number;
}

/** Il turno della rete: rientri, nuove entrate fino alla capienza, il seguito, i commenti. */
export async function turnoRete(oggi = new Date()): Promise<RiepilogoRete> {
  const r: RiepilogoRete = { entrate: 0, messaggi: 0, promemoria: 0, cambiPonte: 0, inPausa: 0, rientrate: 0, scaldaAccodato: false, attive: 0, capienza: capienzaLavorazione(oggi) };
  const cerchia = await cerchiaNomi();

  // 1) Il seguito e i rientri dalla pausa.
  const tutte = await db.lavorazione.findMany({ where: { fase: { in: [...FASI_ATTIVE, "PAUSA"] } } });
  for (const l of tutte) {
    const azione = prossimaAzione(l, oggi);
    if (azione === "RIENTRA") {
      await db.lavorazione.update({ where: { id: l.id }, data: { fase: "MAPPATA", tentativi: 0, pausaFino: null, ponteNome: null, ponteMembroId: null, strada: null, chiestaAt: null, promemoriaAt: null } });
      r.rientrate++;
    } else if (azione === "PROMEMORIA") {
      if (await creaMessaggio(l.id, "PROMEMORIA", oggi)) r.promemoria++;
    } else if (azione === "CAMBIA_PONTE") {
      await cambiaPonte(l.id, "Nessuna risposta in 10 giorni");
      r.cambiPonte++;
    } else if (azione === "PAUSA") {
      await mettiInPausa(l.id, "3 ponti senza risposta");
      r.inPausa++;
    }
  }

  // 2) Nuove entrate fino alla capienza: le approfondite con il ponte più forte.
  let attive = await db.lavorazione.count({ where: { fase: { in: [...FASI_ATTIVE] } } });
  if (attive < r.capienza) {
    const candidate = await db.lead.findMany({
      where: {
        lavorazione: null,
        bniOriginType: null,
        pipelineStage: { notIn: ["NON_TARGET", "CLIENTE", "PERSO", "ARCHIVIATO"] },
        approvalItems: { some: { kind: KIND_FASCICOLO_BASE, status: "APPROVATO" } },
        agentReports: { some: { agent: "decision_maker" } },
      },
      select: { id: true, createdAt: true },
      take: 200,
    });
    const conForza = [];
    for (const c of candidate) {
      const d = await datiAzienda(c.id);
      if (!d.decisori.length && !d.pontiBni.length) continue; // senza chi decide non c'è niente da lavorare
      conForza.push({ id: c.id, forza: forzaAzienda(d, cerchia), creata: c.createdAt.getTime() });
    }
    conForza.sort((a, b) => b.forza - a.forza || a.creata - b.creata);
    for (const c of conForza.slice(0, r.capienza - attive)) {
      await db.lavorazione.create({ data: { leadId: c.id } });
      r.entrate++;
      attive++;
    }
  }
  r.attive = attive;

  // 3) Le mappate: si sceglie il ponte e il messaggio va in Cassetta.
  const mappate = await db.lavorazione.findMany({ where: { fase: "MAPPATA" }, select: { id: true } });
  for (const l of mappate) if (await avanzaMappata(l.id, cerchia, oggi)) r.messaggi++;

  // 4) Scaldare chi decide: un lavoro al giorno, nei feriali, dentro il budget LinkedIn.
  r.scaldaAccodato = await accodaScalda(oggi);
  return r;
}

/**
 * Un'azienda mappata: se c'è una strada si sceglie il ponte e il messaggio va in Cassetta; altrimenti si
 * segna cosa manca ("lo conosci?" sui nomi visti, oppure da scaldare con i commenti).
 */
export async function avanzaMappata(lavorazioneId: string, cerchia?: string[], oggi = new Date()): Promise<boolean> {
  const l = await db.lavorazione.findUnique({ where: { id: lavorazioneId } });
  if (!l || l.fase !== "MAPPATA") return false;
  const c = cerchia ?? (await cerchiaNomi());
  const d = await datiAzienda(l.leadId, !!l.scaldataAt);
  // I ponti già al lavoro per un'altra azienda (messaggio da mandare o presentazione in attesa).
  const occupati = (await db.lavorazione.findMany({ where: { id: { not: l.id }, fase: { in: ["PONTE_SCELTO", "CHIESTA"] }, presentatoAt: null, strada: { in: ["BNI", "CERCHIA"] } }, select: { ponteNome: true } }))
    .map((x) => x.ponteNome).filter((x): x is string => !!x);
  const s = strade(d, c, provatiDi(l.pontiProvati), occupati);
  if (s.length) {
    await scegliPonte(l.id, s[0]);
    return creaMessaggio(l.id, s[0].strada === "BNI" || s[0].strada === "CERCHIA" ? "PONTE" : "DIRETTO", oggi);
  }
  // C'è un ponte valido ma è occupato: si aspetta che si liberi.
  if (strade(d, c, provatiDi(l.pontiProvati)).length) {
    if (l.strada !== "IN_ATTESA_PONTE") await db.lavorazione.update({ where: { id: l.id }, data: { strada: "IN_ATTESA_PONTE" } });
    return false;
  }
  const strada = nomiDaConfermare(d, c, provatiDi(l.pontiProvati)).length ? "DA_CONFERMARE" : "SCALDARE";
  if (l.strada !== strada || !l.decisore) await db.lavorazione.update({ where: { id: l.id }, data: { strada, decisore: l.decisore ?? d.decisori[0]?.nome ?? null } });
  return false;
}

async function scegliPonte(lavorazioneId: string, p: Ponte): Promise<void> {
  await db.lavorazione.update({
    where: { id: lavorazioneId },
    data: { fase: "PONTE_SCELTO", strada: p.strada, ponteNome: p.nome, ponteMembroId: p.membroId ?? null, decisore: p.decisore },
  });
}

/** Il ponte non ha risposto (o Alessio ha detto "non ora"): si passa al successivo, senza dirlo al primo. */
export async function cambiaPonte(lavorazioneId: string, motivo: string): Promise<void> {
  const l = await db.lavorazione.findUnique({ where: { id: lavorazioneId } });
  if (!l) return;
  const provati = [...provatiDi(l.pontiProvati), ...(l.ponteNome ? [l.ponteNome] : [])];
  if (l.tentativi + 1 >= 3) return mettiInPausa(lavorazioneId, motivo);
  await db.lavorazione.update({
    where: { id: l.id },
    data: { fase: "MAPPATA", tentativi: { increment: 1 }, pontiProvati: provati, ponteNome: null, ponteMembroId: null, strada: null, chiestaAt: null, promemoriaAt: null, note: motivo },
  });
  await chiudiVociAperte(l.leadId, "Superata: si passa al ponte successivo");
}

export async function mettiInPausa(lavorazioneId: string, motivo: string, giorni = GIORNI_PAUSA): Promise<void> {
  const l = await db.lavorazione.update({ where: { id: lavorazioneId }, data: { fase: "PAUSA", pausaFino: new Date(Date.now() + giorni * 86400_000), note: motivo } });
  await chiudiVociAperte(l.leadId, "Superata: azienda in pausa");
}

async function chiudiVociAperte(leadId: string, nota: string) {
  await db.approvalItem.updateMany({ where: { leadId, kind: { in: [KIND_RETE_PONTE, KIND_RETE_DIRETTO, KIND_RETE_PROMEMORIA] }, status: "IN_ATTESA" }, data: { status: "SCARTATO", note: nota, decidedAt: new Date() } });
}

// ─── I messaggi ─────────────────────────────────────────────────────────────

interface RispostaMotivo {
  motivo: string;
}
const SCHEMA_MOTIVO: Schema = {
  type: "object",
  properties: {
    motivo: { type: "string", description: "Una o due frasi: perché all'azienda conviene parlare con Alessio, dal caso studio, SENZA nominare il cliente del caso" },
  },
  required: ["motivo"],
};

/** Il motivo nel messaggio, dal caso studio dell'azienda. Il cliente del caso non si cita per iscritto. */
async function motivoDalCaso(leadId: string, oggi: Date): Promise<string | null> {
  const l = await db.lead.findUnique({
    where: { id: leadId },
    select: { name: true, category: true, ritrovamenti: { take: 1, orderBy: { createdAt: "asc" }, select: { chiave: { select: { casoStudio: { select: { storia: true, settore: true, aziendaNome: true } } } } } } },
  });
  const caso = l?.ritrovamenti[0]?.chiave.casoStudio;
  if (!l || !caso?.storia || !(await budgetDisponibile(oggi)).ok) return null;
  try {
    const ai = await chiediJSON<RispostaMotivo>({
      sistema: `${REGOLE_COMUNI}\n\nScrivi il motivo concreto per cui un'azienda dovrebbe ascoltare Alessio Loi (Karalisweb, web e marketing digitale), partendo dal caso studio. REGOLA: il cliente del caso NON si nomina mai per iscritto (lo racconta Alessio a voce): descrivilo come "un'azienda che …" con il mestiere e la zona. Una o due frasi, tono semplice, niente promesse vaghe, nessun numero che non sia nel caso.`,
      testo: `AZIENDA DA CONTATTARE: ${l.name}${l.category ? ` (${l.category})` : ""}\nCLIENTE DEL CASO (da NON nominare): ${caso.aziendaNome ?? ""}\nSETTORE DEL CASO: ${caso.settore ?? ""}\nSTORIA DEL CASO:\n${caso.storia}`,
      schema: SCHEMA_MOTIVO,
    });
    let motivo = ai.dati.motivo.trim();
    // Rete di sicurezza: se il nome del cliente scappa comunque, si toglie il motivo.
    if (caso.aziendaNome && motivo.toLowerCase().includes(caso.aziendaNome.toLowerCase().split(" ")[0])) motivo = "";
    return motivo || null;
  } catch {
    return null;
  }
}

/** Cosa portare al ponte prima di chiedere (solo quando lo si sa: per i membri BNI). */
async function cosaDare(membroId: string | null): Promise<string | null> {
  if (!membroId) return null;
  const s = await db.bniSegnalazione.findFirst({ where: { membroId, stato: "DA_DARE" }, orderBy: { createdAt: "desc" }, select: { nome: true, motivo: true } });
  return s ? `Prima dai: segnalagli ${s.nome}${s.motivo ? ` (${s.motivo})` : ""}.` : null;
}

/** Il messaggio in Cassetta per una lavorazione: al ponte, a chi decide, o il promemoria. Una volta sola per tipo e ponte. */
export async function creaMessaggio(lavorazioneId: string, tipo: "PONTE" | "DIRETTO" | "PROMEMORIA", oggi = new Date()): Promise<boolean> {
  const l = await db.lavorazione.findUnique({ where: { id: lavorazioneId }, include: { lead: { select: { id: true, name: true } } } });
  if (!l || !l.ponteNome) return false;
  const kind = tipo === "PONTE" ? KIND_RETE_PONTE : tipo === "DIRETTO" ? KIND_RETE_DIRETTO : KIND_RETE_PROMEMORIA;
  const gia = await db.approvalItem.findFirst({ where: { leadId: l.leadId, kind, payload: { path: ["ponte"], equals: l.ponteNome } }, select: { id: true } });
  if (gia) return false;
  const membro = l.ponteMembroId ? await db.bniMembro.findUnique({ where: { id: l.ponteMembroId }, select: { phone: true, linkedinUrl: true } }) : null;
  // Contatto diretto: il profilo LinkedIn di chi decide, se l'abbiamo.
  const profiloDecisore = !membro && l.decisore ? (await db.persona.findFirst({ where: { leadId: l.leadId, nome: l.decisore }, select: { linkedinUrl: true } }))?.linkedinUrl ?? null : null;
  const decisore = l.decisore ?? "chi decide";
  const motivo = tipo === "PROMEMORIA" ? null : await motivoDalCaso(l.leadId, oggi);
  const messaggio =
    tipo === "PONTE" ? testoRichiestaPonte(l.ponteNome, decisore, l.lead.name, motivo)
    : tipo === "DIRETTO" ? testoContattoDiretto(decisore, l.lead.name, motivo)
    : testoPromemoria(l.ponteNome, decisore);
  const titolo =
    tipo === "PONTE" ? `Chiedi a ${l.ponteNome} di presentarti ${chiDecideTesto(decisore, l.lead.name)}`
    : tipo === "DIRETTO" ? `Scrivi a ${chiDecideTesto(decisore, l.lead.name)}`
    : `Promemoria a ${l.ponteNome} per ${l.lead.name}`;
  await db.approvalItem.create({
    data: {
      leadId: l.leadId,
      bniMembroId: l.ponteMembroId,
      kind,
      agent: "rete",
      title: titolo,
      payload: {
        lavorazioneId: l.id,
        ponte: l.ponteNome,
        decisore,
        strada: l.strada,
        messaggio,
        canale: membro?.phone ? "whatsapp" : "linkedin",
        telefono: membro?.phone ?? null,
        linkedin: membro?.linkedinUrl ?? profiloDecisore,
        dare: tipo === "PONTE" ? await cosaDare(l.ponteMembroId) : null,
        motivoDalCaso: !!motivo,
      } as Prisma.InputJsonValue,
    },
  });
  return true;
}

/** Effetto dell'approvazione in Cassetta: "Mandato" fa avanzare la lavorazione, "Non ora" cambia ponte. */
export async function decisioneRete(voceId: string, decisione: "APPROVATO" | "SCARTATO"): Promise<void> {
  const v = await db.approvalItem.findUnique({ where: { id: voceId }, select: { kind: true, payload: true } });
  if (!v || !KINDS_RETE.includes(v.kind)) return;
  const id = (v.payload as { lavorazioneId?: string } | null)?.lavorazioneId;
  if (!id) return;
  if (decisione === "APPROVATO") {
    if (v.kind === KIND_RETE_PROMEMORIA) await db.lavorazione.updateMany({ where: { id }, data: { promemoriaAt: new Date() } });
    if (v.kind === KIND_RETE_PONTE || v.kind === KIND_RETE_DIRETTO) await db.lavorazione.updateMany({ where: { id, fase: "PONTE_SCELTO" }, data: { fase: "CHIESTA", chiestaAt: new Date() } });
  } else if (v.kind === KIND_RETE_PONTE || v.kind === KIND_RETE_DIRETTO) {
    await cambiaPonte(id, "Ponte scartato da Alessio");
  }
}

// ─── Scaldare chi decide ────────────────────────────────────────────────────

async function accodaScalda(oggi: Date): Promise<boolean> {
  if (!feriale(oggi)) return false;
  const gia = await db.agentRun.findFirst({ where: { agent: "scalda", OR: [{ status: { in: ["IN_CODA", "IN_CORSO"] } }, { queuedAt: { gte: mezzanotteRoma(oggi) } }] } });
  if (gia) return false;
  const lav = await db.lavorazione.findMany({
    where: { fase: { in: [...FASI_ATTIVE] }, decisore: { not: null }, scaldataAt: null },
    orderBy: { updatedAt: "asc" },
    include: { lead: { select: { id: true, name: true, address: true } } },
    take: 40,
  });
  // Prima chi non ha altre strade (da scaldare), poi chi aspetta la presentazione.
  lav.sort((a, b) => Number(b.strada === "SCALDARE") - Number(a.strada === "SCALDARE"));
  const decisori = [];
  for (const l of lav.slice(0, DECISORI_DA_SCALDARE)) {
    const p = await db.persona.findFirst({ where: { leadId: l.leadId, nome: l.decisore! }, select: { linkedinUrl: true } });
    decisori.push({ leadId: l.leadId, decisore: l.decisore, azienda: l.lead.name, citta: l.lead.address, profilo: p?.linkedinUrl ?? null });
  }
  if (!decisori.length) return false;
  const input = { decisori };
  if (!(await linkedinPermette("scalda", input, oggi))) return false;
  await db.agentRun.create({ data: { agent: "scalda", status: "IN_CODA", input } });
  return true;
}

/** Il referto del lavoro "scalda": 1-2 commenti in Cassetta, e chi ha già dato un segnale diventa "scaldato". */
export async function importaScalda(findings: Record<string, unknown>): Promise<{ commenti: number; scaldate: number }> {
  const e = { commenti: 0, scaldate: 0 };
  const commenti = Array.isArray(findings.commenti) ? (findings.commenti as Record<string, unknown>[]) : [];
  for (const c of commenti) {
    if (e.commenti >= COMMENTI_AL_GIORNO) break;
    const leadId = str(c.leadId);
    const commento = str(c.commento);
    const post = str(c.post);
    if (!leadId || !commento || !post || !/linkedin\.com/i.test(post)) continue;
    const lead = await db.lead.findUnique({ where: { id: leadId }, select: { name: true } });
    if (!lead) continue;
    await db.approvalItem.create({
      data: {
        leadId,
        kind: KIND_COMMENTO,
        agent: "scalda",
        title: `Commenta il post di ${str(c.decisore) ?? "chi decide"} (${lead.name})`,
        payload: { post, estratto: str(c.estratto)?.slice(0, 400) ?? null, commento: commento.slice(0, 600), decisore: str(c.decisore) } as Prisma.InputJsonValue,
      },
    });
    e.commenti++;
  }
  const segnali = Array.isArray(findings.segnali) ? (findings.segnali as Record<string, unknown>[]) : [];
  for (const s of segnali) {
    const leadId = str(s.leadId);
    if (!leadId) continue;
    const r = await db.lavorazione.updateMany({ where: { leadId, scaldataAt: null }, data: { scaldataAt: new Date(), note: `Segnale: ${str(s.tipo) ?? "ha interagito"}` } });
    e.scaldate += r.count;
  }
  return e;
}

// ─── I pulsanti di Alessio ──────────────────────────────────────────────────

export type AzioneAlessio = "presentato" | "scaldata" | "incontro" | "proposta" | "cliente" | "pausa" | "riprendi";

export async function azioneLavorazione(id: string, azione: AzioneAlessio): Promise<void> {
  const l = await db.lavorazione.findUnique({ where: { id } });
  if (!l) throw new Error("Lavorazione non trovata");
  const ora = new Date();
  const stadio = async (s: "BNI_DA_LAVORARE" | "CALL_FISSATA" | "IN_TRATTATIVA" | "CLIENTE") => db.lead.update({ where: { id: l.leadId }, data: { pipelineStage: s } });
  switch (azione) {
    case "presentato":
      await db.lavorazione.update({ where: { id }, data: { presentatoAt: ora, fase: l.fase === "PONTE_SCELTO" || l.fase === "MAPPATA" ? "CHIESTA" : l.fase, chiestaAt: l.chiestaAt ?? ora } });
      await stadio("BNI_DA_LAVORARE");
      break;
    case "scaldata":
      await db.lavorazione.update({ where: { id }, data: { scaldataAt: ora } });
      await avanzaMappata(id);
      break;
    case "incontro":
      await db.lavorazione.update({ where: { id }, data: { fase: "INCONTRO", incontroAt: ora } });
      await stadio("CALL_FISSATA");
      break;
    case "proposta":
      await db.lavorazione.update({ where: { id }, data: { fase: "PROPOSTA", propostaAt: ora } });
      await stadio("IN_TRATTATIVA");
      break;
    case "cliente":
      await db.lavorazione.update({ where: { id }, data: { fase: "CLIENTE", clienteAt: ora } });
      await stadio("CLIENTE");
      break;
    case "pausa":
      await mettiInPausa(id, "Messa in pausa da Alessio");
      break;
    case "riprendi":
      await db.lavorazione.update({ where: { id }, data: { fase: "MAPPATA", pausaFino: null, tentativi: 0 } });
      await avanzaMappata(id);
      break;
  }
}

/** "Lo conosco": il nome entra nella cerchia per sempre. "Non lo conosco": non si propone più per questa azienda. */
export async function loConosco(nome: string, conosco: boolean, lavorazioneId?: string): Promise<void> {
  const pulito = nome.trim().slice(0, 160);
  if (!pulito) return;
  if (conosco) {
    const gia = await db.cerchiaContatto.findFirst({ where: { nome: { equals: pulito, mode: "insensitive" } }, select: { id: true } });
    if (gia) await db.cerchiaContatto.update({ where: { id: gia.id }, data: { rimossoAt: null } });
    else await db.cerchiaContatto.create({ data: { nome: pulito } });
  } else if (lavorazioneId) {
    const l = await db.lavorazione.findUnique({ where: { id: lavorazioneId }, select: { pontiProvati: true } });
    if (l) await db.lavorazione.update({ where: { id: lavorazioneId }, data: { pontiProvati: [...provatiDi(l.pontiProvati), pulito] } });
  }
  // Subito: se adesso c'è un ponte, il messaggio va in Cassetta senza aspettare il turno.
  if (lavorazioneId) await avanzaMappata(lavorazioneId);
}
