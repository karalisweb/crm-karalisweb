import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { detectSegment } from "@/lib/segments";

/**
 * POST /api/internal/recalc-segments
 *
 * Ricalcola il segmento di tutti i lead basandosi sulla category Google Maps.
 * Protetto da CRON_SECRET.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const leads = await db.lead.findMany({
      where: { segment: null },
      select: { id: true, category: true },
    });

    let updated = 0;
    let unmatched = 0;
    const unmatchedCategories: string[] = [];

    for (const lead of leads) {
      const segment = detectSegment(lead.category);
      if (segment) {
        await db.lead.update({
          where: { id: lead.id },
          data: { segment },
        });
        updated++;
      } else {
        unmatched++;
        if (lead.category && !unmatchedCategories.includes(lead.category)) {
          unmatchedCategories.push(lead.category);
        }
      }
    }

    return NextResponse.json({
      total: leads.length,
      updated,
      unmatched,
      unmatchedCategories: unmatchedCategories.slice(0, 20),
    });
  } catch (error) {
    console.error("Error recalculating segments:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
