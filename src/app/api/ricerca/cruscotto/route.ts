import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { cruscottoSettimana } from "@/lib/agents/cruscotto";
import { statoLinkedinOggi } from "@/lib/agents/motore";

/** GET /api/ricerca/cruscotto?settimane=0 — gli 11 numeri della settimana (0 = questa, 1 = la scorsa…). */
export async function GET(request: NextRequest) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  const indietro = Math.min(12, Math.max(0, Number(request.nextUrl.searchParams.get("settimane") ?? 0) || 0));
  const giorno = new Date(Date.now() - indietro * 7 * 86400_000);
  const [c, linkedin] = await Promise.all([cruscottoSettimana(giorno), statoLinkedinOggi()]);
  return NextResponse.json({ ...c, linkedin });
}
