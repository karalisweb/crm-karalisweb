import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/api-auth";
import { oneToOnePriority, ROLE_LABELS, type MemberRole } from "@/lib/bni/member-classifier";

/**
 * CODA 121 — "chi devo ancora conoscere / risentire".
 *
 * NON è un calderone di tutti i membri: chi hai già incontrato di recente sta
 * lavorando la relazione (Pipeline), non è "da fare"; i clienti non si prospettano.
 * Quindi la coda contiene SOLO:
 *   - DA_CONOSCERE: mai fatto un 121 (o data ignota) → il primo 121 da fissare.
 *   - DA_RICOLTIVARE: 121 fatto ma da oltre 4 mesi → il rapporto si è raffreddato.
 *   - i recall a scadenza (impegno preso, va onorato ora).
 * Esclusi: clienti acquisiti, concorrenti, e chi ha un 121 recente.
 *
 * GET /api/bni/queue?chapter=xxx&limit=300
 */

// Oltre questo tempo dall'ultimo 121, il rapporto va ricoltivato.
const COLD_MONTHS = 4;

export async function GET(request: NextRequest) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;

  const chapter = request.nextUrl.searchParams.get("chapter")?.trim();
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get("limit") || "300", 10) || 300, 500);

  const [membri, myChapters] = await Promise.all([
    db.bniMembro.findMany({
      where: {
        status: "ATTIVO",
        isCustomer: false, // i clienti non si prospettano
        ...(chapter ? { chapter } : {}),
      },
      select: {
        id: true, name: true, profession: true, company: true, chapter: true,
        phone: true, email: true, website: true, seeking: true,
        memberRole: true, buyerPersona: true,
        clientScore: true, partnerScore: true,
        oneToOneCount: true, lastOneToOneAt: true,
        bniStage: true, nextRecallAt: true, isCustomer: true,
        _count: { select: { referredLeads: true, referralsGiven: true } },
      },
    }),
    db.bniChapter.findMany({ where: { isMine: true }, select: { name: true } }),
  ]);

  const mine = new Set(myChapters.map((c) => c.name.toLowerCase()));
  const coldCutoff = Date.now() - COLD_MONTHS * 30 * 86_400_000;

  const queue = membri
    .map((m) => {
      const isMyChapter = !!m.chapter && mine.has(m.chapter.toLowerCase());
      let priority = oneToOnePriority({
        clientScore: m.clientScore,
        partnerScore: m.partnerScore,
        lastOneToOneAt: m.lastOneToOneAt,
        isMyChapter,
      });

      const lastTs = m.lastOneToOneAt ? new Date(m.lastOneToOneAt).getTime() : null;
      const neverMet = m.oneToOneCount === 0;
      const cold = !neverMet && (lastTs === null || lastTs < coldCutoff);
      const recallDue =
        m.bniStage === "RECALL" && m.nextRecallAt && new Date(m.nextRecallAt).getTime() <= Date.now();

      // A quale gruppo appartiene (o nessuno → fuori dalla coda).
      let bucket: "RECALL" | "DA_CONOSCERE" | "DA_RICOLTIVARE" | null = null;
      let reason = "";
      if (recallDue) {
        bucket = "RECALL";
        priority += 1000;
        reason = "Recall arrivato a scadenza: avevi deciso di ricontattarlo ora.";
      } else if (neverMet) {
        bucket = "DA_CONOSCERE";
        reason = isMyChapter
          ? "Mai fatto un 121 e sta nel mio capitolo: lacuna da chiudere."
          : "Non l'hai ancora incontrato in 121.";
      } else if (cold) {
        bucket = "DA_RICOLTIVARE";
        const months = lastTs ? Math.floor((Date.now() - lastTs) / (30 * 86_400_000)) : null;
        reason = months
          ? `Ultimo 121 ${months} mesi fa: il rapporto si sta raffreddando.`
          : "121 fatto ma senza data: da ricoltivare.";
      }
      // else: 121 recente e non in recall → NON è "da fare", fuori dalla coda.

      const roleMeta = ROLE_LABELS[(m.memberRole as MemberRole) ?? "NEUTRO"];

      return {
        ...m,
        isMyChapter,
        priority,
        bucket,
        reason,
        roleLabel: roleMeta.label,
        roleIcon: roleMeta.icon,
        referralsReceived: m._count.referredLeads,
        referralsGiven: m._count.referralsGiven,
      };
    })
    // Solo chi è davvero "da fare"; i concorrenti restano fuori.
    .filter((m) => m.bucket !== null && m.memberRole !== "CONCORRENTE")
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit);

  return NextResponse.json({ queue });
}
