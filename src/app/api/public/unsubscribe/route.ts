import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type UnsubResult =
  | { kind: "invalid" }
  | { kind: "notfound" }
  | { kind: "already" }
  | { kind: "done" };

/**
 * Logica condivisa di disiscrizione. Decodifica il token (base64url del leadId),
 * verifica il lead e lo marca come disiscritto. Usata sia dal GET (pagina HTML,
 * link nel footer) sia dal POST (one-click RFC 8058, pulsante nativo Gmail).
 */
async function applyUnsubscribe(token: string | null): Promise<UnsubResult> {
  if (!token) return { kind: "invalid" };

  let leadId: string;
  try {
    leadId = Buffer.from(token, "base64url").toString("utf-8");
  } catch {
    return { kind: "invalid" };
  }
  if (!leadId) return { kind: "invalid" };

  const lead = await db.lead.findUnique({
    where: { id: leadId },
    select: { id: true, unsubscribed: true },
  });
  if (!lead) return { kind: "notfound" };
  if (lead.unsubscribed) return { kind: "already" };

  await db.lead.update({
    where: { id: leadId },
    data: { unsubscribed: true, unsubscribedAt: new Date() },
  });
  return { kind: "done" };
}

// GET /api/public/unsubscribe?t=base64(leadId)
// Pagina HTML per disiscrizione manuale (link nel footer della mail).
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("t");

  try {
    const result = await applyUnsubscribe(token);
    switch (result.kind) {
      case "invalid":
        return html("Link non valido", "Il link di disiscrizione non è valido.", 400);
      case "notfound":
        return html("Link non valido", "Il link di disiscrizione non è valido.", 404);
      case "already":
        return html("Già disiscritto", "Il tuo indirizzo è già stato rimosso dalla nostra lista.", 200);
      case "done":
        return html(
          "Disiscrizione completata",
          "Sei stato rimosso dalla nostra lista. Non riceverai più comunicazioni da parte nostra.",
          200
        );
    }
  } catch (error) {
    console.error("[UNSUBSCRIBE] Errore GET:", error);
    return html("Errore", "Si è verificato un errore. Riprova più tardi.", 500);
  }
}

// POST /api/public/unsubscribe?t=base64(leadId)
// One-click (RFC 8058): Gmail/Apple Mail inviano una POST quando l'utente clicca
// il pulsante nativo "Annulla iscrizione". Risposta minimale, niente HTML.
export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("t");

  try {
    const result = await applyUnsubscribe(token);
    // Per il client mail conta solo che la richiesta sia andata a buon fine:
    // "already" e "done" sono entrambi successo (l'utente non è più in lista).
    if (result.kind === "invalid" || result.kind === "notfound") {
      return new NextResponse("Bad Request", { status: 400 });
    }
    return new NextResponse("Unsubscribed", { status: 200 });
  } catch (error) {
    console.error("[UNSUBSCRIBE] Errore POST:", error);
    return new NextResponse("Error", { status: 500 });
  }
}

function html(title: string, message: string, status: number): NextResponse {
  return new NextResponse(renderPage(title, message), {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function renderPage(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin:0; padding:40px 20px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif; background:#f5f5f5; color:#333; display:flex; justify-content:center; align-items:center; min-height:100vh; }
    .card { background:white; border-radius:12px; padding:40px; max-width:480px; text-align:center; box-shadow:0 2px 8px rgba(0,0,0,0.1); }
    h1 { font-size:24px; margin:0 0 16px; }
    p { font-size:16px; color:#666; line-height:1.5; margin:0; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}
