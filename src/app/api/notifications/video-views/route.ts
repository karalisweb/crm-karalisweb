import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/notifications/video-views?since=ISO_TIMESTAMP
 * Ritorna lead che hanno visto il video dopo il timestamp dato.
 * Usato dal poller per notifiche real-time.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const since = searchParams.get("since");

    if (!since) {
      return NextResponse.json(
        { error: "Parametro 'since' richiesto (ISO timestamp)" },
        { status: 400 }
      );
    }

    const sinceDate = new Date(since);
    if (isNaN(sinceDate.getTime())) {
      return NextResponse.json(
        { error: "Formato 'since' non valido" },
        { status: 400 }
      );
    }

    const views = await db.lead.findMany({
      where: {
        videoViewedAt: { gte: sinceDate },
      },
      select: {
        id: true,
        name: true,
        videoViewedAt: true,
        videoViewsCount: true,
      },
      orderBy: { videoViewedAt: "desc" },
      take: 20,
    });

    return NextResponse.json({
      views: views.map((v) => ({
        leadId: v.id,
        leadName: v.name,
        viewedAt: v.videoViewedAt?.toISOString(),
        viewsCount: v.videoViewsCount,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore" },
      { status: 500 }
    );
  }
}
