import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { siglaIndirizzo } from "@/lib/ricerca/regole";
import { segnaliDa } from "@/lib/agents/segnali";
import { collegamentoDaFindings } from "@/lib/agents/motore";

/**
 * GET /api/ricerca/aziende?canale= — il contenitore Meta + Google: le aziende trovate dagli
 * agenti partendo dai casi studio, le più recenti prima.
 */
export async function GET(request: NextRequest) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  const canale = request.nextUrl.searchParams.get("canale");
  const ritrovamenti = await db.ritrovamento.findMany({
    where: { leadId: { not: null }, ...(canale && ["maps", "google", "facebook", "instagram", "linkedin"].includes(canale) ? { canale } : {}) },
    orderBy: { createdAt: "desc" },
    take: 300,
    include: {
      lead: { select: { id: true, name: true, website: true, address: true, category: true, phone: true, googleRating: true, googleReviewsCount: true, socialUrl: true, pipelineStage: true, approvalItems: { where: { kind: "FASCICOLO_BASE" }, select: { status: true, title: true, note: true }, orderBy: { createdAt: "desc" }, take: 1 } } },
      chiave: { select: { tipo: true, casoStudio: { select: { id: true, titolo: true, provincia: true } } } },
    },
  });
  // Un'azienda una volta sola (il ritrovamento più recente).
  const viste = new Set<string>();
  const aziende = ritrovamenti
    .filter((r) => r.lead && r.lead.pipelineStage !== "NON_TARGET" && !viste.has(r.lead.id) && viste.add(r.lead.id))
    .map((r) => {
      const { approvalItems, ...l } = r.lead!;
      // decisione: null = giro veloce in corso; IN_ATTESA = da decidere; APPROVATO; SCARTATO.
      return { ...l, eliminata: l.pipelineStage === "ARCHIVIATO", canale: r.canale, trovataIl: r.createdAt, caso: r.chiave.casoStudio, provinciaCliente: r.chiave.tipo === "AZIENDA" && !!r.chiave.casoStudio?.provincia && siglaIndirizzo(l.address) === r.chiave.casoStudio.provincia, manuale: r.chiave.tipo === "MANUALE", decisione: approvalItems[0]?.status ?? null, sintesi: approvalItems[0]?.title ?? null, senzaCollegamento: approvalItems[0]?.status === "SCARTATO" && !!approvalItems[0]?.note?.startsWith("Senza collegamento") };
    });
  // I segnali dall'analisi: chi decide, pubblicità, sito vecchio, sito che non comunica, si fa trovare.
  const ids = aziende.map((a) => a.id);
  const [referti, persone, dmInCorso, ponti] = await Promise.all([
    db.agentReport.findMany({
      where: { leadId: { in: ids }, agent: { in: ["google_ads", "meta_ads", "sito_visto", "lettore", "posizioni", "decision_maker"] }, validUntil: { gt: new Date() } },
      orderBy: { collectedAt: "desc" },
      select: { leadId: true, agent: true, findings: true },
    }),
    db.persona.findMany({ where: { leadId: { in: ids } }, select: { leadId: true } }),
    db.agentRun.findMany({ where: { leadId: { in: ids }, agent: "decision_maker", status: { in: ["IN_CODA", "IN_CORSO"] } }, select: { leadId: true } }),
    db.bniPresentazione.findMany({ where: { leadId: { in: ids } }, select: { leadId: true, membro: { select: { name: true } } } }),
  ]);
  const inVerifica = new Set(dmInCorso.map((r) => r.leadId));
  const pontiBni = new Map(ponti.map((p) => [p.leadId, p.membro.name]));
  const perLead = new Map<string, Record<string, Record<string, unknown>>>();
  for (const r of referti) {
    const m = perLead.get(r.leadId!) ?? {};
    if (!m[r.agent]) m[r.agent] = r.findings as Record<string, unknown>;
    perLead.set(r.leadId!, m);
  }
  const conPersona = new Set(persone.map((p) => p.leadId));
  // Motore 121: il collegamento con chi decide (contatto diretto o contatti in comune) e il ponte BNI.
  const conSegnali = aziende.map((a) => {
    const dm = perLead.get(a.id)?.decision_maker;
    const c = dm ? collegamentoDaFindings(dm) : null;
    const collegamento = c ? (c.collegata ? "COLLEGATA" : "SENZA") : inVerifica.has(a.id) ? "IN_VERIFICA" : a.senzaCollegamento ? "SENZA" : "DA_VERIFICARE";
    return { ...a, segnali: segnaliDa(perLead.get(a.id) ?? {}, conPersona.has(a.id)), collegamento, inComune: c?.inComune ?? 0, diretto: c?.diretto ?? false, ponteBni: pontiBni.get(a.id) ?? null };
  });
  return NextResponse.json({ aziende: conSegnali, totale: conSegnali.length });
}
