import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { detectFranchise } from "@/lib/franchise-brands";
import { PipelineStage } from "@prisma/client";

/**
 * POST /api/internal/flag-franchises
 *
 * Giro retroattivo: trova i lead che sono franchising/catene note (per nome) e li
 * sposta in NON_TARGET. Tocca SOLO gli stati "pre-contatto" e salta chi ha già
 * risposto (respondedAt) — non disturbiamo nulla che sia in movimento o in vendita.
 *
 * ?dryRun=1  → NON modifica nulla, ritorna solo l'anteprima dei match (consigliato prima).
 * ?limit=N   → quanti lead scansionare (default 5000).
 *
 * Richiede: Authorization: Bearer CRON_SECRET (o header x-cron-secret).
 */

// Stati da cui è sicuro scartare un franchising (pre-contatto / pool).
const SCAN_STAGES: PipelineStage[] = [
  PipelineStage.DA_ANALIZZARE,
  PipelineStage.HOT_LEAD,
  PipelineStage.WARM_LEAD,
  PipelineStage.COLD_LEAD,
  PipelineStage.SENZA_SITO,
  PipelineStage.NURTURING,
  PipelineStage.ARCHIVIATO,
  PipelineStage.BNI_DA_LAVORARE,
];

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronHeader = request.headers.get("x-cron-secret");
  const expected = process.env.CRON_SECRET;
  const ok =
    (expected && authHeader === `Bearer ${expected}`) ||
    (expected && cronHeader === expected);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "1";
  const limit = Math.min(20000, Math.max(1, parseInt(url.searchParams.get("limit") || "5000", 10) || 5000));

  const leads = await db.lead.findMany({
    where: {
      pipelineStage: { in: SCAN_STAGES },
      respondedAt: null,
    },
    select: { id: true, name: true, pipelineStage: true, notes: true },
    take: limit,
  });

  const matches = leads
    .map((l) => ({ lead: l, brand: detectFranchise(l.name) }))
    .filter((m): m is { lead: (typeof leads)[number]; brand: string } => m.brand !== null);

  if (!dryRun) {
    for (const { lead, brand } of matches) {
      await db.lead.update({
        where: { id: lead.id },
        data: {
          pipelineStage: PipelineStage.NON_TARGET,
          ...(lead.notes ? {} : { notes: `Franchising rilevato (${brand}) — fuori target, scartato in automatico.` }),
        },
      });
      await db.activity.create({
        data: {
          leadId: lead.id,
          type: "STAGE_CHANGE",
          notes: `Scartato in NON_TARGET: franchising/catena (${brand}).`,
        },
      });
    }
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    scanned: leads.length,
    matched: matches.length,
    moved: dryRun ? 0 : matches.length,
    sample: matches.slice(0, 50).map((m) => ({ name: m.lead.name, brand: m.brand, from: m.lead.pipelineStage })),
  });
}
