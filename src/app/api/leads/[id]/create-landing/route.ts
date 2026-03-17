import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createLandingPage } from "@/lib/wordpress";
import { randomUUID } from "crypto";

/**
 * POST /api/leads/[id]/create-landing
 *
 * In un click:
 * 1. Genera token tracking (se non esiste)
 * 2. Crea il post CPT su WordPress via REST API
 * 3. Salva slug e URL nel lead
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
        videoLandingUrl: true,
        videoLandingSlug: true,
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead non trovato" }, { status: 404 });
    }

    if (!lead.videoYoutubeUrl) {
      return NextResponse.json(
        { error: "Inserisci prima il YouTube URL" },
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

    // 2. Genera slug dal nome
    const slug = lead.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    // 3. Crea post su WordPress
    const wp = await createLandingPage({
      title: lead.name,
      nomeProspect: lead.name.split(" ")[0], // primo nome per "Ciao Mario"
      videoYoutubeUrl: lead.videoYoutubeUrl,
      trackingToken: token,
      slug,
    });

    // 4. Salva nel CRM
    await db.lead.update({
      where: { id },
      data: {
        videoTrackingToken: token,
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
