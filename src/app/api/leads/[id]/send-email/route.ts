import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendOutreachEmail } from "@/lib/email";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod/v4";

const sendEmailSchema = z.object({
  // `to` è opzionale: serve solo al PRIMO contatto (quando il lead non ha ancora
  // un'email). Se il lead ha già un'email, si invia a quella e basta.
  to: z.string().email().optional(),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    const userLabel = session?.user?.email || session?.user?.name || "sconosciuto";
    if (!userId) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    // Anti-abuso: max 20 email/minuto per utente (no open-relay di massa).
    const rl = rateLimit(`send-email:${userId}`, 20, 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Troppe email inviate. Riprova tra ${rl.retryAfterSec}s.` },
        { status: 429 }
      );
    }

    const { id } = await params;
    const data = sendEmailSchema.parse(await request.json());

    const lead = await db.lead.findUnique({ where: { id } });
    if (!lead) {
      return NextResponse.json({ error: "Lead non trovato" }, { status: 404 });
    }
    if (lead.unsubscribed) {
      return NextResponse.json(
        { error: "Questo lead si è disiscritto e non desidera ricevere comunicazioni." },
        { status: 403 }
      );
    }

    // ANTI-RELAY: il destinatario è SEMPRE l'email del lead. Il `to` della
    // request viene usato solo se il lead non ha ancora un'email (primo contatto).
    const recipient = lead.email || data.to;
    if (!recipient) {
      return NextResponse.json(
        { error: "Nessun indirizzo email per questo lead. Indica il destinatario al primo contatto." },
        { status: 400 }
      );
    }

    const sent = await sendOutreachEmail(recipient, data.subject, data.body, lead.id);
    if (!sent) {
      return NextResponse.json(
        { error: "Errore nell'invio email. Verifica la configurazione SMTP." },
        { status: 500 }
      );
    }

    // Aggiorna lead + logga attività con il VERO mittente (accountability).
    await db.$transaction([
      db.lead.update({
        where: { id },
        data: {
          email: recipient,
          outreachChannel: "EMAIL",
          lastContactedAt: new Date(),
        },
      }),
      db.activity.create({
        data: {
          leadId: id,
          type: "EMAIL_OUTREACH",
          notes: `Email outreach inviata a ${recipient}: "${data.subject}"`,
          createdBy: userLabel,
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
