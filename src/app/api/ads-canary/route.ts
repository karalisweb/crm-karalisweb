import { NextResponse } from "next/server";
import { canaryTestApify } from "@/lib/ads-canary";

/**
 * GET /api/ads-canary
 * Verifica se Apify è disponibile (canary test leggero).
 */
export async function GET() {
  try {
    const result = await canaryTestApify();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { available: false, reason: error instanceof Error ? error.message : "Errore canary" },
      { status: 500 }
    );
  }
}
