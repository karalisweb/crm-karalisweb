import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runScriptwriterPrompt } from "@/lib/gemini-scriptwriter";
import { isGeminiConfigured } from "@/lib/gemini";

/**
 * POST /api/leads/[id]/run-scriptwriter
 *
 * Prompt 2 "Sceneggiatore": genera script video a 4 atti.
 * GATE: richiede che l'output dell'analista sia approvato.
 * Body opzionale: { notes?: string }
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

    // Verify lead exists and analyst is approved (GATE CHECK)
    const lead = await db.lead.findUnique({
      where: { id },
      select: { id: true, name: true, analystApprovedAt: true },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead non trovato" }, { status: 404 });
    }

    if (!lead.analystApprovedAt) {
      return NextResponse.json(
        { error: "Devi prima approvare l'output dell'analista (Step 1)" },
        { status: 400 }
      );
    }

    // Run scriptwriter prompt
    const scriptOutput = await runScriptwriterPrompt(id, notes);

    // Save to geminiAnalysis (reusing existing field for backward compat)
    await db.lead.update({
      where: { id },
      data: {
        geminiAnalysis: scriptOutput as unknown as import("@prisma/client").Prisma.InputJsonValue,
        geminiAnalyzedAt: new Date(),
        scriptApprovedAt: null,
        scriptApprovedBy: null,
      },
    });

    return NextResponse.json({
      success: true,
      scriptOutput,
    });
  } catch (error) {
    console.error("[run-scriptwriter] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore durante la generazione dello script" },
      { status: 500 }
    );
  }
}
