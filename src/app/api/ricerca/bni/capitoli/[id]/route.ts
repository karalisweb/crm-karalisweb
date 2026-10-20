import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireSession } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { caricaCapitoli } from "@/lib/agents/bni";
import { coperturaCapitolo, dirigenzaNota, formatoDa, gruppiCapitolo, prossimiDelCapitolo, visitaDaProporre } from "@/lib/agents/bni-regole";

/** GET /api/ricerca/bni/capitoli/[id] — la scheda del capitolo con l'ordine dei membri. */
export async function GET(_r: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  const { id } = await params;
  const oggi = new Date();
  const t = (await caricaCapitoli(oggi)).find((x) => x.capitolo.id === id);
  if (!t) return NextResponse.json({ error: "Capitolo non trovato" }, { status: 404 });
  const c = t.capitolo;
  const cop = coperturaCapitolo(t.membri);
  const nota = dirigenzaNota(c, t.membri);
  const prossimi = new Set(c.permesso === "NEGATO" ? [] : prossimiDelCapitolo(t.membri, oggi, nota).map((p) => p.membro.id));
  const extra = await db.bniMembro.findMany({
    where: { id: { in: t.membri.map((m) => m.id) } },
    select: { id: true, company: true, profession: true, lastOneToOneAt: true, next121At: true, conosciutoAt: true },
  });
  const perId = new Map(extra.map((e) => [e.id, e]));
  return NextResponse.json({
    capitolo: {
      id: c.id, nome: c.name, citta: c.city, region: c.region, regioneItaliana: c.regioneItaliana, formato: formatoDa(c.mode),
      giorno: c.meetingDay, ora: c.meetingTime, sede: c.sede, mio: c.isMine, visitStatus: c.visitStatus, visitedAt: c.visitedAt,
      mappatoIl: c.mappedAt, bniConnectUrl: c.bniConnectUrl, permesso: c.permesso, permessoAt: c.permessoAt,
    },
    copertura: cop,
    visitaDaFare: visitaDaProporre({ ...cop, visitStatus: c.visitStatus, mio: c.isMine }),
    attesaMappa: !nota,
    // L'ordine completo si mostra sempre; i "prossimi" rispettano l'attesa della mappa.
    gruppi: gruppiCapitolo(t.membri).map((g) => ({
      motivo: g.motivo,
      membri: g.membri.map((m) => ({
        id: m.id, nome: m.name, azienda: m.company, categoria: m.profession, telefono: m.phone,
        conosciuto: m.conosciuto, chiestaIl: m.richiestaAt, fissatoIl: m.fissato121At, rinviato: m.rinviato, indicato: m.indicato,
        prossimo: prossimi.has(m.id), ultimo121: perId.get(m.id)?.lastOneToOneAt ?? null,
      })),
    })),
  });
}

const Schema = z.object({
  sede: z.string().max(300).nullable().optional(),
  formato: z.enum(["PRESENZA", "ONLINE", "IBRIDO"]).optional(),
  giorno: z.string().max(30).nullable().optional(),
  ora: z.string().max(10).nullable().optional(),
  zona: z.enum(["sardegna_sud", "sardegna_nord", "sardegna_centro", "altro"]).nullable().optional(),
  visitStatus: z.enum(["DA_ANALIZZARE", "VISITA_PIANIFICATA", "VISITATO"]).optional(),
  // Motore 121: il collega di mestiere ha detto sì o no (null = si torna a "da chiedere").
  permesso: z.enum(["CONCESSO", "NEGATO"]).nullable().optional(),
});

/** PATCH /api/ricerca/bni/capitoli/[id] — i dati del capitolo che Alessio corregge a mano. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  const { id } = await params;
  try {
    const d = Schema.parse(await request.json());
    const pulito = (v: string | null | undefined) => (v === undefined ? undefined : v?.trim() || null);
    const c = await db.bniChapter.update({
      where: { id },
      data: {
        sede: pulito(d.sede),
        mode: d.formato,
        meetingDay: pulito(d.giorno),
        meetingTime: pulito(d.ora),
        region: d.zona === undefined ? undefined : d.zona,
        visitStatus: d.visitStatus,
        ...(d.visitStatus === "VISITATO" ? { visitedAt: new Date() } : {}),
        ...(d.permesso !== undefined ? { permesso: d.permesso, permessoAt: d.permesso ? new Date() : null } : {}),
      },
    });
    // Permesso negato: le richieste di 121 ancora da mandare in quel capitolo non partono più.
    if (d.permesso === "NEGATO") {
      await db.approvalItem.updateMany({
        where: { bniChapterId: id, kind: "MESSAGGIO_BNI", status: "IN_ATTESA" },
        data: { status: "SCARTATO", note: "Il collega di mestiere ha detto no: capitolo sospeso", decidedAt: new Date() },
      });
    }
    return NextResponse.json({ success: true, capitolo: { id: c.id } });
  } catch (e) {
    if (e instanceof ZodError) return NextResponse.json({ error: "Dati non validi", dettagli: e.issues }, { status: 400 });
    return NextResponse.json({ error: "Capitolo non trovato" }, { status: 404 });
  }
}
