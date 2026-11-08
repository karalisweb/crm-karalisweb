import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { salvaInPostaInviata } from "@/lib/email";

/**
 * GET /api/percorso/posta-inviata — v3.120: controlla che il CRM entri nella casella e trovi "Posta inviata".
 * Si collega e legge solo l'elenco delle cartelle: non scrive niente.
 */
export async function GET() {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  return NextResponse.json(await salvaInPostaInviata(null));
}
