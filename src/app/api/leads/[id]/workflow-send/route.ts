import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { renderTemplate } from "@/lib/workflow-templates";
import { sendOutreachEmail } from "@/lib/email";

// POST /api/leads/[id]/workflow-send
// Invio manuale di uno step del workflow
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { stepId, body: bodyOverride, subject: subjectOverride } = await request.json();

    if (!stepId) {
      return NextResponse.json({ error: "stepId mancante" }, { status: 400 });
    }

    const [lead, step, settings] = await Promise.all([
      db.lead.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          whatsappNumber: true,
          category: true,
          videoLandingUrl: true,
          pipelineStage: true,
          outreachChannel: true,
          unsubscribed: true,
        },
      }),
      db.workflowStep.findUnique({ where: { id: stepId } }),
      db.settings.findFirst({
        select: {
          calendlyUrl: true,
          signatureAlessio: true,
          signatureFrancesca: true,
          caseStudiesBlock: true,
        },
      }),
    ]);

    if (!lead || !step) {
      return NextResponse.json({ error: "Lead o step non trovato" }, { status: 404 });
    }

    if (lead.unsubscribed) {
      return NextResponse.json({ error: "Lead disiscritto" }, { status: 403 });
    }

    const templateSettings = settings || {
      calendlyUrl: null,
      signatureAlessio: null,
      signatureFrancesca: null,
      caseStudiesBlock: null,
    };

    if (step.channel === "email") {
      if (!lead.email) {
        return NextResponse.json({ error: "Lead senza email" }, { status: 400 });
      }

      const renderedBody = bodyOverride || renderTemplate(step.body, lead, templateSettings, step);
      const renderedSubject = subjectOverride || (step.subject ? renderTemplate(step.subject, lead, templateSettings, step) : `Analisi per ${lead.name}`);

      const sent = await sendOutreachEmail(
        lead.email,
        renderedSubject,
        renderedBody,
        lead.id,
        {
          fromName: step.fromName || undefined,
          fromEmail: step.fromEmail || undefined,
        },
      );

      if (!sent) {
        // Registra esecuzione fallita
        await db.workflowExecution.upsert({
          where: { uq_execution_step_lead: { stepId, leadId: id } },
          update: { status: "failed", error: "SMTP error" },
          create: { stepId, leadId: id, status: "failed", error: "SMTP error" },
        });
        return NextResponse.json({ error: "Errore invio email" }, { status: 500 });
      }

      // Registra esecuzione + activity + avanza stage
      await db.$transaction([
        db.workflowExecution.upsert({
          where: { uq_execution_step_lead: { stepId, leadId: id } },
          update: { status: "sent", sentAt: new Date() },
          create: { stepId, leadId: id, status: "sent", sentAt: new Date() },
        }),
        db.activity.create({
          data: {
            leadId: id,
            type: "EMAIL_OUTREACH",
            notes: `[Workflow Step ${step.stepNumber}] ${step.name} → ${lead.email}\nOggetto: ${renderedSubject}`,
          },
        }),
        ...(step.nextStage
          ? [
              db.lead.update({
                where: { id },
                data: {
                  pipelineStage: step.nextStage as any,
                  lastContactedAt: new Date(),
                },
              }),
            ]
          : []),
      ]);

      return NextResponse.json({ ok: true, channel: "email", sentTo: lead.email });
    }

    // WhatsApp — non si può inviare automaticamente, si prepara il link
    if (step.channel === "whatsapp") {
      const phone = lead.whatsappNumber || lead.phone;
      if (!phone) {
        return NextResponse.json({ error: "Lead senza numero telefono" }, { status: 400 });
      }

      const renderedBody = bodyOverride || renderTemplate(step.body, lead, templateSettings, step);
      const cleanPhone = phone.replace(/\D/g, "");
      const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(renderedBody)}`;

      // Registra esecuzione + activity + avanza stage
      await db.$transaction([
        db.workflowExecution.upsert({
          where: { uq_execution_step_lead: { stepId, leadId: id } },
          update: { status: "sent", sentAt: new Date() },
          create: { stepId, leadId: id, status: "sent", sentAt: new Date() },
        }),
        db.activity.create({
          data: {
            leadId: id,
            type: "WHATSAPP_SENT",
            notes: `[Workflow Step ${step.stepNumber}] ${step.name} → ${phone}`,
          },
        }),
        ...(step.nextStage
          ? [
              db.lead.update({
                where: { id },
                data: {
                  pipelineStage: step.nextStage as any,
                  lastContactedAt: new Date(),
                },
              }),
            ]
          : []),
      ]);

      return NextResponse.json({ ok: true, channel: "whatsapp", waUrl });
    }

    return NextResponse.json({ error: "Canale non supportato" }, { status: 400 });
  } catch (error) {
    console.error("Error sending workflow step:", error);
    return NextResponse.json({ error: "Errore invio" }, { status: 500 });
  }
}
