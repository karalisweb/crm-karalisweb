import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/public/questionnaire
 *
 * Webhook chiamato dal Google Form (via Apps Script) quando un lead COMPILA il
 * self-assessment. La compilazione è un segnale di calore: promuove il lead a
 * CALDO_REATTIVO e ferma la sequenza fredda (opt-in-mailer si ferma su respondedAt).
 *
 * Body JSON: { secret, email?, leadId?, responses? }
 * Mappatura lead: per `leadId` se presente, altrimenti per `email` (match più recente,
 * non disiscritto). Protetto da QUESTIONNAIRE_WEBHOOK_SECRET (se configurato).
 * Risponde sempre 200 anche se non aggancia: il Form non deve mostrare errori.
 */

// Stati "freddi/da-lavorare" da cui ha senso promuovere a caldo (non tocca vendita/chiusura)
const PROMOTABLE_STAGES = new Set([
  "DA_ANALIZZARE",
  "HOT_LEAD",
  "WARM_LEAD",
  "COLD_LEAD",
  "ARCHIVIATO",
  "NURTURING",
]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { secret, email, leadId, responses } = body as {
      secret?: string;
      email?: string;
      leadId?: string;
      responses?: unknown;
    };

    const expected = process.env.QUESTIONNAIRE_WEBHOOK_SECRET;
    if (expected && secret !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let lead: { id: string; name: string; pipelineStage: string } | null = null;
    if (leadId) {
      lead = await db.lead.findUnique({
        where: { id: leadId },
        select: { id: true, name: true, pipelineStage: true },
      });
    }
    if (!lead && email && typeof email === "string" && email.includes("@")) {
      lead = await db.lead.findFirst({
        where: { email: { equals: email.trim(), mode: "insensitive" }, unsubscribed: false },
        orderBy: { updatedAt: "desc" },
        select: { id: true, name: true, pipelineStage: true },
      });
    }

    if (!lead) {
      console.warn(
        `[QUESTIONNAIRE] Compilazione non agganciata (leadId=${leadId ?? "-"}, email=${email ?? "-"})`
      );
      return NextResponse.json({ ok: true, matched: false });
    }

    const now = new Date();
    const promote = PROMOTABLE_STAGES.has(lead.pipelineStage);

    await db.lead.update({
      where: { id: lead.id },
      data: {
        questionnaireCompletedAt: now,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        questionnaireResponses: (responses ?? null) as any,
        // Segnale di calore: ferma la sequenza fredda (respondedAt) e promuove
        respondedAt: now,
        respondedVia: "questionario",
        ...(promote ? { pipelineStage: "CALDO_REATTIVO" as const } : {}),
      },
    });

    await db.activity.create({
      data: {
        leadId: lead.id,
        type: "RESPONSE_RECEIVED",
        notes: promote
          ? "Questionario compilato → promosso a CALDO_REATTIVO"
          : "Questionario compilato (stato non modificato)",
      },
    });

    console.log(`[QUESTIONNAIRE] ${lead.name}: compilato${promote ? " → CALDO_REATTIVO" : ""}`);
    return NextResponse.json({ ok: true, matched: true, promoted: promote });
  } catch (error) {
    console.error("[QUESTIONNAIRE] Errore:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
