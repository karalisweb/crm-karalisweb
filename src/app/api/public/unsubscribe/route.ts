import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/public/unsubscribe?t=base64(leadId)
// Endpoint pubblico (no auth) per disiscrizione da email outreach
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("t");

  if (!token) {
    return new NextResponse(renderPage("Link non valido", "Il link di disiscrizione non è valido."), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  try {
    // Decodifica il token (base64 del leadId)
    let leadId: string;
    try {
      leadId = Buffer.from(token, "base64url").toString("utf-8");
    } catch {
      return new NextResponse(renderPage("Link non valido", "Il link di disiscrizione non è valido."), {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Verifica che il lead esista
    const lead = await db.lead.findUnique({
      where: { id: leadId },
      select: { id: true, name: true, unsubscribed: true },
    });

    if (!lead) {
      return new NextResponse(renderPage("Link non valido", "Il link di disiscrizione non è valido."), {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Se già disiscritto
    if (lead.unsubscribed) {
      return new NextResponse(
        renderPage("Già disiscritto", "Il tuo indirizzo è già stato rimosso dalla nostra lista."),
        { headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    // Marca come disiscritto
    await db.lead.update({
      where: { id: leadId },
      data: {
        unsubscribed: true,
        unsubscribedAt: new Date(),
      },
    });

    return new NextResponse(
      renderPage(
        "Disiscrizione completata",
        "Sei stato rimosso dalla nostra lista. Non riceverai più comunicazioni da parte nostra."
      ),
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  } catch (error) {
    console.error("[UNSUBSCRIBE] Errore:", error);
    return new NextResponse(
      renderPage("Errore", "Si è verificato un errore. Riprova più tardi."),
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
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
