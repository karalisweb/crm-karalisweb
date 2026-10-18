import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { approfondisci } from "@/lib/agents/arricchimento";
import { KIND_FASCICOLO_BASE } from "@/lib/agents/turno";

const Schema = z.object({ azione: z.enum(["approfondisci", "scarta", "ripensaci", "elimina", "ripristina"]) });

/**
 * POST /api/ricerca/aziende/[id]/decisione — Approfondisci (parte subito il giro completo),
 * Scarta, o Ripensaci (torna "da decidere").
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
  if (parsed.data.azione === "elimina") {
    await db.$transaction([
      db.lead.update({ where: { id }, data: { pipelineStage: "ARCHIVIATO" } }),
      db.agentRun.deleteMany({ where: { leadId: id, status: "IN_CODA" } }),
    ]);
    return NextResponse.json({ ok: true, eliminata: true });
  }
  if (parsed.data.azione === "ripristina") {
    await db.lead.update({ where: { id }, data: { pipelineStage: "DA_ANALIZZARE" } });
    return NextResponse.json({ ok: true, eliminata: false });
  }

  const status = parsed.data.azione === "approfondisci" ? "APPROVATO" : parsed.data.azione === "scarta" ? "SCARTATO" : "IN_ATTESA";
  const decisione = { status, decidedAt: status === "IN_ATTESA" ? null : new Date(), decidedBy: gate.userId } as const;
  const gia = await db.approvalItem.findFirst({ where: { leadId: id, kind: KIND_FASCICOLO_BASE }, select: { id: true } });
  if (gia) await db.approvalItem.update({ where: { id: gia.id }, data: decisione });
  else await db.approvalItem.create({ data: { leadId: id, kind: KIND_FASCICOLO_BASE, agent: "alessio", title: lead.name, payload: { sito: lead.website }, ...decisione } });

  if (status === "APPROVATO") {
    if (!lead.website) return NextResponse.json({ ok: true, avviso: "Senza sito il giro completo non può partire" });
    void approfondisci(id).catch((e) => console.error("[decisione] approfondimento fallito:", e));
  }
  return NextResponse.json({ ok: true, status });
}
