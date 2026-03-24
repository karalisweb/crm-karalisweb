import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runAnalystPrompt } from "@/lib/gemini-analyst";
import { isGeminiConfigured } from "@/lib/gemini";

/**
 * POST /api/leads/[id]/run-analyst
 *
 * Prompt 1 "Analista": ri-scrapa il sito e analizza pain points.
 * Body opzionale: { notes?: string } per istruzioni di rigenerazione.
 * Resetta tutta la catena downstream (script, landing, ecc.)
 */
export async function POST(
  request: Request,
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

    // Parse optional notes
    let notes: string | undefined;
    try {
      const body = await request.json();
      notes = body.notes;
    } catch {
      // No body — normal flow
    }

    // Verify lead exists
    const lead = await db.lead.findUnique({
      where: { id },
      select: { id: true, name: true, website: true },
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

    // Run analyst prompt (re-scrapes site + calls Gemini)
    const analystOutput = await runAnalystPrompt(id, notes);

    // Save output and reset downstream chain
    await db.lead.update({
      where: { id },
      data: {
        analystOutput: analystOutput as unknown as import("@prisma/client").Prisma.InputJsonValue,
        analystApprovedAt: null,
        analystApprovedBy: null,
        // Reset downstream
        scriptApprovedAt: null,
        scriptApprovedBy: null,
      },
    });

    return NextResponse.json({
      success: true,
      analystOutput,
    });
  } catch (error) {
    console.error("[run-analyst] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore durante l'analisi" },
      { status: 500 }
    );
  }
}
