import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createLandingPage } from "@/lib/wordpress";
import { randomUUID } from "crypto";
import type { GeminiAnalysisResult } from "@/types";

/**
 * POST /api/leads/[id]/create-landing
 *
 * Crea landing page su WordPress:
 * 1. Genera token tracking (se non esiste)
 * 2. Crea il post CPT "prospect" su WordPress via REST API
 * 3. Compila i campi ACF (nome azienda, punto di dolore, video YouTube)
 * 4. Salva slug e URL nel lead
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const lead = await db.lead.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        videoTrackingToken: true,
        videoYoutubeUrl: true,
        videoYoutubeId: true,
        videoLandingUrl: true,
        videoLandingSlug: true,
        landingPuntoDolore: true,
        geminiAnalysis: true,
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead non trovato" }, { status: 404 });
    }

    if (!lead.videoYoutubeUrl) {
      return NextResponse.json(
        { error: "Carica prima il video su YouTube (o inserisci il YouTube URL)" },
        { status: 400 }
      );
    }

    // Se la landing esiste già, errore
    if (lead.videoLandingUrl) {
      return NextResponse.json(
        { error: "Landing page già creata", url: lead.videoLandingUrl },
        { status: 409 }
      );
    }

    // 1. Genera token se non esiste
    let token = lead.videoTrackingToken;
    if (!token) {
      token = randomUUID().replace(/-/g, "");
      await db.lead.update({
        where: { id },
        data: { videoTrackingToken: token },
      });
    }

    // 2. Punto di dolore: campo manuale > fallback da Gemini
    let puntoDiDolore = lead.landingPuntoDolore || "";
    if (!puntoDiDolore && lead.geminiAnalysis) {
      const gemini = lead.geminiAnalysis as unknown as GeminiAnalysisResult;
      if (gemini.primary_error_pattern) {
        puntoDiDolore = gemini.primary_error_pattern;
      }
    }

    // 3. Genera slug dal nome azienda
    const slug = lead.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    // 4. Crea post su WordPress con campi ACF
    const wp = await createLandingPage({
      title: lead.name,
      nomeAzienda: lead.name,
      videoYoutubeUrl: lead.videoYoutubeUrl,
      puntoDiDolore,
      trackingToken: token,
      slug,
    });

    // 5. Salva nel CRM
    await db.lead.update({
      where: { id },
      data: {
        videoTrackingToken: token,
        videoYoutubeId: lead.videoYoutubeId,
        videoLandingSlug: wp.slug,
        videoLandingUrl: wp.url,
      },
    });

    return NextResponse.json({
      success: true,
      token,
      slug: wp.slug,
      url: wp.url,
      wpPostId: wp.wpPostId,
    });
  } catch (error) {
    console.error("[create-landing] Errore:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore creazione landing" },
      { status: 500 }
    );
  }
}
