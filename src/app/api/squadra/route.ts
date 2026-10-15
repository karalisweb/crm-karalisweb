import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { SQUADRA } from "@/lib/agents/registro";
import { BASE_AZIENDE } from "@/lib/agents/turno";

/** GET /api/squadra — la squadra, cosa ha fatto negli ultimi 7 giorni, cosa resta da fare. */
export async function GET() {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;

  const settimana = new Date(Date.now() - 7 * 86400_000);
  const [lavori, ultimi, aziendeAnalizzate, daAnalizzare, cassetta, errori] = await Promise.all([
    db.agentRun.groupBy({ by: ["agent", "status"], where: { queuedAt: { gte: settimana } }, _count: { _all: true } }),
    db.agentRun.groupBy({ by: ["agent"], _max: { finishedAt: true } }),
    db.agentReport.findMany({ distinct: ["leadId"], select: { leadId: true } }).then((r) => r.length),
    db.lead.count({ where: { ...BASE_AZIENDE, agentRuns: { none: {} } } }),
    db.approvalItem.groupBy({ by: ["status"], _count: { _all: true } }),
    db.agentRun.groupBy({
      by: ["error"],
      where: { status: "FALLITO", queuedAt: { gte: settimana } },
      _count: { _all: true },
      orderBy: { _count: { error: "desc" } },
      take: 5,
    }),
  ]);

  const conta = (agent: string, status: string) =>
    lavori.find((l) => l.agent === agent && l.status === status)?._count._all ?? 0;

  return NextResponse.json({
    agenti: SQUADRA.map((a) => ({
      ...a,
      settimana: { fatti: conta(a.chiave, "FATTO"), falliti: conta(a.chiave, "FALLITO") },
      ultimoLavoro: ultimi.find((u) => u.agent === a.chiave)?._max.finishedAt ?? null,
    })),
    aziendeAnalizzate,
    daAnalizzare,
    cassetta: Object.fromEntries(cassetta.map((c) => [c.status, c._count._all])),
    // Ogni azienda fallita conta una volta per agente: si divide per gli agenti del passo.
    erroriSettimana: errori.map((e) => ({ errore: e.error ?? "sconosciuto", lavori: e._count._all })),
  });
}
