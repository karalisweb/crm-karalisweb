import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { db } from "@/lib/db";

/** GET /api/ricerca/casi-studio/[id]/pdf — il PDF originale. */
export async function GET(_r: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  const { id } = await params;
  const caso = await db.casoStudio.findUnique({ where: { id }, select: { pdf: true, pdfNome: true } });
  if (!caso?.pdf) return NextResponse.json({ error: "PDF non trovato" }, { status: 404 });
  const nome = caso.pdfNome.replace(/[^\w.\- ]+/g, "_");
  return new NextResponse(Buffer.from(caso.pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${nome}"`, "Cache-Control": "private, no-store" },
  });
}
