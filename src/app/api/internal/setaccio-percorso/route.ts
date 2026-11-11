import { NextRequest, NextResponse } from "next/server";
import { setaccioPercorso } from "@/lib/agents/rete";

/**
 * POST /api/internal/setaccio-percorso — v3.129: ripassa tutte le aziende del Percorso con le regole di adesso
 * (niente WhatsApp/mail a chi non ti conosce, senza relazione si molla) e dice cosa è cambiato.
 * Richiede: Authorization: Bearer CRON_SECRET (o header x-cron-secret).
 */
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const ok = !!expected && (request.headers.get("authorization") === `Bearer ${expected}` || request.headers.get("x-cron-secret") === expected);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ success: true, ...(await setaccioPercorso()) });
}
