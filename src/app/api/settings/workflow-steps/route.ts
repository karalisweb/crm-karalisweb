import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET — Tutti gli step del workflow
export async function GET() {
  try {
    const steps = await db.workflowStep.findMany({
      orderBy: [{ stepNumber: "asc" }, { channel: "asc" }, { variantLabel: "asc" }],
    });

    // Recupera anche i campi workflow da Settings
    const settings = await db.settings.findFirst({
      select: {
        workflowEnabled: true,
        bookingUrl: true,
        signatureAlessio: true,
        signatureFrancesca: true,
        caseStudiesBlock: true,
      },
    });

    return NextResponse.json({ steps, settings: settings || {} });
  } catch (error) {
    console.error("Error fetching workflow steps:", error);
    return NextResponse.json({ error: "Errore nel recupero workflow" }, { status: 500 });
  }
}

// PUT — Aggiorna uno step o le settings workflow
export async function PUT(request: Request) {
  try {
    const body = await request.json();

    // Update settings workflow (workflowEnabled, bookingUrl, etc.)
    if (body.type === "settings") {
      const { type: _, ...data } = body;
      const settings = await db.settings.upsert({
        where: { id: "default" },
        update: data,
        create: { id: "default", ...data },
      });
      return NextResponse.json(settings);
    }

    // Update singolo step
    const { id, ...data } = body;
    if (!id) {
      return NextResponse.json({ error: "ID step mancante" }, { status: 400 });
    }

    const step = await db.workflowStep.update({
      where: { id },
      data,
    });
    return NextResponse.json(step);
  } catch (error) {
    console.error("Error updating workflow step:", error);
    return NextResponse.json({ error: "Errore nell'aggiornamento" }, { status: 500 });
  }
}
