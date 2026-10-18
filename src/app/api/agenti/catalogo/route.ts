import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { CATALOGO, modiAgenti } from "@/lib/agents/catalogo";
import { CHIAVI_BROWSER } from "@/lib/agents/registro";

/**
 * GET /api/agenti/catalogo — la pagina Agenti: ogni agente con dove gira, quando parte, se è
 * automatico o a mano, e cosa ha fatto nelle ultime 24 ore. Più lo stato dell'agente sul Mac.
 */
export async function GET() {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  const da = new Date(Date.now() - 24 * 3600_000);
  const [modi, conteggi, errori, inCodaMac, ultimoMac] = await Promise.all([
    modiAgenti(),
    db.agentRun.groupBy({ by: ["agent", "status"], where: { OR: [{ finishedAt: { gte: da } }, { status: { in: ["IN_CODA", "IN_CORSO"] } }] }, _count: true }),
    db.agentRun.findMany({ where: { status: "FALLITO", finishedAt: { gte: da } }, orderBy: { finishedAt: "desc" }, select: { agent: true, error: true, finishedAt: true, lead: { select: { id: true, name: true } } }, take: 40 }),
    db.agentRun.findFirst({ where: { status: "IN_CODA", agent: { in: CHIAVI_BROWSER } }, orderBy: { queuedAt: "asc" }, select: { queuedAt: true } }),
    db.agentRun.findFirst({ where: { status: { in: ["FATTO", "FALLITO"] }, agent: { in: CHIAVI_BROWSER } }, orderBy: { finishedAt: "desc" }, select: { finishedAt: true } }),
  ]);
  const conta = (agente: string, stati: string[]) => conteggi.filter((c) => c.agent === agente && stati.includes(c.status)).reduce((n, c) => n + c._count, 0);
  return NextResponse.json({
    agenti: CATALOGO.map((v) => ({
      ...v,
      modo: modi[v.chiave],
      fatti24h: conta(v.chiave, ["FATTO"]),
      falliti24h: conta(v.chiave, ["FALLITO"]),
      inCorso: conta(v.chiave, ["IN_CORSO"]),
      inCoda: conta(v.chiave, ["IN_CODA"]),
      ultimoErrore: errori.find((e) => e.agent === v.chiave) ?? null,
    })),
    mac: {
      inCodaDa: inCodaMac?.queuedAt ?? null,
      oreInCoda: inCodaMac ? Math.floor((Date.now() - inCodaMac.queuedAt.getTime()) / 3600_000) : 0,
      ultimoLavoro: ultimoMac?.finishedAt ?? null,
      inCoda: conteggi.filter((c) => CHIAVI_BROWSER.includes(c.agent) && c.status === "IN_CODA").reduce((n, c) => n + c._count, 0),
    },
  });
}

const Schema = z.object({ chiave: z.string(), modo: z.enum(["auto", "mano"]) });

/** PATCH /api/agenti/catalogo — Alessio sceglie: automatico o a mano. */
export async function PATCH(request: NextRequest) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !CATALOGO.some((v) => v.chiave === parsed.data.chiave)) return NextResponse.json({ error: "Dati non validi" }, { status: 400 });
  const s = await db.settings.findUnique({ where: { id: "default" }, select: { agentiModo: true } });
  const modi = { ...((s?.agentiModo ?? {}) as Record<string, string>), [parsed.data.chiave]: parsed.data.modo };
  await db.settings.update({ where: { id: "default" }, data: { agentiModo: modi } });
  return NextResponse.json({ ok: true });
}
