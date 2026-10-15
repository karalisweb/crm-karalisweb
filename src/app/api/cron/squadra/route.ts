import { NextRequest, NextResponse } from "next/server";
import { eseguiTurno } from "@/lib/agents/turno";

/**
 * POST /api/cron/squadra?limit=20
 *
 * Un turno della squadra di agenti, chiamato dal crontab del VPS (l'unico orologio).
 * Ripetibile senza danni: non rifà ciò che ha già un referto valido.
 * Richiede CRON_SECRET.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.CRON_SECRET;
  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit")) || 20, 1), 100);
  try {
    const riepilogo = await eseguiTurno({ limit });
    console.log("[squadra] turno:", JSON.stringify(riepilogo));
    return NextResponse.json({ success: true, ...riepilogo });
  } catch (error) {
    console.error("[squadra] turno fallito:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Errore interno" },
      { status: 500 }
    );
  }
}
