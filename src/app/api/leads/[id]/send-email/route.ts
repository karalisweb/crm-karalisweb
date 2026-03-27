import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendOutreachEmail } from "@/lib/email";
import { z } from "zod/v4";

const sendEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = sendEmailSchema.parse(body);

    // Verifica che il lead esista
    const lead = await db.lead.findUnique({ where: { id } });
    if (!lead) {
      return NextResponse.json({ error: "Lead non trovato" }, { status: 404 });
    }

    // Controlla se il lead si è disiscritto
    if (lead.unsubscribed) {
      return NextResponse.json(
        { error: "Questo lead si è disiscritto e non desidera ricevere comunicazioni." },
        { status: 403 }
      );
    }

    // Invia email con GDPR footer
    const sent = await sendOutreachEmail(data.to, data.subject, data.body, lead.id);
    if (!sent) {
      return NextResponse.json(
        { error: "Errore nell'invio email. Verifica la configurazione SMTP." },
        { status: 500 }
      );
    }

    // Aggiorna lead: salva email, canale, logga attività
    await db.$transaction([
      db.lead.update({
        where: { id },
        data: {
          email: data.to,
          outreachChannel: "EMAIL",
          lastContactedAt: new Date(),
        },
      }),
      db.activity.create({
        data: {
          leadId: id,
          type: "EMAIL_OUTREACH",
          notes: `Email outreach inviata a ${data.to}: "${data.subject}"`,
          createdBy: "sistema",
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dati non validi", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error sending email:", error);
    return NextResponse.json(
      { error: "Errore nell'invio email" },
      { status: 500 }
    );
  }
}
