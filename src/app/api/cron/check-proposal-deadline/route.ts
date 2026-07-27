import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const DEADLINE_DAYS = Math.max(1, parseInt(process.env.PROPOSAL_DEADLINE_DAYS || "14", 10) || 14);

/**
 * POST /api/cron/check-proposal-deadline
 *
 * Controlla i lead IN_TRATTATIVA con offerSentAt scaduto da DEADLINE_DAYS (default 14gg)
 * e crea un Task di alert per Alessio. Nessun cambio di stage: il lead resta aperto,
 * serve solo il promemoria.
 * Chiamato da crontab VPS una volta al giorno.
 * Protetto da CRON_SECRET.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.CRON_SECRET;

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cutoff = new Date(Date.now() - DEADLINE_DAYS * 86_400_000);

    const leads = await db.lead.findMany({
      where: {
        pipelineStage: "IN_TRATTATIVA",
        offerSentAt: { not: null, lte: cutoff },
        proposalDeadlineTaskAt: null,
      },
      select: { id: true, name: true, offerSentAt: true },
    });

    if (leads.length === 0) {
      return NextResponse.json({ created: 0, message: "Nessuna proposta scaduta" });
    }

    const leadIds = leads.map((l) => l.id);

    await db.$transaction([
      db.task.createMany({
        data: leads.map((l) => ({
          leadId: l.id,
          title: `⏰ Proposta scaduta — ${l.name}`,
          description: `Proposta inviata il ${l.offerSentAt?.toLocaleDateString("it-IT")}, sono passati ${DEADLINE_DAYS}+ giorni senza fissare l'inizio lavoro. Richiama ${l.name}.`,
          dueAt: new Date(),
        })),
      }),
      db.lead.updateMany({
        where: { id: { in: leadIds } },
        data: { proposalDeadlineTaskAt: new Date() },
      }),
      db.activity.createMany({
        data: leadIds.map((id) => ({
          leadId: id,
          type: "NOTE",
          notes: `Alert: proposta scaduta da ${DEADLINE_DAYS}+ giorni, lead resta IN_TRATTATIVA.`,
        })),
      }),
    ]);

    console.log(
      `[PROPOSAL-DEADLINE] Creati ${leads.length} alert:`,
      leads.map((l) => l.name)
    );

    return NextResponse.json({
      created: leads.length,
      leads: leads.map((l) => l.name),
    });
  } catch (error) {
    console.error("[CRON] Errore check proposal deadline:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore interno" },
      { status: 500 }
    );
  }
}
