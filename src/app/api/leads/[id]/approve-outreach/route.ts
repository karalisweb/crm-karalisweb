import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/api-auth";
import { sendOutreachEmail } from "@/lib/email";
import { Prisma } from "@prisma/client";

/**
 * POST /api/leads/[id]/approve-outreach
 *
 * Approvazione della mail 1: invia la mail (eventualmente ritoccata) tramite il
 * trasporto outreach e segna il lead come contattato (optInSentAt). È il "gate"
 * che sostituisce l'auto-invio: niente parte senza il via di Alessio.
 *
 * Body: { subject, body }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    const text = typeof body.body === "string" ? body.body.trim() : "";

    if (!subject || !text) {
      return NextResponse.json({ error: "Oggetto e corpo sono obbligatori" }, { status: 400 });
    }

    const lead = await db.lead.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, optInSentAt: true, unsubscribed: true },
    });
    if (!lead) return NextResponse.json({ error: "Lead non trovato" }, { status: 404 });
    if (!lead.email) return NextResponse.json({ error: "Il lead non ha un'email" }, { status: 400 });
    if (lead.unsubscribed) return NextResponse.json({ error: "Lead disiscritto" }, { status: 400 });
    if (lead.optInSentAt) return NextResponse.json({ error: "Mail già inviata a questo lead" }, { status: 409 });

    // La mail 1 invita al questionario: senza link non si invia.
    const settings = await db.settings.findUnique({
      where: { id: "default" },
      select: { questionnaireUrl: true },
    });
    if (!settings?.questionnaireUrl || !settings.questionnaireUrl.trim()) {
      return NextResponse.json(
        { error: "Link questionario non impostato (Impostazioni → Link Questionario)" },
        { status: 400 }
      );
    }

    const ok = await sendOutreachEmail(lead.email, subject, text, lead.id);
    if (!ok) {
      return NextResponse.json({ error: "Invio SMTP fallito" }, { status: 502 });
    }

    const sentRecord: Prisma.InputJsonValue = {
      subject,
      body: text,
      approvedAt: new Date().toISOString(),
    };
    await db.$transaction([
      db.lead.update({
        where: { id: lead.id },
        data: {
          outreachMailSent: sentRecord,
          outreachDraft: Prisma.DbNull,
          optInSentAt: new Date(),
          lastContactedAt: new Date(),
        },
      }),
      db.activity.create({
        data: { leadId: lead.id, type: "EMAIL_OUTREACH", notes: `[Opt-in] mail approvata e inviata → ${lead.email}` },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[API] approve-outreach error:", error);
    return NextResponse.json({ error: "Errore nell'approvazione" }, { status: 500 });
  }
}
