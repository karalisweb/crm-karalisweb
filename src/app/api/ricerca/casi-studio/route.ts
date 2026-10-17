import { NextRequest, NextResponse } from "next/server";
import { requireSession, enforceUserRateLimit } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { caricaCasoStudio, PDF_MAX_BYTES } from "@/lib/ricerca/casi-studio";

/** GET /api/ricerca/casi-studio — i casi con le loro chiavi e quanto hanno trovato. */
export async function GET() {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  const casi = await db.casoStudio.findMany({
    orderBy: [{ stato: "asc" }, { createdAt: "desc" }],
    omit: { pdf: true, testo: true },
    include: { chiavi: { orderBy: { tipo: "asc" }, include: { _count: { select: { ritrovamenti: true } } } } },
  });
  return NextResponse.json({ casi });
}

/** POST /api/ricerca/casi-studio (multipart, campo "pdf") — carica un caso e lo fa leggere all'AI. */
export async function POST(request: NextRequest) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  const limited = enforceUserRateLimit("casi-studio", gate.userId, 10, 10 * 60_000);
  if (limited) return limited;
  const form = await request.formData().catch(() => null);
  const file = form?.get("pdf");
  if (!file || typeof file === "string") return NextResponse.json({ error: "Manca il PDF" }, { status: 400 });
  if (file.size > PDF_MAX_BYTES) return NextResponse.json({ error: "Il PDF supera 15 MB" }, { status: 413 });
  try {
    const caso = await caricaCasoStudio(file.name || "caso-studio.pdf", Buffer.from(await file.arrayBuffer()));
    return NextResponse.json({ success: true, caso });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore";
    return NextResponse.json({ error: msg }, { status: /PDF|15 MB/.test(msg) ? 400 : 500 });
  }
}
