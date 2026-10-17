import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { caricaCapitoli, statoSettimana } from "@/lib/agents/bni";
import { coperturaCapitolo, eSardo, mezzanotteRoma } from "@/lib/agents/bni-regole";
import { CHIAVI_BROWSER } from "@/lib/agents/registro";
import { AZIENDE_AL_GIORNO } from "@/lib/ricerca/regole";

/**
 * GET /api/oggi — la Home: solo quello che serve ad Alessio adesso. I numeri partono dalla
 * nuova procedura (BNI, casi studio, ricerca), non dallo storico.
 */
export async function GET() {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  const ora = new Date();
  const oggi = mezzanotteRoma(ora);
  const fraDueGiorni = mezzanotteRoma(ora, 2);

  const [tutti, richiesteDaMandare, visiteDaMandare, fogli, altreDecisioni, incontri, call, aziendeOggi, personeOggi, casiAttivi, casiDaConfermare, browserInCoda, ultimoBrowser] =
    await Promise.all([
      caricaCapitoli(ora),
      db.approvalItem.count({ where: { kind: "MESSAGGIO_BNI", status: "IN_ATTESA" } }),
      db.approvalItem.count({ where: { kind: "VISITA_CAPITOLO", status: "IN_ATTESA" } }),
      db.approvalItem.count({ where: { kind: "PREPARAZIONE_121", status: "IN_ATTESA" } }),
      db.approvalItem.count({ where: { status: "IN_ATTESA", kind: { notIn: ["MESSAGGIO_BNI", "VISITA_CAPITOLO", "PREPARAZIONE_121"] } } }),
      db.bniMembro.findMany({
        where: { next121At: { gte: oggi, lt: fraDueGiorni } },
        orderBy: { next121At: "asc" },
        select: { id: true, name: true, company: true, chapter: true, next121At: true },
      }),
      db.trattativa.findMany({
        where: { stadio: "CALL_FISSATA", callAt: { gte: oggi, lt: fraDueGiorni } },
        orderBy: { callAt: "asc" },
        select: { id: true, nome: true, callAt: true },
      }),
      db.ritrovamento.count({ where: { createdAt: { gte: oggi }, canale: { not: "linkedin" }, lead: { createdAt: { gte: oggi } } } }),
      db.persona.count({ where: { createdAt: { gte: oggi } } }),
      db.casoStudio.count({ where: { stato: "ATTIVO" } }),
      db.casoStudio.count({ where: { stato: "DA_CONFERMARE" } }),
      db.agentRun.findFirst({ where: { status: "IN_CODA", agent: { in: CHIAVI_BROWSER } }, orderBy: { queuedAt: "asc" }, select: { queuedAt: true } }),
      db.agentRun.findFirst({ where: { status: { in: ["FATTO", "FALLITO"] }, agent: { in: CHIAVI_BROWSER } }, orderBy: { finishedAt: "desc" }, select: { finishedAt: true } }),
    ]);

  const settimana = await statoSettimana(ora, tutti);
  const sardi = tutti.filter((t) => eSardo(t.capitolo)).flatMap((t) => t.membri);
  const copertura = coperturaCapitolo(sardi);

  // Gli agenti sul Mac sono fermi se c'è lavoro in coda da più di un giorno.
  const oreFermi = browserInCoda ? Math.floor((ora.getTime() - browserInCoda.queuedAt.getTime()) / 3600_000) : 0;

  return NextResponse.json({
    daFare: {
      richiesteDaMandare,
      visiteDaMandare,
      fogli,
      altreDecisioni,
      casiDaConfermare,
    },
    incontri: incontri.map((m) => ({ id: m.id, nome: m.name, azienda: m.company, capitolo: m.chapter, quando: m.next121At })),
    call: call.map((t) => ({ id: t.id, nome: t.nome, quando: t.callAt })),
    settimana: { fatti: settimana.fatti, fissati: settimana.fissati, obiettivo: settimana.obiettivo, richiesteAperte: settimana.richiesteAperte },
    sardegna: { conosciuti: copertura.conosciuti, totale: copertura.totale },
    ricerca: { aziendeOggi, obiettivo: AZIENDE_AL_GIORNO, personeOggi, casiAttivi },
    agentiMac: { fermi: oreFermi >= 24, oreFermi, ultimoLavoro: ultimoBrowser?.finishedAt ?? null },
  });
}
