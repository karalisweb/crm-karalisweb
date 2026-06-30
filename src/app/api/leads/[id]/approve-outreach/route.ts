import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/api-auth";
import { Prisma } from "@prisma/client";

/**
 * POST /api/leads/[id]/approve-outreach
 *
 * Approvazione della mail 1 di un lead HOT: NON invia subito, mette in CODA DI DRIP.
 * Salva la bozza (eventualmente ritoccata) e segna outreachApprovedAt; sarà il motore
 * drip (opt-in-mailer, cron ogni ~10') a inviarla diluendola nell'arco della giornata
 * rispettando il tetto giornaliero. Così Alessio approva ~100 lead in blocco e il
 * sistema li spalma in autonomia. I WARM non passano di qui: partono da soli.
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
      select: { id: true, name: true, email: true, optInSentAt: true, outreachApprovedAt: true, unsubscribed: true },
    });
    if (!lead) return NextResponse.json({ error: "Lead non trovato" }, { status: 404 });
    if (!lead.email) return NextResponse.json({ error: "Il lead non ha un'email" }, { status: 400 });
    if (lead.unsubscribed) return NextResponse.json({ error: "Lead disiscritto" }, { status: 400 });
    if (lead.optInSentAt) return NextResponse.json({ error: "Mail già inviata a questo lead" }, { status: 409 });

    // La mail 1 invita al questionario: senza link non ha senso approvare.
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

    // Salva la bozza approvata e mette in coda di drip (NON invia): l'invio lo fa il mailer.
    const approvedDraft: Prisma.InputJsonValue = {
      subject,
      body: text,
      approvedAt: new Date().toISOString(),
    };
    await db.$transaction([
      db.lead.update({
        where: { id: lead.id },
        data: {
          outreachDraft: approvedDraft,
          outreachApprovedAt: new Date(),
        },
      }),
      db.activity.create({
        data: { leadId: lead.id, type: "EMAIL_OUTREACH", notes: `[Approvato] mail in coda di invio → ${lead.email}` },
      }),
    ]);

    return NextResponse.json({ ok: true, queued: true });
  } catch (error) {
    console.error("[API] approve-outreach error:", error);
    return NextResponse.json({ error: "Errore nell'approvazione" }, { status: 500 });
  }
}
