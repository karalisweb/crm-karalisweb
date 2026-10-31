import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { caricaCapitoli, statoSettimana } from "@/lib/agents/bni";
import { coperturaCapitolo, eSardo, mezzanotteRoma } from "@/lib/agents/bni-regole";
import { CHIAVI_BROWSER } from "@/lib/agents/registro";
import { AZIENDE_AL_GIORNO } from "@/lib/ricerca/regole";
import { daChiedereA } from "@/lib/agents/presentazioni";
import { KIND_AVVISO_SETTORE } from "@/lib/agents/avvisi-settore";

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

  const [tutti, richiesteDaMandare, visiteDaMandare, fogli, aziendeDaDecidere, incontri, call, aziendeOggi, personeOggi, casiAttivi, casiDaConfermare, browserInCoda, ultimoBrowser, ultimoFatto] =
    await Promise.all([
      caricaCapitoli(ora),
      db.approvalItem.count({ where: { kind: "MESSAGGIO_BNI", status: "IN_ATTESA" } }),
      db.approvalItem.count({ where: { kind: "VISITA_CAPITOLO", status: "IN_ATTESA" } }),
      db.approvalItem.count({ where: { kind: "PREPARAZIONE_121", status: "IN_ATTESA" } }),
      db.approvalItem.count({ where: { status: "IN_ATTESA", kind: "FASCICOLO_BASE" } }),
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
      db.agentRun.findFirst({ where: { status: "FATTO", agent: { in: CHIAVI_BROWSER } }, orderBy: { finishedAt: "desc" }, select: { finishedAt: true } }),
    ]);

  const settimana = await statoSettimana(ora, tutti);
  const sardi = tutti.filter((t) => eSardo(t.capitolo)).flatMap((t) => t.membri);
  const copertura = coperturaCapitolo(sardi);

  // Gli agenti sul Mac sono fermi se c'è lavoro in coda da più di un giorno.
  const oreFermi = browserInCoda ? Math.floor((ora.getTime() - browserInCoda.queuedAt.getTime()) / 3600_000) : 0;
  // Oppure girano ma falliscono tutto (di solito Chrome chiede un permesso che di notte nessuno dà).
  const ultimoOk = ultimoFatto?.finishedAt?.getTime() ?? 0;
  const falliscono = !!ultimoBrowser?.finishedAt && ultimoBrowser.finishedAt.getTime() > ultimoOk && ora.getTime() - ultimoOk >= 24 * 3600_000;
  const oreSenzaRisultati = falliscono ? Math.floor((ora.getTime() - Math.max(ultimoOk, browserInCoda?.queuedAt.getTime() ?? 0, ora.getTime() - 30 * 24 * 3600_000)) / 3600_000) : oreFermi;

  return NextResponse.json({
    daFare: {
      richiesteDaMandare,
      visiteDaMandare,
      fogli,
      aziendeDaDecidere,
      casiDaConfermare,
    },
    // v3.68: quante presentazioni chiedere a ogni incontro (al massimo 3, il dettaglio è nel foglio del 121).
    incontri: await Promise.all(incontri.map(async (m) => {
      const c = await daChiedereA(m.id).catch(() => null);
      return { id: m.id, nome: m.name, azienda: m.company, capitolo: m.chapter, quando: m.next121At, daChiedere: c ? c.ora.membri.length + c.ora.aziende.length : 0 };
    })),
    call: call.map((t) => ({ id: t.id, nome: t.nome, quando: t.callAt })),
    avvisiSettoreTotale: await db.approvalItem.count({ where: { kind: KIND_AVVISO_SETTORE, status: "IN_ATTESA" } }),
    // v3.69: le aziende dei tuoi settori viste in BNI, su LinkedIn o fra le eliminate (in cima a Oggi).
    avvisiSettore: (await db.approvalItem.findMany({ where: { kind: KIND_AVVISO_SETTORE, status: "IN_ATTESA" }, orderBy: { createdAt: "asc" }, take: 5, select: { id: true, title: true, payload: true } }))
      .map((v) => {
        const p = (v.payload ?? {}) as { righe?: string[]; cosaFare?: string; link?: string };
        return { id: v.id, titolo: v.title, riga: p.righe?.[0] ?? "", altre: Math.max(0, (p.righe?.length ?? 1) - 1), cosaFare: p.cosaFare ?? "", link: p.link ?? "/cassetta" };
      }),
    settimana: { fatti: settimana.fatti, fissati: settimana.fissati, obiettivo: settimana.obiettivo, richiesteAperte: settimana.richiesteAperte },
    sardegna: { conosciuti: copertura.conosciuti, totale: copertura.totale },
    ricerca: { aziendeOggi, obiettivo: AZIENDE_AL_GIORNO, personeOggi, casiAttivi },
    agentiMac: { fermi: oreFermi >= 24 || falliscono, falliscono, oreFermi: Math.max(oreFermi, oreSenzaRisultati), ultimoLavoro: ultimoBrowser?.finishedAt ?? null },
  });
}
