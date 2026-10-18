import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireSession } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { confermaCasoStudio, leggiCasoStudio, sospendiCasoStudio } from "@/lib/ricerca/casi-studio";

/** GET /api/ricerca/casi-studio/[id] — il caso, le chiavi e le ultime aziende e persone trovate. */
export async function GET(_r: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  const { id } = await params;
  const caso = await db.casoStudio.findUnique({ where: { id }, omit: { pdf: true, testo: true }, include: { chiavi: true } });
  if (!caso) return NextResponse.json({ error: "Caso studio non trovato" }, { status: 404 });
  const trovati = await db.ritrovamento.findMany({
    where: { chiave: { casoStudioId: id } },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      lead: { select: { id: true, name: true, website: true, address: true, category: true, pipelineStage: true } },
      persona: { select: { id: true, nome: true, ruolo: true, aziendaNome: true, linkedinUrl: true, bniMembroId: true } },
      chiave: { select: { tipo: true } },
    },
  });
  return NextResponse.json({ caso, trovati });
}

const Schema = z.object({
  azione: z.enum(["conferma", "rileggi", "sospendi"]),
  dati: z
    .object({
      titolo: z.string().max(160).optional(),
      storia: z.string().max(3000).nullable().optional(),
      settore: z.string().max(80).nullable().optional(),
      aziendaNome: z.string().max(160).nullable().optional(),
      aziendaSito: z.string().max(300).nullable().optional(),
      personaNome: z.string().max(120).nullable().optional(),
      personaRuolo: z.string().max(120).nullable().optional(),
      personaLinkedin: z.string().max(300).nullable().optional(),
      termini: z.array(z.string().max(100)).max(10).optional(),
      terminiSettore: z.array(z.string().max(100)).max(10).optional(),
      provincia: z.string().max(40).nullable().optional(),
    })
    .optional(),
});

/** PATCH /api/ricerca/casi-studio/[id] — conferma (con le correzioni), fai rileggere, sospendi. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  const { id } = await params;
  try {
    const { azione, dati } = Schema.parse(await request.json());
    if (azione === "conferma") return NextResponse.json({ success: true, caso: await confermaCasoStudio(id, dati ?? {}) });
    if (azione === "rileggi") {
      await leggiCasoStudio(id);
      return NextResponse.json({ success: true });
    }
    await sospendiCasoStudio(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof ZodError) return NextResponse.json({ error: "Dati non validi", dettagli: e.issues }, { status: 400 });
    return NextResponse.json({ error: e instanceof Error ? e.message : "Errore" }, { status: 400 });
  }
}
