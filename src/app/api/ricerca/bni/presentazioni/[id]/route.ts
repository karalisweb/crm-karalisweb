import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireSession } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { presentato } from "@/lib/agents/motore";

const Schema = z.object({
  stato: z.enum(["DA_CHIEDERE", "CHIESTA", "PRESENTATO", "NO"]).optional(),
  /** Motore 121: "lo conosco bene" detto al 121. */
  confermata: z.boolean().nullable().optional(),
  /** L'imbuto dopo la presentazione: true segna oggi, false toglie. */
  incontro: z.boolean().optional(),
  proposta: z.boolean().optional(),
  cliente: z.boolean().optional(),
  esitoNote: z.string().max(1000).nullable().optional(),
});

/**
 * PATCH /api/ricerca/bni/presentazioni/[id] — a che punto è una presentazione.
 * PRESENTATO: la persona diventa un primo contatto caldo (la sua azienda entra nel CRM come
 * opportunità BNI e parte l'analisi completa). Poi incontro → proposta → cliente.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  const { id } = await params;
  try {
    const d = Schema.parse(await request.json());
    const p = await db.bniPresentazione.findUnique({ where: { id }, select: { id: true, leadId: true } });
    if (!p) return NextResponse.json({ error: "Presentazione non trovata" }, { status: 404 });
    const ora = new Date();
    const quando = (v: boolean | undefined) => (v === undefined ? undefined : v ? ora : null);
    await db.bniPresentazione.update({
      where: { id },
      data: {
        ...(d.stato && d.stato !== "PRESENTATO" ? { stato: d.stato, ...(d.stato === "CHIESTA" ? { chiestaAt: ora } : {}) } : {}),
        ...(d.confermata !== undefined ? { confermata: d.confermata } : {}),
        incontroAt: quando(d.incontro),
        propostaAt: quando(d.proposta),
        clienteAt: quando(d.cliente),
        ...(d.esitoNote !== undefined ? { esitoNote: d.esitoNote?.trim() || null } : {}),
      },
    });
    let leadId = p.leadId;
    if (d.stato === "PRESENTATO") leadId = await presentato(id, ora);
    if (leadId && (d.incontro || d.proposta || d.cliente)) {
      const stadio = d.cliente ? "CLIENTE" : d.proposta ? "IN_TRATTATIVA" : "CALL_FISSATA";
      await db.lead.update({ where: { id: leadId }, data: { pipelineStage: stadio } });
    }
    return NextResponse.json({ success: true, leadId });
  } catch (e) {
    if (e instanceof ZodError) return NextResponse.json({ error: "Dati non validi" }, { status: 400 });
    throw e;
  }
}
