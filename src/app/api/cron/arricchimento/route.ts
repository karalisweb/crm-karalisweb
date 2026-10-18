import { NextRequest, NextResponse } from "next/server";
import { eseguiTurnoArricchimento } from "@/lib/agents/arricchimento";

/**
 * POST /api/cron/arricchimento — il giro veloce sulle aziende trovate e il giro completo su quelle
 * che Alessio ha deciso di approfondire. Gira dopo ogni turno di ricerca. Protetto da CRON_SECRET.
 */
export async function POST(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const r = await eseguiTurnoArricchimento();
    console.log("[arricchimento]", JSON.stringify(r));
    return NextResponse.json({ success: true, ...r });
  } catch (error) {
    console.error("[arricchimento] fallito:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Errore interno" }, { status: 500 });
  }
}
