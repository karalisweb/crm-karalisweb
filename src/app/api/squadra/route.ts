import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { SQUADRA, CHIAVI_BROWSER } from "@/lib/agents/registro";
import { BASE_AZIENDE } from "@/lib/agents/turno";
import { budgetMensileEuro, spesaMeseEuro } from "@/lib/agents/costi";
import { motoreAI, MODELLO_CLAUDE } from "@/lib/agents/ai";
import { dataForSeoConfigurato } from "@/lib/agents/dataforseo";

/** GET /api/squadra — la squadra, cosa ha fatto in 7 giorni, quanto ha speso, cosa resta da fare. */
export async function GET() {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;

  const settimana = new Date(Date.now() - 7 * 86400_000);
  const [lavori, ultimi, aziendeAnalizzate, daAnalizzare, cassetta, errori, codaBrowser, spesi, copertura, costiAgente] = await Promise.all([
    db.agentRun.groupBy({ by: ["agent", "status"], where: { queuedAt: { gte: settimana } }, _count: { _all: true } }),
    db.agentRun.groupBy({ by: ["agent"], _max: { finishedAt: true } }),
    db.agentReport.findMany({ where: { leadId: { not: null } }, distinct: ["leadId"], select: { leadId: true } }).then((r) => r.length),
    db.lead.count({ where: { ...BASE_AZIENDE, agentRuns: { none: {} } } }),
    db.approvalItem.groupBy({ by: ["status"], _count: { _all: true } }),
    db.agentRun.groupBy({
      by: ["error"],
      where: { status: "FALLITO", queuedAt: { gte: settimana } },
      _count: { _all: true },
      orderBy: { _count: { error: "desc" } },
      take: 5,
    }),
    db.agentRun.groupBy({ by: ["status"], where: { agent: { in: CHIAVI_BROWSER }, status: { in: ["IN_CODA", "IN_CORSO"] } }, _count: { _all: true } }),
    spesaMeseEuro(),
    db.agentReport.findMany({
      where: { agent: "copertura_sardegna", collectedAt: { gte: new Date(Date.now() - 2 * 86400_000) } },
      orderBy: { collectedAt: "desc" },
      distinct: ["bniChapterId"],
      select: { findings: true, bniChapter: { select: { name: true } } },
    }),
    db.agentRun.groupBy({
      by: ["agent"],
      where: { queuedAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
      _sum: { costCents: true },
    }),
  ]);

  const conta = (agent: string, status: string) =>
    lavori.find((l) => l.agent === agent && l.status === status)?._count._all ?? 0;
  const motore = motoreAI();

  const capitoliSardi = copertura.map((c) => {
    const f = c.findings as { totale?: number; conosciuti?: number; percentuale?: number };
    return { capitolo: c.bniChapter?.name ?? "?", totale: f.totale ?? 0, conosciuti: f.conosciuti ?? 0, percentuale: f.percentuale ?? 0 };
  });
  const totSardi = capitoliSardi.reduce((s, c) => s + c.totale, 0);
  const conSardi = capitoliSardi.reduce((s, c) => s + c.conosciuti, 0);

  return NextResponse.json({
    agenti: SQUADRA.map((a) => ({
      ...a,
      istruzioni: undefined, // le istruzioni per il browser non servono alla pagina
      settimana: { fatti: conta(a.chiave, "FATTO"), falliti: conta(a.chiave, "FALLITO") },
      ultimoLavoro: ultimi.find((u) => u.agent === a.chiave)?._max.finishedAt ?? null,
      spesaMeseEuro: (costiAgente.find((c) => c.agent === a.chiave)?._sum.costCents ?? 0) / 100,
    })),
    aziendeAnalizzate,
    daAnalizzare,
    cassetta: Object.fromEntries(cassetta.map((c) => [c.status, c._count._all])),
    erroriSettimana: errori.map((e) => ({ errore: e.error ?? "sconosciuto", lavori: e._count._all })),
    browser: Object.fromEntries(codaBrowser.map((c) => [c.status, c._count._all])),
    spesa: { meseEuro: Math.round(spesi * 100) / 100, tettoEuro: budgetMensileEuro() },
    servizi: {
      ai: motore === "claude" ? `Claude (${MODELLO_CLAUDE})` : motore === "gemini" ? `Gemini (${process.env.GEMINI_MODEL || "gemini-2.5-flash"})` : null,
      dataForSeo: dataForSeoConfigurato(),
      browser: !!process.env.AGENTI_BROWSER_KEY,
    },
    coperturaSardegna: capitoliSardi.length
      ? { capitoli: capitoliSardi, totale: totSardi, conosciuti: conSardi, percentuale: totSardi ? Math.round((conSardi / totSardi) * 100) : 0 }
      : null,
  });
}
