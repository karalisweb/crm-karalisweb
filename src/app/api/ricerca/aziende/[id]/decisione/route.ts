import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { approfondisci } from "@/lib/agents/arricchimento";
import { KIND_FASCICOLO_BASE } from "@/lib/agents/turno";
import { motivoDaNota, notaMotivo } from "@/lib/ricerca/scarti";
import { KIND_DA_CONTATTARE } from "@/lib/ricerca/contattare";

const Schema = z.object({ azione: z.enum(["approfondisci", "scarta", "ripensaci", "elimina", "ripristina", "da_contattare", "non_contattare", "contattare_auto"]), motivo: z.string().trim().max(500).optional() });

/**
 * POST /api/ricerca/aziende/[id]/decisione — Approfondisci (parte subito il giro completo),
 * Scarta, o Ripensaci (torna "da decidere"). Scarta ed Elimina possono avere il motivo: la ricerca
 * lo legge per non riproporre aziende come quella.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  const { id } = await params;
  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Azione non valida" }, { status: 400 });
  const lead = await db.lead.findUnique({ where: { id }, select: { id: true, name: true, website: true } });
  if (!lead) return NextResponse.json({ error: "Azienda non trovata" }, { status: 404 });

  // Elimina: esce da tutti gli elenchi e dai turni degli agenti (resta in "Eliminate", ripristinabile).
  // Da contattare a mano: aggiunta (APPROVATO), tolta (SCARTATO) o di nuovo decisa dalla regola (voce cancellata).
  if (parsed.data.azione === "da_contattare" || parsed.data.azione === "non_contattare" || parsed.data.azione === "contattare_auto") {
    await db.approvalItem.deleteMany({ where: { leadId: id, kind: KIND_DA_CONTATTARE } });
    if (parsed.data.azione !== "contattare_auto") {
      const aggiunta = parsed.data.azione === "da_contattare";
      await db.approvalItem.create({
        data: {
          leadId: id, kind: KIND_DA_CONTATTARE, agent: "alessio", title: `${lead.name}: ${aggiunta ? "da contattare" : "non da contattare"}`,
          payload: { sito: lead.website }, status: aggiunta ? "APPROVATO" : "SCARTATO", decidedAt: new Date(), decidedBy: gate.userId,
          ...(parsed.data.motivo ? { note: parsed.data.motivo } : {}),
        },
      });
    }
    return NextResponse.json({ ok: true });
  }

  const motivo = parsed.data.motivo ? notaMotivo(parsed.data.motivo) : null;
  const gia = await db.approvalItem.findFirst({ where: { leadId: id, kind: KIND_FASCICOLO_BASE }, orderBy: { createdAt: "desc" }, select: { id: true, note: true } });
  if (parsed.data.azione === "elimina") {
    await db.$transaction([
      db.lead.update({ where: { id }, data: { pipelineStage: "ARCHIVIATO" } }),
      db.agentRun.deleteMany({ where: { leadId: id, status: "IN_CODA" } }),
    ]);
    if (motivo) {
      if (gia) await db.approvalItem.update({ where: { id: gia.id }, data: { note: motivo } });
      else await db.approvalItem.create({ data: { leadId: id, kind: KIND_FASCICOLO_BASE, agent: "alessio", title: lead.name, payload: { sito: lead.website }, status: "SCARTATO", decidedAt: new Date(), decidedBy: gate.userId, note: motivo } });
    }
    return NextResponse.json({ ok: true, eliminata: true });
  }
  if (parsed.data.azione === "ripristina") {
    await db.lead.update({ where: { id }, data: { pipelineStage: "DA_ANALIZZARE" } });
    return NextResponse.json({ ok: true, eliminata: false });
  }

  const status = (parsed.data.azione === "approfondisci" ? "APPROVATO" : parsed.data.azione === "scarta" ? "SCARTATO" : "IN_ATTESA") as "APPROVATO" | "SCARTATO" | "IN_ATTESA";
  // Il motivo vale finché l'azienda resta scartata: se Alessio ci ripensa non insegna più nulla.
  const note = status === "SCARTATO" ? motivo ?? undefined : motivoDaNota(gia?.note) ? null : undefined;
  const decisione = { status, decidedAt: status === "IN_ATTESA" ? null : new Date(), decidedBy: gate.userId, ...(note !== undefined ? { note } : {}) };
  if (gia) await db.approvalItem.update({ where: { id: gia.id }, data: decisione });
  else await db.approvalItem.create({ data: { leadId: id, kind: KIND_FASCICOLO_BASE, agent: "alessio", title: lead.name, payload: { sito: lead.website }, ...decisione } });

  if (status === "APPROVATO") {
    if (!lead.website) return NextResponse.json({ ok: true, avviso: "Senza sito il giro completo non può partire" });
    void approfondisci(id).catch((e) => console.error("[decisione] approfondimento fallito:", e));
  }
  return NextResponse.json({ ok: true, status });
}
