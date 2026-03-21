import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { uploadVideo } from "@/lib/youtube";

/**
 * POST /api/leads/[id]/upload-youtube
 *
 * Riceve un file MP4 via FormData, lo carica su YouTube come unlisted,
 * e salva videoYoutubeUrl + videoYoutubeId nel lead.
 *
 * Body: FormData con campo "video" (file MP4)
 *
 * Limiti: max ~128MB (limite default Next.js per route handler)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const lead = await db.lead.findUnique({
      where: { id },
      select: { id: true, name: true, videoYoutubeId: true },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead non trovato" }, { status: 404 });
    }

    if (lead.videoYoutubeId) {
      return NextResponse.json(
        {
          error: "Video già caricato",
          videoId: lead.videoYoutubeId,
          url: `https://youtu.be/${lead.videoYoutubeId}`,
        },
        { status: 409 }
      );
    }

    // Leggi il file dal FormData
    const formData = await request.formData();
    const file = formData.get("video") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Nessun file video nel body (campo 'video')" },
        { status: 400 }
      );
    }

    // Verifica tipo
    if (!file.type.startsWith("video/")) {
      return NextResponse.json(
        { error: `Tipo file non valido: ${file.type}. Serve un video.` },
        { status: 400 }
      );
    }

    // Converti in Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload su YouTube
    const title = `Analisi ${lead.name} — Karalisweb`;
    const result = await uploadVideo({
      fileBuffer: buffer,
      title,
      description: `Analisi digitale personalizzata per ${lead.name}.\nPreparata da Alessio Loi — Karalisweb`,
    });

    // Salva nel lead
    await db.lead.update({
      where: { id },
      data: {
        videoYoutubeId: result.videoId,
        videoYoutubeUrl: result.url,
      },
    });

    return NextResponse.json({
      success: true,
      videoId: result.videoId,
      url: result.url,
    });
  } catch (error) {
    console.error("[upload-youtube] Errore:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore upload YouTube" },
      { status: 500 }
    );
  }
}
