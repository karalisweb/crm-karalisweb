import { db } from "@/lib/db";
import { sendInternalEmail } from "@/lib/email";
import { KIND_FASCICOLO_BASE } from "@/lib/agents/turno";
import { TrattativaStadio } from "@prisma/client";

/**
 * Report del mattino (v3.61): cosa è successo ieri nel Motore 121 e cosa aspetta Alessio.
 * In cima la Cassetta, perché se non la guarda si ferma tutto; poi i 121, le presentazioni
 * (quelle ferme da più di 7 giorni vanno richiamate), le segnalazioni da dare, le aziende nuove
 * con chi decide collegato, le trattative aperte. Il drip a freddo è uscito: è spento dal 2026-10-20.
 * Le aziende da decidere hanno la loro mail delle 7 (agents/mail-decisioni.ts).
 */

/** Come si chiama ogni voce della Cassetta nella mail: corto, al plurale dove serve. */
const VOCI_CASSETTA: Record<string, string> = {
  FASCICOLO_BASE: "aziende da decidere",
  SCHEDA_CONTATTO: "aziende pronte al contatto",
  AZIONE_BNI: "azioni BNI",
  MESSAGGIO_BNI: "richieste di 121",
  VISITA_CAPITOLO: "visite a capitoli",
  PREPARAZIONE_121: "121 da preparare",
  DOPO_121: "121 da registrare",
  PRESENTAZIONE_BNI: "presentazioni da chiedere",
  RETE_PONTE: "\"me lo presenti?\"",
  RETE_DIRETTO: "messaggi a chi decide",
  RETE_PROMEMORIA: "promemoria ai ponti",
  COMMENTO_LINKEDIN: "commenti alle pagine",
  RETE_CONTATTO: "contatti dopo i commenti",
  RETE_PAGINA: "messaggi alle pagine",
  PROPOSTA_MSD: "proposte MSD",
  MSD_FUORI_TARGET: "interessati fuori target",
  RICHIAMO_MSD: "richiami dopo la proposta",
  PREPARAZIONE_CALL: "call da preparare",
  DOPO_CALL: "messaggi dopo la call",
  RECALL: "recall",
  NURTURING_PROPOSTO: "senza risposta",
  MESSAGGIO_NURTURING: "messaggi di nurturing",
};

const CHIUSE: TrattativaStadio[] = [TrattativaStadio.INCARICO, TrattativaStadio.EXIT, TrattativaStadio.NURTURING];
const SETTE_GIORNI = 7 * 24 * 3600_000;

/** Scostamento ora di Roma ↔ UTC per l'istante dato (gestisce l'ora legale). */
function romeOffsetMs(at: Date): number {
  const asRome = new Date(at.toLocaleString("en-US", { timeZone: "Europe/Rome" }));
  const asUtc = new Date(at.toLocaleString("en-US", { timeZone: "UTC" }));
  return asRome.getTime() - asUtc.getTime();
}

/** Mezzanotte di Roma (in UTC) del giorno che contiene `at`. */
function romeDayStartUtc(at: Date): Date {
  const offset = romeOffsetMs(at);
  const wallClock = new Date(at.getTime() + offset);
  wallClock.setUTCHours(0, 0, 0, 0);
  return new Date(wallClock.getTime() - offset);
}

export async function sendDailyReport(): Promise<{ sent: boolean; stats: Record<string, number> }> {
  // Finestra: il giorno solare precedente in ORA ITALIANA (non UTC, altrimenti le
  // attività tra mezzanotte e le 02:00 finiscono nel giorno sbagliato).
  const startToday = romeDayStartUtc(new Date());
  const startYesterday = romeDayStartUtc(new Date(startToday.getTime() - 3_600_000));
  const window = { gte: startYesterday, lt: startToday };
  const conChiDecide = { agentReports: { some: { agent: "decision_maker" } } };

  const [cassetta, fatti121, chieste, ottenute, ferme, segnalazioni, aziendeNuove, trattative, callFissate] =
    await Promise.all([
      db.approvalItem.groupBy({ by: ["kind"], where: { status: "IN_ATTESA" }, _count: { _all: true } }),
      db.oneToOne.count({ where: { date: window } }),
      db.bniPresentazione.count({ where: { chiestaAt: window } }),
      db.bniPresentazione.count({ where: { presentatoAt: window } }),
      db.bniPresentazione.count({
        where: { stato: "CHIESTA", chiestaAt: { lt: new Date(startToday.getTime() - SETTE_GIORNI) } },
      }),
      db.bniSegnalazione.count({ where: { stato: "DA_DARE" } }),
      // Stesso filtro della mail delle 7: solo aziende con il collegamento verificato.
      db.approvalItem.count({ where: { kind: KIND_FASCICOLO_BASE, createdAt: window, lead: conChiDecide } }),
      db.trattativa.count({ where: { stadio: { notIn: CHIUSE } } }),
      db.trattativa.count({ where: { stadio: TrattativaStadio.CALL_FISSATA } }),
    ]);

  const voci = cassetta
    .map((c) => ({ kind: c.kind, n: c._count._all }))
    .sort((a, b) => b.n - a.n);
  const cassettaTotale = voci.reduce((s, v) => s + v.n, 0);
  const stats = { cassettaTotale, fatti121, chieste, ottenute, ferme, segnalazioni, aziendeNuove, trattative, callFissate };

  const righeCassetta =
    cassettaTotale === 0
      ? `📥 Cassetta vuota: niente aspetta te\n`
      : `📥 Cassetta: ${cassettaTotale} ${cassettaTotale === 1 ? "cosa aspetta" : "cose aspettano"} te\n` +
        `   ${voci.map((v) => `${v.n} ${VOCI_CASSETTA[v.kind] ?? v.kind.toLowerCase()}`).join(" · ")}\n`;

  const crmUrl = (process.env.NEXTAUTH_URL || "https://crm.karalisdemo.it").replace(/\/$/, "");
  const text =
    `Report di ieri — CRM\n\n` +
    righeCassetta +
    `\n🤝 121 fatti ieri: ${fatti121}\n` +
    `🔗 Presentazioni ieri: ${chieste} chieste, ${ottenute} ottenute\n` +
    (ferme > 0 ? `   ⏳ ${ferme} chieste da più di 7 giorni senza risposta: richiamale\n` : "") +
    `🎁 Segnalazioni da dare ai membri: ${segnalazioni}\n` +
    `🏢 Aziende nuove con chi decide collegato a te: ${aziendeNuove}\n` +
    `💼 Trattative aperte: ${trattative}${callFissate > 0 ? ` (${callFissate} con la call fissata)` : ""}\n\n` +
    `Apri la Cassetta: ${crmUrl}/cassetta\n`;

  const sent = await sendInternalEmail("☀️ Report CRM — ieri", text);
  return { sent, stats };
}
