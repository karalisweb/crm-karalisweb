import { NextRequest, NextResponse } from "next/server";
import { unisciCapitoliDoppi } from "@/lib/agents/bni";

/**
 * POST /api/internal/unisci-capitoli-doppi — v3.133: unisce i capitoli BNI scritti due volte ("BNI Atlantide" e
 * "Atlantide") con i loro membri. Di default è una prova (non scrive): `?prova=0` per applicare.
 * Richiede: Authorization: Bearer CRON_SECRET (o header x-cron-secret).
 */
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const ok = !!expected && (request.headers.get("authorization") === `Bearer ${expected}` || request.headers.get("x-cron-secret") === expected);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const prova = request.nextUrl.searchParams.get("prova") !== "0";
  return NextResponse.json({ success: true, ...(await unisciCapitoliDoppi(prova)) });
}
