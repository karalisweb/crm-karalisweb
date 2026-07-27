import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/api-auth";
import { z } from "zod/v4";
import { oneToOnePriority } from "@/lib/bni/member-classifier";

/**
 * CAPITOLI BNI — la coda delle visite.
 *
 * I membri restano collegati al capitolo per NOME (campo libero gia' esistente):
 * questa API unisce quei nomi ai metadati di `BniChapter` e calcola, per ogni
 * capitolo, quanto vale visitarlo.
 *
 * GET   /api/bni/chapters  → elenco capitoli con attrattivita' e stato visita
 * POST  /api/bni/chapters  → crea/aggiorna i metadati di un capitolo (upsert per nome)
 *
 * Regola di Alessio: in Sardegna si visita di persona; fuori Sardegna solo se IBRIDO.
 */

const upsertSchema = z.object({
  name: z.string().min(1).max(255),
  city: z.string().max(255).nullable().optional(),
  region: z.string().max(100).nullable().optional(),
  mode: z.enum(["PRESENZA", "ONLINE", "IBRIDO"]).optional(),
  meetingDay: z.string().max(50).nullable().optional(),
  meetingTime: z.string().max(20).nullable().optional(),
  visitStatus: z.enum(["DA_ANALIZZARE", "ANALIZZATO", "VISITA_PIANIFICATA", "VISITATO"]).optional(),
  visitPlannedAt: z.string().nullable().optional(),
  visitedAt: z.string().nullable().optional(),
  isMine: z.boolean().optional(),
  notes: z.string().max(5000).nullable().optional(),
});

const clean = (v?: string | null) => {
  if (v === null) return null;
  const t = v?.trim();
  return t ? t : null;
};

const parseDate = (v?: string | null) => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

export async function GET() {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;

  const [membri, chapterMeta] = await Promise.all([
    db.bniMembro.findMany({
      where: { chapter: { not: null }, status: { not: "EX_MEMBRO" } },
      select: {
        id: true, name: true, chapter: true, memberRole: true,
        clientScore: true, partnerScore: true, lastOneToOneAt: true,
        buyerPersona: true,
      },
    }),
    db.bniChapter.findMany({ orderBy: { name: "asc" } }),
  ]);

  const metaByName = new Map(chapterMeta.map((c) => [c.name.toLowerCase(), c]));

  // Raggruppo i membri per capitolo e calcolo l'attrattivita'.
  const grouped = new Map<string, typeof membri>();
  for (const m of membri) {
    const key = m.chapter!.trim();
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(m);
  }

  // Includo anche i capitoli censiti che non hanno ancora membri:
  // sono proprio quelli "da analizzare" prima di una visita.
  for (const c of chapterMeta) {
    if (!grouped.has(c.name)) grouped.set(c.name, []);
  }

  const chapters = [...grouped.entries()].map(([name, list]) => {
    const meta = metaByName.get(name.toLowerCase()) ?? null;
    const partners = list.filter((m) => m.memberRole === "PARTNER");
    const clients = list.filter((m) => m.memberRole === "CLIENTE");
    const competitors = list.filter((m) => m.memberRole === "CONCORRENTE");

    // Attrattivita' = valore totale che quel capitolo puo' generare.
    // I partner pesano il doppio dei clienti: portano piu' fatturato nel tempo.
    const attractiveness =
      partners.reduce((s, m) => s + m.partnerScore, 0) * 2 +
      clients.reduce((s, m) => s + m.clientScore, 0);

    // Chi intercettare nel libero networking: i piu' preziosi, ordinati.
    const topTargets = [...list]
      .filter((m) => m.memberRole === "PARTNER" || m.memberRole === "CLIENTE")
      .sort(
        (a, b) =>
          oneToOnePriority({
            clientScore: b.clientScore, partnerScore: b.partnerScore,
            lastOneToOneAt: b.lastOneToOneAt, isMyChapter: meta?.isMine,
          }) -
          oneToOnePriority({
            clientScore: a.clientScore, partnerScore: a.partnerScore,
            lastOneToOneAt: a.lastOneToOneAt, isMyChapter: meta?.isMine,
          })
      )
      .slice(0, 5)
      .map((m) => ({
        id: m.id, name: m.name, memberRole: m.memberRole,
        clientScore: m.clientScore, partnerScore: m.partnerScore,
        buyerPersona: m.buyerPersona,
      }));

    // Composizione per persona: detta il pitch da usare in quel capitolo.
    const personaMix: Record<string, number> = {};
    for (const m of list) {
      if (!m.buyerPersona) continue;
      personaMix[m.buyerPersona] = (personaMix[m.buyerPersona] ?? 0) + 1;
    }

    return {
      name,
      meta,
      membersCount: list.length,
      partnersCount: partners.length,
      clientsCount: clients.length,
      competitorsCount: competitors.length,
      attractiveness,
      topTargets,
      personaMix,
      // Un capitolo si puo' visitare se e' in Sardegna (di persona) o se e' ibrido.
      visitable: !meta || meta.mode !== "ONLINE",
    };
  });

  chapters.sort((a, b) => b.attractiveness - a.attractiveness);

  return NextResponse.json({ chapters });
}

export async function POST(request: NextRequest) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;

  try {
    const body = await request.json();
    const data = upsertSchema.parse(body);
    const name = data.name.trim();

    const payload = {
      city: data.city !== undefined ? clean(data.city) : undefined,
      region: data.region !== undefined ? clean(data.region) : undefined,
      mode: data.mode,
      meetingDay: data.meetingDay !== undefined ? clean(data.meetingDay) : undefined,
      meetingTime: data.meetingTime !== undefined ? clean(data.meetingTime) : undefined,
      visitStatus: data.visitStatus,
      visitPlannedAt: data.visitPlannedAt !== undefined ? parseDate(data.visitPlannedAt) : undefined,
      visitedAt: data.visitedAt !== undefined ? parseDate(data.visitedAt) : undefined,
      isMine: data.isMine,
      notes: data.notes !== undefined ? clean(data.notes) : undefined,
    };

    const chapter = await db.bniChapter.upsert({
      where: { name },
      update: payload,
      create: { name, ...payload },
    });

    return NextResponse.json({ success: true, chapter });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dati non validi", details: error.issues }, { status: 400 });
    }
    console.error("[BNI] Errore salvataggio capitolo:", error);
    return NextResponse.json({ error: "Errore nel salvataggio del capitolo" }, { status: 500 });
  }
}
