import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/api-auth";
import { cambiaSito } from "@/lib/agents/arricchimento";
import { dominio } from "@/lib/agents/dataforseo";

const Schema = z.object({ sito: z.string().min(4).max(300) });

/** POST /api/ricerca/aziende/[id]/sito — Alessio corregge il sito: si salva e ripartono le ricerche. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  const { id } = await params;
  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Scrivi l'indirizzo del sito" }, { status: 400 });
  const d = dominio(parsed.data.sito.trim());
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(d)) return NextResponse.json({ error: "Indirizzo non valido" }, { status: 400 });
  await cambiaSito(id, `https://${d}`);
  return NextResponse.json({ ok: true, sito: `https://${d}` });
}
