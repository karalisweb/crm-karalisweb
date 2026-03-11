import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { isSocialLink } from "@/lib/url-utils";

/**
 * POST /api/leads/filter-social
 * Filtra retroattivamente lead con URL social come website.
 * Sposta il social URL nel campo socialUrl e imposta SENZA_SITO.
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    // Trova tutti i lead con website non nullo
    const leads = await db.lead.findMany({
      where: {
        website: { not: null },
      },
      select: { id: true, website: true },
    });

    let filtered = 0;

    for (const lead of leads) {
      if (lead.website && isSocialLink(lead.website)) {
        await db.lead.update({
          where: { id: lead.id },
          data: {
            socialUrl: lead.website,
            website: null,
            auditStatus: "NO_WEBSITE",
            pipelineStage: "SENZA_SITO",
          },
        });
        filtered++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `${filtered} lead filtrati (URL social spostati in SENZA_SITO)`,
      filtered,
      total: leads.length,
    });
  } catch (error) {
    console.error("Error filtering social URLs:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
