import { NextRequest, NextResponse } from "next/server";
import { togliConcorrenti } from "@/lib/concorrenti";

/**
 * POST /api/cron/mail-decisioni — protetto da CRON_SECRET.
 * v3.98 (Alessio, 2026-11-05: "eviterei via mail, via mail lascerei solo un recap del giorno prima"): la mail delle 7
 * con le aziende da decidere non parte più. Le aziende da decidere (e l'avviso "LinkedIn fermo") stanno in Oggi.
 * Il cron resta: alle 7 toglie i concorrenti, così Oggi è già pulita quando Alessio la apre.
 */
export async function POST(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const concorrentiTolti = await togliConcorrenti();
    return NextResponse.json({ success: true, inviata: false, spenta: true, concorrentiTolti });
  } catch (error) {
    console.error("[mail-decisioni] fallita:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Errore interno" }, { status: 500 });
  }
}
