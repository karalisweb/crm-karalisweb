import { NextResponse } from "next/server";
import { requireAdmin, enforceUserRateLimit } from "@/lib/api-auth";
import { eseguiTurno } from "@/lib/agents/turno";
import { eseguiTurnoBni } from "@/lib/agents/bni";
import { sincronizzaIncontri } from "@/lib/ricerca/calendario";
import { eseguiTurnoRicerca } from "@/lib/ricerca/cercatore";
import { avviaAnalisiVeloci } from "@/lib/ricerca/manuale";

/**
 * POST /api/squadra/lancia — un turno lanciato a mano dalla pagina Squadra.
 * Body: { squadra?: "commerciale" | "bni" | "ricerca", limit?: number (max 10) }.
 * Solo ADMIN, al massimo 6 lanci ogni 10 minuti.
 */
export async function POST(request: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const limited = enforceUserRateLimit("squadra-lancia", gate.userId, 6, 10 * 60_000);
  if (limited) return limited;

  const body = await request.json().catch(() => ({}));
  try {
    if (body?.squadra === "bni") {
      await sincronizzaIncontri().catch(() => null);
      return NextResponse.json({ success: true, squadra: "bni", ...(await eseguiTurnoBni()) });
    }
    if (body?.squadra === "esploratore" || body?.squadra === "ricerca") {
      // Lanciata a mano: fino a 5 aziende nuove in più, e l'analisi veloce parte subito.
      const r = await eseguiTurnoRicerca(new Date(), { manuale: true });
      if (r.nuove) avviaAnalisiVeloci();
      return NextResponse.json({ success: true, squadra: "ricerca", ...r });
    }
    const limit = Math.min(Math.max(Number(body?.limit) || 5, 1), 10);
    return NextResponse.json({ success: true, squadra: "commerciale", ...(await eseguiTurno({ limit })) });
  } catch (error) {
    console.error("[squadra] lancio manuale fallito:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Errore interno" }, { status: 500 });
  }
}
