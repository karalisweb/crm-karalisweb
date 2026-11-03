import { db } from "@/lib/db";
import { sendInternalEmail } from "@/lib/email";
import { TrattativaStadio } from "@prisma/client";
import { mezzanotteRoma } from "@/lib/agents/bni-regole";
import { KIND_AVVISO_SETTORE, MESSAGGI_121_AL_GIORNO } from "@/lib/agents/avvisi-settore";

/**
 * Report del mattino (v3.92): tre blocchi, nell'ordine in cui servono ad Alessio.
 *   1. Oggi: cosa deve fare lui (121 e call in agenda, messaggi da mandare, membri BNI da contattare),
 *      con gli stessi tetti della pagina Oggi, così il numero è quello che troverà aprendola.
 *   2. Ieri: cosa ha fatto lui e cosa ha fatto il CRM da solo (commenti pubblicati, messaggi LinkedIn).
 *   3. I soldi: trattative aperte e quanto valgono, clienti chiusi nel mese.
 * Sotto, solo se ci sono, le cose ferme da sistemare. Il totale della Cassetta resta in fondo, piccolo:
 * da solo non dice cosa fare.
 */

const CHIUSE: TrattativaStadio[] = [TrattativaStadio.INCARICO, TrattativaStadio.EXIT, TrattativaStadio.NURTURING];
const SETTE_GIORNI = 7 * 24 * 3600_000;
const KIND_MESSAGGI = ["RETE_DIRETTO", "RETE_CONTATTO", "RETE_PAGINA"];

export interface DatiReport {
  giorno: string;
  oggi: {
    incontri: { nome: string; ora: string }[];
    call: { nome: string; ora: string }[];
    messaggiDaMandare: number;
    membriDaContattare: number;
    daPreparare: number;
    daRegistrare: number;
    aziendeDaDecidere: number;
  };
  ieri: {
    approvateDaTe: number;
    fatti121: number;
    presentazioniChieste: number;
    presentazioniOttenute: number;
    commentiCrm: number;
    messaggiCrm: number;
    callFissate: number;
  };
  soldi: { trattativeAperte: number; valoreAperte: number; clientiMese: number; valoreMese: number };
  daSistemare: { presentazioniFerme: number; segnalazioni: number };
  cassettaTotale: number;
  url: string;
}

// Il punto delle migliaia anche sotto 10.000 (l'italiano di Intl lo toglie: "8000").
const euro = (n: number) => `${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".")} €`;
const ora = (d: Date) => d.toLocaleTimeString("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit" });
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const plur = (n: number, uno: string, tanti: string) => `${n} ${n === 1 ? uno : tanti}`;

/** Le righe di ogni blocco, già in parole: le usano sia il testo semplice sia l'HTML. */
function righe(d: DatiReport) {
  const o = d.oggi;
  const oggi: string[] = [];
  for (const i of o.incontri) oggi.push(`121 alle ${i.ora} con ${i.nome}`);
  for (const c of o.call) oggi.push(`Call alle ${c.ora} con ${c.nome}`);
  if (o.messaggiDaMandare) oggi.push(`${plur(o.messaggiDaMandare, "messaggio", "messaggi")} da mandare a chi decide (Contatto)`);
  if (o.membriDaContattare) oggi.push(`${plur(o.membriDaContattare, "membro BNI", "membri BNI")} a cui chiedere un 121`);
  if (o.daPreparare) oggi.push(`Fogli dei 121 da preparare: ${o.daPreparare}`);
  if (o.daRegistrare) oggi.push(`121 da registrare (com'è andato): ${o.daRegistrare}`);
  if (o.aziendeDaDecidere) oggi.push(`${plur(o.aziendeDaDecidere, "azienda", "aziende")} da decidere`);

  const i = d.ieri;
  const ieri = [
    `Tu: ${plur(i.approvateDaTe, "cosa approvata", "cose approvate")} · 121 fatti: ${i.fatti121}`,
    `Presentazioni: ${i.presentazioniChieste} chieste, ${i.presentazioniOttenute} ottenute`,
    `Il CRM da solo: ${plur(i.commentiCrm, "commento pubblicato", "commenti pubblicati")}, ${plur(i.messaggiCrm, "messaggio LinkedIn", "messaggi LinkedIn")} a chi decide`,
  ];
  if (i.callFissate) ieri.push(`Call fissate: ${i.callFissate}`);

  const s = d.soldi;
  const soldi = [
    `Trattative aperte: ${s.trattativeAperte}${s.valoreAperte ? ` · ${euro(s.valoreAperte)} in ballo` : ""}`,
    `Clienti chiusi questo mese: ${s.clientiMese}${s.valoreMese ? ` · ${euro(s.valoreMese)}` : ""}`,
  ];

  const sistemare: string[] = [];
  if (d.daSistemare.presentazioniFerme) sistemare.push(`${d.daSistemare.presentazioniFerme} presentazioni chieste da più di 7 giorni senza risposta: richiamale`);
  if (d.daSistemare.segnalazioni) sistemare.push(`${d.daSistemare.segnalazioni} segnalazioni da dare ai membri BNI`);

  return { oggi, ieri, soldi, sistemare };
}

export function componiReport(d: DatiReport): { oggetto: string; testo: string; html: string } {
  const r = righe(d);
  const n = r.oggi.length;
  const oggetto = n ? `☀️ Oggi: ${plur(n, "cosa", "cose")} da fare` : "☀️ Oggi niente in agenda";

  const blocchi: [string, string[]][] = [
    ["📌 OGGI", n ? r.oggi : ["Niente in agenda"]],
    ["📅 IERI", r.ieri],
    ["💰 SOLDI", r.soldi],
  ];
  if (r.sistemare.length) blocchi.push(["⚠️ DA SISTEMARE", r.sistemare]);

  const testo =
    `Buongiorno Alessio, ${d.giorno}\n\n` +
    blocchi.map(([t, rr]) => `${t}\n${rr.map((x) => `• ${x}`).join("\n")}`).join("\n\n") +
    `\n\nApri Oggi: ${d.url}/\n` +
    `(In Cassetta in tutto: ${d.cassettaTotale})\n`;

  const sezione = ([titolo, rr]: [string, string[]]) =>
    `<tr><td style="padding:20px 0 6px;font-size:13px;font-weight:700;letter-spacing:.04em;color:#6b7280">${esc(titolo)}</td></tr>` +
    rr.map((x) => `<tr><td style="padding:8px 0;font-size:16px;line-height:1.4;border-bottom:1px solid #e5e7eb">${esc(x)}</td></tr>`).join("");

  const html =
    `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:520px;margin:0 auto;padding:8px 4px">` +
    `<p style="font-size:19px;margin:0 0 2px"><b>Buongiorno Alessio</b></p>` +
    `<p style="font-size:14px;color:#6b7280;margin:0">${esc(d.giorno)}</p>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${blocchi.map(sezione).join("")}</table>` +
    `<p style="margin:26px 0 8px"><a href="${d.url}/" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:8px">Apri Oggi</a></p>` +
    `<p style="font-size:12px;color:#9ca3af;margin:12px 0 0">In Cassetta in tutto: ${d.cassettaTotale}</p>` +
    `</div>`;

  return { oggetto, testo, html };
}

export async function raccogliDati(adesso = new Date()): Promise<DatiReport> {
  const oggi = mezzanotteRoma(adesso);
  const domani = mezzanotteRoma(adesso, 1);
  const finestra = { gte: mezzanotteRoma(adesso, -1), lt: oggi };
  const giornoDelMese = Number(new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Rome", day: "numeric" }).format(adesso));
  const inizioMese = mezzanotteRoma(adesso, 1 - giornoDelMese);

  const [incontri, call, messaggiDaMandare, membri, daPreparare, daRegistrare, aziendeDaDecidere, approvateDaTe, fatti121, chieste, ottenute, commentiCrm, messaggiCrm, callFissate, aperte, chiuseMese, ferme, segnalazioni, cassettaTotale] =
    await Promise.all([
      db.bniMembro.findMany({ where: { next121At: { gte: oggi, lt: domani } }, orderBy: { next121At: "asc" }, select: { name: true, next121At: true } }),
      db.trattativa.findMany({ where: { stadio: "CALL_FISSATA", callAt: { gte: oggi, lt: domani } }, orderBy: { callAt: "asc" }, select: { nome: true, callAt: true } }),
      db.approvalItem.count({ where: { status: "IN_ATTESA", kind: { in: KIND_MESSAGGI } } }),
      db.approvalItem.count({ where: { status: "IN_ATTESA", kind: KIND_AVVISO_SETTORE, payload: { path: ["azione"], equals: "121" } } }),
      db.approvalItem.count({ where: { status: "IN_ATTESA", kind: "PREPARAZIONE_121" } }),
      db.approvalItem.count({ where: { status: "IN_ATTESA", kind: "DOPO_121" } }),
      db.approvalItem.count({ where: { status: "IN_ATTESA", kind: "FASCICOLO_BASE" } }),
      db.approvalItem.count({ where: { status: "APPROVATO", decidedAt: finestra, NOT: { decidedBy: "crm_auto" } } }),
      db.oneToOne.count({ where: { date: finestra } }),
      db.bniPresentazione.count({ where: { chiestaAt: finestra } }),
      db.bniPresentazione.count({ where: { presentatoAt: finestra } }),
      db.approvalItem.count({ where: { decidedBy: "crm_auto", decidedAt: finestra, kind: "COMMENTO_LINKEDIN" } }),
      db.approvalItem.count({ where: { decidedBy: "crm_auto", decidedAt: finestra, kind: { in: KIND_MESSAGGI } } }),
      db.trattativa.count({ where: { createdAt: finestra, callAt: { not: null } } }),
      db.trattativa.aggregate({ where: { stadio: { notIn: CHIUSE } }, _count: { _all: true }, _sum: { valoreEuro: true } }),
      db.trattativa.aggregate({ where: { stadio: TrattativaStadio.INCARICO, chiusaAt: { gte: inizioMese } }, _count: { _all: true }, _sum: { valoreEuro: true } }),
      db.bniPresentazione.count({ where: { stato: "CHIESTA", chiestaAt: { lt: new Date(oggi.getTime() - SETTE_GIORNI) } } }),
      db.bniSegnalazione.count({ where: { stato: "DA_DARE" } }),
      db.approvalItem.count({ where: { status: "IN_ATTESA" } }),
    ]);

  return {
    giorno: adesso.toLocaleDateString("it-IT", { timeZone: "Europe/Rome", weekday: "long", day: "numeric", month: "long" }),
    oggi: {
      incontri: incontri.map((m) => ({ nome: m.name, ora: ora(m.next121At!) })),
      call: call.map((c) => ({ nome: c.nome, ora: ora(c.callAt!) })),
      messaggiDaMandare,
      // Come in Oggi: al massimo 5 membri al giorno.
      membriDaContattare: Math.min(membri, MESSAGGI_121_AL_GIORNO),
      daPreparare,
      daRegistrare,
      aziendeDaDecidere,
    },
    ieri: { approvateDaTe, fatti121, presentazioniChieste: chieste, presentazioniOttenute: ottenute, commentiCrm, messaggiCrm, callFissate },
    soldi: {
      trattativeAperte: aperte._count._all,
      valoreAperte: aperte._sum.valoreEuro ?? 0,
      clientiMese: chiuseMese._count._all,
      valoreMese: chiuseMese._sum.valoreEuro ?? 0,
    },
    daSistemare: { presentazioniFerme: ferme, segnalazioni },
    cassettaTotale,
    url: (process.env.NEXTAUTH_URL || "https://crm.karalisdemo.it").replace(/\/$/, ""),
  };
}

export async function sendDailyReport(): Promise<{ sent: boolean; stats: Record<string, unknown> }> {
  const dati = await raccogliDati();
  const { oggetto, testo, html } = componiReport(dati);
  const sent = await sendInternalEmail(oggetto, testo, html);
  return { sent, stats: { oggi: dati.oggi, ieri: dati.ieri, soldi: dati.soldi } };
}
