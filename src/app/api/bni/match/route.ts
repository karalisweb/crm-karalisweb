import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/api-auth";
import { Prisma } from "@prisma/client";
import {
  extractSeekingTags,
  parseTags,
  scoreCandidate,
  type ReciprocityMatch,
} from "@/lib/bni/reciprocity";

/**
 * MATCHER DI RECIPROCITA' — "chi posso regalare a questo membro?"
 *
 * Uso tipico: sono in 121 con Giampaolo, lui cerca "sindaci di piccoli comuni".
 * Questa API scorre i miei contatti (lead del CRM + altri membri BNI) e propone
 * chi posso segnalargli, spiegando perche' ogni suggerimento e' pertinente.
 *
 * GET /api/bni/match?membroId=xxx        → usa il "chi cerca" salvato sul membro
 * GET /api/bni/match?q=sindaci+comuni    → ricerca libera (se il campo non e' compilato)
 *
 * LIMITE NOTO E VOLUTO: il matcher vale quanto il pool di contatti taggati.
 * Se i lead non hanno categoria/professione/zona, i risultati saranno pochi.
 * Non e' un difetto del matching: e' mancanza di dati a monte.
 */

const MAX_RESULTS = 15;
/** Sotto questo punteggio il suggerimento e' rumore e confonde invece di aiutare. */
const MIN_SCORE = 2;

export async function GET(request: NextRequest) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;

  const membroId = request.nextUrl.searchParams.get("membroId")?.trim();
  const q = request.nextUrl.searchParams.get("q")?.trim();

  let tags: string[] = [];
  let seekingText: string | null = null;
  let membroName: string | null = null;

  if (membroId) {
    const membro = await db.bniMembro.findUnique({
      where: { id: membroId },
      select: { name: true, seeking: true, seekingTags: true },
    });
    if (!membro) {
      return NextResponse.json({ error: "Membro non trovato" }, { status: 404 });
    }
    membroName = membro.name;
    seekingText = membro.seeking;
    // I tag salvati sono la via veloce; se mancano (membro vecchio) li ricavo al volo.
    tags = parseTags(membro.seekingTags);
    if (tags.length === 0) tags = extractSeekingTags(membro.seeking);
  }

  // La query libera si somma ai tag del membro (utile quando in 121 emerge
  // un bisogno diverso da quello registrato).
  if (q) tags = [...new Set([...tags, ...extractSeekingTags(q)])];

  if (tags.length === 0) {
    return NextResponse.json({
      matches: [],
      tags: [],
      membroName,
      seekingText,
      hint: "Compila il campo \"chi cerca\" del membro (o scrivi cosa cerca qui sopra) per ottenere suggerimenti.",
    });
  }

  // Pre-filtro in SQL: prendo solo i record che contengono almeno un tag, poi
  // assegno il punteggio in memoria. Cosi' non scarico l'intero database.
  const leadOr: Prisma.LeadWhereInput[] = [];
  for (const t of tags) {
    leadOr.push({ category: { contains: t, mode: "insensitive" } });
    leadOr.push({ name: { contains: t, mode: "insensitive" } });
    leadOr.push({ address: { contains: t, mode: "insensitive" } });
  }

  const membroOr: Prisma.BniMembroWhereInput[] = [];
  for (const t of tags) {
    membroOr.push({ profession: { contains: t, mode: "insensitive" } });
    membroOr.push({ company: { contains: t, mode: "insensitive" } });
    membroOr.push({ name: { contains: t, mode: "insensitive" } });
  }

  const [leads, membri] = await Promise.all([
    db.lead.findMany({
      where: {
        OR: leadOr,
        // Non ha senso regalare contatti persi o fuori target.
        pipelineStage: { notIn: ["PERSO", "NON_TARGET"] },
      },
      select: {
        id: true, name: true, category: true, address: true,
        phone: true, notes: true, pipelineStage: true,
      },
      take: 120,
    }),
    db.bniMembro.findMany({
      where: {
        OR: membroOr,
        ...(membroId ? { id: { not: membroId } } : {}), // non suggerire il membro a se' stesso
        status: { not: "EX_MEMBRO" },
      },
      select: {
        id: true, name: true, profession: true, company: true,
        phone: true, chapter: true, notes: true,
      },
      take: 120,
    }),
  ]);

  const matches: ReciprocityMatch[] = [];

  for (const l of leads) {
    const { score, matchedOn } = scoreCandidate(tags, {
      category: l.category,
      name: l.name,
      location: l.address,
      notes: l.notes,
    });
    if (score >= MIN_SCORE) {
      matches.push({
        kind: "lead",
        id: l.id,
        name: l.name,
        subtitle: [l.category, l.address].filter(Boolean).join(" · ") || null,
        phone: l.phone,
        score,
        matchedOn,
      });
    }
  }

  for (const m of membri) {
    const { score, matchedOn } = scoreCandidate(tags, {
      profession: m.profession,
      name: m.name,
      location: m.chapter,
      notes: m.notes,
    });
    if (score >= MIN_SCORE) {
      matches.push({
        kind: "membro",
        id: m.id,
        name: m.name,
        subtitle: [m.profession, m.company, m.chapter].filter(Boolean).join(" · ") || null,
        phone: m.phone,
        score,
        matchedOn,
      });
    }
  }

  matches.sort((a, b) => b.score - a.score);

  return NextResponse.json({
    matches: matches.slice(0, MAX_RESULTS),
    tags,
    membroName,
    seekingText,
    totalFound: matches.length,
  });
}
