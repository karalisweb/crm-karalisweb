import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runGeminiAnalysis } from "@/lib/gemini-analysis";
import { isGeminiConfigured } from "@/lib/gemini";
import { Prisma } from "@prisma/client";
import type { AuditData } from "@/types";

/**
 * POST /api/leads/[id]/gemini-analysis
 *
 * Genera (o rigenera) l'analisi AI Gemini per un lead.
 * Richiede: audit completato + Gemini API key configurata.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!isGeminiConfigured()) {
      return NextResponse.json(
        { error: "Gemini API key non configurata. Vai in Impostazioni > API & Token." },
        { status: 400 }
      );
    }

    const lead = await db.lead.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        website: true,
        category: true,
        auditStatus: true,
        auditData: true,
        qualificationData: true,
        opportunityScore: true,
        commercialTag: true,
        googleRating: true,
        googleReviewsCount: true,
      },
    });

    if (!lead) {
      return NextResponse.json(
        { error: "Lead non trovato" },
        { status: 404 }
      );
    }

    if (lead.auditStatus !== "COMPLETED" || !lead.auditData || !lead.website) {
      return NextResponse.json(
        { error: "Audit non completato o sito web mancante. Impossibile analizzare." },
        { status: 400 }
      );
    }

    const auditData = lead.auditData as unknown as AuditData;

    const analysis = await runGeminiAnalysis({
      leadName: lead.name,
      website: lead.website,
      category: lead.category,
      auditData,
      qualificationData: lead.qualificationData as Record<string, unknown> | null,
      opportunityScore: lead.opportunityScore,
      commercialTag: lead.commercialTag,
      googleRating: lead.googleRating ? Number(lead.googleRating) : null,
      googleReviewsCount: lead.googleReviewsCount,
    });

    // Salva risultato
    await db.lead.update({
      where: { id },
      data: {
        geminiAnalysis: analysis as unknown as Prisma.InputJsonValue,
        geminiAnalyzedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error("[API] gemini-analysis error:", error);
    const message = error instanceof Error ? error.message : "Errore nell'analisi AI";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
