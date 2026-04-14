import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { findLandingPageBySlug, updateLandingPage } from "@/lib/wordpress";

/**
 * POST /api/leads/[id]/resync-landing
 *
 * Risincronizza la landing page WordPress con i dati attuali del CRM.
 * Utile per:
 *  - lead con landing creata prima della v3.13.1 (no wpPostId salvato)
 *  - lead in cui la landing si e' desincronizzata (es. video sbagliato pubblicato)
 *
 * Logica:
 *  1. Se manca wpPostId nel DB, lo cerca su WP per slug e lo salva
 *  2. Push del videoYoutubeUrl e landingPuntoDolore correnti su WordPress
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const lead = await db.lead.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        videoLandingSlug: true,
        videoLandingUrl: true,
        videoWpPostId: true,
        videoYoutubeUrl: true,
        landingPuntoDolore: true,
        puntoDoloreLungo: true,
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead non trovato" }, { status: 404 });
    }

    if (!lead.videoLandingUrl || !lead.videoLandingSlug) {
      return NextResponse.json(
        { error: "Nessuna landing page da risincronizzare" },
        { status: 400 },
      );
    }

    if (!lead.videoYoutubeUrl) {
      return NextResponse.json(
        { error: "Nessun video YouTube impostato" },
        { status: 400 },
      );
    }

    // 1. Recupera wpPostId se mancante
    let wpPostId = lead.videoWpPostId;
    if (!wpPostId) {
      wpPostId = await findLandingPageBySlug(lead.videoLandingSlug);
      if (!wpPostId) {
        return NextResponse.json(
          {
            error: `Post WordPress non trovato per slug "${lead.videoLandingSlug}". Forse e' stato eliminato manualmente.`,
          },
          { status: 404 },
        );
      }
      await db.lead.update({
        where: { id },
        data: { videoWpPostId: wpPostId },
      });
    }

    // 2. Push aggiornamenti
    const puntoDolore = lead.puntoDoloreLungo || lead.landingPuntoDolore || "";
    await updateLandingPage(wpPostId, {
      videoYoutubeUrl: lead.videoYoutubeUrl,
      puntoDiDolore: puntoDolore,
      nomeAzienda: lead.name,
    });

    return NextResponse.json({
      success: true,
      wpPostId,
      videoYoutubeUrl: lead.videoYoutubeUrl,
      message: "Landing risincronizzata con successo",
    });
  } catch (error) {
    console.error("[resync-landing] Errore:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore risync" },
      { status: 500 },
    );
  }
}
