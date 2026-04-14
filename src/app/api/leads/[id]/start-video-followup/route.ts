import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { processLeadWorkflow } from "@/lib/workflow-engine";

/**
 * POST /api/leads/[id]/start-video-followup
 *
 * Avvia l'intera sequenza follow-up email dopo che la landing page e' pronta.
 * - Setta videoSentAt + outreachChannel=EMAIL + pipelineStage=VIDEO_INVIATO
 * - Triggera il workflow-engine: invia subito msg 1 via email auto
 * - I msg 2 (T+3) e 3 (T+6) partiranno dal cron giornaliero
 *
 * Il canale WhatsApp resta manuale (non si puo' automatizzare): l'utente apre
 * il link wa.me dalla UI quando vuole.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const lead = await db.lead.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        videoLandingUrl: true,
        videoSentAt: true,
        unsubscribed: true,
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead non trovato" }, { status: 404 });
    }
    if (lead.unsubscribed) {
      return NextResponse.json(
        { error: "Lead disiscritto" },
        { status: 403 }
      );
    }
    if (!lead.videoLandingUrl) {
      return NextResponse.json(
        { error: "Landing page non ancora creata" },
        { status: 400 }
      );
    }
    if (!lead.email) {
      return NextResponse.json(
        { error: "Lead senza email: impossibile avviare il follow-up automatico" },
        { status: 400 }
      );
    }
    if (lead.videoSentAt) {
      return NextResponse.json(
        { error: "Follow-up gia' avviato in passato" },
        { status: 409 }
      );
    }

    const now = new Date();

    await db.$transaction([
      db.lead.update({
        where: { id },
        data: {
          videoSentAt: now,
          lastContactedAt: now,
          outreachChannel: "EMAIL",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          pipelineStage: "VIDEO_INVIATO" as any,
        },
      }),
      db.activity.create({
        data: {
          leadId: id,
          type: "VIDEO_SENT",
          notes: `Follow-up avviato: msg 1 email auto → ${lead.email}`,
        },
      }),
    ]);

    // Trigger immediato: esegue il step 1 del workflow (delayDays=0)
    const executed = await processLeadWorkflow(id);

    return NextResponse.json({
      success: true,
      executed,
      message: executed
        ? "Email msg 1 inviata, msg 2 partira' a T+3, msg 3 a T+6"
        : "Follow-up avviato ma nessuno step pronto (controlla la configurazione workflow)",
    });
  } catch (error) {
    console.error("[start-video-followup] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Errore durante l'avvio del follow-up",
      },
      { status: 500 }
    );
  }
}
