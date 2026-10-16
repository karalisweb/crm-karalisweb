import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { chiudiLavoro, ErroreLavoro, SchemaChiusura } from "@/lib/agents/browser";

/**
 * POST /api/agenti/browser/referto
 * Body: { runId, esito: "FATTO", referto: {summary, findings, levers, evidence, confidence} }
 *    o  { runId, esito: "FALLITO", errore }
 *
 * Il referto viene validato: se non rispetta lo schema, 400 con il dettaglio (il lavoro
 * resta in corso e si può rimandare corretto). Protetto da AGENTI_BROWSER_KEY (middleware).
 */
export async function POST(request: Request) {
  try {
    const chiusura = SchemaChiusura.parse(await request.json());
    return NextResponse.json(await chiudiLavoro(chiusura));
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Referto non valido", dettaglio: err.issues.slice(0, 10) }, { status: 400 });
    }
    if (err instanceof ErroreLavoro) return NextResponse.json({ error: err.message }, { status: err.stato });
    if (err instanceof SyntaxError) return NextResponse.json({ error: "JSON non valido" }, { status: 400 });
    console.error("[agenti/browser] chiusura fallita:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore interno" }, { status: 500 });
  }
}
