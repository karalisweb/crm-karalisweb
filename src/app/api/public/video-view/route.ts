import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const RATE_LIMIT_MS = 5 * 60 * 1000; // 5 minuti

// Rate limiting per IP — in-memory, max 1 req/10s per IP
const ipLastRequest = new Map<string, number>();
const IP_RATE_LIMIT_MS = 10_000; // 10 secondi

function isIpRateLimited(ip: string): boolean {
  const now = Date.now();
  const last = ipLastRequest.get(ip);
  if (last && now - last < IP_RATE_LIMIT_MS) {
    return true;
  }
  ipLastRequest.set(ip, now);
  // Pulizia periodica per evitare memory leak
  if (ipLastRequest.size > 1000) {
    const cutoff = now - IP_RATE_LIMIT_MS;
    for (const [key, ts] of ipLastRequest) {
      if (ts < cutoff) ipLastRequest.delete(key);
    }
  }
  return false;
}

/**
 * OPTIONS /api/public/video-view — CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * POST /api/public/video-view
 * API pubblica (no auth) per tracciare quando un lead guarda il video.
 * Body: { token: string }
 */
export async function POST(request: Request) {
  try {
    // Rate limit per IP
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || "unknown";
    if (isIpRateLimited(ip)) {
      return NextResponse.json(
        { ok: true, skipped: true },
        { status: 200, headers: CORS_HEADERS }
      );
    }

    const body = await request.json();
    const { token } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Token mancante" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Trova lead dal token
    const lead = await db.lead.findUnique({
      where: { videoTrackingToken: token },
      select: {
        id: true,
        name: true,
        videoViewedAt: true,
        videoViewsCount: true,
      },
    });

    if (!lead) {
      // Non rivelare se il token esiste o meno
      return NextResponse.json(
        { ok: true },
        { status: 200, headers: CORS_HEADERS }
      );
    }

    // Rate limit: skip se ultimo view < 5 min fa
    if (lead.videoViewedAt) {
      const elapsed = Date.now() - lead.videoViewedAt.getTime();
      if (elapsed < RATE_LIMIT_MS) {
        return NextResponse.json(
          { ok: true, skipped: true },
          { status: 200, headers: CORS_HEADERS }
        );
      }
    }

    // Aggiorna lead: incrementa conteggio, setta timestamp
    await db.lead.update({
      where: { id: lead.id },
      data: {
        videoViewsCount: { increment: 1 },
        videoViewedAt: new Date(),
      },
    });

    // Crea Activity VIDEO_VIEWED
    await db.activity.create({
      data: {
        leadId: lead.id,
        type: "VIDEO_VIEWED",
        notes: `Video visualizzato (view #${lead.videoViewsCount + 1})`,
      },
    });

    return NextResponse.json(
      { ok: true },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error("[PUBLIC] video-view error:", error);
    return NextResponse.json(
      { error: "Errore interno" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
