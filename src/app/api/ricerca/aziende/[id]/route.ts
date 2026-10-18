import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { CANALI } from "@/components/ricerca/etichette";
import { refertiValidi, KIND_FASCICOLO_BASE } from "@/lib/agents/turno";
import { CHIAVI_BROWSER } from "@/lib/agents/registro";

/**
 * GET /api/ricerca/aziende/[id] — la scheda di un'azienda trovata: perché è qui, chi decide,
 * chi te la può presentare, com'è messa online, prossimo passo e storia.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  const { id } = await params;

  const lead = await db.lead.findUnique({
    where: { id },
    select: {
      id: true, name: true, website: true, address: true, category: true, phone: true,
      googleRating: true, googleReviewsCount: true, googleMapsUrl: true, socialUrl: true, createdAt: true,
      activities: { orderBy: { createdAt: "desc" }, take: 20, select: { id: true, type: true, notes: true, createdAt: true } },
    },
  });
  if (!lead) return NextResponse.json({ error: "Azienda non trovata" }, { status: 404 });

  const [ritrovamenti, persone, referti, decisione, inCorso] = await Promise.all([
    db.ritrovamento.findMany({
      where: { leadId: id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true, canale: true, createdAt: true,
        chiave: {
          select: {
            tipo: true, valore: true,
            casoStudio: { select: { id: true, titolo: true } },
            bniMembro: { select: { id: true, name: true, chapter: true } },
          },
        },
      },
    }),
    db.persona.findMany({
      where: { leadId: id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true, nome: true, ruolo: true, linkedinUrl: true, contattoInComune: true, createdAt: true,
        bniMembro: { select: { id: true, name: true, chapter: true } },
        presentazioni: { select: { id: true, stato: true, membro: { select: { id: true, name: true, chapter: true } } } },
      },
    }),
    refertiValidi(id),
    db.approvalItem.findFirst({ where: { leadId: id, kind: KIND_FASCICOLO_BASE }, select: { status: true, decidedAt: true, createdAt: true } }),
    db.agentRun.findMany({ where: { leadId: id, status: { in: ["IN_CODA", "IN_CORSO"] } }, select: { agent: true, status: true } }),
  ]);

  // Chi te la può presentare: i membri BNI che conoscono il titolare, senza doppioni.
  const ponti = new Map<string, { id: string; name: string; chapter: string | null; come: string; stato?: string }>();
  for (const p of persone) {
    for (const pr of p.presentazioni) ponti.set(pr.membro.id, { ...pr.membro, come: `conosce ${p.nome}`, stato: pr.stato });
    if (p.bniMembro) ponti.set(p.bniMembro.id, { ...p.bniMembro, come: "è lui stesso membro BNI" });
  }
  for (const r of ritrovamenti) {
    const m = r.chiave.bniMembro;
    if (m && !ponti.has(m.id)) ponti.set(m.id, { ...m, come: "è nella sua rete" });
  }

  const casi = [...new Map(ritrovamenti.filter((r) => r.chiave.casoStudio).map((r) => [r.chiave.casoStudio!.id, r.chiave.casoStudio!])).values()];
  const titolare = persone[0] ?? null;

  // Il prossimo passo si ricava da quello che manca, in ordine.
  let prossimo: string;
  if (!titolare) prossimo = "Trovare il titolare: l'agente lo cerca su LinkedIn";
  else if (ponti.size > 0) {
    const primo = [...ponti.values()][0];
    prossimo = primo.stato === "CHIESTA" ? `Aspetti la presentazione di ${primo.name}` : `Chiedi a ${primo.name} di presentarti ${titolare.nome}`;
  } else if (titolare.linkedinUrl) prossimo = `Collegati con ${titolare.nome} su LinkedIn`;
  else prossimo = `Contatta ${titolare.nome}`;

  const storia = [
    ...ritrovamenti.map((r) => ({
      quando: r.createdAt,
      cosa: r.chiave.tipo === "MANUALE" ? "Aggiunta a mano" : r.chiave.casoStudio ? `Trovata su ${CANALI[r.canale] ?? r.canale} dal caso ${r.chiave.casoStudio.titolo}` : r.chiave.bniMembro ? `Trovata nella rete di ${r.chiave.bniMembro.name}` : `Trovata su ${CANALI[r.canale] ?? r.canale}`,
    })),
    ...persone.map((p) => ({ quando: p.createdAt, cosa: `Trovato ${p.nome}${p.ruolo ? `, ${p.ruolo}` : ""}` })),
    ...lead.activities.map((a) => ({ quando: a.createdAt, cosa: a.notes ? `${a.type.toLowerCase()}: ${a.notes}` : a.type.toLowerCase() })),
  ].sort((a, b) => b.quando.getTime() - a.quando.getTime());

  const { activities: _a, ...azienda } = lead;
  void _a;
  return NextResponse.json({
    azienda: { ...azienda, googleRating: azienda.googleRating != null ? Number(azienda.googleRating) : null },
    perche: ritrovamenti[0] ?? null,
    casi,
    persone,
    ponti: [...ponti.values()],
    prossimo: decisione?.status === "IN_ATTESA" ? "Decidi: approfondire o scartare" : decisione?.status === "SCARTATO" ? "Scartata" : prossimo,
    storia,
    decisione,
    // Server: lavorano adesso. Browser: aspettano gli agenti sul Mac di Alessio.
    inCorso: inCorso.filter((r) => !CHIAVI_BROWSER.includes(r.agent)),
    sulMac: inCorso.filter((r) => CHIAVI_BROWSER.includes(r.agent)).map((r) => r.agent),
    analisi: Object.fromEntries(referti.map((r) => [r.agent, { summary: r.summary, findings: r.findings, levers: r.levers, data: r.collectedAt }])),
  });
}
