import { NextResponse } from "next/server";
import { requireAdmin, enforceUserRateLimit } from "@/lib/api-auth";
import { eseguiTurno } from "@/lib/agents/turno";

/**
 * POST /api/squadra/lancia — un turno piccolo lanciato a mano dalla pagina Squadra.
 * Body: { limit?: number } (max 10). Solo ADMIN, al massimo 6 lanci ogni 10 minuti.
 */
export async function POST(request: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const limited = enforceUserRateLimit("squadra-lancia", gate.userId, 6, 10 * 60_000);
  if (limited) return limited;

  const body = await request.json().catch(() => ({}));
  const limit = Math.min(Math.max(Number(body?.limit) || 5, 1), 10);
  try {
    return NextResponse.json({ success: true, ...(await eseguiTurno({ limit })) });
  } catch (error) {
    console.error("[squadra] lancio manuale fallito:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Errore interno" },
      { status: 500 }
    );
  }
}
