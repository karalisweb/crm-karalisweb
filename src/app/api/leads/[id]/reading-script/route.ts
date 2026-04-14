import { NextRequest, NextResponse } from "next/server";
import { generateReadingScriptForLead } from "@/lib/gemini-reading-script";

/**
 * POST /api/leads/[id]/reading-script
 *
 * Genera lo script finale di lettura per il video Tella.
 * Delega a generateReadingScriptForLead (condivisa con batch + auto-pipeline).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const customInstructions = body.customInstructions || "";

    const script = await generateReadingScriptForLead(id, customInstructions);

    return NextResponse.json({
      success: true,
      script,
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    });
  } catch (error) {
    console.error("[API] reading-script error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Errore nella generazione dello script",
      },
      { status: 500 }
    );
  }
}
