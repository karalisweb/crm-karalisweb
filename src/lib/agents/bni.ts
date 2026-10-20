/**
 * Squadra BNI — la parte che lavora sul database. Le regole sono in bni-regole.ts.
 *
 *   Cartografo (B1)       → lavoro di browser su BNI Connect; qui si importa quello che porta.
 *                           La Sardegna si rilegge ogni 30 giorni: i ruoli cambiano.
 *   Pianificatore 121     → 20 richieste di 121 a settimana, preparate alle 14 dei giorni feriali,
 *                           2 capitoli alla volta, con l'ordine di Alessio dentro ogni capitolo.
 *                           Tetto: 12 121 fissati a settimana (Motore 121, v3.52).
 *   Preparatore 121 (B3)  → il messaggio di richiesta (in cassetta: lo manda Alessio) e il foglio
 *                           del giorno prima.
 *   Copertura (B4)        → conosciuti su totale per capitolo; la visita a un terzo.
 *
 * Il dopo-121 (la scheda del membro dalla trascrizione) è in src/lib/ricerca/dopo-121.ts.
 */
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { chiediJSON, REGOLE_COMUNI, type Schema } from "./ai";
import { budgetDisponibile } from "./costi";
import { PROFILI_MEMBRI_GIORNO, richiesteDaPreparare } from "./motore-121";
import { aziendeDaCercareNellaRete, linkedinPermette, promemoriaDopo121, proponiSegnalazioni, statoLinkedinOggi } from "./motore";
import {
  capitoliInCorso,
  coperturaCapitolo,
  dirigenzaDa,
  dirigenzaNota,
  mezzanotteRoma,
  gruppiCapitolo,
  eSardo,
  formato121,
  formatoDa,
  giorniTraMappe,
  norm,
  prossimiDelCapitolo,
  REGIONI_ITALIA,
  GIORNI_SENZA_RISPOSTA,
  settimanaDi,
  visitaDaProporre,
  OBIETTIVO_121_SETTIMANA,
  type MembroPerRegole,
  type Motivo,
  type ProssimoMembro,
} from "./bni-regole";

export const KIND_MESSAGGIO_BNI = "MESSAGGIO_BNI";
export const KIND_VISITA_CAPITOLO = "VISITA_CAPITOLO";
export const KIND_PREPARAZIONE_121 = "PREPARAZIONE_121";
/** Vecchio tipo (v3.45): un'azione per capitolo. Le voci rimaste si chiudono da sole. */
const KIND_AZIONE_BNI = "AZIONE_BNI";

/** Una richiesta scartata ("non ora") non si ripropone per 30 giorni. */
const GIORNI_RINVIO = 30;
/** Il foglio del giorno prima: per i 121 delle prossime 36 ore. */
const ORE_PREPARAZIONE = 36;

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
  sede?: unknown;
  url?: unknown;
  membri?: unknown;
}

const testo = (v: unknown, max = 200): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

/**
 * Salva capitoli e membri letti da BNI Connect. Non cancella nulla: aggiunge i nuovi e completa
 * i dati di quelli che già esistono. I ruoli di dirigenza si sovrascrivono sempre: valgono quelli
 * letti adesso (chi non ha più un ruolo lo perde).
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
      sede: testo(c.sede, 300),
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
          sede: dati.sede ?? esistente.sede,
          meetingDay: dati.meetingDay ?? esistente.meetingDay,
          meetingTime: dati.meetingTime ?? esistente.meetingTime,
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
            profession: categoria ?? gia.profession,
            phone: gia.phone ?? telefono,
            leadershipRole: dirigenza,
          },
        });
        esito.membriAggiornati++;
      } else {
        await db.bniMembro.create({
          data: { name: nomeM, company: azienda, profession: categoria, phone: telefono, chapter: nome, leadershipRole: dirigenza },
        });
        esito.membriNuovi++;
      }
    }
  }
  return esito;
}

// ─── Lettura dei capitoli con i loro membri ────────────────────────────────

export interface CapitoloCaricato {
  capitolo: Prisma.BniChapterGetPayload<object>;
  membri: MembroPerRegole[];
}

/** Capitoli e membri attivi, con lo stato delle richieste di 121 di ciascun membro. */
export async function caricaCapitoli(oggi = new Date()): Promise<CapitoloCaricato[]> {
  const [capitoli, membri, richieste] = await Promise.all([
    db.bniChapter.findMany({ orderBy: { name: "asc" } }),
    db.bniMembro.findMany({
      where: { status: "ATTIVO" },
      select: {
        id: true, name: true, profession: true, company: true, phone: true, chapter: true, leadershipRole: true,
        conosciutoAt: true, oneToOneCount: true, isCustomer: true, indicatoAt: true, next121At: true,
      },
    }),
    db.approvalItem.findMany({
      where: { kind: KIND_MESSAGGIO_BNI, bniMembroId: { not: null } },
      select: { bniMembroId: true, status: true, createdAt: true, decidedAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const ultima = new Map<string, (typeof richieste)[number]>();
  for (const r of richieste) if (!ultima.has(r.bniMembroId!)) ultima.set(r.bniMembroId!, r);
  const limiteRinvio = oggi.getTime() - GIORNI_RINVIO * 86400_000;

  return capitoli.map((c) => ({
    capitolo: c,
    membri: membri
      .filter((m) => norm(m.chapter) === norm(c.name))
      .map<MembroPerRegole>((m) => {
        const r = ultima.get(m.id);
        const scartata = r?.status === "SCARTATO";
        return {
          id: m.id,
          name: m.name,
          profession: m.profession,
          company: m.company,
          phone: m.phone,
          leadershipRole: m.leadershipRole,
          conosciuto: !!m.conosciutoAt || m.oneToOneCount > 0 || m.isCustomer,
          indicato: !!m.indicatoAt,
          richiestaAt: r && !scartata ? r.createdAt : null,
          fissato121At: m.next121At && m.next121At.getTime() > oggi.getTime() - 86400_000 ? m.next121At : null,
          rinviato: scartata && (r!.decidedAt ?? r!.createdAt).getTime() > limiteRinvio,
        };
      }),
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

// ─── La settimana ──────────────────────────────────────────────────────────

export interface StatoSettimana {
  obiettivo: number;
  fatti: number;
  fissati: number;
  richiesteAperte: number;
  /** Richieste preparate dal Pianificatore da lunedì (obiettivo 20). */
  richiesteSettimana: number;
  /** 121 già fissati la settimana prossima (tetto 12). */
  fissatiProssima: number;
  inizio: Date;
  fine: Date;
}

export async function statoSettimana(oggi = new Date(), caricati?: CapitoloCaricato[]): Promise<StatoSettimana> {
  const { inizio, fine } = settimanaDi(oggi);
  const [fatti, fissati, tutti, richiesteSettimana, fissatiProssima] = await Promise.all([
    db.oneToOne.count({ where: { date: { gte: inizio, lt: fine } } }),
    db.bniMembro.count({ where: { next121At: { gte: oggi, lt: fine } } }),
    caricati ? Promise.resolve(caricati) : caricaCapitoli(oggi),
    db.approvalItem.count({ where: { kind: KIND_MESSAGGIO_BNI, agent: { not: "alessio" }, createdAt: { gte: inizio } } }),
    db.bniMembro.count({ where: { next121At: { gte: fine, lt: new Date(fine.getTime() + 7 * 86400_000) } } }),
  ]);
  return { obiettivo: OBIETTIVO_121_SETTIMANA, fatti, fissati, richiesteAperte: contaAperte(tutti, oggi), richiesteSettimana, fissatiProssima, inizio, fine };
}

/** Richieste mandate (o in cassetta) da meno di 14 giorni, a chi non è ancora stato incontrato. */
function contaAperte(tutti: CapitoloCaricato[], oggi: Date): number {
  const limite = oggi.getTime() - 2 * GIORNI_SENZA_RISPOSTA * 86400_000;
  return tutti.flatMap((t) => t.membri).filter((m) => !m.conosciuto && !m.fissato121At && m.richiestaAt && m.richiestaAt.getTime() > limite).length;
}

/** Le prossime persone a cui chiedere, dai capitoli in corso; se non bastano, dagli altri. */
export function scegliProssimi(tutti: CapitoloCaricato[], quanti: number, oggi: Date): (ProssimoMembro & { capitolo: CapitoloCaricato["capitolo"] })[] {
  // Il collega di mestiere ha detto no: il capitolo non si lavora con i 121 (Motore 121).
  const candidati = tutti.filter((t) => t.capitolo.permesso !== "NEGATO").map((t) => ({ t, prossimi: prossimiDelCapitolo(t.membri, oggi, dirigenzaNota(t.capitolo, t.membri)) }));
  const perScelta = candidati.map(({ t, prossimi }) => {
    const cop = coperturaCapitolo(t.membri);
    return { id: t.capitolo.id, nome: t.capitolo.name, sardo: eSardo(t.capitolo), mio: t.capitolo.isMine, conosciuti: cop.conosciuti, totale: cop.totale, daChiedere: prossimi.length };
  });
  const ordine = capitoliInCorso(perScelta, perScelta.length).map((c) => c.id);
  const code = ordine.map((id) => {
    const x = candidati.find((c) => c.t.capitolo.id === id)!;
    return x.prossimi.map((p) => ({ ...p, capitolo: x.t.capitolo }));
  });
  const scelti: (ProssimoMembro & { capitolo: CapitoloCaricato["capitolo"] })[] = [];
  // Prima i 2 capitoli in corso, a turno; poi, se non bastano, gli altri nello stesso ordine.
  const giri = [code.slice(0, 2), code.slice(2)];
  for (const gruppo of giri) {
    let preso = true;
    while (scelti.length < quanti && preso) {
      preso = false;
      for (const coda of gruppo) {
        const p = coda.shift();
        if (p && scelti.length < quanti) {
          scelti.push(p);
          preso = true;
        }
      }
    }
  }
  return scelti;
}

// ─── Il turno BNI ──────────────────────────────────────────────────────────

export interface RiepilogoBni {
  settimana: StatoSettimana;
  richiesteNuove: number;
  visiteProposte: number;
  preparazioni: number;
  retiAccodate: number;
  mappeAccodate: number;
  saltatiPerBudget: number;
  vecchieChiuse: number;
  riscritte: number;
  profiliLinkedin: number;
  promemoria: number;
  linkedinFermo: boolean;
  coperturaSardegna: { capitoli: number; membri: number; conosciuti: number; percentuale: number } | null;
}

/**
 * Il turno BNI. "mattina" (alle 7): copertura, foglio del giorno prima, rete dei membri, profili
 * LinkedIn, promemoria del vocale, mappa. "richieste" (alle 14 dei feriali): le richieste di 121
 * da mandare al pomeriggio. "tutto": il pulsante "Prepara le richieste adesso".
 */
export type FaseBni = "mattina" | "richieste" | "tutto";

export async function eseguiTurnoBni(oggi = new Date(), fase: FaseBni = "tutto"): Promise<RiepilogoBni> {
  // Le azioni per capitolo della v3.45 non esistono più: si chiudono quelle rimaste aperte.
  const vecchie = await db.approvalItem.updateMany({
    where: { kind: KIND_AZIONE_BNI, status: "IN_ATTESA" },
    data: { status: "SCARTATO", note: "Superata: dalla v3.47 i 121 si pianificano persona per persona", decidedAt: oggi },
  });

  let tutti = await caricaCapitoli(oggi);
  const r: RiepilogoBni = {
    settimana: await statoSettimana(oggi, tutti),
    richiesteNuove: 0, visiteProposte: 0, preparazioni: 0, retiAccodate: 0, mappeAccodate: 0, saltatiPerBudget: 0,
    vecchieChiuse: vecchie.count, riscritte: 0, profiliLinkedin: 0, promemoria: 0, linkedinFermo: false, coperturaSardegna: null,
  };
  const mattina = fase !== "richieste";
  const richieste = fase !== "mattina";

  // B4 — Copertura (ogni giorno: è un conteggio, non costa nulla) e visita a un terzo.
  let membriSardi = 0;
  let conosciutiSardi = 0;
  let capitoliSardi = 0;
  for (const { capitolo, membri } of mattina ? tutti : []) {
    if (!membri.length) continue;
    const cop = coperturaCapitolo(membri);
    if (eSardo(capitolo)) {
      capitoliSardi++;
      membriSardi += cop.totale;
      conosciutiSardi += cop.conosciuti;
    }
    await salvaRefertoCapitolo(capitolo.id, "copertura_sardegna", `${capitolo.name}: conosci ${cop.conosciuti} su ${cop.totale} (${cop.percentuale}%)`, cop, 1, oggi);
    if (visitaDaProporre({ ...cop, visitStatus: capitolo.visitStatus, mio: capitolo.isMine })) {
      const gia = await db.approvalItem.findFirst({ where: { bniChapterId: capitolo.id, kind: KIND_VISITA_CAPITOLO } });
      if (!gia) {
        const fatto = await proponiVisita(capitolo, membri, cop, oggi);
        if (fatto === "budget") r.saltatiPerBudget++;
        else if (fatto) r.visiteProposte++;
      }
    }
  }
  if (capitoliSardi) {
    r.coperturaSardegna = {
      capitoli: capitoliSardi,
      membri: membriSardi,
      conosciuti: conosciutiSardi,
      percentuale: membriSardi ? Math.round((conosciutiSardi / membriSardi) * 100) : 0,
    };
  }

  // Le richieste in attesa scritte col modello vecchio si riscrivono con quello di Alessio.
  if (mattina) r.riscritte = await riscriviRichiesteVecchie(tutti, oggi);

  // Pianificatore — 20 richieste a settimana divise sui giorni feriali, tetto di 12 121 fissati.
  // Gli inviti fatti da Alessio di sua iniziativa non tolgono posto a quelli del Pianificatore.
  if (richieste) {
    const stato = { preparateSettimana: r.settimana.richiesteSettimana, questaSettimana: r.settimana.fatti + r.settimana.fissati, prossimaSettimana: r.settimana.fissatiProssima };
    let quante = richiesteDaPreparare(stato, oggi);
    // Il pulsante "adesso" funziona anche nel fine settimana, sempre dentro le 20 e il tetto.
    if (fase === "tutto" && !quante && Math.max(stato.questaSettimana, stato.prossimaSettimana) < 12) quante = Math.min(4, Math.max(0, 20 - stato.preparateSettimana));
    const silenti = colleghiSenzaRisposta(tutti, oggi);
    for (const p of scegliProssimi(tutti, quante, oggi)) {
      const fatto = await preparaRichiesta(p, oggi, silenti.get(p.capitolo.id) ?? []);
      if (fatto === "budget") {
        r.saltatiPerBudget++;
        break;
      }
      if (fatto) r.richiesteNuove++;
    }
    if (r.richiesteNuove) {
      tutti = await caricaCapitoli(oggi);
      r.settimana = await statoSettimana(oggi, tutti);
    }
  }

  // Dopo il 121: se non è registrato, un promemoria per il vocale.
  r.promemoria = await promemoriaDopo121(oggi);
  if (!mattina) return r;

  // Prima del 121: la rete LinkedIn del membro (con le aziende da cercare fra i suoi collegamenti),
  // i contatti da segnalargli e il foglio del giorno prima.
  const imminenti = await db.bniMembro.findMany({
    where: { next121At: { gte: new Date(oggi.getTime() - 3600_000), lte: new Date(oggi.getTime() + GIORNI_PRIMA_RETE * 86400_000) } },
    orderBy: { next121At: "asc" },
    select: { id: true, next121At: true, reteLettaAt: true },
  });
  for (const m of imminenti) {
    if (!m.reteLettaAt && (await accodaReteMembro(m.id, oggi))) r.retiAccodate++;
    if (m.next121At!.getTime() <= oggi.getTime() + ORE_PREPARAZIONE * 3600_000) {
      await proponiSegnalazioni(m.id, oggi);
      if (await preparaFoglio121(m.id, m.next121At!)) r.preparazioni++;
    }
  }

  // Collegarsi su LinkedIn con tutti i membri: i profili da cercare, dentro il budget LinkedIn comune.
  r.profiliLinkedin = await accodaProfiliLinkedin(oggi);
  r.linkedinFermo = (await statoLinkedinOggi(oggi)).blocco;

  // B1 — Cartografo: una regione per volta; la Sardegna ogni 30 giorni.
  r.mappeAccodate = await accodaMappa(tutti, oggi);
  return r;
}

/**
 * Per ogni capitolo, i colleghi di mestiere a cui è stata mandata la richiesta da più di 7 giorni
 * senza risposta: si passa alla dirigenza e lo si dice al presidente.
 */
function colleghiSenzaRisposta(tutti: CapitoloCaricato[], oggi: Date): Map<string, string[]> {
  const limite = oggi.getTime() - GIORNI_SENZA_RISPOSTA * 86400_000;
  const out = new Map<string, string[]>();
  for (const t of tutti) {
    if (t.capitolo.permesso === "CONCESSO") continue;
    const gruppo = gruppiCapitolo(t.membri, dirigenzaNota(t.capitolo, t.membri)).find((g) => g.motivo === "STESSO_RUOLO");
    const silenti = (gruppo?.membri ?? []).filter((m) => !m.conosciuto && !m.fissato121At && m.richiestaAt && m.richiestaAt.getTime() <= limite).map((m) => m.name);
    if (silenti.length) out.set(t.capitolo.id, silenti);
  }
  return out;
}

// ─── Cartografo: quale regione rileggere ───────────────────────────────────

async function accodaMappa(tutti: CapitoloCaricato[], oggi: Date): Promise<number> {
  const attivo = await db.agentRun.findFirst({ where: { agent: "cartografo_bni", status: { in: ["IN_CODA", "IN_CORSO"] } } });
  if (attivo) return 0;
  const recenti = await db.agentRun.findMany({
    where: { agent: "cartografo_bni", status: { in: ["FATTO", "IN_CODA", "IN_CORSO"] }, queuedAt: { gt: new Date(oggi.getTime() - 90 * 86400_000) } },
    select: { input: true, queuedAt: true },
  });
  const ultimaVolta = (regione: string) =>
    Math.max(0, ...recenti.filter((x) => norm((x.input as { regione?: string } | null)?.regione) === norm(regione)).map((x) => x.queuedAt.getTime()));
  // Prima le regioni dei capitoli senza membri, poi l'ordine fisso (Sardegna per prima).
  const senzaMembri = tutti.filter((t) => !t.membri.length && t.capitolo.regioneItaliana).map((t) => t.capitolo.regioneItaliana!);
  const regione = [...senzaMembri, ...REGIONI_ITALIA].find((g) => oggi.getTime() - ultimaVolta(g) > giorniTraMappe(g) * 86400_000);
  if (!regione) return 0;
  await db.agentRun.create({ data: { agent: "cartografo_bni", status: "IN_CODA", input: { regione } } });
  return 1;
}

/**
 * La richiesta di 121 ancora in cassetta non serve più quando il 121 è fissato o fatto: si chiude
 * da sola (come "mandata": evidentemente è partita).
 */
export async function chiudiRichiesteSuperate(membroId: string, motivo: string, oggi = new Date()): Promise<number> {
  const r = await db.approvalItem.updateMany({
    where: { bniMembroId: membroId, kind: KIND_MESSAGGIO_BNI, status: "IN_ATTESA" },
    data: { status: "APPROVATO", note: motivo, decidedAt: oggi },
  });
  return r.count;
}

// ─── Collegarsi su LinkedIn con tutti i membri ─────────────────────────────

/** Profili da cercare ogni giorno: LinkedIn non va stressato (budget comune, Motore 121). */
export const PROFILI_LINKEDIN_AL_GIORNO = PROFILI_MEMBRI_GIORNO;
export const STATI_LINKEDIN = ["NON_TROVATO", "DA_COLLEGARE", "RICHIESTA_INVIATA", "COLLEGATI"] as const;

/**
 * Accoda la ricerca dei profili LinkedIn dei prossimi 20 membri (prima quelli che Alessio conosce
 * già: accettano più volentieri). Chi ha già un profilo salvato passa direttamente a "da collegare".
 */
export async function accodaProfiliLinkedin(oggi = new Date()): Promise<number> {
  await db.bniMembro.updateMany({
    where: { status: "ATTIVO", linkedinStato: null, linkedinUrl: { not: null } },
    data: { linkedinStato: "DA_COLLEGARE", linkedinStatoAt: oggi },
  });
  const gia = await db.agentRun.findFirst({
    where: { agent: "linkedin_membri", OR: [{ status: { in: ["IN_CODA", "IN_CORSO"] } }, { queuedAt: { gte: mezzanotteRoma(oggi) } }] },
  });
  if (gia) return 0;
  const membri = await db.bniMembro.findMany({
    where: { status: "ATTIVO", linkedinStato: null, linkedinUrl: null },
    select: { id: true, name: true, company: true, profession: true, chapter: true, conosciutoAt: true, oneToOneCount: true },
  });
  if (!membri.length) return 0;
  membri.sort((a, b) => Number(!!b.conosciutoAt || b.oneToOneCount > 0) - Number(!!a.conosciutoAt || a.oneToOneCount > 0) || (a.chapter ?? "").localeCompare(b.chapter ?? "") || a.name.localeCompare(b.name));
  const disponibili = (await statoLinkedinOggi(oggi)).disponibili;
  const lotto = membri.slice(0, Math.min(PROFILI_LINKEDIN_AL_GIORNO, disponibili));
  if (!lotto.length) return 0;
  await db.agentRun.create({
    data: {
      agent: "linkedin_membri",
      status: "IN_CODA",
      input: { membri: lotto.map((m) => ({ id: m.id, nome: m.name, azienda: m.company, categoria: m.profession, capitolo: m.chapter })) },
    },
  });
  return lotto.length;
}

/** I profili trovati dall'agente: salvati sul membro con lo stato del collegamento. */
export async function importaProfiliMembri(findings: Record<string, unknown>, oggi = new Date()): Promise<{ nuove: number; esistenti: number; scartate: number }> {
  const profili = Array.isArray(findings.profili) ? (findings.profili as Record<string, unknown>[]) : [];
  const e = { nuove: 0, esistenti: 0, scartate: 0 };
  for (const p of profili.slice(0, 50)) {
    const id = typeof p.id === "string" ? p.id : null;
    if (!id) continue;
    const stato = (STATI_LINKEDIN as readonly string[]).includes(String(p.stato)) ? String(p.stato) : "NON_TROVATO";
    const url = typeof p.profilo === "string" ? (p.profilo.match(/linkedin\.com\/in\/[^/?#\s]+/i)?.[0] ?? null) : null;
    const r = await db.bniMembro.updateMany({
      where: { id },
      data: url && stato !== "NON_TROVATO"
        ? { linkedinUrl: `https://www.${url.toLowerCase()}`, linkedinStato: stato, linkedinStatoAt: oggi }
        : { linkedinStato: "NON_TROVATO", linkedinStatoAt: oggi },
    });
    if (!r.count) e.scartate++;
    else if (url && stato !== "NON_TROVATO") e.nuove++;
    else e.esistenti++;
  }
  return e;
}

// ─── Rete del membro (lavoro di browser su LinkedIn) ───────────────────────

/** Quanti giorni prima del 121 si legge la rete del membro (dentro il budget LinkedIn comune). */
const GIORNI_PRIMA_RETE = 3;

/** Accoda la lettura della rete LinkedIn di un membro, se non è già in corso o fatta da poco. */
export async function accodaReteMembro(membroId: string, oggi = new Date()): Promise<boolean> {
  const gia = await db.agentRun.findFirst({
    where: { agent: "rete_membro", bniMembroId: membroId, OR: [{ status: { in: ["IN_CODA", "IN_CORSO"] } }, { queuedAt: { gt: new Date(oggi.getTime() - 30 * 86400_000) } }] },
  });
  if (gia) return false;
  const membro = await db.bniMembro.findUnique({ where: { id: membroId }, select: { name: true, company: true, profession: true, chapter: true, linkedinUrl: true } });
  if (!membro) return false;
  const settori = await db.casoStudio.findMany({ where: { stato: "ATTIVO" }, select: { settore: true } });
  const input = {
    membro: { nome: membro.name, azienda: membro.company, categoria: membro.profession, capitolo: membro.chapter, linkedin: membro.linkedinUrl },
    settoriCasiStudio: settori.map((s) => s.settore).filter(Boolean),
    // Passo 5, l'incrocio: le aziende del serbatoio da cercare fra i suoi collegamenti.
    aziendeDaCercare: await aziendeDaCercareNellaRete(membroId),
  };
  // LinkedIn non va stressato: il lavoro parte solo se il budget del giorno lo permette.
  if (!(await linkedinPermette("rete_membro", input, oggi))) return false;
  await db.agentRun.create({ data: { agent: "rete_membro", bniMembroId: membroId, status: "IN_CODA", input } });
  return true;
}

// ─── Preparatore 121: la richiesta ─────────────────────────────────────────

interface RispostaMessaggio {
  messaggio: string;
  nota_per_alessio: string;
}

const SCHEMA_MESSAGGIO: Schema = {
  type: "object",
  properties: {
    messaggio: { type: "string", description: "Il messaggio WhatsApp, un solo paragrafo, con il link alle disponibilità, firmato Alessio" },
    nota_per_alessio: { type: "string", description: "Una riga per Alessio: cosa chiedere o portare al 121" },
  },
  required: ["messaggio", "nota_per_alessio"],
};

const SCOPI: Record<Motivo, string> = {
  STESSO_RUOLO:
    "presentarsi a un collega che nel suo capitolo fa il suo stesso mestiere (web, marketing, comunicazione). Alessio lo contatta per primo, per rispetto: occupa quella posizione nel capitolo. Più che chiedere un permesso, lo informa: prima di conoscere gli altri membri del capitolo vuole conoscere lui. Proponi di conoscersi e di capire come collaborare da partner (ognuno fa la sua parte, ci si passano i lavori), senza nessuna concorrenza",
  DIRIGENZA: "chiedere un 121 a chi guida il capitolo (presidenza, formazione o eventi) per presentarsi e conoscersi",
  PRESIDENTE:
    "chiedere un 121 al presidente del capitolo per presentarsi. Nel 121 Alessio gli chiederà chi sono i membri più attivi: nel messaggio basta proporre di conoscersi",
  INDICATO: "chiedere un 121 per conoscersi: è stato indicato ad Alessio come uno dei membri più attivi del capitolo",
  ALTRI: "chiedere un 121 per conoscersi: Alessio vuole conoscere tutti i membri BNI, una segnalazione può nascere da chiunque",
};


const NOTE_MOTIVO: Record<Motivo, string> = {
  STESSO_RUOLO: "Fa il tuo mestiere: va per primo. Più che chiedere il permesso, informalo e proponi di fare i partner.",
  DIRIGENZA: "Guida il capitolo.",
  PRESIDENTE: "Nel capitolo nessuno fa il tuo mestiere: si parte dal presidente. Chiedigli chi sono i più attivi.",
  INDICATO: "Indicato come uno dei più attivi.",
  ALTRI: "Da conoscere: in BNI contano tutti.",
};

/** Il link alle disponibilità di Alessio (Google Calendar), messo in ogni richiesta di 121. */
export const LINK_DISPONIBILITA = process.env.BNI_LINK_DISPONIBILITA || "https://calendar.app.google/XUssH72ZnzNSB6fy6";
/** Versione del modello di messaggio: le richieste in attesa scritte col modello vecchio si riscrivono. */
const MODELLO_MESSAGGIO = 2;

const ESEMPIO_MESSAGGIO = `Ciao Cosima, sono Alessio Loi di Karalisweb, web e marketing digitale, Capitolo Atlantide di Cagliari. Ho visto che sei nel Saint Remy come geologa: collabori con studi tecnici e imprese che spesso hanno bisogno di farsi trovare online, e potremmo passarci referenze. Ti va di fare un 121, con un caffè o in videochiamata? Qui vedi le mie disponibilità: ${LINK_DISPONIBILITA} , scegli tu il momento che ti è comodo. Alessio`;

type Capitolo121 = { name: string; city: string | null; isMine: boolean };

/** Scrive la richiesta di 121 con il modello di Alessio. */
async function scriviRichiesta(membro: { name: string; company: string | null; profession: string | null; indicatoDa: string | null }, capitolo: Capitolo121, motivo: Motivo) {
  return chiediJSON<RispostaMessaggio>({
    sistema: `${REGOLE_COMUNI}\n\nSei il Preparatore 121 della squadra BNI di Alessio Loi. Scrivi il messaggio WhatsApp con cui Alessio chiede un 121 a un membro BNI. Segui ESATTAMENTE la struttura di questo esempio, cambiando solo nome, capitolo, mestiere e la frase sul perché ha senso conoscersi:\n\n"${ESEMPIO_MESSAGGIO}"\n\nRegole: presentazione sempre "Alessio Loi di Karalisweb, web e marketing digitale, Capitolo Atlantide di Cagliari" (se il membro è anche lui dell'Atlantide scrivi "anche io nel Capitolo Atlantide"). La frase sul perché deve essere concreta per il suo mestiere: con chi lavora lui che potrebbe aver bisogno di Alessio, e viceversa; niente frasi generiche, niente vendita. Il link alle disponibilità va sempre, identico. Firma "Alessio". Un solo paragrafo, niente a capo.`,
    testo: [
      `MOTIVO DEL CONTATTO: ${SCOPI[motivo]}`,
      `MEMBRO: ${membro.name}${membro.company ? `, azienda ${membro.company}` : ""}${membro.profession ? `, mestiere: ${membro.profession}` : ""}`,
      `CAPITOLO DEL MEMBRO: ${capitolo.name}${capitolo.city ? ` (${capitolo.city})` : ""}${capitolo.isMine ? " — è lo stesso capitolo di Alessio" : ""}`,
      membro.indicatoDa ? `CHI L'HA INDICATO: ${membro.indicatoDa}` : null,
      `LINK DISPONIBILITÀ: ${LINK_DISPONIBILITA}`,
    ].filter(Boolean).join("\n"),
    schema: SCHEMA_MESSAGGIO,
  });
}

async function preparaRichiesta(p: ProssimoMembro & { capitolo: CapitoloCaricato["capitolo"] }, oggi: Date, colleghiSilenti: string[] = []): Promise<boolean | "budget"> {
  if (!(await budgetDisponibile(oggi)).ok) return "budget";
  const membro = await db.bniMembro.findUnique({ where: { id: p.membro.id } });
  if (!membro) return false;
  const formato = formato121(formatoDa(p.capitolo.mode));
  const run = await db.agentRun.create({ data: { bniMembroId: membro.id, agent: "preparatore_121", status: "IN_CORSO", attempts: 1, startedAt: new Date() } });
  try {
    const ai = await scriviRichiesta(membro, p.capitolo, p.motivo);
    await db.$transaction([
      db.agentReport.create({
        data: {
          bniMembroId: membro.id,
          agent: "preparatore_121",
          runId: run.id,
          summary: `Richiesta di 121 per ${membro.name} (${p.motivo})`,
          findings: { ...ai.dati, motivo: p.motivo, formato, motoreAI: `${ai.motore} ${ai.modello}` } as Prisma.InputJsonValue,
          confidence: "MEDIA",
          collectedAt: oggi,
          validUntil: new Date(oggi.getTime() + 30 * 86400_000),
        },
      }),
      db.agentRun.update({ where: { id: run.id }, data: { status: "FATTO", finishedAt: new Date(), costCents: ai.costCents } }),
      db.approvalItem.create({
        data: {
          bniMembroId: membro.id,
          bniChapterId: p.capitolo.id,
          kind: KIND_MESSAGGIO_BNI,
          agent: "preparatore_121",
          title: `121 con ${membro.name}`,
          payload: {
            ...ai.dati,
            tipo: p.motivo,
            perche:
              colleghiSilenti.length && (p.motivo === "PRESIDENTE" || (p.motivo === "DIRIGENZA" && membro.leadershipRole === "PRESIDENTE"))
                ? `${NOTE_MOTIVO[p.motivo]} Il collega di mestiere (${colleghiSilenti.join(", ")}) non ha risposto in 7 giorni: diglielo al 121.`
                : NOTE_MOTIVO[p.motivo],
            formato,
            telefono: membro.phone,
            capitolo: p.capitolo.name,
            modello: MODELLO_MESSAGGIO,
          } as Prisma.InputJsonValue,
        },
      }),
    ]);
    return true;
  } catch (err) {
    await db.agentRun.update({
      where: { id: run.id },
      data: { status: "FALLITO", finishedAt: new Date(), error: (err instanceof Error ? err.message : String(err)).slice(0, 500) },
    });
    return false;
  }
}

/**
 * L'invito scritto al volo quando Alessio apre un membro e vuole invitarlo di sua iniziativa.
 * Se c'è già una richiesta da mandare per lui, si riusa quella.
 */
export async function invitoManuale(membroId: string, oggi = new Date()): Promise<string> {
  const gia = await db.approvalItem.findFirst({ where: { bniMembroId: membroId, kind: KIND_MESSAGGIO_BNI, status: "IN_ATTESA" }, select: { id: true } });
  if (gia) return gia.id;
  const membro = await db.bniMembro.findUnique({ where: { id: membroId } });
  if (!membro) throw new Error("Membro non trovato");
  const tutti = await caricaCapitoli(oggi);
  const t = tutti.find((x) => x.membri.some((m) => m.id === membroId));
  const capitolo = t?.capitolo ?? { id: null, name: membro.chapter ?? "", city: null, isMine: false, mode: null };
  const motivo: Motivo = (t ? gruppiCapitolo(t.membri).find((g) => g.membri.some((x) => x.id === membroId))?.motivo : null) ?? "ALTRI";
  const ai = await scriviRichiesta(membro, capitolo, motivo);
  const voce = await db.approvalItem.create({
    data: {
      bniMembroId: membro.id,
      bniChapterId: capitolo.id,
      kind: KIND_MESSAGGIO_BNI,
      agent: "alessio",
      title: `121 con ${membro.name}`,
      payload: {
        ...ai.dati,
        tipo: motivo,
        perche: "Invito tuo",
        formato: formato121(formatoDa(capitolo.mode)),
        telefono: membro.phone,
        capitolo: capitolo.name,
        modello: MODELLO_MESSAGGIO,
        manuale: true,
      } as Prisma.InputJsonValue,
    },
  });
  return voce.id;
}

/**
 * Le richieste ancora da mandare scritte con un modello vecchio si riscrivono (stesso membro, motivo
 * ricalcolato con le regole di oggi). Quelle di chi nel frattempo è conosciuto si chiudono.
 */
export async function riscriviRichiesteVecchie(tutti: CapitoloCaricato[], oggi = new Date()): Promise<number> {
  const voci = await db.approvalItem.findMany({ where: { kind: KIND_MESSAGGIO_BNI, status: "IN_ATTESA" } });
  let riscritte = 0;
  for (const v of voci) {
    const pl = v.payload as { modello?: number };
    if (pl.modello === MODELLO_MESSAGGIO || !v.bniMembroId) continue;
    const t = tutti.find((x) => x.membri.some((m) => m.id === v.bniMembroId));
    const m = t?.membri.find((x) => x.id === v.bniMembroId);
    if (!t || !m || m.conosciuto) {
      await db.approvalItem.update({ where: { id: v.id }, data: { status: "SCARTATO", note: "Superata: membro già conosciuto o non più nel capitolo", decidedAt: oggi } });
      continue;
    }
    if (!(await budgetDisponibile(oggi)).ok) break;
    const gruppo = gruppiCapitolo(t.membri).find((g) => g.membri.some((x) => x.id === m.id));
    const motivo: Motivo = gruppo?.motivo ?? "ALTRI";
    const membro = await db.bniMembro.findUnique({ where: { id: m.id } });
    if (!membro) continue;
    try {
      const ai = await scriviRichiesta(membro, t.capitolo, motivo);
      await db.approvalItem.update({
        where: { id: v.id },
        data: { payload: { ...(v.payload as object), ...ai.dati, tipo: motivo, perche: NOTE_MOTIVO[motivo], telefono: membro.phone, modello: MODELLO_MESSAGGIO } as Prisma.InputJsonValue },
      });
      riscritte++;
    } catch {
      /* si riprova al prossimo turno */
    }
  }
  return riscritte;
}

// ─── Visita al capitolo ────────────────────────────────────────────────────

async function proponiVisita(
  capitolo: CapitoloCaricato["capitolo"],
  membri: MembroPerRegole[],
  cop: { conosciuti: number; totale: number },
  oggi: Date
): Promise<boolean | "budget"> {
  if (!(await budgetDisponibile(oggi)).ok) return "budget";
  const presidente = membri.find((m) => m.leadershipRole === "PRESIDENTE") ?? null;
  const formato = formatoDa(capitolo.mode);
  const quando = [capitolo.meetingDay, capitolo.meetingTime].filter(Boolean).join(" alle ");
  try {
    const ai = await chiediJSON<RispostaMessaggio>({
      sistema: `${REGOLE_COMUNI}\n\nSei il Preparatore 121 della squadra BNI di Alessio Loi. Scrivi il messaggio WhatsApp con cui Alessio chiede al presidente di un capitolo BNI di partecipare come visitatore a una riunione. Alessio ha già conosciuto con un 121 una parte dei membri del capitolo: dillo con naturalezza, senza numeri precisi.`,
      testo: [
        `CAPITOLO: ${capitolo.name}${capitolo.city ? `, ${capitolo.city}` : ""}`,
        `RIUNIONE: ${formato === "ONLINE" ? "online" : formato === "IBRIDO" ? "ibrida (in presenza e online)" : "in presenza"}${quando ? `, ${quando}` : ""}${capitolo.sede ? `, ${capitolo.sede}` : ""}`,
        presidente ? `PRESIDENTE: ${presidente.name}` : "PRESIDENTE: non noto. Saluta con un semplice \"Ciao\", senza nome e senza titoli.",
      ].join("\n"),
      schema: SCHEMA_MESSAGGIO,
    });
    await db.approvalItem.create({
      data: {
        bniChapterId: capitolo.id,
        bniMembroId: presidente?.id ?? null,
        kind: KIND_VISITA_CAPITOLO,
        agent: "copertura_sardegna",
        title: `Visita al capitolo ${capitolo.name}`,
        payload: {
          ...ai.dati,
          perche: `Hai conosciuto ${cop.conosciuti} membri su ${cop.totale}: è il momento della visita, ti conoscono già.`,
          telefono: presidente?.phone ?? null,
          capitolo: capitolo.name,
          formato,
          quando: quando || null,
          sede: capitolo.sede,
        } as Prisma.InputJsonValue,
      },
    });
    return true;
  } catch {
    return false;
  }
}

// ─── Il foglio del giorno prima (niente AI: solo fatti della scheda) ────────

async function preparaFoglio121(membroId: string, quando: Date): Promise<boolean> {
  const gia = await db.approvalItem.findFirst({
    where: { kind: KIND_PREPARAZIONE_121, bniMembroId: membroId, createdAt: { gt: new Date(quando.getTime() - 3 * 86400_000) } },
  });
  if (gia) return false;
  const [m, presentazioni, caso, capitolo] = await Promise.all([
    db.bniMembro.findUnique({ where: { id: membroId } }),
    db.bniPresentazione.findMany({ where: { membroId, stato: "DA_CHIEDERE" }, orderBy: [{ forza: "desc" }, { createdAt: "asc" }], take: 3 }),
    db.casoStudio.findFirst({ where: { stato: "ATTIVO", storia: { not: null } }, orderBy: { confermatoAt: "desc" } }),
    db.bniMembro.findUnique({ where: { id: membroId }, select: { chapter: true } }).then((x) => (x?.chapter ? db.bniChapter.findFirst({ where: { name: { equals: x.chapter, mode: "insensitive" } } }) : null)),
  ]);
  if (!m) return false;
  const segnalazioni = await db.bniSegnalazione.findMany({ where: { membroId, stato: "DA_DARE" }, orderBy: { createdAt: "desc" }, take: 2 });
  const altri = capitolo
    ? await db.bniMembro.count({ where: { chapter: { equals: capitolo.name, mode: "insensitive" }, status: "ATTIVO" } })
    : 0;
  await db.approvalItem.create({
    data: {
      bniMembroId: m.id,
      bniChapterId: capitolo?.id ?? null,
      kind: KIND_PREPARAZIONE_121,
      agent: "preparatore_121",
      title: `Domani: 121 con ${m.name}`,
      payload: {
        quando: quando.toISOString(),
        chi: [m.name, m.company, m.profession].filter(Boolean).join(" · "),
        capitolo: m.chapter,
        ruolo: m.leadershipRole,
        cosaFa: m.cosaFa,
        referenzeCerca: m.seeking,
        referenzePuoDare: m.referenzePuoDare,
        linkedin: m.linkedinUrl,
        presentazioni: presentazioni.map((p) => ({ nome: p.nome, ruolo: p.ruolo, perche: p.perche, linkedin: p.linkedinUrl, punti: p.puntiContatto, forza: p.forza })),
        segnalazioni: segnalazioni.map((s) => ({ nome: s.nome, motivo: s.motivo })),
        pagina: `/bni/121/${m.id}`,
        ricorda: "Al primo 121 non si vende: dai i contatti, chiedi le presentazioni.",
        casoStudio: caso ? { titolo: caso.titolo, storia: caso.storia } : null,
        domande: [
          "Chi è il tuo cliente ideale? Fammi un esempio concreto dell'ultima persona giusta per te.",
          "Chi conosci tra i tuoi clienti e nel tuo giro? Che tipo di aziende vedi ogni settimana?",
          ...(presentazioni.length ? ["Ho visto che conosci alcune persone su LinkedIn: le conosci bene? Me le presenteresti?"] : []),
          ...(m.leadershipRole === "PRESIDENTE" ? [`Chi sono i membri più attivi o più interessanti del capitolo${altri ? ` (${altri} membri)` : ""}?`] : []),
        ],
      } as Prisma.InputJsonValue,
    },
  });
  return true;
}
