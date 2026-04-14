import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { processFullVideoScript } from "@/lib/background-jobs";
import { isGeminiConfigured } from "@/lib/gemini";

/**
 * POST /api/leads/[id]/regenerate-video-script
 *
 * Bottone "Rifai tutto": rilancia analista + sceneggiatore in sequenza
 * con auto-approvazione. Sincrono (aspetta il completamento) così l'UI
 * può mostrare subito il nuovo script.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!isGeminiConfigured()) {
      return NextResponse.json(
        { error: "Gemini API key non configurata" },
        { status: 400 }
      );
    }

    const lead = await db.lead.findUnique({
      where: { id },
      select: { id: true, auditStatus: true, website: true },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead non trovato" }, { status: 404 });
    }
    if (!lead.website) {
      return NextResponse.json(
        { error: "Lead senza sito web" },
        { status: 400 }
      );
    }
    if (lead.auditStatus !== "COMPLETED") {
      return NextResponse.json(
        { error: "Audit non completato, impossibile rigenerare lo script" },
        { status: 400 }
      );
    }

    await processFullVideoScript(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[regenerate-video-script] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Errore durante la rigenerazione",
      },
      { status: 500 }
    );
  }
}
