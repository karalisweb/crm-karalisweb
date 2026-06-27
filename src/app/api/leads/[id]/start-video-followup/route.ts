import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/leads/[id]/start-video-followup
 *
 * Segna che il video è stato inviato dopo che la landing page è pronta.
 * - Setta videoSentAt + outreachChannel=EMAIL + pipelineStage=VIDEO_INVIATO
 * - Registra l'attività VIDEO_SENT
 *
 * L'invio effettivo del link video è manuale (WhatsApp/email): l'utente apre
 * il link wa.me o invia dalla UI. Il cron `check-video-followup` creerà un
 * promemoria se il prospect non guarda il video entro N giorni.
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
          notes: `Video segnato come inviato → ${lead.email}`,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Video segnato come inviato. Invia il link al prospect (WhatsApp/email).",
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
