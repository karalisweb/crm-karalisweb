import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireSession } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { accodaReteMembro, chiudiRichiesteSuperate } from "@/lib/agents/bni";
import { normalizzaLinkedin } from "@/lib/ricerca/regole";

/** GET /api/ricerca/bni/membri/[id] — la scheda del membro, nelle sue 7 parti. */
export async function GET(_r: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  const { id } = await params;
  const m = await db.bniMembro.findUnique({
    where: { id },
    include: {
      oneToOnes: { orderBy: { date: "desc" }, select: { id: true, date: true, formato: true, location: true, notes: true, riassunto: true, promesse: true, trascrizione: true } },
      presentazioni: { orderBy: [{ forza: "desc" }, { createdAt: "asc" }] },
      segnalazioni: { orderBy: { createdAt: "desc" }, take: 10 },
      lead: { select: { id: true, name: true, website: true } },
      _count: { select: { persone: true } },
    },
  });
  if (!m) return NextResponse.json({ error: "Membro non trovato" }, { status: 404 });
  const [capitolo, inCassetta, reteInCorso, capitoli] = await Promise.all([
    m.chapter ? db.bniChapter.findFirst({ where: { name: { equals: m.chapter, mode: "insensitive" } }, select: { id: true, name: true, mode: true, meetingDay: true, meetingTime: true, sede: true } }) : null,
    db.approvalItem.findMany({ where: { bniMembroId: id, status: "IN_ATTESA" }, select: { id: true, kind: true, title: true, createdAt: true, payload: true } }),
    db.agentRun.findFirst({ where: { bniMembroId: id, agent: "rete_membro", status: { in: ["IN_CODA", "IN_CORSO"] } }, select: { id: true } }),
    db.bniChapter.findMany({ select: { name: true }, orderBy: { name: "asc" } }),
  ]);
  const conosciuto = !!m.conosciutoAt || m.oneToOneCount > 0 || m.isCustomer;
  const stato = conosciuto ? "CONOSCIUTO" : m.next121At && m.next121At.getTime() > Date.now() - 86400_000 ? "FISSATO" : "DA_INCONTRARE";
  return NextResponse.json({
    membro: {
      id: m.id, nome: m.name, azienda: m.company, categoria: m.profession, capitolo: m.chapter, telefono: m.phone, email: m.email, sito: m.website,
      linkedin: m.linkedinUrl, ruolo: m.leadershipRole, cosaFa: m.cosaFa, referenzeCerca: m.seeking, referenzePuoDare: m.referenzePuoDare,
      prossimoPasso: m.prossimoPasso, prossimoPassoAt: m.prossimoPassoAt, next121At: m.next121At, indicatoDa: m.indicatoDa,
      reteLettaAt: m.reteLettaAt, reteInCorso: !!reteInCorso, personeInRete: m._count.persone, note: m.notes, stato, conosciutoAt: m.conosciutoAt,
      azienda_collegata: m.lead,
      linkedinStato: m.linkedinStato, newsletterAt: m.newsletterAt, studiatoAt: m.studiatoAt,
    },
    capitolo,
    capitoli: capitoli.map((c) => c.name),
    storia: m.oneToOnes.map((o) => ({ ...o, trascrizione: undefined, haTrascrizione: !!o.trascrizione })),
    presentazioni: m.presentazioni,
    segnalazioni: m.segnalazioni,
    inCassetta,
  });
}

const testo = (max: number) => z.string().max(max).nullable().optional();
const Schema = z.object({
  linkedin: testo(300),
  cosaFa: testo(4000),
  referenzeCerca: testo(4000),
  referenzePuoDare: testo(4000),
  prossimoPasso: testo(300),
  prossimoPassoAt: z.string().datetime().nullable().optional(),
  next121At: z.string().datetime().nullable().optional(),
  telefono: testo(50),
  email: testo(200),
  sito: testo(300),
  azienda: testo(200),
  categoria: testo(200),
  note: testo(5000),
  conosciuto: z.boolean().optional(),
  capitolo: z.string().min(1).max(120).optional(),
  stato: z.enum(["ATTIVO", "EX_MEMBRO"]).optional(),
  linkedinStato: z.enum(["NON_TROVATO", "DA_COLLEGARE", "RICHIESTA_INVIATA", "COLLEGATI"]).optional(),
  // Motore 121, passo 3: invitato alle newsletter (LinkedIn e Substack).
  newsletter: z.boolean().optional(),
});

/** PATCH /api/ricerca/bni/membri/[id] — Alessio corregge la scheda o fissa la data del 121. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  const { id } = await params;
  try {
    const d = Schema.parse(await request.json());
    const esistente = await db.bniMembro.findUnique({ where: { id }, select: { id: true, oneToOneCount: true, conosciutoAt: true, reteLettaAt: true } });
    if (!esistente) return NextResponse.json({ error: "Membro non trovato" }, { status: 404 });
    const p = (v: string | null | undefined) => (v === undefined ? undefined : v?.trim() || null);
    if (d.stato === "EX_MEMBRO") {
      // Non è più nel capitolo: le sue richieste ancora da mandare non servono più.
      await db.approvalItem.updateMany({ where: { bniMembroId: id, status: "IN_ATTESA" }, data: { status: "SCARTATO", note: "Non è più nel capitolo", decidedAt: new Date() } });
    }
    const data = {
      linkedinUrl: d.linkedin === undefined ? undefined : normalizzaLinkedin(d.linkedin),
      cosaFa: p(d.cosaFa),
      seeking: p(d.referenzeCerca),
      referenzePuoDare: p(d.referenzePuoDare),
      prossimoPasso: p(d.prossimoPasso),
      prossimoPassoAt: d.prossimoPassoAt === undefined ? undefined : d.prossimoPassoAt ? new Date(d.prossimoPassoAt) : null,
      next121At: d.next121At === undefined ? undefined : d.next121At ? new Date(d.next121At) : null,
      phone: p(d.telefono),
      email: p(d.email),
      website: p(d.sito),
      company: p(d.azienda),
      profession: p(d.categoria),
      notes: p(d.note),
      chapter: d.capitolo?.trim(),
      ...(d.linkedinStato ? { linkedinStato: d.linkedinStato, linkedinStatoAt: new Date() } : {}),
      // Profilo sbagliato: si toglie, l'agente lo ricerca.
      ...(d.linkedinStato === "NON_TROVATO" ? { linkedinUrl: null } : {}),
      ...(d.linkedin ? { linkedinStato: "DA_COLLEGARE", linkedinStatoAt: new Date() } : {}),
      status: d.stato,
      ...(d.newsletter === true ? { newsletterAt: new Date() } : d.newsletter === false ? { newsletterAt: null } : {}),
      // "Già conosciuto" (un 121 fatto in passato, senza registrarlo): non si toglie se ci sono 121 registrati.
      ...(d.conosciuto === true && !esistente.conosciutoAt ? { conosciutoAt: new Date() } : {}),
      ...(d.conosciuto === false && esistente.oneToOneCount === 0 ? { conosciutoAt: null } : {}),
      ...(d.next121At ? { bniStage: "RICHIESTA_121" } : {}),
    };
    await db.bniMembro.update({ where: { id }, data });
    // Fissato il 121: la richiesta è partita, e si guarda subito la sua rete LinkedIn.
    if (d.next121At) await chiudiRichiesteSuperate(id, "Superata: il 121 è in calendario");
    // La rete LinkedIn la legge il turno BNI nei 2 giorni prima dell'incontro (max 2 al giorno).
    if (d.next121At && !esistente.reteLettaAt && new Date(d.next121At).getTime() - Date.now() < 2 * 86400_000) await accodaReteMembro(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof ZodError) return NextResponse.json({ error: "Dati non validi", dettagli: e.issues }, { status: 400 });
    throw e;
  }
}
