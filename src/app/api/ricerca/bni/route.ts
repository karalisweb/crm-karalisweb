import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { caricaCapitoli, statoSettimana, scegliProssimi } from "@/lib/agents/bni";
import { coperturaCapitolo, dirigenzaNota, eSardo, formatoDa, prossimiDelCapitolo, visitaDaProporre, CAPITOLI_IN_CORSO } from "@/lib/agents/bni-regole";

/**
 * GET /api/ricerca/bni — la pagina "121 BNI": la settimana (obiettivo 10), i 121 in calendario,
 * le richieste aperte e i capitoli con il loro avanzamento.
 */
export async function GET() {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  const oggi = new Date();
  const tutti = await caricaCapitoli(oggi);
  const settimana = await statoSettimana(oggi, tutti);
  // I capitoli in corso sono i primi due da cui il Pianificatore prende le prossime persone.
  const ordineInCorso: string[] = [];
  for (const p of scegliProssimi(tutti, 50, oggi)) if (!ordineInCorso.includes(p.capitolo.id)) ordineInCorso.push(p.capitolo.id);
  const inCorso = new Set(ordineInCorso.slice(0, CAPITOLI_IN_CORSO));

  const membriPerId = new Map(tutti.flatMap((t) => t.membri.map((m) => [m.id, { ...m, capitolo: t.capitolo.name }] as const)));
  const [calendario, richieste] = await Promise.all([
    db.bniMembro.findMany({
      where: { next121At: { gte: new Date(oggi.getTime() - 86400_000) } },
      orderBy: { next121At: "asc" },
      select: { id: true, name: true, company: true, profession: true, chapter: true, next121At: true, phone: true },
      take: 50,
    }),
    db.approvalItem.findMany({
      where: { kind: "MESSAGGIO_BNI", status: { in: ["IN_ATTESA", "APPROVATO"] }, createdAt: { gt: new Date(oggi.getTime() - 21 * 86400_000) } },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true, createdAt: true, bniMembroId: true, payload: true },
      take: 100,
    }),
  ]);
  const aperte = richieste
    .filter((r) => r.bniMembroId && membriPerId.has(r.bniMembroId))
    .map((r) => {
      const m = membriPerId.get(r.bniMembroId!)!;
      return { voceId: r.id, inCassetta: r.status === "IN_ATTESA", chiestaIl: r.createdAt, membroId: m.id, nome: m.name, capitolo: m.capitolo, telefono: m.phone, conosciuto: m.conosciuto, fissato: !!m.fissato121At, perche: (r.payload as { perche?: string })?.perche ?? null };
    })
    .filter((r) => !r.conosciuto && !r.fissato);
  // Una richiesta sola per membro (la più recente).
  const viste = new Set<string>();
  const richiesteAperte = aperte.filter((r) => (viste.has(r.membroId) ? false : (viste.add(r.membroId), true)));

  const capitoli = tutti.map(({ capitolo: c, membri }) => {
    const cop = coperturaCapitolo(membri);
    const nota = dirigenzaNota(c, membri);
    const prossimi = prossimiDelCapitolo(membri, oggi, nota);
    return {
      id: c.id,
      nome: c.name,
      zona: [c.region?.replace("sardegna_", "Sardegna ").replace("altro", "") || c.regioneItaliana, c.city].filter(Boolean).join(" · "),
      sardo: eSardo(c),
      formato: formatoDa(c.mode),
      giorno: c.meetingDay,
      ora: c.meetingTime,
      sede: c.sede,
      mio: c.isMine,
      visitStatus: c.visitStatus,
      visitaDaFare: visitaDaProporre({ ...cop, visitStatus: c.visitStatus, mio: c.isMine }),
      ...cop,
      inCorso: inCorso.has(c.id),
      ordine: ordineInCorso.indexOf(c.id),
      prossimi: prossimi.slice(0, 3).map((p) => ({ id: p.membro.id, nome: p.membro.name, motivo: p.motivo })),
      attesaMappa: !nota,
    };
  });
  capitoli.sort((a, b) => Number(b.inCorso) - Number(a.inCorso) || Number(b.sardo) - Number(a.sardo) || b.conosciuti / (b.totale || 1) - a.conosciuti / (a.totale || 1) || a.nome.localeCompare(b.nome, "it"));

  return NextResponse.json({ settimana, calendario, richiesteAperte, capitoli });
}
