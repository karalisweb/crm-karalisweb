import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { caricaCapitoli, statoSettimana, scegliProssimi } from "@/lib/agents/bni";
import { coperturaCapitolo, dirigenzaNota, eSardo, formatoDa, prossimiDelCapitolo, visitaDaProporre, CAPITOLI_IN_CORSO, GIORNI_SENZA_RISPOSTA } from "@/lib/agents/bni-regole";

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
  const limiteRisposta = oggi.getTime() - GIORNI_SENZA_RISPOSTA * 86400_000;
  const [calendario, richieste, fattiRecenti, voci] = await Promise.all([
    db.bniMembro.findMany({
      where: { next121At: { gte: new Date(oggi.getTime() - 86400_000) } },
      orderBy: { next121At: "asc" },
      select: { id: true, name: true, company: true, profession: true, chapter: true, next121At: true, phone: true },
      take: 100,
    }),
    db.approvalItem.findMany({
      where: { kind: "MESSAGGIO_BNI", status: { in: ["IN_ATTESA", "APPROVATO"] }, createdAt: { gt: new Date(oggi.getTime() - 60 * 86400_000) } },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true, createdAt: true, decidedAt: true, bniMembroId: true, payload: true },
      take: 300,
    }),
    db.oneToOne.findMany({
      where: { date: { gte: new Date(oggi.getTime() - 14 * 86400_000) } },
      orderBy: { date: "desc" },
      select: { id: true, date: true, formato: true, membro: { select: { id: true, name: true, chapter: true } } },
      take: 50,
    }),
    db.approvalItem.findMany({
      where: { kind: { in: ["VISITA_CAPITOLO", "PREPARAZIONE_121"] }, status: "IN_ATTESA" },
      select: { id: true, kind: true, bniMembroId: true, payload: true, bniChapter: { select: { name: true } } },
    }),
  ]);
  const visite = voci
    .filter((v) => v.kind === "VISITA_CAPITOLO")
    .map((v) => ({ voceId: v.id, capitolo: v.bniChapter?.name ?? "", payload: v.payload, telefono: (v.payload as { telefono?: string | null }).telefono ?? null }));
  const conFoglio = new Set(voci.filter((v) => v.kind === "PREPARAZIONE_121" && v.bniMembroId).map((v) => v.bniMembroId!));
  // Una richiesta sola per membro (la più recente), e solo per chi non è ancora conosciuto né fissato.
  const viste = new Set<string>();
  const righe = richieste
    .filter((r) => r.bniMembroId && membriPerId.has(r.bniMembroId) && !viste.has(r.bniMembroId) && viste.add(r.bniMembroId))
    .map((r) => {
      const m = membriPerId.get(r.bniMembroId!)!;
      const p = r.payload as { perche?: string; messaggio?: string; telefono?: string | null; formato?: string };
      return {
        voceId: r.id,
        membroId: m.id,
        nome: m.name,
        capitolo: m.capitolo,
        telefono: p.telefono ?? m.phone,
        perche: p.perche ?? null,
        messaggio: p.messaggio ?? "",
        formato: p.formato ?? null,
        mandataIl: r.status === "APPROVATO" ? (r.decidedAt ?? r.createdAt) : null,
        conosciuto: m.conosciuto,
        fissato: !!m.fissato121At,
      };
    })
    .filter((r) => !r.conosciuto && !r.fissato);
  const daMandare = righe.filter((r) => !r.mandataIl);
  const inAttesa = righe.filter((r) => r.mandataIl && r.mandataIl.getTime() > limiteRisposta);
  const senzaRisposta = righe.filter((r) => r.mandataIl && r.mandataIl.getTime() <= limiteRisposta);
  const richiesteAperte = [...daMandare, ...inAttesa];

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

  // Per la barra: chi ho incontrato questa settimana e chi è fissato la settimana prossima, per nome.
  const [fattiSettimana, prossima] = await Promise.all([
    db.oneToOne.findMany({ where: { date: { gte: settimana.inizio, lt: settimana.fine } }, orderBy: { date: "asc" }, select: { date: true, membro: { select: { name: true } } } }),
    db.bniMembro.findMany({
      where: { next121At: { gte: settimana.fine, lt: new Date(settimana.fine.getTime() + 7 * 86400_000) }, status: "ATTIVO" },
      orderBy: { next121At: "asc" },
      select: { name: true, next121At: true },
    }),
  ]);
  const fissatiSettimana = calendario.filter((c) => c.next121At && c.next121At >= oggi && c.next121At < settimana.fine).map((c) => c.name);

  return NextResponse.json({
    settimana: {
      ...settimana,
      nomiFatti: fattiSettimana.map((f) => f.membro.name),
      nomiFissati: fissatiSettimana,
      prossima: prossima.map((p) => ({ nome: p.name, quando: p.next121At })),
    },
    calendario: calendario.map((c) => ({ ...c, foglio: conFoglio.has(c.id) })),
    visite,
    richiesteAperte,
    tracker: {
      daMandare,
      inAttesa,
      senzaRisposta,
      fatti: fattiRecenti.map((f) => ({ id: f.id, data: f.date, formato: f.formato, membroId: f.membro.id, nome: f.membro.name, capitolo: f.membro.chapter })),
    },
    capitoli,
  });
}
