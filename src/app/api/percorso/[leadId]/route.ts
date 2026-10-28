import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { refertiValidi } from "@/lib/agents/turno";
import { voce } from "@/lib/agents/catalogo";
import { datiAzienda } from "@/lib/agents/rete";
import { commentiDaLeggere } from "@/lib/agents/commenti";
import { noteDaReferti, SEZIONI_IMPRESSIONI, type SezioneImpressione } from "@/lib/agents/impressioni-sezioni";

/**
 * Il foglio "Cosa dirgli" (v3.65, Alessio 2026-10-28: "quando le ho scaldate non so che dire, devo essere più
 * preparato"): prima del contatto, su un foglio solo, i 3 ganci con la frase per aprire, la scheda tecnica per
 * area (sito, Google, cosa comunica, pubblicità), le note di Alessio e i commenti fatti sulle loro pagine.
 */
const AREE: { titolo: string; agenti: string[] }[] = [
  { titolo: "Il sito", agenti: ["sito_visto", "contatto"] },
  { titolo: "Si fa trovare su Google?", agenti: ["trova_sito", "posizioni", "scheda_google", "recensioni", "concorrenti"] },
  { titolo: "Cosa comunica", agenti: ["lettore", "social", "instagram", "linkedin_azienda"] },
  { titolo: "Pubblicità e codici", agenti: ["google_ads", "meta_ads", "tracciamenti"] },
];

export async function GET(_request: Request, { params }: { params: Promise<{ leadId: string }> }) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  const { leadId } = await params;

  const lead = await db.lead.findUnique({ where: { id: leadId }, select: { name: true, website: true, phone: true } });
  if (!lead) return NextResponse.json({ error: "Azienda non trovata" }, { status: 404 });
  const [referti, commenti, d] = await Promise.all([refertiValidi(leadId), commentiDaLeggere(leadId), datiAzienda(leadId)]);

  const ganci = referti.find((r) => r.agent === "ganci")?.findings as { ganci?: { frase: string; prova: string }[]; apertura?: string } | undefined;
  const note = noteDaReferti(referti);

  return NextResponse.json({
    azienda: lead,
    decisore: d.decisori[0]?.nome ?? null,
    apertura: ganci?.apertura ?? null,
    ganci: (ganci?.ganci ?? []).map((g) => ({ frase: g.frase, prova: g.prova })),
    aree: AREE.map((a) => ({
      titolo: a.titolo,
      righe: a.agenti.flatMap((k) => {
        const r = referti.find((x) => x.agent === k);
        return r?.summary ? [{ nome: voce(k)?.nome ?? k, testo: r.summary }] : [];
      }),
    })).filter((a) => a.righe.length),
    note: Object.entries(note.impressioni).map(([k, t]) => ({ titolo: SEZIONI_IMPRESSIONI[k as SezioneImpressione]?.titolo ?? k, testo: t })),
    commenti,
  });
}
