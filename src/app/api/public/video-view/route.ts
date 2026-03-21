import { NextResponse } from "next/server";
import { recordVideoEvent } from "@/lib/youtube";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Rate limiting per IP — in-memory, max 1 req/3s per IP
const ipLastRequest = new Map<string, number>();
const IP_RATE_LIMIT_MS = 3_000;

function isIpRateLimited(ip: string): boolean {
  const now = Date.now();
  const last = ipLastRequest.get(ip);
  if (last && now - last < IP_RATE_LIMIT_MS) {
    return true;
  }
  ipLastRequest.set(ip, now);
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
 *
 * API pubblica (no auth) per tracciare eventi video dalla landing page.
 *
 * Body:
 *   { token: string, event: "play" | "progress" | "complete", percent?: number }
 *
 * Retrocompatibile: se event non è presente, tratta come "play" (vecchio comportamento).
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
    const { token, event, percent } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Token mancante" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Valida evento
    const validEvents = ["play", "progress", "complete"];
    const videoEvent = validEvents.includes(event) ? event : "play";

    // Valida percent
    const validPercent =
      typeof percent === "number" && percent >= 0 && percent <= 100
        ? Math.round(percent)
        : undefined;

    const result = await recordVideoEvent(token, videoEvent, validPercent);

    return NextResponse.json(
      { ok: result.ok },
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
