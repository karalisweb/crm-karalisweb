import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { analyzeAdsForLead } from "@/lib/ads-intelligence";

/**
 * POST /api/leads/[id]/ads-check
 *
 * Lancia l'analisi Ads Intelligence asincrona per un lead.
 * Non blocca — salva risultati nel DB e li ritorna.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const lead = await db.lead.findUnique({
      where: { id },
      select: { id: true, name: true, website: true },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead non trovato" }, { status: 404 });
    }

    if (!lead.website) {
      return NextResponse.json(
        { error: "Sito web mancante" },
        { status: 400 }
      );
    }

    const domain = lead.website
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0];

    const result = await analyzeAdsForLead(lead.id, lead.name, domain);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("[API] ads-check error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore analisi Ads" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/leads/[id]/ads-check
 *
 * Ritorna lo stato corrente dei dati Ads Intelligence dal DB.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const lead = await db.lead.findUnique({
      where: { id },
      select: {
        hasActiveGoogleAds: true,
        hasActiveMetaAds: true,
        googleAdsCopy: true,
        metaAdsCopy: true,
        landingPageUrl: true,
        landingPageText: true,
        adsCheckedAt: true,
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead non trovato" }, { status: 404 });
    }

    return NextResponse.json({ data: lead });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore" },
      { status: 500 }
    );
  }
}
