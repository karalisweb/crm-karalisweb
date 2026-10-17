import { NextRequest, NextResponse } from "next/server";
import { eseguiTurnoRicerca } from "@/lib/ricerca/cercatore";

/**
 * POST /api/cron/esploratore — il turno di ricerca clienti (feriali 06:30 e 14:30): le chiavi dei
 * casi studio e delle reti BNI su Google Maps e Google, più i lavori di browser per Facebook,
 * Instagram e LinkedIn. Obiettivo 5 aziende nuove al giorno. Senza chiavi attive torna
 * all'Esploratore di prima (categoria × città). Protetto da CRON_SECRET.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.CRON_SECRET;
  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const r = await eseguiTurnoRicerca();
    console.log("[ricerca]", JSON.stringify({ ...r, passi: r.passi.length }));
    return NextResponse.json({ success: true, ...r });
  } catch (error) {
    console.error("[ricerca] fallito:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Errore interno" }, { status: 500 });
  }
}
