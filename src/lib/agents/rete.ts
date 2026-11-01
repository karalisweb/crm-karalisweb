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
import { mezzanotteRoma, norm } from "./bni-regole";
import { indirizzoSardo, linkedinPermette, mandaAScaldare, verificaCollegamento } from "./motore";
import {
  FASI_ATTIVE, GIORNI_PAUSA, capienzaLavorazione, chiDecideTesto, forzaAzienda, nomiDaConfermare, prossimaAzione, strade,
  testoContattoDiretto, testoDirettoConPonte, testoPromemoria, testoRichiestaPonte, type DatiAzienda, type Ponte,
  COMMENTI_PER_CONTATTO, PIATTAFORME, piattaformaConsigliata, piattaformaDi, piattaformaPiuCommentata, testoContattoDopoCommenti, testoMessaggioPagina,
  type PaginaSocial, type Piattaforma,
} from "./rete-regole";
import { noteDaReferti } from "./impressioni-sezioni";
import { scaricaPagina } from "./pagina";
import { extractWhatsAppNumber, normalizePhoneForWhatsApp } from "@/lib/audit/whatsapp-extractor";
import { extractContactEmail } from "@/lib/audit/email-finder";
import { pontiInZona } from "./presentazioni";
import { NOTA_PAGINA_FERMA } from "./presentazioni-regole";

export const KIND_RETE_PONTE = "RETE_PONTE";
export const KIND_RETE_DIRETTO = "RETE_DIRETTO";
export const KIND_RETE_PROMEMORIA = "RETE_PROMEMORIA";
// Il nome resta per i commenti già in Cassetta: dal 2026-10-25 vale per le pagine Facebook, Instagram e LinkedIn.
export const KIND_COMMENTO = "COMMENTO_LINKEDIN";
/** Al 5° commento: il contatto diretto (WhatsApp, mail o telefono). */
export const KIND_RETE_CONTATTO = "RETE_CONTATTO";
/** Chi decide non si trova: il messaggio privato alla pagina per arrivare a lui. */
export const KIND_RETE_PAGINA = "RETE_PAGINA";
export const KINDS_RETE = [KIND_RETE_PONTE, KIND_RETE_DIRETTO, KIND_RETE_PROMEMORIA, KIND_COMMENTO, KIND_RETE_CONTATTO, KIND_RETE_PAGINA];

/** Decisori al giorno da scaldare con i commenti (letture LinkedIn). */
/** Aziende lette dal lavoro "scalda": un po' più dei commenti, perché chi non ha post recenti si salta. */
const DECISORI_DA_SCALDARE = 14;
/** Commenti proposti in Cassetta al giorno (Alessio, 2026-10-28: da 2 a 10). */
const COMMENTI_AL_GIORNO = 10;

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
      // In comune su LinkedIn e, dal 2026-10-25, gli amici in comune su Facebook.
      contattiInComune: [...(Array.isArray(p.contattiInComune) ? p.contattiInComune : []), ...(Array.isArray(p.amiciInComuneFacebook) ? p.amiciInComuneFacebook : [])].map((x) => (typeof x === "string" ? x : str((x as { nome?: unknown })?.nome))).filter((x): x is string => !!x),
    })).filter((d) => d.nome),
    pontiBni: ponti.map((p) => ({ membroId: p.membroId, membro: p.membro.name, decisore: p.nome })),
    pontiZona: (await pontiInZona(leadId)).filter((p) => p.conosciuto).map((p) => ({ membroId: p.membroId, membro: p.membro })),
    scaldata,
  };
}

const provatiDi = (j: Prisma.JsonValue): string[] => (Array.isArray(j) ? j.filter((x): x is string => typeof x === "string") : []);

// ─── Il turno ───────────────────────────────────────────────────────────────

export interface RiepilogoRete {
  entrate: number;
  /** Approfondite senza chi decide, ponte né pagine: scartate da sole. */
  scartate: number;
  messaggi: number;
  promemoria: number;
  cambiPonte: number;
  inPausa: number;
  rientrate: number;
  scaldaAccodato: boolean;
  daScaldareAggiunte: number;
  pagineFerme: number;
  contattiAccodati: number;
  attive: number;
  capienza: number;
}

/** Il turno della rete: rientri, nuove entrate fino alla capienza, il seguito, i commenti. */
export async function turnoRete(oggi = new Date()): Promise<RiepilogoRete> {
  const r: RiepilogoRete = { entrate: 0, scartate: 0, messaggi: 0, promemoria: 0, cambiPonte: 0, inPausa: 0, rientrate: 0, scaldaAccodato: false, daScaldareAggiunte: 0, pagineFerme: 0, contattiAccodati: 0, attive: 0, capienza: capienzaLavorazione(oggi) };
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

  // 1b) Le approfondite senza nessuna strada si scartano da sole (Alessio, 2026-10-28).
  const controllate = await db.lead.findMany({
    where: { lavorazione: null, approvalItems: { some: { kind: KIND_FASCICOLO_BASE, status: "APPROVATO" } }, agentReports: { some: { agent: "decision_maker" } } },
    select: { id: true },
    take: 200,
  });
  for (const c of controllate) if (await scartaSenzaStrade(c.id)) r.scartate++;

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
      // Senza chi decide si lavora dalla pagina (Alessio, 2026-10-25); senza nemmeno quella si scarta (1b).
      if (!d.decisori.length && !d.pontiBni.length && !(await pagineAzienda(c.id)).length) continue;
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

  // 2b) Sempre almeno 10 da scaldare (v3.83): prima escono le pagine ferme (v3.84), poi se mancano si riprendono
  //     le sarde scartate "senza collegamento".
  r.pagineFerme = await liberaPagineFerme(oggi);
  // v3.86: le collegate ferme in "da decidere" vanno avanti da sole (prima aspettavano il sì di Alessio).
  for (const v of await db.approvalItem.findMany({ where: { kind: KIND_FASCICOLO_BASE, status: "IN_ATTESA", lead: { lavorazione: null, agentReports: { some: { agent: "decision_maker" } } } }, select: { leadId: true, note: true, payload: true }, take: 30 })) {
    const ponte = (v.payload as { collegamento?: string } | null)?.collegamento;
    if (v.leadId && ponte) await mandaAScaldare(v.leadId, oggi, `Va avanti da sola: ${ponte} (deciso dal CRM)`);
  }
  r.daScaldareAggiunte = await riempiScaldare(oggi);

  // 2c) v3.87: la richiesta al ponte non ancora mandata diventa il messaggio diretto a chi decide (si riparte da
  //     "mappata": avanzaMappata sceglie lo stesso ponte e scrive a chi decide, citandolo se lo conosce davvero).
  const daConvertire = await db.lavorazione.findMany({
    where: { fase: "PONTE_SCELTO", strada: { in: ["BNI", "CERCHIA"] }, decisore: { not: null }, lead: { approvalItems: { some: { kind: KIND_RETE_PONTE, status: "IN_ATTESA" } } } },
    select: { id: true, leadId: true },
  });
  for (const c of daConvertire) {
    await db.approvalItem.updateMany({ where: { leadId: c.leadId, kind: KIND_RETE_PONTE, status: "IN_ATTESA" }, data: { status: "SCARTATO", decidedAt: new Date(), decidedBy: "rete", note: "Sostituita dal messaggio diretto a chi decide" } });
    await db.lavorazione.update({ where: { id: c.id }, data: { fase: "MAPPATA", strada: null, ponteNome: null, ponteMembroId: null } });
  }

  // 3) Le mappate: si sceglie il ponte e il messaggio va in Cassetta.
  const mappate = await db.lavorazione.findMany({ where: { fase: "MAPPATA" }, select: { id: true } });
  for (const l of mappate) if (await avanzaMappata(l.id, cerchia, oggi)) r.messaggi++;

  // 4) Scaldare chi decide: fino a 3 lavori al giorno, dentro il budget LinkedIn.
  r.scaldaAccodato = await accodaScalda(oggi);
  // 5) I messaggi a chi decide li manda il Mac su LinkedIn (v3.88).
  r.contattiAccodati = await accodaContatti(oggi);
  return r;
}

/** Una pagina è ferma se in 10 giorni "scalda" l'ha letta almeno 3 volte senza trovare un post da commentare. */
const GIORNI_PAGINA_FERMA = 10;
const LETTURE_PAGINA_FERMA = 3;
/** Quanto resta fuori una pagina ferma: poi riprova da sola (magari ha ripreso a pubblicare). */
const GIORNI_PAUSA_PAGINA_FERMA = 45;

/**
 * v3.84 (rischio: "aziende con pagine morte restano a scaldare per sempre e occupano i 10 posti"; Metal Sulcis 0 post,
 * Centro Piscine fermo da un mese): esce in pausa e il posto passa a un'altra.
 */
async function liberaPagineFerme(oggi: Date): Promise<number> {
  const da = new Date(oggi.getTime() - GIORNI_PAGINA_FERMA * 86400_000);
  const [lav, giri, commenti] = await Promise.all([
    db.lavorazione.findMany({ where: { fase: "MAPPATA", strada: "SCALDARE" }, select: { id: true, leadId: true } }),
    db.agentRun.findMany({ where: { agent: "scalda", status: "FATTO", finishedAt: { gte: da } }, select: { input: true } }),
    db.approvalItem.findMany({ where: { kind: KIND_COMMENTO, createdAt: { gte: da } }, select: { leadId: true } }),
  ]);
  const lette = new Map<string, number>();
  for (const g of giri) {
    const aziende = ((g.input ?? {}) as { aziende?: { leadId?: string }[] }).aziende ?? [];
    for (const a of aziende) if (a.leadId) lette.set(a.leadId, (lette.get(a.leadId) ?? 0) + 1);
  }
  const conCommento = new Set(commenti.map((c) => c.leadId));
  let uscite = 0;
  for (const l of lav) {
    if ((lette.get(l.leadId) ?? 0) < LETTURE_PAGINA_FERMA || conCommento.has(l.leadId)) continue;
    // v3.87: in pausa esce dai commenti ma entra fra le aziende da chiedere ai membri BNI della zona (presentazioni.ts).
    await mettiInPausa(l.id, `${NOTA_PAGINA_FERMA}: in ${GIORNI_PAGINA_FERMA} giorni nessun post da commentare, si cerca chi la presenta`, GIORNI_PAUSA_PAGINA_FERMA);
    uscite++;
  }
  return uscite;
}

/** Aziende da tenere sempre in riscaldamento (Alessio, 2026-11-01: "ci devono essere sempre 10 aziende in lista"). */
export const MINIMO_DA_SCALDARE = 10;

/**
 * Se in riscaldamento (passo 3) ce ne sono meno di 10, entrano le aziende sarde messe da parte "senza collegamento"
 * con chi decide già cercato: le più vecchie prima. Ognuna passa da mandaAScaldare (approvata dal CRM, approfondita).
 */
async function riempiScaldare(oggi: Date): Promise<number> {
  const daScaldare = () => db.lavorazione.count({ where: { fase: "MAPPATA", strada: "SCALDARE" } });
  let mancano = MINIMO_DA_SCALDARE - (await daScaldare());
  if (mancano <= 0) return 0;
  const candidate = await db.approvalItem.findMany({
    where: { kind: KIND_FASCICOLO_BASE, status: "SCARTATO", note: { startsWith: "Senza collegamento" }, lead: { lavorazione: null, agentReports: { some: { agent: "decision_maker" } } } },
    orderBy: { createdAt: "asc" },
    select: { leadId: true, lead: { select: { address: true, phone: true, name: true } } },
    take: 100,
  });
  let aggiunte = 0;
  for (const c of candidate) {
    if (mancano <= 0) break;
    if (!c.leadId || !indirizzoSardo(c.lead?.address, { telefono: c.lead?.phone, nome: c.lead?.name })) continue;
    if (!(await mandaAScaldare(c.leadId, oggi))) continue;
    aggiunte++;
    mancano = MINIMO_DA_SCALDARE - (await daScaldare());
  }
  return aggiunte;
}

/**
 * v3.88 (Alessio: "voglio che faccia tutto in autonomia: commenti e messaggio"): i messaggi a chi decide ancora da
 * mandare, con il suo profilo LinkedIn, diventano un lavoro per il Mac che li manda (messaggio se collegati, altrimenti
 * richiesta di collegamento con la nota). Uno alla volta per azienda, dentro il budget LinkedIn.
 */
const LUNGHEZZA_NOTA = 280;

export function notaInvito(decisore: string | null, testo: string): string {
  const nome = decisore ? decisore.trim().split(/\s+/)[0] : null;
  const inComune = testo.match(/Abbiamo in comune ([^.]+)\./)?.[1];
  const commenti = /commentato i post/.test(testo);
  const base = `${nome ? `Buongiorno ${nome}` : "Buongiorno"}, sono Alessio Loi di Karalisweb (Cagliari).${inComune ? ` Abbiamo in comune ${inComune}.` : commenti ? " Ho seguito e commentato i vostri post." : ""} Lavoro con aziende come la vostra: mi farebbe piacere collegarci.`;
  return base.length <= LUNGHEZZA_NOTA ? base : `${base.slice(0, LUNGHEZZA_NOTA - 1)}…`;
}

async function accodaContatti(oggi: Date): Promise<number> {
  const voci = await db.approvalItem.findMany({
    where: { kind: { in: [KIND_RETE_DIRETTO, KIND_RETE_CONTATTO] }, status: "IN_ATTESA", leadId: { not: null } },
    orderBy: { createdAt: "asc" },
    select: { id: true, leadId: true, payload: true, lead: { select: { name: true } } },
    take: 20,
  });
  let accodati = 0;
  for (const v of voci) {
    const p = (v.payload ?? {}) as { linkedin?: string; messaggio?: string; decisore?: string };
    if (!v.leadId || !p.linkedin || !/linkedin\.com\/in\//i.test(p.linkedin) || !p.messaggio) continue;
    if (await db.agentRun.findFirst({ where: { leadId: v.leadId, agent: "contatta_persona", status: { in: ["IN_CODA", "IN_CORSO", "FATTO"] } }, select: { id: true } })) continue;
    if (!(await linkedinPermette("contatta_persona", null, oggi))) break;
    const decisore = p.decisore && p.decisore !== "chi decide" ? p.decisore : null;
    await db.agentRun.create({
      data: { agent: "contatta_persona", status: "IN_CODA", leadId: v.leadId, input: { voceId: v.id, leadId: v.leadId, persona: decisore, azienda: v.lead?.name ?? null, profilo: p.linkedin, messaggio: p.messaggio, nota: notaInvito(decisore, p.messaggio) } },
    });
    accodati++;
  }
  return accodati;
}

/** Il referto del Mac: messaggio o invito partito → la voce è fatta e l'azienda passa a "aspetti la risposta". */
export async function importaContattoPersona(findings: Record<string, unknown>): Promise<void> {
  const leadId = str(findings.leadId);
  const esito = str(findings.esito);
  if (!leadId || (esito !== "MESSAGGIO" && esito !== "INVITO")) return;
  const voce = await db.approvalItem.findFirst({ where: { leadId, kind: { in: [KIND_RETE_DIRETTO, KIND_RETE_CONTATTO] }, status: "IN_ATTESA" }, orderBy: { createdAt: "asc" }, select: { id: true } });
  if (!voce) return;
  await db.approvalItem.update({ where: { id: voce.id }, data: { status: "APPROVATO", decidedAt: new Date(), decidedBy: "crm_auto", note: esito === "MESSAGGIO" ? "Messaggio mandato su LinkedIn dal CRM" : "Richiesta di collegamento con nota mandata su LinkedIn dal CRM" } });
  await decisioneRete(voce.id, "APPROVATO");
  await db.activity.create({ data: { leadId, type: "LINKEDIN_SENT", notes: `[Contatto-auto] ${esito === "MESSAGGIO" ? "messaggio LinkedIn a chi decide" : "invito LinkedIn con nota a chi decide"}` } }).catch(() => null);
}

/** Chi la scarta da sola: si distingue dalle scelte di Alessio (non conta nelle sue "da validare" di oggi). */
export const SCARTATA_DAL_CRM = "crm";

/**
 * Niente chi decide, nessuno che te la presenta, nessuna pagina social: si scarta e via (Alessio, 2026-10-28).
 * Solo a controlli finiti: chi decide (decision_maker) e i social (agente "social") devono aver già risposto.
 */
export async function scartaSenzaStrade(leadId: string): Promise<boolean> {
  const fatti = await db.agentReport.findMany({ where: { leadId, agent: { in: ["decision_maker", "social"] } }, distinct: ["agent"], select: { agent: true } });
  if (fatti.length < 2) return false;
  const d = await datiAzienda(leadId);
  if (d.decisori.length || d.pontiBni.length || (await pagineAzienda(leadId)).length) return false;
  const voce = await db.approvalItem.findFirst({ where: { leadId, kind: KIND_FASCICOLO_BASE, status: "APPROVATO" }, orderBy: { createdAt: "desc" }, select: { id: true } });
  if (!voce) return false;
  await db.approvalItem.update({
    where: { id: voce.id },
    data: { status: "SCARTATO", decidedAt: new Date(), decidedBy: SCARTATA_DAL_CRM, note: "Scartata da sola: niente chi decide, nessuno che te la presenta, nessuna pagina social" },
  });
  return true;
}

/**
 * Dal passo 1 al passo 2 subito, senza aspettare il turno delle 7 o delle 14 (Alessio, 2026-10-28:
 * "dal passo 1 al passo 2 dobbiamo essere superveloci"). Si chiama quando Alessio approfondisce e quando
 * arriva il referto di "chi decide": se chi decide c'è l'azienda entra e si sceglie subito il ponte,
 * altrimenti parte adesso il controllo di chi decide.
 */
export async function entraSubito(leadId: string, oggi = new Date()): Promise<"entrata" | "in_verifica" | "no"> {
  if (await db.lavorazione.findUnique({ where: { leadId }, select: { id: true } })) return "no";
  const voce = await db.approvalItem.findFirst({ where: { leadId, kind: KIND_FASCICOLO_BASE }, orderBy: { createdAt: "desc" }, select: { status: true } });
  if (voce?.status !== "APPROVATO") return "no";
  if (!(await db.agentReport.findFirst({ where: { leadId, agent: "decision_maker" }, select: { id: true } }))) {
    return (await verificaCollegamento(leadId, oggi)) === "IN_VERIFICA" ? "in_verifica" : "no";
  }
  if (await scartaSenzaStrade(leadId)) return "no";
  const d = await datiAzienda(leadId);
  if (!d.decisori.length && !d.pontiBni.length && !(await pagineAzienda(leadId)).length) return "no";
  if ((await db.lavorazione.count({ where: { fase: { in: [...FASI_ATTIVE] } } })) >= capienzaLavorazione(oggi)) return "no";
  const l = await db.lavorazione.create({ data: { leadId } });
  await avanzaMappata(l.id, undefined, oggi);
  return "entrata";
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
    // v3.87: con chi decide noto si scrive subito a lui, citando chi avete in comune (non il membro "di zona",
    // che non è detto lo conosca). Il ponte resta come aiuto, non come passaggio obbligato.
    if ((s[0].strada === "BNI" || s[0].strada === "CERCHIA") && s[0].decisore) {
      await db.lavorazione.update({ where: { id: l.id }, data: { strada: "DIRETTO" } });
      return creaMessaggio(l.id, "DIRETTO", oggi, s[0].zona ? null : s[0].nome);
    }
    return creaMessaggio(l.id, s[0].strada === "BNI" || s[0].strada === "CERCHIA" ? "PONTE" : "DIRETTO", oggi);
  }
  // C'è un ponte valido ma è occupato: si aspetta che si liberi.
  if (strade(d, c, provatiDi(l.pontiProvati)).length) {
    if (l.strada !== "IN_ATTESA_PONTE") await db.lavorazione.update({ where: { id: l.id }, data: { strada: "IN_ATTESA_PONTE" } });
    return false;
  }
  const strada = nomiDaConfermare(d, c, provatiDi(l.pontiProvati)).length ? "DA_CONFERMARE" : "SCALDARE";
  if (l.strada !== strada || !l.decisore) await db.lavorazione.update({ where: { id: l.id }, data: { strada, decisore: l.decisore ?? d.decisori[0]?.nome ?? null } });
  // Chi decide non si sa: si scrive alla pagina per arrivare a lui (e intanto si commenta).
  if (!d.decisori.length) return messaggioAllaPagina(l.leadId, oggi);
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
    motivo: { type: "string", description: "Una o due frasi in PRIMA PERSONA (parla Alessio: \"Ho aiutato…\"), dal caso studio, SENZA nominare il cliente del caso" },
  },
  required: ["motivo"],
};

/** Il motivo nel messaggio, dal caso studio dell'azienda. Il cliente del caso non si cita per iscritto. */
async function motivoDalCaso(leadId: string, oggi: Date): Promise<string | null> {
  const l = await db.lead.findUnique({
    where: { id: leadId },
    select: { name: true, category: true, ritrovamenti: { take: 5, orderBy: { createdAt: "asc" }, select: { chiave: { select: { casoStudio: { select: { storia: true, settore: true, aziendaNome: true } } } } } } },
  });
  // Il caso della ricerca che l'ha trovata; se arriva da altre strade (rete di un membro, LinkedIn), il caso attivo
  // dello stesso settore (v3.87: Centro Piscine e Macciocco partivano senza caso studio nel messaggio).
  let caso = l?.ritrovamenti.map((r) => r.chiave.casoStudio).find((c) => c?.storia) ?? null;
  if (l && !caso) {
    const testo = norm(`${l.category ?? ""} ${l.name}`);
    const casi = await db.casoStudio.findMany({ where: { stato: "ATTIVO", storia: { not: null } }, select: { storia: true, settore: true, aziendaNome: true } });
    caso = casi.find((c) => norm(c.settore).split(/\s+/).some((w) => w.length >= 5 && testo.includes(w.slice(0, -1)))) ?? null;
  }
  if (!l || !caso?.storia || !(await budgetDisponibile(oggi)).ok) return null;
  try {
    const ai = await chiediJSON<RispostaMotivo>({
      sistema: `${REGOLE_COMUNI}\n\nScrivi il motivo concreto per cui un'azienda dovrebbe ascoltare Alessio Loi (Karalisweb, web e marketing digitale), partendo dal caso studio. REGOLA: il cliente del caso NON si nomina mai per iscritto (lo racconta Alessio a voce): descrivilo come "un'azienda che …" con il mestiere e la zona. Una o due frasi, tono semplice, niente promesse vaghe, nessun numero che non sia nel caso. Scrivi in PRIMA PERSONA, perché il messaggio lo firma Alessio: "Ho aiutato un'azienda che…", mai "Alessio Loi ha aiutato" né "Karalisweb ha aiutato".`,
      testo: `AZIENDA DA CONTATTARE: ${l.name}${l.category ? ` (${l.category})` : ""}\nCLIENTE DEL CASO (da NON nominare): ${caso.aziendaNome ?? ""}\nSETTORE DEL CASO: ${caso.settore ?? ""}\nSTORIA DEL CASO:\n${caso.storia}`,
      schema: SCHEMA_MOTIVO,
    });
    // Rete di sicurezza: il messaggio lo firma Alessio, quindi niente terza persona (v3.87).
    let motivo = ai.dati.motivo.trim().replace(/^(Alessio Loi|Alessio|Karalisweb|karalisweb)\s+ha\s+/i, "Ho ");
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

/**
 * Come scrivere direttamente a chi decide (v3.87): il suo LinkedIn se l'abbiamo, e dal sito dell'azienda il WhatsApp
 * (link wa.me) e la mail; il telefono dell'azienda per chiamare. Senza sito, solo quello che c'è già nel CRM.
 */
export async function canaleDiretto(leadId: string, decisore: string): Promise<{ whatsapp: string | null; email: string | null; telefono: string | null; linkedin: string | null }> {
  const [lead, persona, contatto] = await Promise.all([
    db.lead.findUnique({ where: { id: leadId }, select: { website: true, phone: true, email: true } }),
    db.persona.findFirst({ where: { leadId, nome: decisore }, select: { linkedinUrl: true } }),
    db.agentReport.findFirst({ where: { leadId, agent: "contatto" }, orderBy: { collectedAt: "desc" }, select: { findings: true } }),
  ]);
  let whatsapp: string | null = null;
  let email = lead?.email ?? null;
  if (lead?.website) {
    const pagine = [lead.website, (contatto?.findings as { paginaContatti?: string } | null)?.paginaContatti].filter((u): u is string => !!u);
    for (const url of pagine) {
      if (whatsapp && email) break;
      try {
        const html = (await scaricaPagina(url)).html;
        whatsapp ??= extractWhatsAppNumber(html);
        email ??= extractContactEmail(html, new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, ""));
      } catch {
        // Sito che non risponde: si va con quello che c'è.
      }
    }
  }
  // Un cellulare dell'azienda (3…) vale anche per WhatsApp.
  const tel = lead?.phone ?? null;
  if (!whatsapp && tel && /^(\+?39)?\s*3/.test(tel.replace(/[^\d+]/g, ""))) whatsapp = normalizePhoneForWhatsApp(tel);
  return { whatsapp, email, telefono: tel, linkedin: persona?.linkedinUrl ?? null };
}

/** Il messaggio in Cassetta per una lavorazione: al ponte, a chi decide, o il promemoria. Una volta sola per tipo e ponte. */
export async function creaMessaggio(lavorazioneId: string, tipo: "PONTE" | "DIRETTO" | "PROMEMORIA", oggi = new Date(), inComune?: string | null): Promise<boolean> {
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
  // Contatto diretto via ponte (v3.87): a chi decide, con chi avete in comune, sui suoi canali.
  const viaPonte = tipo === "DIRETTO" && inComune !== undefined;
  const canale = viaPonte ? await canaleDiretto(l.leadId, decisore) : null;
  const messaggio =
    tipo === "PONTE" ? testoRichiestaPonte(l.ponteNome, decisore, l.lead.name, motivo)
    : viaPonte ? testoDirettoConPonte(decisore, l.lead.name, inComune ?? null, motivo)
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
        ...(canale
          ? { canale: canale.whatsapp ? "whatsapp" : canale.email ? "email" : "linkedin", telefono: canale.whatsapp, email: canale.email, chiamare: canale.telefono, linkedin: canale.linkedin, inComune: inComune ?? null }
          : { canale: membro?.phone ? "whatsapp" : "linkedin", telefono: membro?.phone ?? null, linkedin: membro?.linkedinUrl ?? profiloDecisore }),
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
  // Un commento fatto: si conta; al 5° parte il contatto diretto.
  if (v.kind === KIND_COMMENTO) {
    const leadId = (await db.approvalItem.findUnique({ where: { id: voceId }, select: { leadId: true } }))?.leadId;
    if (decisione === "APPROVATO" && leadId) await dopoCommento(leadId);
    return;
  }
  if (v.kind === KIND_RETE_CONTATTO || v.kind === KIND_RETE_PAGINA) {
    const leadId = (await db.approvalItem.findUnique({ where: { id: voceId }, select: { leadId: true } }))?.leadId;
    if (decisione === "APPROVATO" && leadId && v.kind === KIND_RETE_CONTATTO) {
      await db.lavorazione.updateMany({ where: { leadId, fase: { in: ["MAPPATA", "PONTE_SCELTO"] } }, data: { fase: "CHIESTA", strada: "SCALDATO", chiestaAt: new Date(), scaldataAt: new Date() } });
    }
    return;
  }
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

/** Giri "scalda" al giorno: alle 7 e alle 14, tutti i giorni (v3.80, Alessio: "accelerare ed evitare blocchi da mie
 *  assenze"; prima uno solo, nei feriali: segnando "Commentato" dopo le 7 si perdeva la giornata, e il weekend era fermo). */
const GIRI_SCALDA_AL_GIORNO = 3; // v3.82: tre giri (6:45, 14:45, 18:15)

async function accodaScalda(oggi: Date): Promise<boolean> {
  const mezzanotte = mezzanotteRoma(oggi);
  if (await db.agentRun.findFirst({ where: { agent: "scalda", status: { in: ["IN_CODA", "IN_CORSO"] } }, select: { id: true } })) return false;
  if ((await db.agentRun.count({ where: { agent: "scalda", queuedAt: { gte: mezzanotte } } })) >= GIRI_SCALDA_AL_GIORNO) return false;
  const lav = await db.lavorazione.findMany({
    where: { fase: { in: [...FASI_ATTIVE] }, scaldataAt: null },
    orderBy: { updatedAt: "asc" },
    include: { lead: { select: { id: true, name: true, address: true } } },
    take: 40,
  });
  // Prima chi non ha altre strade (da scaldare), poi chi aspetta la presentazione.
  lav.sort((a, b) => Number(b.strada === "SCALDARE") - Number(a.strada === "SCALDARE"));
  // LinkedIn fermo (budget o stop di 48 ore): si commenta su Facebook e Instagram, non si ferma tutto
  // (2026-10-29: una sola azienda con la sola pagina LinkedIn bloccava il lavoro di tutte).
  const linkedinOk = await linkedinPermette("scalda", { aziende: [] }, oggi);
  const aziende = [];
  for (const l of lav) {
    if (aziende.length >= DECISORI_DA_SCALDARE) break;
    // Un commento al giorno per azienda: se quello di ieri aspetta ancora Alessio, non se ne aggiunge un altro.
    if (await db.approvalItem.findFirst({ where: { leadId: l.leadId, kind: KIND_COMMENTO, status: "IN_ATTESA" }, select: { id: true } })) continue;
    // E uno solo al giorno per azienda, anche con due giri: non deve sembrare spam.
    if (await db.approvalItem.findFirst({ where: { leadId: l.leadId, kind: KIND_COMMENTO, createdAt: { gte: mezzanotte } }, select: { id: true } })) continue;
    const fattiQui = await commentiDi(l.leadId);
    const giaFatti = piattaformaPiuCommentata(fattiQui);
    if ((giaFatti?.fatti ?? 0) >= COMMENTI_PER_CONTATTO) {
      // Commenti già bastanti (anche perché da 7 sono scesi a 5): il contatto va in Cassetta, se non c'è.
      await dopoCommento(l.leadId, oggi);
      continue;
    }
    const tutte = await pagineAzienda(l.leadId);
    const pagine = linkedinOk ? tutte : tutte.filter((p) => p.piattaforma !== "linkedin");
    if (!pagine.length) continue;
    // I commenti vanno sulla stessa piattaforma: si resta dove si è già cominciato (se è LinkedIn fermo, si aspetta).
    if (giaFatti && !linkedinOk && giaFatti.piattaforma === "linkedin" && tutte.some((p) => p.piattaforma === "linkedin")) continue;
    const iniziata = giaFatti && pagine.some((p) => p.piattaforma === giaFatti.piattaforma) ? giaFatti.piattaforma : null;
    const piattaforma = iniziata ?? (await piattaformaScelta(l.leadId, pagine, oggi)) ?? pagine[0].piattaforma;
    const pagina = pagine.find((p) => p.piattaforma === piattaforma) ?? pagine[0];
    const giaCommentati = fattiQui.map((c) => c.post).filter((x): x is string => typeof x === "string");
    aziende.push({ leadId: l.leadId, azienda: l.lead.name, citta: l.lead.address, decisore: l.decisore, piattaforma: pagina.piattaforma, pagina: pagina.url, giaCommentati });
  }
  if (!aziende.length) return false;
  const input = { aziende };
  await db.agentRun.create({ data: { agent: "scalda", status: "IN_CODA", input } });
  return true;
}

/** Il referto del lavoro "scalda": fino a 10 commenti in Cassetta, e chi ha già dato un segnale diventa "scaldato". */
export async function importaScalda(findings: Record<string, unknown>): Promise<{ commenti: number; scaldate: number }> {
  const e = { commenti: 0, scaldate: 0 };
  const commenti = Array.isArray(findings.commenti) ? (findings.commenti as Record<string, unknown>[]) : [];
  for (const c of commenti) {
    if (e.commenti >= COMMENTI_AL_GIORNO) break;
    const leadId = str(c.leadId);
    const commento = str(c.commento);
    const post = str(c.post);
    const piattaforma = piattaformaDi(post);
    if (!leadId || !commento || !post || !piattaforma) continue;
    const lead = await db.lead.findUnique({ where: { id: leadId }, select: { name: true } });
    if (!lead) continue;
    // Mai due volte lo stesso post (ora si commentano anche i post precedenti).
    if (await db.approvalItem.findFirst({ where: { leadId, kind: KIND_COMMENTO, status: { in: ["IN_ATTESA", "APPROVATO"] }, payload: { path: ["post"], equals: post } }, select: { id: true } })) continue;
    const fatti = await commentiFatti(leadId, piattaforma);
    // v3.88: il commento l'ha già pubblicato l'agente (autonomia): conta subito, e al 3° parte il contatto.
    const pubblicato = c.pubblicato === true;
    await db.approvalItem.create({
      data: {
        leadId,
        kind: KIND_COMMENTO,
        agent: "scalda",
        title: `${pubblicato ? "Commentato" : "Commenta"} il post di ${lead.name} su ${NOMI[piattaforma]} (${fatti + 1}° di ${COMMENTI_PER_CONTATTO})`,
        payload: { post, piattaforma, estratto: str(c.estratto)?.slice(0, 400) ?? null, commento: commento.slice(0, 600), decisore: str(c.decisore), pubblicato } as Prisma.InputJsonValue,
        ...(pubblicato ? { status: "APPROVATO" as const, decidedAt: new Date(), decidedBy: "crm_auto", note: "Pubblicato dal CRM" } : {}),
      },
    });
    if (pubblicato) await dopoCommento(leadId);
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

// ─── Entrare in relazione: le pagine, i commenti, il contatto al 5° (Alessio, 2026-10-25) ──────

const NOMI: Record<Piattaforma, string> = { facebook: "Facebook", instagram: "Instagram", linkedin: "LinkedIn" };
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/**
 * Le pagine dell'azienda sulle tre piattaforme, con quanto pubblicano: dai referti di Social, Instagram e
 * LinkedIn azienda; i link trovati da Alessio valgono sopra tutto.
 */
export async function pagineAzienda(leadId: string): Promise<PaginaSocial[]> {
  const referti = await db.agentReport.findMany({
    where: { leadId, agent: { in: ["social", "instagram", "linkedin_azienda", "alessio"] } },
    orderBy: { collectedAt: "desc" },
    distinct: ["agent"],
    select: { agent: true, findings: true },
  });
  const f = (a: string) => (referti.find((r) => r.agent === a)?.findings ?? {}) as Record<string, unknown>;
  const social = f("social");
  const ig = f("instagram");
  const li = f("linkedin_azienda");
  const diAlessio = noteDaReferti(referti.map((r) => ({ agent: r.agent, findings: r.findings as Record<string, unknown> }))).social;
  const pagine: PaginaSocial[] = [];
  const fb = diAlessio.facebook ?? str(social.facebook);
  if (fb) pagine.push({ piattaforma: "facebook", url: fb, postUltimi3Mesi: num(social.post_ultimi_3_mesi), ultimoPost: str(social.ultimo_post) });
  const insta = diAlessio.instagram ?? (ig.esiste !== false ? str(ig.url) : null) ?? str(social.instagram);
  if (insta) pagine.push({ piattaforma: "instagram", url: insta, postUltimi3Mesi: num(ig.postUltimi3Mesi), ultimoPost: str(ig.ultimoPost) });
  const linked = diAlessio.linkedin ?? (li.esiste !== false ? str(li.url) : null) ?? str(social.linkedin);
  if (linked) pagine.push({ piattaforma: "linkedin", url: linked, postUltimi3Mesi: num(li.postUltimi3Mesi), ultimoPost: str(li.ultimoPost) });
  return pagine;
}

/** Dove commentare: la scelta di Alessio se l'ha fatta, altrimenti la pagina viva che pubblica di più. */
export async function piattaformaScelta(leadId: string, pagine?: PaginaSocial[], oggi = new Date()): Promise<Piattaforma | null> {
  const r = await db.agentReport.findFirst({ where: { leadId, agent: "alessio" }, orderBy: { collectedAt: "desc" }, select: { findings: true } });
  const scelta = (r?.findings as { piattaforma?: string } | null)?.piattaforma;
  const p = pagine ?? (await pagineAzienda(leadId));
  if (scelta && (PIATTAFORME as readonly string[]).includes(scelta) && p.some((x) => x.piattaforma === scelta)) return scelta as Piattaforma;
  return piattaformaConsigliata(p, oggi);
}

/** I commenti fatti da Alessio sulle pagine di quest'azienda (proposti e segnati "Commentato", o segnati da lui). */
async function commentiDi(leadId: string): Promise<{ piattaforma?: unknown; post?: unknown }[]> {
  const fatti = await db.approvalItem.findMany({ where: { leadId, kind: KIND_COMMENTO, status: "APPROVATO" }, select: { payload: true } });
  return fatti.map((f) => (f.payload ?? {}) as { piattaforma?: unknown; post?: unknown });
}

/**
 * Quanti commenti contano per il contatto: quelli sulla piattaforma indicata, o sulla più commentata. Si
 * contano per piattaforma, non sommati (Alessio, 2026-10-27): il contatto parte al 5° sulla stessa.
 */
export async function commentiFatti(leadId: string, piattaforma?: Piattaforma): Promise<number> {
  const tutti = await commentiDi(leadId);
  if (piattaforma) return tutti.filter((c) => piattaformaPiuCommentata([c])?.piattaforma === piattaforma).length;
  return piattaformaPiuCommentata(tutti)?.fatti ?? 0;
}

/** "Ho commentato" dalla scheda: un commento fatto da Alessio da solo, che conta come gli altri. */
export async function segnaCommento(leadId: string, piattaforma: Piattaforma): Promise<{ fatti: number; contatto: boolean }> {
  const lead = await db.lead.findUnique({ where: { id: leadId }, select: { name: true } });
  if (!lead) throw new Error("Azienda non trovata");
  await db.approvalItem.create({
    data: {
      leadId,
      kind: KIND_COMMENTO,
      agent: "alessio",
      title: `Commento su ${NOMI[piattaforma]} a ${lead.name}`,
      status: "APPROVATO",
      decidedAt: new Date(),
      note: "Segnato dalla scheda",
      payload: { piattaforma, manuale: true } as Prisma.InputJsonValue,
    },
  });
  const contatto = await dopoCommento(leadId);
  return { fatti: await commentiFatti(leadId), contatto };
}

/** Dopo ogni commento: al 5° il contatto diretto va in Cassetta (una volta sola). */
export async function dopoCommento(leadId: string, oggi = new Date()): Promise<boolean> {
  if ((await commentiFatti(leadId)) < COMMENTI_PER_CONTATTO) return false;
  const gia = await db.approvalItem.findFirst({ where: { leadId, kind: KIND_RETE_CONTATTO }, select: { id: true } });
  if (gia) return false;
  const lead = await db.lead.findUnique({ where: { id: leadId }, select: { name: true, phone: true, email: true } });
  if (!lead) return false;
  const d = await datiAzienda(leadId);
  const decisore = d.decisori[0]?.nome ?? null;
  const profili = await profiliDecisore(leadId);
  // La piattaforma dove Alessio ha commentato 7 volte: è lì che l'azienda l'ha visto.
  const piattaforma = piattaformaPiuCommentata(await commentiDi(leadId))?.piattaforma ?? (await piattaformaScelta(leadId, undefined, oggi));
  const motivo = await motivoDalCaso(leadId, oggi);
  await db.approvalItem.create({
    data: {
      leadId,
      kind: KIND_RETE_CONTATTO,
      agent: "rete",
      title: `${COMMENTI_PER_CONTATTO} commenti fatti: scrivi a ${decisore ? chiDecideTesto(decisore, lead.name) : lead.name}`,
      payload: {
        decisore,
        azienda: lead.name,
        messaggio: testoContattoDopoCommenti(decisore, lead.name, piattaforma, motivo),
        telefono: lead.phone,
        email: lead.email,
        linkedin: profili.linkedin,
        facebook: profili.facebook,
        instagram: profili.instagram,
        motivoDalCaso: !!motivo,
      } as Prisma.InputJsonValue,
    },
  });
  return true;
}

/** Chi decide non si sa: il messaggio privato alla pagina, una volta sola per azienda. */
export async function messaggioAllaPagina(leadId: string, oggi = new Date()): Promise<boolean> {
  const gia = await db.approvalItem.findFirst({ where: { leadId, kind: KIND_RETE_PAGINA }, select: { id: true } });
  if (gia) return false;
  const pagine = await pagineAzienda(leadId);
  if (!pagine.length) return false;
  const lead = await db.lead.findUnique({ where: { id: leadId }, select: { name: true } });
  if (!lead) return false;
  const piattaforma = (await piattaformaScelta(leadId, pagine, oggi)) ?? pagine[0].piattaforma;
  const pagina = pagine.find((p) => p.piattaforma === piattaforma) ?? pagine[0];
  await db.approvalItem.create({
    data: {
      leadId,
      kind: KIND_RETE_PAGINA,
      agent: "rete",
      title: `Non si sa chi decide in ${lead.name}: scrivi alla pagina ${NOMI[pagina.piattaforma]}`,
      payload: { azienda: lead.name, piattaforma: pagina.piattaforma, pagina: pagina.url, messaggio: testoMessaggioPagina(lead.name, await motivoDalCaso(leadId, oggi)) } as Prisma.InputJsonValue,
    },
  });
  return true;
}

/** I profili di chi decide sulle tre piattaforme (dall'agente Chi decide; il LinkedIn anche dalle persone salvate). */
export async function profiliDecisore(leadId: string): Promise<{ nome: string | null; ruolo: string | null; linkedin: string | null; facebook: string | null; instagram: string | null; amiciFacebook: string[] }> {
  const r = await db.agentReport.findFirst({ where: { leadId, agent: "decision_maker" }, orderBy: { collectedAt: "desc" }, select: { findings: true } });
  const p = ((r?.findings as { persone?: unknown } | null)?.persone as Record<string, unknown>[] | undefined)?.[0] ?? {};
  const nome = str(p.nome);
  const salvata = nome ? await db.persona.findFirst({ where: { leadId, nome }, select: { linkedinUrl: true } }) : null;
  return {
    nome,
    ruolo: str(p.ruolo),
    linkedin: salvata?.linkedinUrl ?? (piattaformaDi(str(p.profilo)) === "linkedin" ? str(p.profilo) : null),
    facebook: str(p.profiloFacebook),
    instagram: str(p.profiloInstagram),
    amiciFacebook: (Array.isArray(p.amiciInComuneFacebook) ? p.amiciInComuneFacebook : []).map((x) => (typeof x === "string" ? x : str((x as { nome?: unknown })?.nome))).filter((x): x is string => !!x).slice(0, 30),
  };
}
