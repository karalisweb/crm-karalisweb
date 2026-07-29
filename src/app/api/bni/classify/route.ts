import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/api-auth";
import { classifyMembro } from "@/lib/bni/member-classifier";
import { extractSeekingTags, serializeTags } from "@/lib/bni/reciprocity";
import { loadMyChapterNames, isMyChapter } from "@/lib/bni/my-chapters";

/**
 * RICLASSIFICAZIONE RETROATTIVA dei membri BNI.
 *
 * I membri inseriti prima dell'introduzione dei due assi hanno punteggi a zero.
 * Questo endpoint li riclassifica tutti in blocco.
 *
 * POST /api/bni/classify        → classifica solo chi non e' mai stato classificato
 * POST /api/bni/classify?all=1  → riclassifica tutti (tranne i roleLocked)
 *
 * I membri con `roleLocked` (ruolo deciso a mano) non vengono mai toccati:
 * la decisione umana vince sempre sull'euristica.
 */

export async function POST(request: NextRequest) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;

  const all = request.nextUrl.searchParams.get("all") === "1";

  const membri = await db.bniMembro.findMany({
    where: {
      roleLocked: false,
      ...(all ? {} : { classifiedAt: null }),
    },
    select: {
      id: true, profession: true, company: true, website: true,
      notes: true, seeking: true, seekingTags: true, chapter: true,
    },
  });

  const myChapters = await loadMyChapterNames();
  let updated = 0;
  const now = new Date();

  for (const m of membri) {
    const cls = classifyMembro(
      {
        profession: m.profession,
        company: m.company,
        website: m.website,
        notes: m.notes,
      },
      { isMyChapter: isMyChapter(myChapters, m.chapter) }
    );

    // Rigenero anche i tag del matcher se mancano ma il "chi cerca" c'e'.
    const needTags = !m.seekingTags && !!m.seeking;

    await db.bniMembro.update({
      where: { id: m.id },
      data: {
        buyerPersona: cls.buyerPersona,
        memberRole: cls.memberRole,
        clientScore: cls.clientScore,
        partnerScore: cls.partnerScore,
        personasServed: cls.personasServed.join(",") || null,
        classifiedAt: now,
        ...(needTags ? { seekingTags: serializeTags(extractSeekingTags(m.seeking)) } : {}),
      },
    });
    updated++;
  }

  return NextResponse.json({ success: true, updated, scanned: membri.length });
}
