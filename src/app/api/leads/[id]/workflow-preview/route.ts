import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { renderTemplate } from "@/lib/workflow-templates";

// POST /api/leads/[id]/workflow-preview
// Renderizza un template workflow con i dati reali del lead
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { stepId } = await request.json();

    if (!stepId) {
      return NextResponse.json({ error: "stepId mancante" }, { status: 400 });
    }

    const [lead, step, settings] = await Promise.all([
      db.lead.findUnique({
        where: { id },
        select: { name: true, category: true, segment: true, videoLandingUrl: true },
      }),
      db.workflowStep.findUnique({ where: { id: stepId } }),
      db.settings.findFirst({
        select: {
          bookingUrl: true,
          signatureAlessio: true,
          signatureFrancesca: true,
          caseStudiesBlock: true,
        },
      }),
    ]);

    if (!lead || !step) {
      return NextResponse.json({ error: "Lead o step non trovato" }, { status: 404 });
    }

    const renderedBody = renderTemplate(step.body, lead, settings || {
      bookingUrl: null,
      signatureAlessio: null,
      signatureFrancesca: null,
      caseStudiesBlock: null,
    }, step);

    const renderedSubject = step.subject
      ? renderTemplate(step.subject, lead, settings || {
          bookingUrl: null,
          signatureAlessio: null,
          signatureFrancesca: null,
          caseStudiesBlock: null,
        }, step)
      : null;

    return NextResponse.json({
      subject: renderedSubject,
      body: renderedBody,
      fromName: step.fromName,
      fromEmail: step.fromEmail,
      channel: step.channel,
    });
  } catch (error) {
    console.error("Error previewing workflow:", error);
    return NextResponse.json({ error: "Errore" }, { status: 500 });
  }
}
