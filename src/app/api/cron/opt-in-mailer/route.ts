import { NextResponse } from "next/server";
import { runOptInMailer } from "@/lib/opt-in-mailer";

/**
 * POST /api/cron/opt-in-mailer
 *
 * Invia la MAIL 1 (opt-in) ai lead caldi/tiepidi con email, e i follow-up.
 * Pensato per girare spesso con piccoli batch (invii distribuiti nella giornata).
 * Protetto da CRON_SECRET.
 *
 * L'invio è LENTO di proposito: tra una mail e l'altra c'è una pausa di 4-20s
 * (per distribuire gli invii ed evitare lo spam). Con più mail la richiesta HTTP
 * supererebbe i timeout del proxy/cron. Per questo, di default l'endpoint avvia
 * il lavoro in BACKGROUND e risponde subito (202): il processo Node (PM2) porta
 * avanti gli invii anche dopo che la richiesta è chiusa.
 *
 * Con `?wait=1` resta sincrono (utile per test manuali da terminale).
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const wait = new URL(request.url).searchParams.get("wait") === "1";

  // Modalità sincrona (solo per debug manuale): aspetta e ritorna il riepilogo.
  if (wait) {
    try {
      const result = await runOptInMailer();
      const summary = { ...result, timestamp: new Date().toISOString() };
      console.log("[opt-in-mailer]", summary);
      return NextResponse.json(summary);
    } catch (error) {
      console.error("[opt-in-mailer] Fatal error:", error);
      return NextResponse.json({ error: "Errore interno" }, { status: 500 });
    }
  }

  // Default: fire-and-forget. Il lavoro continua nel processo dopo la risposta.
  runOptInMailer()
    .then((result) => console.log("[opt-in-mailer] completato", { ...result, timestamp: new Date().toISOString() }))
    .catch((error) => console.error("[opt-in-mailer] Fatal error:", error));

  return NextResponse.json(
    { started: true, message: "Invio opt-in avviato in background", timestamp: new Date().toISOString() },
    { status: 202 }
  );
}
