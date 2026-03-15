import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calculateLeadScore, extractScoreInputFromGeminiAnalysis } from "@/lib/scoring/lead-score";

/**
 * POST /api/internal/recalc-scores
 *
 * Ricalcola opportunityScore per tutti i lead con geminiAnalysis.
 * Usa la nuova logica "Sanguinamento Finanziario".
 * Richiede CRON_SECRET per autenticazione.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.CRON_SECRET;
  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const leads = await db.lead.findMany({
    where: {
      geminiAnalysis: { not: { equals: null } },
    },
    select: {
      id: true,
      name: true,
      category: true,
      geminiAnalysis: true,
      opportunityScore: true,
    },
  });

  console.log(`[RECALC] Ricalcolo score per ${leads.length} lead...`);

  const results: Array<{ name: string; oldScore: number | null; newScore: number; breakdown: string[] }> = [];

  for (const lead of leads) {
    const scoreInput = extractScoreInputFromGeminiAnalysis(lead.geminiAnalysis, lead.category);
    const scoreResult = calculateLeadScore(scoreInput);

    await db.lead.update({
      where: { id: lead.id },
      data: {
        opportunityScore: scoreResult.score,
        scoreBreakdown: {
          score: scoreResult.score,
          tier: scoreResult.tier,
          breakdown: scoreResult.breakdown,
          calculatedAt: new Date().toISOString(),
        },
      },
    });

    results.push({
      name: lead.name,
      oldScore: lead.opportunityScore,
      newScore: scoreResult.score,
      breakdown: scoreResult.breakdown,
    });

    console.log(
      `[RECALC] ${lead.name}: ${lead.opportunityScore ?? "null"} → ${scoreResult.score} (${scoreResult.breakdown.join(", ")})`
    );
  }

  return NextResponse.json({
    total: leads.length,
    results,
  });
}
