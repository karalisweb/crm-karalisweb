import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireSession } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { ORDINE_STADI, TRANSIZIONI, inRitardo, type Stadio } from "@/lib/vendita/regole";
import { aggiungiEvento, cambiaStadio, ErroreTrattativa } from "@/lib/vendita/trattative";

type Params = { params: Promise<{ id: string }> };

/** GET /api/trattative/[id] — la trattativa con diario, lavori degli agenti e voci in cassetta. */
export async function GET(_req: Request, { params }: Params) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  const { id } = await params;
  const t = await db.trattativa.findUnique({
    where: { id },
    include: {
      eventi: { orderBy: { createdAt: "desc" }, take: 100 },
      agentReports: { orderBy: { collectedAt: "desc" }, take: 20 },
      approvalItems: { orderBy: { createdAt: "desc" }, take: 20 },
      lead: { select: { id: true, name: true, website: true } },
      bniMembro: { select: { id: true, name: true, company: true, chapter: true } },
      opportunita: { select: { id: true, name: true } },
    },
  });
  if (!t) return NextResponse.json({ error: "Trattativa non trovata" }, { status: 404 });
  return NextResponse.json({ trattativa: { ...t, inRitardo: inRitardo(t, new Date()), transizioni: TRANSIZIONI[t.stadio] } });
}

const SchemaModifica = z.object({
  stadio: z.enum(ORDINE_STADI as [Stadio, ...Stadio[]]).optional(),
  motivo: z.string().max(300).optional().nullable(),
  nota: z.string().max(2000).optional().nullable(),
  callAt: z.string().datetime({ offset: true }).optional().nullable(),
  trascrizione: z.string().max(200_000).optional().nullable(),
  valoreEuro: z.number().int().min(0).max(10_000_000).optional().nullable(),
  prossimoPasso: z.string().max(300).optional().nullable(),
  prossimaData: z.string().datetime({ offset: true }).optional().nullable(),
  referente: z.string().max(160).optional().nullable(),
  telefono: z.string().max(40).optional().nullable(),
  email: z.string().max(160).optional().nullable(),
});

/** PATCH /api/trattative/[id] — dati, trascrizione, nota, oppure passaggio di stadio (controllato). */
export async function PATCH(request: Request, { params }: Params) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  const { id } = await params;
  try {
    const d = SchemaModifica.parse(await request.json());
    const esiste = await db.trattativa.findUnique({ where: { id }, select: { id: true, trascrizione: true } });
    if (!esiste) throw new ErroreTrattativa(404, "Trattativa non trovata");

    const data: Record<string, unknown> = {};
    for (const k of ["referente", "telefono", "email", "prossimoPasso", "valoreEuro"] as const) if (d[k] !== undefined) data[k] = d[k];
    if (d.callAt !== undefined) data.callAt = d.callAt ? new Date(d.callAt) : null;
    if (d.prossimaData !== undefined) data.prossimaData = d.prossimaData ? new Date(d.prossimaData) : null;
    if (d.trascrizione !== undefined) data.trascrizione = d.trascrizione?.trim() || null;
    if (Object.keys(data).length) await db.trattativa.update({ where: { id }, data });

    if (d.trascrizione !== undefined && (d.trascrizione?.trim() || null) !== esiste.trascrizione) {
      await aggiungiEvento(id, "TRASCRIZIONE", `Trascrizione della call salvata (${d.trascrizione?.trim().length ?? 0} caratteri)`, gate.userId);
    }
    if (d.nota?.trim()) await aggiungiEvento(id, "NOTA", d.nota.trim(), gate.userId);
    if (d.stadio) {
      await cambiaStadio(id, { a: d.stadio, motivo: d.motivo, prossimoPasso: d.prossimoPasso, prossimaData: d.prossimaData ? new Date(d.prossimaData) : null }, gate.userId);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ZodError) return NextResponse.json({ error: "Dati non validi", dettaglio: err.issues.slice(0, 5) }, { status: 400 });
    if (err instanceof ErroreTrattativa) return NextResponse.json({ error: err.message }, { status: err.stato });
    console.error("[trattative] modifica fallita:", err);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
