import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { etichettePunti } from "@/lib/agents/motore-121";
import { daChiedereA } from "@/lib/agents/presentazioni";
import { ETICHETTE_FONTE, ETICHETTE_TIPO } from "@/lib/agents/presentazioni-regole";

/**
 * GET /api/ricerca/bni/membri/[id]/foglio — la pagina del giorno prima del 121 (Motore 121, passo 7),
 * sempre letta dai dati di adesso: chi è, cosa si è visto della sua azienda, i contatti da
 * segnalargli e le persone da chiedergli, con i punti di contatto.
 */
export async function GET(_r: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  const { id } = await params;
  const m = await db.bniMembro.findUnique({ where: { id } });
  if (!m) return NextResponse.json({ error: "Membro non trovato" }, { status: 404 });
  const [presentazioni, segnalazioni, referti, caso, capitolo, ultimo121, daChiedere] = await Promise.all([
    db.bniPresentazione.findMany({ where: { membroId: id, stato: { in: ["DA_CHIEDERE", "CHIESTA"] }, OR: [{ confermata: null }, { confermata: true }] }, orderBy: [{ forza: "desc" }, { createdAt: "asc" }], take: 5 }),
    db.bniSegnalazione.findMany({ where: { membroId: id, stato: "DA_DARE" }, orderBy: { createdAt: "desc" }, take: 3 }),
    m.leadId
      ? db.agentReport.findMany({ where: { leadId: m.leadId, validUntil: { gt: new Date() } }, orderBy: { collectedAt: "desc" }, select: { agent: true, summary: true, levers: true } })
      : Promise.resolve([]),
    db.casoStudio.findFirst({ where: { stato: "ATTIVO", storia: { not: null } }, orderBy: { confermatoAt: "desc" }, select: { titolo: true, storia: true } }),
    m.chapter ? db.bniChapter.findFirst({ where: { name: { equals: m.chapter, mode: "insensitive" } }, select: { name: true, mode: true, city: true } }) : null,
    db.oneToOne.findFirst({ where: { membroId: id }, orderBy: { date: "desc" }, select: { date: true, riassunto: true, promesse: true } }),
    daChiedereA(id),
  ]);
  const visti = new Set<string>();
  const ultimi = referti.filter((r) => !visti.has(r.agent) && visti.add(r.agent));
  const leve = ultimi.flatMap((r) => (Array.isArray(r.levers) ? (r.levers as { testo?: string }[]) : [])).map((l) => l.testo).filter(Boolean).slice(0, 4);
  return NextResponse.json({
    membro: {
      id: m.id, nome: m.name, azienda: m.company, categoria: m.profession, capitolo: capitolo?.name ?? m.chapter, ruolo: m.leadershipRole,
      telefono: m.phone, linkedin: m.linkedinUrl, quando: m.next121At, cosaFa: m.cosaFa, referenzeCerca: m.seeking, referenzePuoDare: m.referenzePuoDare,
      conosciuto: !!m.conosciutoAt || m.oneToOneCount > 0,
    },
    studio: m.leadId ? { leadId: m.leadId, studiatoAt: m.studiatoAt, riepiloghi: ultimi.slice(0, 6).map((r) => ({ agente: r.agent, testo: r.summary })), leve } : null,
    segnalazioni: segnalazioni.map((s) => ({ id: s.id, nome: s.nome, motivo: s.motivo, leadId: s.leadId })),
    presentazioni: presentazioni.slice(0, 3).map((p) => ({ id: p.id, nome: p.nome, ruolo: p.ruolo, perche: p.perche, linkedin: p.linkedinUrl, forza: p.forza, punti: etichettePunti(p.puntiContatto), stato: p.stato })),
    ultimo121,
    // v3.68: le due liste separate, con la frase pronta e le 3 richieste di questa volta.
    daChiedere: daChiedere && {
      tipo: ETICHETTE_TIPO[daChiedere.tipo],
      zona: daChiedere.zona.citta ?? daChiedere.zona.provincia,
      membri: daChiedere.membri.map((x) => ({ id: x.id, nome: x.nome, categoria: x.categoria, azienda: x.azienda, tipo: ETICHETTE_TIPO[x.tipo], domanda: x.domanda, ora: daChiedere.ora.membri.includes(x.id) })),
      aziende: daChiedere.aziende.map((x) => ({
        chiave: x.presentazioneId ?? x.leadId ?? x.azienda, presentazioneId: x.presentazioneId, leadId: x.leadId, azienda: x.azienda, decisore: x.decisore, citta: x.citta,
        perche: [ETICHETTE_FONTE[x.fonte], x.settore === "CASO" ? "settore dei casi studio" : x.settore === "INTERESSE" ? "settore caldo" : null, x.citta].filter(Boolean).join(" · "),
        domanda: x.domanda, ora: daChiedere.ora.aziende.includes(x.presentazioneId ?? x.leadId ?? x.azienda),
      })),
    },
    casoStudio: caso,
    domande: [
      "Chi è il tuo cliente ideale? Fammi un esempio concreto dell'ultima persona giusta per te.",
      "Chi conosci tra i tuoi clienti e nel tuo giro? Che tipo di aziende vedi ogni settimana?",
      ...(presentazioni.length || daChiedere?.aziende.length ? ["Queste persone le conosci bene? Me le presenteresti?"] : []),
      "Chi sono i tuoi clienti e fornitori più stretti? (dettalo nel vocale: la volta dopo il CRM lo sa)",
      ...(m.leadershipRole === "PRESIDENTE" ? ["Chi sono i membri più attivi o più interessanti del capitolo?"] : []),
    ],
    ricorda: "Al primo 121 non si vende: dai i contatti, chiedi le presentazioni.",
  });
}
