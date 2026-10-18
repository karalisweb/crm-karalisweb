import { NextRequest, NextResponse } from "next/server";
import { inviaMailDecisioni } from "@/lib/agents/mail-decisioni";

/** POST /api/cron/mail-decisioni — la mail delle 7 con le aziende da decidere. Protetto da CRON_SECRET. */
export async function POST(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json({ success: true, ...(await inviaMailDecisioni()) });
  } catch (error) {
    console.error("[mail-decisioni] fallita:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Errore interno" }, { status: 500 });
  }
}
