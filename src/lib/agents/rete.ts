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
import { casoDaColleghi, trovataDaColleghi } from "@/lib/concorrenti";
import { chiediJSON, REGOLE_COMUNI, type Schema } from "./ai";
import { budgetDisponibile } from "./costi";
import { KIND_FASCICOLO_BASE } from "./turno";
import { mezzanotteRoma, norm } from "./bni-regole";
import { indirizzoSardo, linkedinPermette, mandaAScaldare, verificaCollegamento } from "./motore";
import {
  canaleDallaNota, testoCambioCanale, type ContattoManuale,
  FASI_ATTIVE, GIORNI_PAUSA, pubblicaDa, stradaContatto, capienzaLavorazione, chiDecideTesto, forzaAzienda, prossimaAzione,
  testoContattoDiretto, testoDirettoConPonte, testoFollowupContatto, testoPromemoria, testoRichiestaPonte, type DatiAzienda, type Ponte,
  COMMENTI_PER_CONTATTO, PIATTAFORME, paginaPreferita, piattaformaConsigliata, piattaformaDi, piattaformaPiuCommentata, testoContattoDopoCommenti, testoMessaggioPagina,
  type PaginaSocial, type Piattaforma, STRADA_COLLEGARE, STRADA_SCALDARE, nellaCerchia, piattaformaPersona, stessaPersona,
} from "./rete-regole";
import { noteDaReferti } from "./impressioni-sezioni";
import { scaricaPagina } from "./pagina";
import { AGENTE_SERVER, cercaChiDecideServer } from "./chi-decide-server";
import { extractWhatsAppNumber, normalizePhoneForWhatsApp } from "@/lib/audit/whatsapp-extractor";
import { extractContactEmail, extractEmails } from "@/lib/audit/email-finder";
import { pontiInZona } from "./presentazioni";

export const KIND_RETE_PONTE = "RETE_PONTE";
export const KIND_RETE_DIRETTO = "RETE_DIRETTO";
export const KIND_RETE_PROMEMORIA = "RETE_PROMEMORIA";
// Il nome resta per i commenti già in Cassetta: dal 2026-10-25 vale per le pagine Facebook, Instagram e LinkedIn.
export const KIND_COMMENTO = "COMMENTO_LINKEDIN";
/** Al 5° commento: il contatto diretto (WhatsApp, mail o telefono). */
export const KIND_RETE_CONTATTO = "RETE_CONTATTO";
/** Chi decide non si trova: il messaggio privato alla pagina per arrivare a lui. */
export const KIND_RETE_PAGINA = "RETE_PAGINA";
/** v3.103: il follow-up a chi decide che non ha risposto al contatto. */
export const KIND_RETE_FOLLOWUP = "RETE_FOLLOWUP";
/** v3.116: ha risposto e vuole il caso studio: il messaggio con il PDF. */
export const KIND_RETE_CASO = "RETE_CASO_STUDIO";
/** v3.124: una mail di risposta letta dalla casella: "Ti ha risposto". */
export const KIND_RETE_RISPOSTA = "RETE_RISPOSTA";
const KIND_MESSAGGI_A_CHI_DECIDE = [KIND_RETE_DIRETTO, KIND_RETE_CONTATTO, KIND_RETE_PAGINA, KIND_RETE_FOLLOWUP, KIND_RETE_CASO];
export const KINDS_RETE = [KIND_RETE_PONTE, KIND_RETE_DIRETTO, KIND_RETE_PROMEMORIA, KIND_COMMENTO, KIND_RETE_CONTATTO, KIND_RETE_PAGINA, KIND_RETE_FOLLOWUP, KIND_RETE_CASO, KIND_RETE_RISPOSTA];

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
  collegamentiAccodati: number;
  riallineate: number;
  attive: number;
  capienza: number;
}

/** Il turno della rete: rientri, nuove entrate fino alla capienza, il seguito, i commenti. */
export async function turnoRete(oggi = new Date()): Promise<RiepilogoRete> {
  const r: RiepilogoRete = { entrate: 0, scartate: 0, messaggi: 0, promemoria: 0, cambiPonte: 0, inPausa: 0, rientrate: 0, scaldaAccodato: false, daScaldareAggiunte: 0, pagineFerme: 0, contattiAccodati: 0, collegamentiAccodati: 0, riallineate: 0, attive: 0, capienza: capienzaLavorazione(oggi) };
  const cerchia = await cerchiaNomi();
  // 0) v3.117: le aziende rimaste sulla strada vecchia (ponti, pagine) passano alla relazione diretta.
  r.riallineate = await riallineaRelazioneDiretta(cerchia);

  // 1) Il seguito e i rientri dalla pausa.
  const tutte = await db.lavorazione.findMany({ where: { fase: { in: [...FASI_ATTIVE, "PAUSA"] } } });
  // v3.124: chi ha risposto non riceve follow-up né va in pausa finché Alessio non ha letto.
  const conRisposta = new Set((await db.approvalItem.findMany({ where: { kind: KIND_RETE_RISPOSTA, status: "IN_ATTESA" }, select: { leadId: true } })).map((v) => v.leadId));
  for (const l of tutte) {
    if (conRisposta.has(l.leadId)) continue;
    const azione = prossimaAzione(l, oggi);
    if (azione === "RIENTRA") {
      await db.lavorazione.update({ where: { id: l.id }, data: { fase: "MAPPATA", tentativi: 0, pausaFino: null, ponteNome: null, ponteMembroId: null, strada: null, chiestaAt: null, promemoriaAt: null } });
      // v3.117: era in pausa perché chi decide non si trovava: si ricerca adesso.
      if (l.note?.startsWith(NOTA_SENZA_CHI_DECIDE)) await ricercaChiDecide(l.leadId, oggi);
      r.rientrate++;
    } else if (azione === "PROMEMORIA") {
      // v3.103: senza ponte (contatto diretto a chi decide) il promemoria è il follow-up a lui.
      if (await (contattoDiretto(l) ? creaFollowup(l.id) : creaMessaggio(l.id, "PROMEMORIA", oggi))) r.promemoria++;
    } else if (azione === "CAMBIA_PONTE" && contattoDiretto(l)) {
      // Nessun ponte da cambiare: senza risposta nemmeno al follow-up, l'azienda va in pausa (torna fra 3 mesi).
      if (l.promemoriaAt) {
        await mettiInPausa(l.id, "Nessuna risposta al contatto né al follow-up");
        r.inPausa++;
      } else if (await creaFollowup(l.id)) r.promemoria++;
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
  for (const c of controllate) if (await scartaSenzaStrade(c.id, oggi)) r.scartate++;

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
      // v3.117: senza chi decide non entra (la mette in pausa il punto 1b).
      if (!d.decisori.length) continue;
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
  // 2b) v3.90: i messaggi di contatto ancora da mandare si riscrivono col caso studio e i canali trovati meglio.
  await aggiornaTestiContatto(oggi).catch(() => 0);
  await aggiornaCanaliPagina().catch(() => 0);

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

  // 3b) v3.117: il collegamento con chi decide (LinkedIn + Instagram), lo manda il Mac.
  r.collegamentiAccodati = await accodaCollega(oggi);
  // 4) Scaldare chi decide: fino a 3 lavori al giorno, dentro il budget LinkedIn.
  r.scaldaAccodato = await accodaScalda(oggi);
  // 5) I messaggi a chi decide li manda il Mac su LinkedIn (v3.88).
  r.contattiAccodati = await accodaContatti(oggi);
  return r;
}

/** Nota sulle voci chiuse dal riallineamento del 2026-11-06. */
const NOTA_RIALLINEAMENTO = "Superata: dal 2026-11-06 niente presentazioni né contatti in comune, prima il collegamento e i commenti ai post di chi decide (v3.117)";
const STRADE_PONTE = ["BNI", "CERCHIA", "DIRETTO", "DA_CONFERMARE", "IN_ATTESA_PONTE"];

/**
 * v3.119 (Alessio, 2026-11-08: "Sì, rimettile"): col giro vecchio il Mac mandava a chi decide solo la richiesta di
 * collegamento (con la nota "Abbiamo in comune…" o senza nota) e l'azienda finiva in "Aspetti la risposta" senza aver mai
 * ricevuto il messaggio col caso studio. Sono "solo invito" se tutto quello che risulta mandato è un invito del Mac sulla
 * voce vecchia (RETE_DIRETTO): ripartono dal collegamento. Il giro nuovo usa RETE_CONTATTO, quindi non rimbalzano.
 */
const NOTA_SOLO_INVITO = "Mandata solo la richiesta di collegamento su LinkedIn, nessun messaggio: si riparte dal collegamento (v3.119)";
const INVITO_DEL_MAC = /^Richiesta di collegamento .*su LinkedIn dal CRM$/;
export function soloInvito(mandati: { kind: string; note: string | null }[]): boolean {
  return mandati.length > 0 && mandati.every((m) => m.kind === KIND_RETE_DIRETTO && INVITO_DEL_MAC.test(m.note ?? ""));
}
async function haSoloInvito(leadId: string): Promise<boolean> {
  const mandati = await db.approvalItem.findMany({
    where: { leadId, kind: { in: [KIND_RETE_DIRETTO, KIND_RETE_CONTATTO, KIND_RETE_PAGINA, KIND_RETE_FOLLOWUP, KIND_RETE_CASO] }, status: "APPROVATO" },
    select: { kind: true, note: true },
  });
  return soloInvito(mandati);
}

/**
 * v3.117 (Alessio, 2026-11-06: "prendi tutte le aziende del Percorso e allinea a questa nuova procedura"). Idempotente:
 * tocca solo quello che è rimasto sulla strada vecchia, quindi si può rifare a ogni giro.
 *   - messaggi non ancora mandati (al ponte, promemoria, contatto dopo i commenti alla pagina, "scrivi all'azienda"):
 *     si chiudono, tranne quelli a chi decide che Alessio conosce (cerchia);
 *   - le aziende ferme su un ponte o sui commenti alla pagina tornano "mappate": il giro le porta al collegamento con chi
 *     decide (o in pausa se chi decide non si sa);
 *   - i lavori del Mac ancora in coda col formato vecchio (commenti alle pagine, messaggi chiusi) si tolgono.
 * Restano come sono le aziende già contattate (si aspetta la risposta, follow-up, caso studio).
 */
export async function riallineaRelazioneDiretta(cerchia: string[]): Promise<number> {
  const ora = new Date();
  const chiudi = (where: Prisma.ApprovalItemWhereInput) => db.approvalItem.updateMany({ where: { ...where, status: "IN_ATTESA" }, data: { status: "SCARTATO", decidedAt: ora, decidedBy: "rete", note: NOTA_RIALLINEAMENTO } });
  const daRiportare = new Set<string>();

  // Messaggi vecchi non ancora mandati.
  const voci = await db.approvalItem.findMany({ where: { kind: { in: [KIND_RETE_PONTE, KIND_RETE_PROMEMORIA, KIND_RETE_DIRETTO, KIND_RETE_CONTATTO, KIND_RETE_PAGINA] }, status: "IN_ATTESA", leadId: { not: null } }, select: { id: true, kind: true, leadId: true, payload: true } });
  for (const v of voci) {
    const p = (v.payload ?? {}) as { relazioneDiretta?: unknown; decisore?: unknown };
    if (p.relazioneDiretta === true) continue;
    const decisore = typeof p.decisore === "string" ? p.decisore : null;
    // Lo conosce Alessio: il messaggio diretto resta.
    if (v.kind === KIND_RETE_DIRETTO && decisore && nellaCerchia(decisore, cerchia) && !("inComune" in (v.payload as object ?? {}))) continue;
    await chiudi({ id: v.id });
    daRiportare.add(v.leadId!);
  }

  // Lavorazioni sulla strada vecchia.
  const lav = await db.lavorazione.findMany({ where: { fase: { in: ["MAPPATA", "PONTE_SCELTO", "CHIESTA"] } }, select: { id: true, leadId: true, fase: true, strada: true, decisore: true, presentatoAt: true } });
  for (const l of lav) {
    const conPonte = l.strada === "BNI" || l.strada === "CERCHIA";
    // v3.119: "contattate" solo con l'invito LinkedIn: non restano ad aspettare una risposta a un messaggio mai mandato.
    const invitoSolo = l.fase === "CHIESTA" && !conPonte && (await haSoloInvito(l.leadId));
    // Già contattate (aspetti la risposta / follow-up / caso studio) o presentate: restano.
    if (l.fase === "CHIESTA" && !(conPonte && !l.presentatoAt) && !invitoSolo) continue;
    let riporta = daRiportare.has(l.leadId) || invitoSolo;
    if (l.fase === "PONTE_SCELTO" || (l.fase === "CHIESTA" && conPonte)) riporta = true;
    if (l.fase === "MAPPATA" && (l.strada === null || STRADE_PONTE.includes(l.strada))) riporta = true;
    // Ai commenti senza aver mai chiesto il collegamento (la strada vecchia, commenti alla pagina): si riparte da lì.
    if (l.fase === "MAPPATA" && l.strada === STRADA_SCALDARE && !(await db.agentRun.findFirst({ where: { leadId: l.leadId, agent: "collega" }, select: { id: true } }))) {
      const [nuovi, contatto] = await Promise.all([
        db.approvalItem.count({ where: { leadId: l.leadId, kind: KIND_COMMENTO, status: "APPROVATO", payload: { path: ["persona"], equals: true } } }),
        db.approvalItem.findFirst({ where: { leadId: l.leadId, kind: KIND_RETE_CONTATTO, status: { in: ["IN_ATTESA", "APPROVATO"] } }, select: { id: true } }),
      ]);
      if (!nuovi && !contatto) riporta = true;
    }
    // Chi decide conosciuto da Alessio con il messaggio diretto ancora da mandare: resta.
    if (l.strada === "DIRETTO" && l.decisore && nellaCerchia(l.decisore, cerchia) && (await db.approvalItem.findFirst({ where: { leadId: l.leadId, kind: KIND_RETE_DIRETTO, status: "IN_ATTESA" }, select: { id: true } }))) riporta = false;
    if (!riporta) continue;
    if (l.fase === "MAPPATA" && l.strada === null) continue; // già pronta per il giro
    await db.lavorazione.update({ where: { id: l.id }, data: { fase: "MAPPATA", strada: null, ponteNome: null, ponteMembroId: null, chiestaAt: null, promemoriaAt: null, note: invitoSolo ? NOTA_SOLO_INVITO : "Riallineata alla relazione diretta (v3.117)" } });
    await chiudi({ leadId: l.leadId, kind: { in: [KIND_RETE_PONTE, KIND_RETE_PROMEMORIA] } });
    // Il follow-up direbbe "ti riscrivo per il messaggio di qualche giorno fa": un messaggio che non c'è stato.
    if (invitoSolo) await db.approvalItem.updateMany({ where: { leadId: l.leadId, kind: KIND_RETE_FOLLOWUP, status: "IN_ATTESA" }, data: { status: "SCARTATO", decidedAt: ora, decidedBy: "rete", note: NOTA_SOLO_INVITO } });
    daRiportare.add(l.leadId);
  }

  // Lavori del Mac in coda col formato vecchio: commenti alle pagine e messaggi delle voci chiuse.
  const inCoda = await db.agentRun.findMany({ where: { status: "IN_CODA", agent: { in: ["scalda", "contatta_persona"] } }, select: { id: true, agent: true, input: true, leadId: true } });
  for (const r of inCoda) {
    const input = (r.input ?? {}) as { aziende?: { pagina?: unknown }[]; voceId?: string };
    const vecchio = r.agent === "scalda"
      ? (input.aziende ?? []).some((a) => a && "pagina" in a)
      : !!input.voceId && !!(await db.approvalItem.findFirst({ where: { id: input.voceId, status: "SCARTATO", note: NOTA_RIALLINEAMENTO }, select: { id: true } }));
    if (vecchio) await db.agentRun.update({ where: { id: r.id }, data: { status: "FALLITO", finishedAt: ora, error: "Annullato dal CRM: interrotto per il riallineamento alla relazione diretta (v3.117)" } });
  }
  return daRiportare.size;
}

/** Chi decide è fermo se in 10 giorni "scalda" ha letto i suoi profili almeno 3 volte senza un post da commentare. */
const GIORNI_PAGINA_FERMA = 10;
const LETTURE_PAGINA_FERMA = 3;

/**
 * v3.84: chi non pubblica non resta a scaldare per sempre. v3.117: non va più in pausa: gli si scrive col caso studio
 * (passo 4) con quello che c'è, senza aspettare i commenti.
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
    // v3.117: chi decide non pubblica: non si aspetta, gli si scrive (passo 4) con quello che c'è.
    if (await dopoCommento(l.leadId, oggi, true)) uscite++;
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
  // v3.117: contano anche quelle al collegamento (passo 2): sono la stessa fila verso il contatto.
  const daScaldare = () => db.lavorazione.count({ where: { fase: "MAPPATA", strada: { in: [STRADA_COLLEGARE, STRADA_SCALDARE] } } });
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
    // v3.117: rientrano solo quelle dove chi decide si sa (prima "senza collegamento" voleva dire senza contatti in comune).
    if (!(await datiAzienda(c.leadId)).decisori.length) continue;
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
/**
 * v3.95 (Alessio, 2026-11-05: "dopo due fallimenti, senza segnalarlo, archivialo in un posto"): un messaggio LinkedIn
 * che non è partito per 2 volte non torna più in coda. La voce si chiude in silenzio e finisce in Archivio → Non riusciti,
 * con il motivo dell'ultimo tentativo. Niente avvisi in Oggi né nel report.
 */
export const TENTATIVI_MAX_CONTATTO = 2;
export const ARCHIVIATA_NON_RIUSCITA = "crm_non_riuscito";
/**
 * v3.96 (Alessio, 2026-11-05: "manda senza nota"): i fallimenti di prima non contano. Erano quasi tutti "note
 * personalizzate gratuite finite", e ora l'invito parte senza nota: chi era stato archiviato per quello torna in coda.
 */
const FALLIMENTI_CONTANO_DAL = new Date("2026-11-05T06:30:00Z");

async function ridaiPossibilita(): Promise<void> {
  const archiviate = await db.approvalItem.findMany({ where: { decidedBy: ARCHIVIATA_NON_RIUSCITA, status: "SCARTATO", leadId: { not: null } }, select: { id: true, leadId: true } });
  for (const a of archiviate) {
    const falliti = await db.agentRun.count({ where: { leadId: a.leadId!, agent: "contatta_persona", status: "FALLITO", finishedAt: { gte: FALLIMENTI_CONTANO_DAL } } });
    if (falliti >= TENTATIVI_MAX_CONTATTO) continue;
    await db.approvalItem.update({ where: { id: a.id }, data: { status: "IN_ATTESA", decidedAt: null, decidedBy: null, note: null } });
  }
}

async function archiviaSeNonRiuscito(voceId: string, leadId: string): Promise<boolean> {
  const falliti = await db.agentRun.findMany({
    where: { leadId, agent: "contatta_persona", status: "FALLITO", finishedAt: { gte: FALLIMENTI_CONTANO_DAL } },
    orderBy: { finishedAt: "desc" },
    select: { error: true },
  });
  if (falliti.length < TENTATIVI_MAX_CONTATTO) return false;
  const motivo = (falliti[0]?.error ?? "motivo non indicato").slice(0, 300);
  await db.approvalItem.update({
    where: { id: voceId },
    data: { status: "SCARTATO", decidedAt: new Date(), decidedBy: ARCHIVIATA_NON_RIUSCITA, note: `Non riuscito dopo ${falliti.length} tentativi. Ultimo motivo: ${motivo}` },
  });
  return true;
}

async function accodaContatti(oggi: Date): Promise<number> {
  await ridaiPossibilita();
  const voci = await db.approvalItem.findMany({
    where: { kind: { in: [KIND_RETE_DIRETTO, KIND_RETE_CONTATTO] }, status: "IN_ATTESA", leadId: { not: null } },
    orderBy: { createdAt: "asc" },
    select: { id: true, kind: true, leadId: true, payload: true, createdAt: true, lead: { select: { name: true } } },
    take: 20,
  });
  let accodati = 0;
  for (const v of voci) {
    const p = (v.payload ?? {}) as { linkedin?: string; messaggio?: string; decisore?: string; telefono?: string | null; email?: string | null; contattoManuale?: boolean };
    if (!v.leadId || !p.linkedin || !/linkedin\.com\/in\//i.test(p.linkedin) || !p.messaggio) continue;
    // v3.117 (Alessio: "poi mail o WhatsApp per il caso studio"): con WhatsApp o mail scrive Alessio da lì; LinkedIn
    // solo se non c'è altro (ormai siete collegati: il messaggio, non l'invito).
    if ((v.kind === KIND_RETE_CONTATTO || p.contattoManuale) && (p.telefono || p.email)) continue;
    // v3.119: un invito fatto per una voce vecchia non blocca il messaggio di questa (conta solo quello fatto dopo).
    if (await db.agentRun.findFirst({ where: { leadId: v.leadId, agent: "contatta_persona", OR: [{ status: { in: ["IN_CODA", "IN_CORSO"] } }, { status: "FATTO", queuedAt: { gte: v.createdAt } }] }, select: { id: true } })) continue;
    if (await archiviaSeNonRiuscito(v.id, v.leadId)) continue;
    // v3.99: l'azienda di un membro BNI passa dal 121, non da LinkedIn.
    if (await db.bniMembro.findFirst({ where: { leadId: v.leadId, status: "ATTIVO" }, select: { id: true } })) continue;
    if (!(await linkedinPermette("contatta_persona", null, oggi))) break;
    const decisore = p.decisore && p.decisore !== "chi decide" ? p.decisore : null;
    await db.agentRun.create({
      data: { agent: "contatta_persona", status: "IN_CODA", leadId: v.leadId, input: { voceId: v.id, leadId: v.leadId, persona: decisore, azienda: v.lead?.name ?? null, profilo: p.linkedin, messaggio: p.messaggio } },
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
  await db.approvalItem.update({ where: { id: voce.id }, data: { status: "APPROVATO", decidedAt: new Date(), decidedBy: "crm_auto", note: esito === "MESSAGGIO" ? "Messaggio mandato su LinkedIn dal CRM" : findings.senzaNota === true ? "Richiesta di collegamento senza nota mandata su LinkedIn dal CRM" : "Richiesta di collegamento con nota mandata su LinkedIn dal CRM" } });
  await decisioneRete(voce.id, "APPROVATO");
  await db.activity.create({ data: { leadId, type: "LINKEDIN_SENT", notes: `[Contatto-auto] ${esito === "MESSAGGIO" ? "messaggio LinkedIn a chi decide" : findings.senzaNota === true ? "invito LinkedIn senza nota a chi decide" : "invito LinkedIn con nota a chi decide"}` } }).catch(() => null);
}

/** Chi la scarta da sola: si distingue dalle scelte di Alessio (non conta nelle sue "da validare" di oggi). */
export const SCARTATA_DAL_CRM = "crm";

/**
 * Niente chi decide, nessuno che te la presenta, nessuna pagina social: si scarta e via (Alessio, 2026-10-28).
 * Solo a controlli finiti: chi decide (decision_maker) e i social (agente "social") devono aver già risposto.
 */
/** v3.108 (Alessio, 2026-11-06): un'azienda approfondita non resta ferma più di 48 ore. */
export const ORE_MASSIME_FERMA = 48;

export async function scartaSenzaStrade(leadId: string, oggi = new Date()): Promise<boolean> {
  const voce = await db.approvalItem.findFirst({ where: { leadId, kind: KIND_FASCICOLO_BASE, status: "APPROVATO" }, orderBy: { createdAt: "desc" }, select: { id: true, decidedAt: true } });
  if (!voce) return false;
  const fatti = new Set((await db.agentReport.findMany({ where: { leadId, agent: { in: ["decision_maker", "social"] } }, distinct: ["agent"], select: { agent: true } })).map((f) => f.agent));
  if (!fatti.has("decision_maker")) return false;
  // Se i social non arrivano (lavoro fallito, niente sito) dopo 48 ore si decide con quello che c'è: prima restava
  // "Approfondita: il CRM cerca chi decide" per sempre (Eden Sardegna, Artstone Garden, Sarda Semafori…).
  const scaduta = !!voce.decidedAt && oggi.getTime() - voce.decidedAt.getTime() > ORE_MASSIME_FERMA * 3600_000;
  if (!fatti.has("social") && !scaduta) return false;
  const d = await datiAzienda(leadId);
  if (d.decisori.length) return false;
  // v3.117 (Alessio, 2026-11-06): chi decide non si trova: pausa 3 mesi, poi si ricerca (non si scrive all'azienda).
  if (await db.lavorazione.findUnique({ where: { leadId }, select: { id: true } })) return false;
  const l = await db.lavorazione.create({ data: { leadId } });
  await mettiInPausa(l.id, `${NOTA_SENZA_CHI_DECIDE}: si ricerca fra 3 mesi`);
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
  if (!d.decisori.length) return "no";
  if ((await db.lavorazione.count({ where: { fase: { in: [...FASI_ATTIVE] } } })) >= capienzaLavorazione(oggi)) return "no";
  const l = await db.lavorazione.create({ data: { leadId } });
  await avanzaMappata(l.id, undefined, oggi);
  return "entrata";
}

/** v3.117: chi decide non si trova da nessuna parte: l'azienda va in pausa 3 mesi (poi si ricerca chi decide). */
export const NOTA_SENZA_CHI_DECIDE = "Chi decide non trovato";

/**
 * Un'azienda mappata (v3.117, Alessio 2026-11-06: "chi me la presenta di fatto non serve"):
 *   - chi decide lo conosci tu (cerchia): il messaggio diretto, subito (passo 4);
 *   - chi decide si sa: il CRM chiede il collegamento su LinkedIn e lo segue su Instagram (passo 2), poi i commenti;
 *   - chi decide non si sa: pausa 3 mesi (niente più messaggi alla pagina).
 */
export async function avanzaMappata(lavorazioneId: string, cerchia?: string[], oggi = new Date()): Promise<boolean> {
  const l = await db.lavorazione.findUnique({ where: { id: lavorazioneId } });
  if (!l || l.fase !== "MAPPATA") return false;
  const c = cerchia ?? (await cerchiaNomi());
  const d = await datiAzienda(l.leadId, !!l.scaldataAt);
  const decisore = d.decisori[0]?.nome ?? null;
  if (!decisore) {
    // Si sta ricercando chi decide (rientro dalla pausa): si aspetta il referto.
    if (await db.agentRun.findFirst({ where: { leadId: l.leadId, agent: "decision_maker", status: { in: ["IN_CODA", "IN_CORSO"] } }, select: { id: true } })) return false;
    await mettiInPausa(l.id, `${NOTA_SENZA_CHI_DECIDE}: si ricerca fra 3 mesi`);
    return false;
  }
  const conosciuto = d.decisori.find((x) => nellaCerchia(x.nome, c) && !provatiDi(l.pontiProvati).some((p) => stessaPersona(p, x.nome)));
  if (conosciuto) {
    await scegliPonte(l.id, { strada: "DIRETTO", nome: conosciuto.nome, decisore: conosciuto.nome });
    return creaMessaggio(l.id, "DIRETTO", oggi);
  }
  // v3.123 (Alessio, 2026-11-08: "quando serve il riscaldamento?"): messaggio subito, salvo quando scaldare serve davvero.
  const giaContatto = await db.approvalItem.findFirst({ where: { leadId: l.leadId, kind: KIND_RETE_CONTATTO, status: { in: ["IN_ATTESA", "APPROVATO"] } }, select: { id: true } });
  if (!giaContatto) {
    const [canale, profili, membro, report] = await Promise.all([
      canaleDiretto(l.leadId, decisore),
      profiliDecisore(l.leadId),
      db.bniMembro.findFirst({ where: { OR: [{ leadId: l.leadId }, { name: { equals: decisore, mode: "insensitive" } }], status: "ATTIVO" }, select: { id: true } }),
      db.agentReport.findFirst({ where: { leadId: l.leadId, agent: "decision_maker" }, orderBy: { collectedAt: "desc" }, select: { findings: true } }),
    ]);
    const persona = ((report?.findings as { persone?: Record<string, unknown>[] } | null)?.persone ?? [])[0] ?? {};
    // Le aziende riportate al collegamento (v3.119) ripartono da lì; le altre contano dall'ingresso nel percorso.
    const dal = l.note === NOTA_SOLO_INVITO ? l.updatedAt : l.createdAt;
    const aMano = await contattoManualeDi(l.leadId);
    const strada = aMano?.email || aMano?.whatsapp ? "contatta" : stradaContatto({
      whatsapp: !!canale.whatsapp, email: !!canale.email, emailPersonale: canale.emailPersonale, linkedin: !!(canale.linkedin ?? profili.linkedin), instagram: !!profili.instagram,
      pubblica: pubblicaDa(persona, oggi), loConosce: !!membro, oreInCorso: (oggi.getTime() - dal.getTime()) / 3600_000,
    });
    if (strada === "contatta") {
      await db.lavorazione.update({ where: { id: l.id }, data: { strada: STRADA_SCALDARE, decisore, ponteNome: null, ponteMembroId: null } });
      return dopoCommento(l.leadId, oggi, true);
    }
  }
  // Già al lavoro (collegamento chiesto o commenti in corso): resta dov'è.
  if (l.strada === STRADA_COLLEGARE || l.strada === STRADA_SCALDARE) {
    if (!l.decisore) await db.lavorazione.update({ where: { id: l.id }, data: { decisore } });
    return false;
  }
  await db.lavorazione.update({ where: { id: l.id }, data: { strada: STRADA_COLLEGARE, decisore, ponteNome: null, ponteMembroId: null } });
  return false;
}

/** v3.117: rientrata dalla pausa senza chi decide: si rifà la ricerca (se LinkedIn lo permette oggi). */
async function ricercaChiDecide(leadId: string, oggi: Date): Promise<void> {
  if (await db.agentRun.findFirst({ where: { leadId, agent: "decision_maker", status: { in: ["IN_CODA", "IN_CORSO"] } }, select: { id: true } })) return;
  if (!(await linkedinPermette("decision_maker", null, oggi))) return;
  await db.agentRun.create({ data: { leadId, agent: "decision_maker", status: "IN_CODA", input: { ricontrollo: true } } });
}

/** Collegamenti (LinkedIn + Instagram) accodati al giorno: inviti con calma, come una persona. */
export const COLLEGAMENTI_AL_GIORNO = 10;

/**
 * v3.117 (passo 2): per chi decide, il Mac chiede il collegamento su LinkedIn (senza nota) e lo segue su Instagram.
 * Fatto (o se non c'è nessun profilo) l'azienda passa ai commenti ai suoi post (passo 3).
 */
async function accodaCollega(oggi: Date): Promise<number> {
  const lav = await db.lavorazione.findMany({ where: { fase: "MAPPATA", strada: STRADA_COLLEGARE }, orderBy: { updatedAt: "asc" }, select: { id: true, leadId: true, decisore: true, lead: { select: { name: true } } }, take: 40 });
  const mezzanotte = mezzanotteRoma(oggi);
  let fatti = await db.agentRun.count({ where: { agent: "collega", queuedAt: { gte: mezzanotte } } });
  let accodati = 0;
  for (const l of lav) {
    if (await db.agentRun.findFirst({ where: { leadId: l.leadId, agent: "collega", status: { in: ["IN_CODA", "IN_CORSO"] } }, select: { id: true } })) continue;
    // Già fatto una volta (anche fallito due volte): si va avanti con quello che c'è.
    const giri = await db.agentRun.findMany({ where: { leadId: l.leadId, agent: "collega" }, select: { status: true } });
    const p = await profiliDecisore(l.leadId);
    if (!p.linkedin && !p.instagram) {
      // Nessun profilo personale. Se chi decide è stato cercato con le istruzioni vecchie (senza Instagram, a volte senza
      // link) si ricerca una volta; se nemmeno così: niente da collegare né da commentare, si scrive col caso studio.
      const ricerca = await db.agentRun.findFirst({ where: { leadId: l.leadId, agent: AGENTE_SERVER, input: { path: ["relazioneDiretta"], equals: true } }, orderBy: { queuedAt: "desc" }, select: { status: true } });
      if (ricerca?.status === "IN_CORSO") continue;
      if (!ricerca) {
        // v3.122: la ricerca dei profili la fa il server, non il Chrome.
        await cercaChiDecideServer(l.leadId, oggi, { forza: true, relazioneDiretta: true });
        continue;
      }
      await db.lavorazione.update({ where: { id: l.id }, data: { strada: STRADA_SCALDARE } });
      await dopoCommento(l.leadId, oggi, true);
      continue;
    }
    if (giri.some((g) => g.status === "FATTO") || giri.filter((g) => g.status === "FALLITO").length >= 2) {
      await db.lavorazione.update({ where: { id: l.id }, data: { strada: STRADA_SCALDARE } });
      continue;
    }
    if (fatti >= COLLEGAMENTI_AL_GIORNO) continue;
    // Solo Instagram (LinkedIn fermo o profilo assente) va bene lo stesso.
    const linkedinOk = !!p.linkedin && (await linkedinPermette("collega", null, oggi));
    if (!linkedinOk && !p.instagram) continue;
    await db.agentRun.create({
      data: { agent: "collega", status: "IN_CODA", leadId: l.leadId, input: { leadId: l.leadId, persona: l.decisore ?? p.nome, ruolo: p.ruolo, azienda: l.lead.name, linkedin: linkedinOk ? p.linkedin : null, instagram: p.instagram } },
    });
    fatti++;
    accodati++;
  }
  return accodati;
}

/** Il referto del Mac per il collegamento: l'azienda passa ai commenti ai post di chi decide. */
export async function importaCollega(leadId: string | null, findings: Record<string, unknown>): Promise<void> {
  if (!leadId) return;
  const li = str(findings.linkedin);
  const ig = str(findings.instagram);
  await db.lavorazione.updateMany({ where: { leadId, fase: "MAPPATA", strada: STRADA_COLLEGARE }, data: { strada: STRADA_SCALDARE } });
  const fatto = [li === "INVITO" ? "richiesta di collegamento su LinkedIn" : li === "GIA_COLLEGATI" ? "già collegati su LinkedIn" : null, ig === "SEGUITO" ? "seguito su Instagram" : null].filter(Boolean).join(", ");
  if (fatto) await db.activity.create({ data: { leadId, type: "LINKEDIN_SENT", notes: `[Collegamento-auto] ${fatto}` } }).catch(() => null);
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

const contattoDiretto = (l: { strada: string | null }) => l.strada !== "BNI" && l.strada !== "CERCHIA";

/**
 * v3.103 (Alessio: "in da contattare manca il follow up"): chi decide non ha risposto al contatto. Un follow-up solo,
 * sugli stessi canali del primo messaggio (WhatsApp, email, LinkedIn), in Da contattare.
 */
export async function creaFollowup(lavorazioneId: string): Promise<boolean> {
  const l = await db.lavorazione.findUnique({ where: { id: lavorazioneId }, include: { lead: { select: { name: true } } } });
  if (!l || l.fase !== "CHIESTA" || !l.chiestaAt || l.promemoriaAt) return false;
  if (await db.approvalItem.findFirst({ where: { leadId: l.leadId, kind: KIND_RETE_FOLLOWUP, createdAt: { gte: l.chiestaAt } }, select: { id: true } })) return false;
  const primo = await db.approvalItem.findFirst({
    where: { leadId: l.leadId, kind: { in: [KIND_RETE_CONTATTO, KIND_RETE_DIRETTO, KIND_RETE_PAGINA] }, status: "APPROVATO" },
    orderBy: { decidedAt: "desc" },
    select: { payload: true },
  });
  const p = (primo?.payload ?? {}) as Record<string, unknown>;
  const decisore = l.decisore ?? (typeof p.decisore === "string" ? p.decisore : null);
  await db.approvalItem.create({
    data: {
      leadId: l.leadId,
      kind: KIND_RETE_FOLLOWUP,
      agent: "rete",
      title: `Follow-up a ${decisore ? chiDecideTesto(decisore, l.lead.name) : l.lead.name}`,
      payload: {
        lavorazioneId: l.id,
        decisore,
        azienda: l.lead.name,
        messaggio: testoFollowupContatto(decisore, p.collega === true),
        collega: p.collega === true,
        canale: p.canale ?? null,
        telefono: p.telefono ?? null,
        email: p.email ?? null,
        linkedin: p.linkedin ?? null,
        // v3.113: se il primo messaggio era alla pagina, anche il follow-up va lì.
        pagina: p.pagina ?? null,
        piattaforma: p.piattaforma ?? null,
      } as Prisma.InputJsonValue,
    },
  });
  return true;
}

/** v3.125: mail e telefono trovati a mano. Una voce per azienda, già chiusa: non compare fra le cose da fare. */
export const KIND_CONTATTO_MANUALE = "CONTATTO_MANUALE";

export async function contattoManualeDi(leadId: string): Promise<ContattoManuale | null> {
  const v = await db.approvalItem.findFirst({ where: { leadId, kind: KIND_CONTATTO_MANUALE }, orderBy: { createdAt: "desc" }, select: { payload: true } });
  return (v?.payload as unknown as ContattoManuale | null) ?? null;
}

export type EsitoContatto = "da_contattare" | "canale_aggiunto" | "nuovo_messaggio" | "salvato";

/**
 * v3.125 (Alessio, 2026-11-09: "dopo una richiesta di collegamento trovo email o telefono: aggiungere o cambiare
 * canale"). Salva il contatto e lo fa valere subito:
 *   - messaggio già pronto: il nuovo canale si aggiunge a quel messaggio;
 *   - collegamento o riscaldamento in corso: si smette di aspettare, il messaggio va in Da contattare;
 *   - già scritto, nessuna risposta: un nuovo messaggio, solo sul nuovo canale.
 * Non manda niente: scrive Alessio. Un numero fisso si salva per chiamare e non cambia il percorso.
 */
export async function aggiungiContatto(leadId: string, nuovo: ContattoManuale, chi: string, oggi = new Date()): Promise<EsitoContatto | null> {
  const lead = await db.lead.findUnique({ where: { id: leadId }, select: { email: true, phone: true } });
  if (!lead) return null;

  const gia = await db.approvalItem.findFirst({ where: { leadId, kind: KIND_CONTATTO_MANUALE }, orderBy: { createdAt: "desc" }, select: { id: true, payload: true } });
  const prima = (gia?.payload as unknown as ContattoManuale | null) ?? { email: null, telefono: null, whatsapp: null };
  const salvato: ContattoManuale = { email: nuovo.email ?? prima.email, ...(nuovo.telefono ? { telefono: nuovo.telefono, whatsapp: nuovo.whatsapp } : { telefono: prima.telefono, whatsapp: prima.whatsapp }) };
  const dati = { payload: salvato as unknown as Prisma.InputJsonValue, decidedAt: oggi, decidedBy: chi };
  if (gia) await db.approvalItem.update({ where: { id: gia.id }, data: dati });
  else await db.approvalItem.create({ data: { ...dati, leadId, kind: KIND_CONTATTO_MANUALE, agent: "rete", status: "APPROVATO", title: "Mail o telefono trovati a mano" } });

  // Anche le altre pagine del CRM lo vedono. La mail dell'azienda, se c'è, resta com'è.
  await db.lead.update({
    where: { id: leadId },
    data: {
      ...(nuovo.email && !lead.email ? { email: nuovo.email } : {}),
      ...(nuovo.whatsapp ? { whatsappNumber: nuovo.whatsapp, whatsappSource: "manual", ...(lead.phone ? {} : { phone: nuovo.telefono }) } : nuovo.telefono ? { phone: nuovo.telefono, phoneVerified: true } : {}),
    },
  });
  const cosa = [nuovo.email && `mail ${nuovo.email}`, nuovo.telefono && `${nuovo.whatsapp ? "WhatsApp" : "telefono"} ${nuovo.telefono}`].filter(Boolean).join(", ");
  const sostituito = nuovo.telefono && !nuovo.whatsapp && lead.phone ? ` (prima il telefono era ${lead.phone})` : "";
  await db.activity.create({ data: { leadId, type: "NOTE", notes: `[Percorso] Contatto trovato a mano: ${cosa}${sostituito}`, createdBy: chi } });

  if (!nuovo.email && !nuovo.whatsapp) return "salvato";

  // Un messaggio già pronto: si aggiunge il canale, il testo resta.
  const aperte = await db.approvalItem.findMany({ where: { leadId, status: "IN_ATTESA", kind: { in: KIND_MESSAGGI_A_CHI_DECIDE } }, select: { id: true, payload: true } });
  if (aperte.length) {
    for (const v of aperte) {
      const payload = { ...((v.payload ?? {}) as Record<string, unknown>), ...(nuovo.whatsapp ? { telefono: nuovo.whatsapp } : {}), ...(nuovo.email ? { email: nuovo.email, emailPersonale: true } : {}), contattoManuale: true };
      await db.approvalItem.update({ where: { id: v.id }, data: { payload: payload as Prisma.InputJsonValue } });
    }
    // Se il Mac doveva scrivere su LinkedIn e non ha ancora iniziato, si ferma: scrivi tu dal canale nuovo.
    await db.agentRun.updateMany({ where: { leadId, agent: "contatta_persona", status: "IN_CODA" }, data: { status: "FALLITO", finishedAt: oggi, error: "Annullato: Alessio ha trovato WhatsApp o mail" } });
    return "canale_aggiunto";
  }

  const l = await db.lavorazione.findUnique({ where: { leadId } });
  if (!l) return "salvato";

  if (l.fase === "MAPPATA") {
    const d = await datiAzienda(leadId, !!l.scaldataAt);
    await db.lavorazione.update({ where: { id: l.id }, data: { strada: STRADA_SCALDARE, decisore: l.decisore ?? d.decisori[0]?.nome ?? null, ponteNome: null, ponteMembroId: null } });
    return (await dopoCommento(leadId, oggi, true)) ? "da_contattare" : "salvato";
  }

  if (l.fase !== "CHIESTA" || !contattoDiretto(l) || l.presentatoAt) return "salvato";
  if (await db.approvalItem.findFirst({ where: { leadId, kind: KIND_RETE_RISPOSTA, status: "IN_ATTESA" }, select: { id: true } })) return "salvato";
  const ultimo = await db.approvalItem.findFirst({ where: { leadId, kind: { in: KIND_MESSAGGI_A_CHI_DECIDE }, status: "APPROVATO" }, orderBy: { decidedAt: "desc" }, select: { kind: true, note: true, payload: true } });
  if (!ultimo) return "salvato";
  const p = (ultimo.payload ?? {}) as Record<string, unknown>;
  const decisore = l.decisore ?? (typeof p.decisore === "string" ? p.decisore : null);
  const azienda = (await db.lead.findUnique({ where: { id: leadId }, select: { name: true } }))?.name ?? "";
  await db.approvalItem.create({
    data: {
      leadId,
      kind: KIND_RETE_FOLLOWUP,
      agent: "rete",
      title: `Nuovo canale: riscrivi a ${decisore ? chiDecideTesto(decisore, azienda) : azienda}`,
      payload: {
        lavorazioneId: l.id,
        decisore,
        azienda,
        messaggio: testoCambioCanale(decisore, canaleDallaNota(ultimo.note), ultimo.kind === KIND_RETE_CASO, p.collega === true),
        collega: p.collega === true,
        telefono: nuovo.whatsapp,
        email: nuovo.email,
        contattoManuale: true,
      } as Prisma.InputJsonValue,
    },
  });
  return "nuovo_messaggio";
}

/**
 * v3.116 (Alessio, 2026-11-06: "se mi risponde come PiscineSpa, che mi ha chiesto il caso studio, devo segnalarlo nel
 * CRM"): la risposta resta nelle attività e si prepara il messaggio con il caso studio, sullo stesso canale del primo.
 */
export async function segnaRispostaCaso(leadId: string, chi: string): Promise<boolean> {
  const l = await db.lavorazione.findUnique({ where: { leadId }, include: { lead: { select: { name: true } } } });
  if (!l) return false;
  if (await db.approvalItem.findFirst({ where: { leadId, kind: KIND_RETE_CASO, status: "IN_ATTESA" }, select: { id: true } })) return false;
  const primo = await db.approvalItem.findFirst({
    where: { leadId, kind: { in: [KIND_RETE_CONTATTO, KIND_RETE_DIRETTO, KIND_RETE_PAGINA, KIND_RETE_FOLLOWUP] }, status: "APPROVATO" },
    orderBy: { decidedAt: "desc" },
    select: { payload: true },
  });
  const p = (primo?.payload ?? {}) as Record<string, unknown>;
  const decisore = l.decisore ?? (typeof p.decisore === "string" ? p.decisore : null);
  const casoId = typeof p.casoId === "string" ? p.casoId : (await casoPerMessaggio(leadId, new Date()))?.casoId ?? null;
  await db.approvalItem.updateMany({ where: { leadId, kind: KIND_RETE_FOLLOWUP, status: "IN_ATTESA" }, data: { status: "SCARTATO", decidedAt: new Date(), decidedBy: chi, note: "Ha risposto" } });
  await db.approvalItem.updateMany({ where: { leadId, kind: KIND_RETE_RISPOSTA, status: "IN_ATTESA" }, data: { status: "APPROVATO", decidedAt: new Date(), decidedBy: chi, note: "Vuole il caso studio" } });
  await db.approvalItem.create({
    data: {
      leadId,
      kind: KIND_RETE_CASO,
      agent: "rete",
      title: `Manda il caso studio a ${decisore ? chiDecideTesto(decisore, l.lead.name) : l.lead.name}`,
      payload: {
        lavorazioneId: l.id, decisore, azienda: l.lead.name, casoId,
        messaggio: testoInvioCaso(decisore, p.collega === true),
        collega: p.collega === true,
        canale: p.canale ?? null, telefono: p.telefono ?? null, email: p.email ?? null, linkedin: p.linkedin ?? null, pagina: p.pagina ?? null, piattaforma: p.piattaforma ?? null,
      } as Prisma.InputJsonValue,
    },
  });
  // Finché il caso studio non parte, niente follow-up automatico.
  await db.lavorazione.update({ where: { id: l.id }, data: { promemoriaAt: new Date() } });
  await db.activity.create({ data: { leadId, type: "RESPONSE_RECEIVED", notes: "[Percorso] Ha risposto: vuole il caso studio", createdBy: chi } });
  return true;
}

function testoInvioCaso(decisore: string | null, collega = false): string {
  const nome = decisore ? ` ${decisore.trim().split(/\s+/)[0]}` : "";
  // v3.126: al collega si dà del tu e si propone di sentirsi per capire come collaborare.
  if (collega) return `Ciao${nome}, come promesso ti mando il caso studio, così vedi come lavoro.\n\nSe ti va ci sentiamo 20 minuti per capire come possiamo collaborare: dimmi tu quando ti è più comodo.\n\nAlessio`;
  return `Buongiorno${nome}, come promesso le mando il caso studio.\n\nSe le va, ne parliamo in 20 minuti: mi dica lei quando le è più comodo.\n\nGrazie,\nAlessio`;
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
  gancio: string;
}
const SCHEMA_MOTIVO: Schema = {
  type: "object",
  properties: {
    gancio: { type: "string", description: "Due frasi in PRIMA PERSONA (parla Alessio): il problema che aveva un'azienda come la sua, poi cosa è cambiato. SENZA nominare il cliente del caso" },
  },
  required: ["gancio"],
};

/** Il caso studio per il messaggio: il gancio scritto dall'AI (null se non c'è budget o l'AI non risponde) e il PDF da mandare. */
export interface CasoPerMessaggio {
  gancio: string | null;
  casoId: string;
  /** v3.126: trovata dal caso di una consulente (Liliana): è un collega, gli si propone di collaborare. */
  collega: boolean;
}

/** Il caso studio dell'azienda e il gancio per il messaggio. Il cliente del caso non si cita per iscritto. */
async function casoPerMessaggio(leadId: string, oggi: Date): Promise<CasoPerMessaggio | null> {
  const l = await db.lead.findUnique({
    where: { id: leadId },
    select: { name: true, category: true, ritrovamenti: { take: 5, orderBy: { createdAt: "asc" }, select: { chiave: { select: { casoStudio: { select: { id: true, storia: true, settore: true, aziendaNome: true } } } } } } },
  });
  const daColleghi = !!l?.ritrovamenti.some((r) => casoDaColleghi(r.chiave.casoStudio));
  // Il caso della ricerca che l'ha trovata; se arriva da altre strade (rete di un membro, LinkedIn), il caso attivo
  // dello stesso settore (v3.87: Centro Piscine e Macciocco partivano senza caso studio nel messaggio).
  let caso = l?.ritrovamenti.map((r) => r.chiave.casoStudio).find((c) => c?.storia) ?? null;
  if (l && !caso) {
    const testo = norm(`${l.category ?? ""} ${l.name}`);
    const casi = await db.casoStudio.findMany({ where: { stato: "ATTIVO", storia: { not: null } }, select: { id: true, storia: true, settore: true, aziendaNome: true } });
    caso = casi.find((c) => norm(c.settore).split(/\s+/).some((w) => w.length >= 5 && testo.includes(w.slice(0, -1)))) ?? null;
  }
  if (!l || !caso?.storia) return null;
  const collega = daColleghi || casoDaColleghi(caso);
  if (!(await budgetDisponibile(oggi)).ok) return { gancio: null, casoId: caso.id, collega };
  try {
    const ai = await chiediJSON<RispostaMotivo>({
      sistema: collega ? `${REGOLE_COMUNI}\n\n${ISTRUZIONI_GANCIO_COLLEGA}` : `${REGOLE_COMUNI}\n\nScrivi il gancio di un messaggio WhatsApp/email che Alessio Loi (Karalisweb, strategia, siti e marketing digitale) manda al titolare di un'azienda per offrirgli il caso studio di un'azienda simile. Deve far pensare al titolare "questo è proprio il mio problema".
DUE frasi, in PRIMA PERSONA (firma Alessio):
1) il problema concreto che aveva l'azienda del caso, raccontato in modo che il titolare ci si riconosca ("Un'azienda di piscine come la vostra era cresciuta in fretta, ma il marketing andava a strappi e il sito non raccontava chi erano davvero.");
2) cosa è cambiato dopo il lavoro con Alessio, concreto ("Ci ho lavorato insieme e oggi sanno a chi parlare, come, e cosa fare ogni mese.").
REGOLE: il cliente del caso NON si nomina mai (lo racconta Alessio a voce), si descrive con il mestiere; niente numeri che non siano nel caso; niente promesse vaghe ("aumentare la visibilità", "crescere online"); niente gergo (DDSC, piano operativo, documento strategico: di' cosa fanno, non come si chiamano); mai "Alessio ha" o "Karalisweb ha"; non chiedere niente, non offrire il caso studio (lo fa il resto del messaggio).`,
      testo: `AZIENDA DA CONTATTARE: ${l.name}${l.category ? ` (${l.category})` : ""}\nCLIENTE DEL CASO (da NON nominare): ${caso.aziendaNome ?? ""}\nSETTORE DEL CASO: ${caso.settore ?? ""}\nSTORIA DEL CASO:\n${caso.storia}`,
      schema: SCHEMA_MOTIVO,
    });
    // Rete di sicurezza: il messaggio lo firma Alessio, quindi niente terza persona (v3.87).
    let gancio = ai.dati.gancio.trim().replace(/^(Alessio Loi|Alessio|Karalisweb|karalisweb)\s+ha\s+/i, "Ho ");
    // Rete di sicurezza: se il nome del cliente scappa comunque, si toglie il gancio (il caso studio resta).
    if (caso.aziendaNome && gancio.toLowerCase().includes(caso.aziendaNome.toLowerCase().split(" ")[0])) gancio = "";
    return { gancio: gancio || null, casoId: caso.id, collega };
  } catch {
    return { gancio: null, casoId: caso.id, collega };
  }
}

/**
 * v3.126 (Alessio, 2026-11-10): il gancio per un collega trovato dal caso di una consulente. Non gli si vende il caso:
 * gli si fa vedere cosa Alessio sa fare per un professionista come lui e cosa può aggiungere ai suoi clienti.
 */
const ISTRUZIONI_GANCIO_COLLEGA = `Scrivi il gancio di un messaggio WhatsApp/email che Alessio Loi (Karalisweb, strategia, siti e marketing digitale) manda a un COLLEGA: un consulente, coach, formatore o professionista del marketing che lavora con le imprese. Non è un cliente da convincere: Alessio gli propone di COLLABORARE e deve fargli capire che può portargli valore aggiunto, non fargli concorrenza.
DUE frasi, in PRIMA PERSONA (firma Alessio), dando del tu:
1) cosa ha fatto per una professionista come lui, dal caso studio, raccontato da collega a collega ("Ho lavorato con una consulente B2B che aveva un'offerta solida ma faticava a dimostrare il suo valore: insieme l'abbiamo resa concreta, e oggi chiude collaborazioni in delega.");
2) cosa può aggiungere al suo lavoro o ai suoi clienti, legato a quello che fa lui (il suo mestiere è nel nome e nella categoria): la parte che di solito gli manca, ad esempio rendere dimostrabile la promessa, il sito, le campagne, un marketing che si misura ("Ai tuoi clienti posso portare la parte che di solito resta scoperta: il sito e le campagne che mettono in pratica quello che imposti tu.").
REGOLE: il cliente del caso NON si nomina mai, si descrive con il mestiere; niente numeri che non siano nel caso; niente promesse vaghe; niente gergo (DDSC, piano operativo, documento strategico); mai "Alessio ha" o "Karalisweb ha"; non chiedere niente, non proporre ancora la collaborazione né offrire il caso studio (lo fa il resto del messaggio).`;

/** Cosa portare al ponte prima di chiedere (solo quando lo si sa: per i membri BNI). */
async function cosaDare(membroId: string | null): Promise<string | null> {
  if (!membroId) return null;
  const s = await db.bniSegnalazione.findFirst({ where: { membroId, stato: "DA_DARE" }, orderBy: { createdAt: "desc" }, select: { nome: true, motivo: true } });
  return s ? `Prima dai: segnalagli ${s.nome}${s.motivo ? ` (${s.motivo})` : ""}.` : null;
}

/** v3.90: i testi delle voci di contatto. Le voci ancora aperte con una versione più vecchia si riscrivono al turno. */
export const VERSIONE_TESTO = 2;

const CELLULARE = /(?<![\d])(?:\+?39[\s./-]?)?3\d{2}[\s./-]?\d{3}[\s./-]?\d{3,4}(?![\d])/g;
const PAGINE_UTILI = /contatt|chi-?siamo|about|team|staff|azienda|dove-?siamo|titolare|fondator/i;

/** Un cellulare italiano (3…) scritto sul sito: nei link tel: o nel testo, purché separato come un numero di telefono. */
function cellulareDa(html: string): string | null {
  const tel = [...html.matchAll(/href=["']tel:([^"']+)["']/gi)].map((m) => m[1]);
  const testo = html.replace(/<[^>]+>/g, " ").match(CELLULARE) ?? [];
  for (const n of [...tel, ...testo.filter((t) => /[\s./-]|\+?39/.test(t))]) {
    const cifre = n.replace(/\D/g, "").replace(/^0039/, "39");
    const locale = cifre.startsWith("39") && cifre.length > 10 ? cifre.slice(2) : cifre;
    if (/^3\d{8,9}$/.test(locale)) return `39${locale}`;
  }
  return null;
}

/** L'email della persona fra quelle del sito: nome o cognome di chi decide nella parte prima della chiocciola. */
function emailDellaPersona(email: string[], decisore: string): string | null {
  const parti = norm(decisore.replace(/\([^)]*\)/g, "")).split(/\s+/).filter((p) => p.length >= 3);
  if (!parti.length) return null;
  return email.find((e) => {
    const locale = norm(e.split("@")[0].replace(/[._-]+/g, " "));
    return parti.some((p) => locale.includes(p));
  }) ?? null;
}

/**
 * Come scrivere direttamente a chi decide (v3.87, più a fondo dalla v3.90): il suo LinkedIn se l'abbiamo; il suo
 * telefono e la sua email se è un membro BNI; dal sito (home, contatti, chi siamo, team) la sua email personale
 * (nome.cognome@…) prima di quella dell'azienda, il WhatsApp (link wa.me) o un cellulare scritto. Il telefono
 * dell'azienda resta per chiamare.
 */
export async function canaleDiretto(leadId: string, decisore: string | null): Promise<{ whatsapp: string | null; email: string | null; emailPersonale: boolean; telefono: string | null; linkedin: string | null }> {
  const [lead, persona, contatto, membro, aMano] = await Promise.all([
    db.lead.findUnique({ where: { id: leadId }, select: { website: true, phone: true, email: true } }),
    decisore ? db.persona.findFirst({ where: { leadId, nome: decisore }, select: { linkedinUrl: true } }) : null,
    db.agentReport.findFirst({ where: { leadId, agent: "contatto" }, orderBy: { collectedAt: "desc" }, select: { findings: true } }),
    decisore ? db.bniMembro.findFirst({ where: { name: { equals: decisore, mode: "insensitive" } }, select: { phone: true, email: true } }) : null,
    contattoManualeDi(leadId),
  ]);
  // v3.125: quello che Alessio ha trovato e scritto lui viene prima di tutto.
  let whatsapp = aMano?.whatsapp ?? (membro?.phone ? normalizePhoneForWhatsApp(membro.phone) : null);
  let emailPersona = aMano?.email ?? membro?.email ?? null;
  let emailAzienda = lead?.email ?? null;
  if (lead?.website) {
    const home = lead.website.startsWith("http") ? lead.website : `https://${lead.website}`;
    const dominio = (() => { try { return new URL(home).hostname.replace(/^www\./, ""); } catch { return ""; } })();
    const daVedere = [home, (contatto?.findings as { paginaContatti?: string } | null)?.paginaContatti].filter((u): u is string => !!u);
    const viste = new Set<string>();
    while (daVedere.length && viste.size < 5 && !(whatsapp && emailPersona)) {
      const url = daVedere.shift()!;
      if (viste.has(url)) continue;
      viste.add(url);
      try {
        const html = (await scaricaPagina(url)).html;
        whatsapp ??= extractWhatsAppNumber(html) ?? cellulareDa(html);
        const email = extractEmails(html);
        if (decisore) emailPersona ??= emailDellaPersona(email, decisore);
        emailAzienda ??= extractContactEmail(html, dominio);
        // Dalla home, le pagine dove di solito c'è chi decide (contatti, chi siamo, team).
        if (url === home) {
          for (const m of html.matchAll(/href=["']([^"'#]+)["']/gi)) {
            if (!PAGINE_UTILI.test(m[1])) continue;
            try {
              const u = new URL(m[1], home);
              if (u.hostname.replace(/^www\./, "") === dominio && !daVedere.includes(u.href)) daVedere.push(u.href);
            } catch {
              // Link rotto: si salta.
            }
          }
        }
      } catch {
        // Pagina che non risponde: si va con quello che c'è.
      }
    }
  }
  // Un cellulare dell'azienda (3…) vale anche per WhatsApp.
  const tel = aMano?.telefono ?? lead?.phone ?? null;
  if (!whatsapp && tel && /^(\+?39)?\s*3/.test(tel.replace(/[^\d+]/g, ""))) whatsapp = normalizePhoneForWhatsApp(tel);
  // v3.115: le mail lette dal sito possono portarsi dietro pezzi di HTML ("…it\&quot;"): si tiene solo l'indirizzo.
  const pulita = (e: string | null) => e?.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/)?.[0]?.toLowerCase() ?? null;
  const ePersona = pulita(emailPersona);
  return { whatsapp, email: ePersona ?? pulita(emailAzienda), emailPersonale: !!ePersona, telefono: tel, linkedin: persona?.linkedinUrl ?? null };
}

/**
 * v3.90: le voci di contatto ancora da mandare scritte coi testi vecchi ("ti va di sentirci 20 minuti?") si
 * riscrivono: gancio dal caso studio, offerta del caso studio, permesso di mandarlo; e i canali si cercano di nuovo.
 */
export async function aggiornaTestiContatto(oggi = new Date(), massimo = 20): Promise<number> {
  const voci = await db.approvalItem.findMany({
    where: { kind: { in: [KIND_RETE_DIRETTO, KIND_RETE_CONTATTO, KIND_RETE_PAGINA] }, status: "IN_ATTESA", leadId: { not: null } },
    orderBy: { createdAt: "asc" },
    select: { id: true, kind: true, leadId: true, payload: true, lead: { select: { name: true } } },
  });
  let fatte = 0;
  for (const v of voci) {
    const p = (v.payload ?? {}) as Record<string, unknown>;
    if (fatte >= massimo) break;
    if (!v.leadId || !v.lead) continue;
    // v3.126: si riscrive anche quando l'azienda risulta un collega (trovato dal caso di una consulente) e il testo no.
    const collegaOra = await trovataDaColleghi(v.leadId);
    if (typeof p.versioneTesto === "number" && p.versioneTesto >= VERSIONE_TESTO && !!p.collega === collegaOra) continue;
    const azienda = v.lead.name;
    const decisore = typeof p.decisore === "string" && p.decisore !== "chi decide" ? p.decisore : null;
    const caso = await casoPerMessaggio(v.leadId, oggi);
    const gancio = caso?.gancio ?? null;
    const collega = caso?.collega ?? collegaOra;
    let nuovo: Record<string, unknown>;
    if (v.kind === KIND_RETE_PAGINA) {
      nuovo = { messaggio: testoMessaggioPagina(azienda, gancio, !!caso, collega) };
    } else {
      const canale = await canaleDiretto(v.leadId, decisore);
      const canali = { telefono: canale.whatsapp ?? (p.telefono as string | null) ?? null, email: canale.email ?? (p.email as string | null) ?? null, emailPersonale: canale.emailPersonale, chiamare: canale.telefono, linkedin: (p.linkedin as string | null) ?? canale.linkedin };
      if (v.kind === KIND_RETE_CONTATTO) {
        const piattaforma = piattaformaPiuCommentata(await commentiDi(v.leadId))?.piattaforma ?? null;
        nuovo = { ...canali, messaggio: testoContattoDopoCommenti(decisore, azienda, piattaforma, gancio, !!caso, !!piattaforma, collega) };
      } else if ("inComune" in p) {
        nuovo = { ...canali, messaggio: testoDirettoConPonte(decisore ?? "", azienda, (p.inComune as string | null) ?? null, gancio, !!caso, collega) };
      } else {
        // Lo conosce Alessio: si resta sul tu, i canali sono quelli che c'erano.
        nuovo = { messaggio: testoContattoDiretto(decisore ?? "", azienda, gancio, !!caso, collega) };
      }
    }
    await db.approvalItem.update({ where: { id: v.id }, data: { payload: { ...p, ...nuovo, motivoDalCaso: !!gancio, casoId: caso?.casoId ?? null, collega, versioneTesto: VERSIONE_TESTO } as Prisma.InputJsonValue } });
    fatte++;
  }
  return fatte;
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
  const caso = tipo === "PROMEMORIA" ? null : await casoPerMessaggio(l.leadId, oggi);
  const motivo = caso?.gancio ?? null;
  // Contatto diretto via ponte (v3.87): a chi decide, con chi avete in comune, sui suoi canali.
  const viaPonte = tipo === "DIRETTO" && inComune !== undefined;
  const canale = viaPonte ? await canaleDiretto(l.leadId, decisore) : null;
  const messaggio =
    tipo === "PONTE" ? testoRichiestaPonte(l.ponteNome, decisore, l.lead.name, motivo)
    : viaPonte ? testoDirettoConPonte(decisore, l.lead.name, inComune ?? null, motivo, !!caso, !!caso?.collega)
    : tipo === "DIRETTO" ? testoContattoDiretto(decisore, l.lead.name, motivo, !!caso, !!caso?.collega)
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
          ? { canale: canale.whatsapp ? "whatsapp" : canale.email ? "email" : "linkedin", telefono: canale.whatsapp, email: canale.email, emailPersonale: canale.emailPersonale, chiamare: canale.telefono, linkedin: canale.linkedin, inComune: inComune ?? null }
          : { canale: membro?.phone ? "whatsapp" : "linkedin", telefono: membro?.phone ?? null, linkedin: membro?.linkedinUrl ?? profiloDecisore }),
        dare: tipo === "PONTE" ? await cosaDare(l.ponteMembroId) : null,
        motivoDalCaso: !!motivo,
        casoId: caso?.casoId ?? null,
        collega: !!caso?.collega,
        versioneTesto: VERSIONE_TESTO,
        relazioneDiretta: true,
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
    // v3.113: anche il messaggio alla pagina è un contatto: si passa ad "Aspetti la risposta" (prima tornava a scaldare).
    if (decisione === "APPROVATO" && leadId) {
      await db.lavorazione.updateMany({ where: { leadId, fase: { in: ["MAPPATA", "PONTE_SCELTO"] } }, data: { fase: "CHIESTA", strada: "SCALDATO", chiestaAt: new Date(), scaldataAt: new Date() } });
    }
    return;
  }
  const id = (v.payload as { lavorazioneId?: string } | null)?.lavorazioneId;
  if (!id) return;
  // v3.124: "La seguo io" ferma follow-up e pausa automatici; "Non è interessato" la mette in pausa. Lo decide Alessio.
  if (v.kind === KIND_RETE_RISPOSTA) {
    if (decisione === "APPROVATO") await db.lavorazione.updateMany({ where: { id }, data: { presentatoAt: new Date() } });
    else await mettiInPausa(id, "Ha risposto: non è interessato");
    return;
  }
  // v3.116: caso studio mandato: si riparte ad aspettare la risposta, e fra 5 giorni il follow-up.
  if (decisione === "APPROVATO" && v.kind === KIND_RETE_CASO) {
    await db.lavorazione.updateMany({ where: { id }, data: { fase: "CHIESTA", chiestaAt: new Date(), promemoriaAt: null } });
    return;
  }
  // "Non serve" sul follow-up: conta come fatto, così a 10 giorni l'azienda va in pausa invece di restare ferma.
  if (decisione === "SCARTATO" && v.kind === KIND_RETE_FOLLOWUP) await db.lavorazione.updateMany({ where: { id }, data: { promemoriaAt: new Date() } });
  if (decisione === "APPROVATO") {
    if (v.kind === KIND_RETE_PROMEMORIA || v.kind === KIND_RETE_FOLLOWUP) await db.lavorazione.updateMany({ where: { id }, data: { promemoriaAt: new Date() } });
    if (v.kind === KIND_RETE_PONTE) await db.lavorazione.updateMany({ where: { id, fase: "PONTE_SCELTO" }, data: { fase: "CHIESTA", chiestaAt: new Date() } });
    // v3.103: anche "lo conosci tu" (lavorazione ancora MAPPATA) passa ad "aspetti la risposta", e da lì al follow-up.
    if (v.kind === KIND_RETE_DIRETTO) await db.lavorazione.updateMany({ where: { id, fase: { in: ["MAPPATA", "PONTE_SCELTO"] } }, data: { fase: "CHIESTA", chiestaAt: new Date() } });
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
  // v3.117: si scaldano solo le aziende al passo 3, e si commentano i post di CHI DECIDE (Instagram o LinkedIn).
  const lav = await db.lavorazione.findMany({
    where: { fase: "MAPPATA", strada: STRADA_SCALDARE },
    orderBy: { updatedAt: "asc" },
    include: { lead: { select: { id: true, name: true, address: true } } },
    take: 40,
  });
  // LinkedIn fermo (budget o stop di 48 ore): si commenta su Instagram, non si ferma tutto.
  const linkedinOk = await linkedinPermette("scalda", { aziende: [] }, oggi);
  const aziende = [];
  for (const l of lav) {
    if (aziende.length >= DECISORI_DA_SCALDARE) break;
    await db.approvalItem.updateMany({ where: { leadId: l.leadId, kind: KIND_COMMENTO, status: "IN_ATTESA" }, data: { status: "SCARTATO", decidedAt: new Date(), decidedBy: "crm_scalda", note: "Lo pubblica il CRM" } });
    // L'azienda di un membro BNI passa dal 121: niente commenti.
    if (await db.bniMembro.findFirst({ where: { leadId: l.leadId, status: "ATTIVO" }, select: { id: true } })) continue;
    // Uno solo al giorno per azienda, anche con più giri: non deve sembrare spam.
    if (await db.approvalItem.findFirst({ where: { leadId: l.leadId, kind: KIND_COMMENTO, createdAt: { gte: mezzanotte } }, select: { id: true } })) continue;
    const fattiQui = await commentiDi(l.leadId);
    const giaFatti = piattaformaPiuCommentata(fattiQui);
    if ((giaFatti?.fatti ?? 0) >= COMMENTI_PER_CONTATTO) {
      await dopoCommento(l.leadId, oggi);
      continue;
    }
    const p = await profiliDecisore(l.leadId);
    const piattaforma = piattaformaPersona({ instagram: p.instagram, linkedin: p.linkedin }, giaFatti?.piattaforma ?? null, linkedinOk);
    if (!piattaforma) {
      // Nessun profilo dove commentare (o solo LinkedIn, fermo oggi): senza profili si scrive subito.
      if (!p.instagram && !p.linkedin) await dopoCommento(l.leadId, oggi, true);
      continue;
    }
    const altra = piattaforma === "instagram" ? (linkedinOk ? p.linkedin : null) : p.instagram;
    const giaCommentati = fattiQui.map((c) => c.post).filter((x): x is string => typeof x === "string");
    aziende.push({ leadId: l.leadId, azienda: l.lead.name, citta: l.lead.address, decisore: l.decisore ?? p.nome, piattaforma, profilo: piattaforma === "instagram" ? p.instagram : p.linkedin, altroProfilo: altra, giaCommentati });
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
    // v3.99: un commento non pubblicato non diventa un compito di Alessio: il CRM riprova al giro dopo.
    if (!pubblicato) continue;
    await db.approvalItem.create({
      data: {
        leadId,
        kind: KIND_COMMENTO,
        agent: "scalda",
        title: `${pubblicato ? "Commentato" : "Commenta"} il post di ${str(c.decisore) ?? "chi decide"} (${lead.name}) su ${NOMI[piattaforma]} (${fatti + 1}° di ${COMMENTI_PER_CONTATTO})`,
        // v3.117: persona = commento al post di chi decide (contano solo questi per il contatto).
        payload: { post, piattaforma, estratto: str(c.estratto)?.slice(0, 400) ?? null, commento: commento.slice(0, 600), decisore: str(c.decisore), pubblicato, persona: true } as Prisma.InputJsonValue,
        ...(pubblicato ? { status: "APPROVATO" as const, decidedAt: new Date(), decidedBy: "crm_auto", note: "Pubblicato dal CRM" } : {}),
      },
    });
    if (pubblicato) await dopoCommento(leadId);
    e.commenti++;
  }
  // v3.117: chi decide non pubblica (nessun post negli ultimi 90 giorni sui suoi profili): gli si scrive subito.
  const senzaPost = Array.isArray(findings.senzaPost) ? (findings.senzaPost as unknown[]) : [];
  for (const x of senzaPost) {
    const leadId = typeof x === "string" ? x : str((x as { leadId?: unknown })?.leadId);
    if (leadId && (await db.lavorazione.findFirst({ where: { leadId, fase: "MAPPATA", strada: STRADA_SCALDARE }, select: { id: true } }))) await dopoCommento(leadId, new Date(), true);
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
  // v3.117: contano solo i commenti ai post di chi decide; quelli di prima alla pagina dell'azienda no.
  return fatti.map((f) => (f.payload ?? {}) as { piattaforma?: unknown; post?: unknown; persona?: unknown }).filter((p) => p.persona === true);
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
      payload: { piattaforma, manuale: true, persona: true } as Prisma.InputJsonValue,
    },
  });
  const contatto = await dopoCommento(leadId);
  return { fatti: await commentiFatti(leadId), contatto };
}

/**
 * Dopo ogni commento: al 3° il contatto diretto (WhatsApp o mail col caso studio) va in Cassetta, una volta sola.
 * v3.117: `subito` = chi decide non pubblica (o non ha profili): si scrive senza aspettare i commenti.
 */
export async function dopoCommento(leadId: string, oggi = new Date(), subito = false): Promise<boolean> {
  const commentati = await commentiFatti(leadId);
  if (!subito && commentati < COMMENTI_PER_CONTATTO) return false;
  // Le voci chiuse col riallineamento del 2026-11-06 (scartate) non contano.
  const gia = await db.approvalItem.findFirst({ where: { leadId, kind: KIND_RETE_CONTATTO, status: { in: ["IN_ATTESA", "APPROVATO"] } }, select: { id: true } });
  if (gia) return false;
  const lead = await db.lead.findUnique({ where: { id: leadId }, select: { name: true, phone: true, email: true } });
  if (!lead) return false;
  const d = await datiAzienda(leadId);
  const decisore = d.decisori[0]?.nome ?? null;
  const profili = await profiliDecisore(leadId);
  // La piattaforma dove il CRM ha commentato i suoi post: è lì che chi decide ha visto Alessio.
  const piattaforma = piattaformaPiuCommentata(await commentiDi(leadId))?.piattaforma ?? null;
  const caso = await casoPerMessaggio(leadId, oggi);
  const canale = await canaleDiretto(leadId, decisore);
  await db.approvalItem.create({
    data: {
      leadId,
      kind: KIND_RETE_CONTATTO,
      agent: "rete",
      title: `${commentati ? `${commentati} commenti fatti: ` : ""}scrivi a ${decisore ? chiDecideTesto(decisore, lead.name) : lead.name} ${caso?.collega ? "per proporgli di collaborare" : "col caso studio"}`,
      payload: {
        decisore,
        azienda: lead.name,
        messaggio: testoContattoDopoCommenti(decisore, lead.name, commentati ? piattaforma : null, caso?.gancio ?? null, !!caso, commentati > 0, !!caso?.collega),
        piattaforma,
        telefono: canale.whatsapp,
        email: canale.email,
        emailPersonale: canale.emailPersonale,
        chiamare: canale.telefono,
        linkedin: profili.linkedin,
        facebook: profili.facebook,
        instagram: profili.instagram,
        motivoDalCaso: !!caso?.gancio,
        casoId: caso?.casoId ?? null,
        collega: !!caso?.collega,
        versioneTesto: VERSIONE_TESTO,
        relazioneDiretta: true,
      } as Prisma.InputJsonValue,
    },
  });
  return true;
}

/** Chi decide non si sa: il messaggio all'azienda (WhatsApp, mail o pagina), una volta sola. */
export async function messaggioAllaPagina(leadId: string, oggi = new Date()): Promise<boolean> {
  const gia = await db.approvalItem.findFirst({ where: { leadId, kind: KIND_RETE_PAGINA }, select: { id: true } });
  if (gia) return false;
  const lead = await db.lead.findUnique({ where: { id: leadId }, select: { name: true } });
  if (!lead) return false;
  const canali = await canaliAzienda(leadId);
  if (!canali.telefono && !canali.email && !canali.pagina) return false;
  const caso = await casoPerMessaggio(leadId, oggi);
  const dove = canali.telefono ? "WhatsApp" : canali.email ? "email" : `pagina ${NOMI[canali.piattaforma!]}`;
  await db.approvalItem.create({
    data: {
      leadId,
      kind: KIND_RETE_PAGINA,
      agent: "rete",
      title: `Non si sa chi decide in ${lead.name}: scrivi all'azienda (${dove})`,
      payload: { azienda: lead.name, ...canali, messaggio: testoMessaggioPagina(lead.name, caso?.gancio ?? null, !!caso, !!caso?.collega), casoId: caso?.casoId ?? null, collega: !!caso?.collega, versioneTesto: VERSIONE_TESTO, canaliVersione: 1 } as Prisma.InputJsonValue,
    },
  });
  return true;
}

/**
 * v3.115 (Alessio, 2026-11-06: "prima cerco WhatsApp, anche aziendale, poi la mail nel sito…"): i punti di contatto
 * dell'azienda quando chi decide non si sa. WhatsApp e mail come per il contatto diretto (cellulari e mail del sito),
 * la pagina in ordine Instagram, Facebook, LinkedIn.
 */
async function canaliAzienda(leadId: string): Promise<{ telefono: string | null; email: string | null; piattaforma: Piattaforma | null; pagina: string | null }> {
  const [c, pagine] = await Promise.all([canaleDiretto(leadId, null), pagineAzienda(leadId)]);
  const p = paginaPreferita(pagine);
  return { telefono: c.whatsapp, email: c.email, piattaforma: p?.piattaforma ?? null, pagina: p?.url ?? null };
}

/** v3.115: i messaggi "all'azienda" già pronti prendono WhatsApp e mail dell'azienda e il nuovo testo. */
export async function aggiornaCanaliPagina(): Promise<number> {
  const voci = await db.approvalItem.findMany({ where: { kind: KIND_RETE_PAGINA, status: "IN_ATTESA", leadId: { not: null } }, select: { id: true, leadId: true, payload: true, lead: { select: { name: true } } } });
  let fatte = 0;
  for (const v of voci) {
    const p = (v.payload ?? {}) as Record<string, unknown>;
    if (p.canaliVersione === 1 || !v.lead) continue;
    const canali = await canaliAzienda(v.leadId!);
    const caso = await casoPerMessaggio(v.leadId!, new Date());
    await db.approvalItem.update({
      where: { id: v.id },
      data: { payload: { ...p, ...canali, pagina: canali.pagina ?? p.pagina ?? null, piattaforma: canali.piattaforma ?? p.piattaforma ?? null, messaggio: testoMessaggioPagina(v.lead.name, caso?.gancio ?? null, !!caso, !!caso?.collega), casoId: caso?.casoId ?? p.casoId ?? null, collega: !!caso?.collega, canaliVersione: 1 } as Prisma.InputJsonValue },
    });
    fatte++;
  }
  return fatte;
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
