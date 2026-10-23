import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/api-auth";
import { salvaSocial } from "@/lib/agents/arricchimento";
import type { ReteSocial } from "@/lib/agents/impressioni-sezioni";

const Schema = z.object({
  facebook: z.string().max(300).nullable().optional(),
  instagram: z.string().max(300).nullable().optional(),
  linkedin: z.string().max(300).nullable().optional(),
});

const NOME: Record<ReteSocial, string> = { facebook: "Facebook", instagram: "Instagram", linkedin: "LinkedIn" };

const HOST: Record<ReteSocial, RegExp> = {
  facebook: /^(www\.|m\.|it-it\.)?(facebook\.com|fb\.com)$/i,
  instagram: /^(www\.)?instagram\.com$/i,
  linkedin: /^([a-z]{2,3}\.)?linkedin\.com$/i,
};

/** Il link incollato, pulito (https, senza ? e #); null = cancellato; errore se non è di quel social. */
function pulisci(rete: ReteSocial, v: string | null | undefined): string | null {
  const t = v?.trim();
  if (!t) return null;
  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`);
  } catch {
    throw new Error(`Il link di ${NOME[rete]} non è valido`);
  }
  if (!HOST[rete].test(u.hostname) || u.pathname.split("/").filter(Boolean).length === 0) throw new Error(`Questo non sembra un link di ${NOME[rete]}`);
  return `https://${u.hostname}${u.pathname.replace(/\/+$/, "")}`;
}

/** POST /api/ricerca/aziende/[id]/social — Alessio incolla i social che ha trovato lui: ripartono gli agenti che li leggono. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  const { id } = await params;
  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Link non validi" }, { status: 400 });
  const social: Partial<Record<ReteSocial, string | null>> = {};
  try {
    for (const k of Object.keys(parsed.data) as ReteSocial[]) social[k] = pulisci(k, parsed.data[k]);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  const { accodatiMac } = await salvaSocial(id, social);
  return NextResponse.json({ ok: true, accodatiMac });
}
