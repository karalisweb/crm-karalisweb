import { NextResponse } from "next/server";
import { recordVideoEvent } from "@/lib/youtube";

function corsHeaders(request: Request) {
  const origin = request.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Credentials": "true",
  };
}

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
export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

/**
 * POST /api/public/video-view
 *
 * API pubblica (no auth) per tracciare eventi video dalla landing page.
 *
 * Body:
 *   { token: string, event: "play" | "progress" | "complete", percent?: number }
 */
export async function POST(request: Request) {
  const headers = corsHeaders(request);
  try {
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || "unknown";
    if (isIpRateLimited(ip)) {
      return NextResponse.json(
        { ok: true, skipped: true },
        { status: 200, headers }
      );
    }

    const body = await request.json();
    const { token, event, percent, utm } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Token mancante" },
        { status: 400, headers }
      );
    }

    // Solo le visite con utm=client vengono tracciate (esclude visite interne)
    if (utm !== "client") {
      return NextResponse.json(
        { ok: true, skipped: true, reason: "internal" },
        { status: 200, headers }
      );
    }

    const validEvents = ["play", "progress", "complete"];
    const videoEvent = validEvents.includes(event) ? event : "play";

    const validPercent =
      typeof percent === "number" && percent >= 0 && percent <= 100
        ? Math.round(percent)
        : undefined;

    const result = await recordVideoEvent(token, videoEvent, validPercent);

    return NextResponse.json(
      { ok: result.ok },
      { status: 200, headers }
    );
  } catch (error) {
    console.error("[PUBLIC] video-view error:", error);
    return NextResponse.json(
      { error: "Errore interno" },
      { status: 500, headers }
    );
  }
}
