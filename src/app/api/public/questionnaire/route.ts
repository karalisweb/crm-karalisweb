import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/public/questionnaire
 *
 * Webhook chiamato dal Google Form (via Apps Script) quando un lead COMPILA il
 * self-assessment. La compilazione è un segnale di calore: promuove il lead a
 * CALDO_REATTIVO e ferma la sequenza fredda (opt-in-mailer si ferma su respondedAt).
 *
 * Body JSON: { secret, email?, leadId?, responses?, score? }
 * Mappatura lead: per `leadId` se presente, altrimenti per `email` (match più recente,
 * non disiscritto). Protetto da QUESTIONNAIRE_WEBHOOK_SECRET (se configurato).
 * Risponde sempre 200 anche se non aggancia: il Form non deve mostrare errori.
 *
 * SMISTAMENTO per punteggio (self-assessment a 10 domande, max 30):
 * CHIUNQUE compila riceve il video (lo promettiamo nella mail di outreach): la fascia
 * decide solo la PRIORITÀ in coda, non SE il video arriva. → tutti CALDO_REATTIVO.
 *  - ≥ ALTA_MIN  → CALDO_REATTIVO, priorità 1 (video subito)
 *  - ≥ MEDIA_MIN → CALDO_REATTIVO, priorità 2 (video, dopo gli alti)
 *  - < MEDIA_MIN → CALDO_REATTIVO, priorità 3 (video comunque, in coda agli altri)
 *  - score assente → CALDO_REATTIVO senza priorità (vale la sola compilazione)
 */

const SCORE_ALTA_MIN = 24; // fascia alta
const SCORE_MEDIA_MIN = 17; // fascia media (sotto = bassa)

// Stati "freddi/da-lavorare" da cui ha senso smistare (non tocca vendita/chiusura)
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
    const { secret, email, leadId, responses, score } = body as {
      secret?: string;
      email?: string;
      leadId?: string;
      responses?: unknown;
      score?: number | string;
    };
    const numScore =
      score == null || score === "" || Number.isNaN(Number(score)) ? null : Math.round(Number(score));

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
    const canRoute = PROMOTABLE_STAGES.has(lead.pipelineStage);

    // Smistamento per fascia di punteggio (se disponibile).
    let targetStage: "CALDO_REATTIVO" | "NURTURING" | null = null;
    let priority: number | null = null;
    let band = "n/d";
    if (canRoute) {
      if (numScore == null) {
        targetStage = "CALDO_REATTIVO"; // vale la sola compilazione
        band = "senza punteggio";
      } else if (numScore >= SCORE_ALTA_MIN) {
        targetStage = "CALDO_REATTIVO"; priority = 1; band = "ALTA";
      } else if (numScore >= SCORE_MEDIA_MIN) {
        targetStage = "CALDO_REATTIVO"; priority = 2; band = "MEDIA";
      } else {
        // Fascia bassa: riceve comunque il video (promesso nella mail), ma in coda.
        targetStage = "CALDO_REATTIVO"; priority = 3; band = "BASSA";
      }
    }

    await db.lead.update({
      where: { id: lead.id },
      data: {
        questionnaireCompletedAt: now,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        questionnaireResponses: (responses ?? null) as any,
        ...(numScore != null ? { questionnaireScore: numScore } : {}),
        // Segnale di calore: ferma la sequenza fredda (respondedAt) e smista per fascia
        respondedAt: now,
        respondedVia: "questionario",
        ...(targetStage ? { pipelineStage: targetStage } : {}),
        ...(priority != null ? { commercialPriority: priority } : {}),
      },
    });

    const noteScore = numScore != null ? ` (punteggio ${numScore}, fascia ${band})` : "";
    await db.activity.create({
      data: {
        leadId: lead.id,
        type: "RESPONSE_RECEIVED",
        notes: targetStage
          ? `Questionario compilato${noteScore} → ${targetStage}`
          : `Questionario compilato${noteScore} (stato non modificato)`,
      },
    });

    console.log(`[QUESTIONNAIRE] ${lead.name}: compilato${noteScore}${targetStage ? ` → ${targetStage}` : ""}`);
    return NextResponse.json({ ok: true, matched: true, stage: targetStage, score: numScore, band });
  } catch (error) {
    console.error("[QUESTIONNAIRE] Errore:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
