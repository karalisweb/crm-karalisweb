import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireSession } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { ORIGINI, ORDINE_STADI, inRitardo, type Stadio } from "@/lib/vendita/regole";
import { creaTrattativa, ErroreTrattativa } from "@/lib/vendita/trattative";

/** GET /api/trattative?stadio=&origine=&tutte=1 — la pipeline, con i conteggi per stadio. */
export async function GET(request: NextRequest) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  const sp = request.nextUrl.searchParams;
  const stadio = sp.get("stadio");
  const origine = sp.get("origine");
  const tutte = sp.get("tutte") === "1";

  const where = {
    ...(stadio && (ORDINE_STADI as string[]).includes(stadio) ? { stadio: stadio as Stadio } : tutte ? {} : { stadio: { notIn: ["INCARICO", "EXIT"] as Stadio[] } }),
    ...(origine && origine in ORIGINI ? { origine } : {}),
  };
  const [trattative, conteggi] = await Promise.all([
    db.trattativa.findMany({
      where,
      orderBy: [{ prossimaData: { sort: "asc", nulls: "last" } }, { updatedAt: "desc" }],
      take: 200,
      include: { _count: { select: { approvalItems: { where: { status: "IN_ATTESA" } } } } },
    }),
    db.trattativa.groupBy({ by: ["stadio"], _count: { _all: true } }),
  ]);
  const oggi = new Date();
  return NextResponse.json({
    trattative: trattative.map((t) => ({ ...t, inRitardo: inRitardo(t, oggi), daDecidere: t._count.approvalItems })),
    conteggi: Object.fromEntries(conteggi.map((c) => [c.stadio, c._count._all])),
  });
}

const SchemaNuova = z.object({
  nome: z.string().max(160).optional(),
  origine: z.enum(Object.keys(ORIGINI) as [string, ...string[]]),
  leadId: z.string().uuid().optional(),
  bniMembroId: z.string().uuid().optional(),
  opportunitaId: z.string().uuid().optional(),
  callAt: z.string().datetime({ offset: true }).optional().nullable(),
  referente: z.string().max(160).optional().nullable(),
  telefono: z.string().max(40).optional().nullable(),
  email: z.string().max(160).optional().nullable(),
  /** Voce di cassetta da cui nasce (scheda contatto): viene chiusa come approvata. */
  daVoce: z.string().uuid().optional(),
});

/** POST /api/trattative — apre una trattativa (di solito: è stata fissata una call). */
export async function POST(request: Request) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  try {
    const d = SchemaNuova.parse(await request.json());
    const t = await creaTrattativa(
      { ...d, origine: d.origine as keyof typeof ORIGINI, callAt: d.callAt ? new Date(d.callAt) : null },
      gate.userId
    );
    if (d.daVoce) {
      await db.approvalItem.updateMany({
        where: { id: d.daVoce, status: "IN_ATTESA" },
        data: { status: "APPROVATO", decidedAt: new Date(), decidedBy: gate.userId, note: "Call fissata" },
      });
    }
    return NextResponse.json({ trattativa: t });
  } catch (err) {
    if (err instanceof ZodError) return NextResponse.json({ error: "Dati non validi", dettaglio: err.issues.slice(0, 5) }, { status: 400 });
    if (err instanceof ErroreTrattativa) return NextResponse.json({ error: err.message }, { status: err.stato });
    console.error("[trattative] creazione fallita:", err);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
