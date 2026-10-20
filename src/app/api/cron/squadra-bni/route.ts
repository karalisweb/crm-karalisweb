import { NextRequest, NextResponse } from "next/server";
import { eseguiTurnoBni, type FaseBni } from "@/lib/agents/bni";
import { sincronizzaIncontri } from "@/lib/ricerca/calendario";

/**
 * POST /api/cron/squadra-bni?fase=mattina|richieste — un turno della squadra BNI.
 *   mattina (alle 7):  copertura, foglio del giorno prima, rete dei membri, profili LinkedIn, mappa;
 *   richieste (alle 14 dei feriali): le richieste di 121 da mandare al pomeriggio (Motore 121).
 * Senza fase: tutto insieme. Chiamato dal crontab del VPS. Protetto da CRON_SECRET.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.CRON_SECRET;
  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    // Prima il calendario: chi ha già prenotato non riceve una nuova richiesta.
    const calendario = await sincronizzaIncontri().catch((e) => ({ errore: e instanceof Error ? e.message : String(e) }));
    const f = request.nextUrl.searchParams.get("fase");
    const fase: FaseBni = f === "mattina" || f === "richieste" ? f : "tutto";
    const riepilogo = { ...(await eseguiTurnoBni(new Date(), fase)), calendario, fase };
    console.log("[squadra-bni] turno:", JSON.stringify(riepilogo));
    return NextResponse.json({ success: true, ...riepilogo });
  } catch (error) {
    console.error("[squadra-bni] turno fallito:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Errore interno" }, { status: 500 });
  }
}
