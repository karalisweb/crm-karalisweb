import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { cerchiaNomi, datiAzienda } from "@/lib/agents/rete";
import { capienzaLavorazione, ETICHETTE_FASE, FASI_ATTIVE, GIORNI_CAMBIO_PONTE, GIORNI_PROMEMORIA, nomiDaConfermare, type Fase } from "@/lib/agents/rete-regole";

const STRADE: Record<string, string> = {
  BNI: "membro BNI",
  CERCHIA: "contatto della cerchia",
  DIRETTO: "contatto diretto",
  SCALDATO: "contatto scaldato",
  DA_CONFERMARE: "serve un \"lo conosco\"",
  SCALDARE: "da scaldare con i commenti",
  IN_ATTESA_PONTE: "il ponte sta già presentando un'altra azienda",
};

function prossimoPasso(l: { fase: string; strada: string | null; ponteNome: string | null; decisore: string | null; chiestaAt: Date | null; presentatoAt: Date | null; pausaFino: Date | null }): string {
  if (l.fase === "MAPPATA") {
    if (l.strada === "DA_CONFERMARE") return "Dimmi chi conosci davvero fra i nomi qui sotto";
    if (l.strada === "SCALDARE") return `Nessun ponte: si scalda ${l.decisore ?? "chi decide"} con i commenti (li trovi in Cassetta)`;
    if (l.strada === "IN_ATTESA_PONTE") return "Il ponte giusto sta già presentando un'altra azienda: un favore alla volta, poi tocca a questa";
    return "Il CRM sta scegliendo il ponte";
  }
  if (l.fase === "PONTE_SCELTO") return `Manda il messaggio a ${l.ponteNome} (è in Cassetta)`;
  if (l.fase === "CHIESTA") {
    if (l.presentatoAt) return `Presentato: fissa l'incontro con ${l.decisore ?? "chi decide"}`;
    const giorni = l.chiestaAt ? Math.floor((Date.now() - l.chiestaAt.getTime()) / 86400_000) : 0;
    return giorni < GIORNI_PROMEMORIA ? `Aspetti ${l.ponteNome} (${giorni} giorni su ${GIORNI_PROMEMORIA} prima del promemoria)` : `Promemoria a ${l.ponteNome}; al giorno ${GIORNI_CAMBIO_PONTE} si passa al ponte successivo`;
  }
  if (l.fase === "INCONTRO") return "Dopo l'incontro: proposta o pausa";
  if (l.fase === "PROPOSTA") return "Aspetti la risposta alla proposta";
  if (l.fase === "PAUSA") return l.pausaFino ? `Torna da sola il ${l.pausaFino.toLocaleDateString("it-IT", { day: "numeric", month: "short" })}` : "In pausa";
  return "";
}

/** GET /api/rete — le aziende in lavorazione (La rete al centro, v3.53) e la cerchia stretta. */
export async function GET() {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  const oggi = new Date();
  const [lav, cerchia, aggiunti, bni] = await Promise.all([
    db.lavorazione.findMany({ orderBy: [{ updatedAt: "desc" }], include: { lead: { select: { id: true, name: true, address: true, category: true } } } }),
    cerchiaNomi(),
    db.cerchiaContatto.findMany({ where: { rimossoAt: null }, orderBy: { createdAt: "desc" }, select: { id: true, nome: true, createdAt: true } }),
    db.bniMembro.count({ where: { OR: [{ conosciutoAt: { not: null } }, { oneToOneCount: { gt: 0 } }] } }),
  ]);
  const lavorazioni = [];
  for (const l of lav) {
    const d = l.fase === "MAPPATA" ? await datiAzienda(l.leadId, !!l.scaldataAt) : null;
    const provati = Array.isArray(l.pontiProvati) ? (l.pontiProvati as string[]) : [];
    lavorazioni.push({
      id: l.id, leadId: l.leadId, azienda: l.lead.name, zona: l.lead.address, categoria: l.lead.category,
      fase: l.fase, etichettaFase: ETICHETTE_FASE[l.fase as Fase] ?? l.fase, attiva: (FASI_ATTIVE as readonly string[]).includes(l.fase),
      strada: l.strada, etichettaStrada: l.strada ? STRADE[l.strada] ?? l.strada : null, ponte: l.ponteNome, decisore: l.decisore,
      tentativi: l.tentativi, provati, chiestaAt: l.chiestaAt, presentatoAt: l.presentatoAt, scaldataAt: l.scaldataAt, incontroAt: l.incontroAt,
      propostaAt: l.propostaAt, clienteAt: l.clienteAt, pausaFino: l.pausaFino, note: l.note,
      daConfermare: d ? nomiDaConfermare(d, cerchia, provati) : [],
      prossimoPasso: prossimoPasso(l),
    });
  }
  return NextResponse.json({
    capienza: capienzaLavorazione(oggi),
    attive: lavorazioni.filter((l) => l.attiva).length,
    lavorazioni,
    cerchia: { daBni: bni, aggiunti },
  });
}
