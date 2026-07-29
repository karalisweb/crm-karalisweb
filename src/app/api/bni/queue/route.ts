import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/api-auth";
import { oneToOnePriority, ROLE_LABELS, type MemberRole } from "@/lib/bni/member-classifier";

/**
 * CODA 121 — "chi devo incontrare adesso".
 *
 * Ordina i membri per priorita' operativa: valore del membro (partner pesa doppio)
 * combinato col tempo passato dall'ultimo incontro. Un partner fortissimo che non
 * senti da 8 mesi torna in cima; un neutro appena visto sprofonda.
 *
 * Nel MIO capitolo la regola e' diversa: devo fare un 121 con OGNI membro, quindi
 * chi non l'ha mai fatto ha una spinta costante verso l'alto.
 *
 * GET /api/bni/queue?chapter=xxx&limit=30
 */

export async function GET(request: NextRequest) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;

  const chapter = request.nextUrl.searchParams.get("chapter")?.trim();
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get("limit") || "30", 10) || 30, 200);

  const [membri, myChapters] = await Promise.all([
    db.bniMembro.findMany({
      where: {
        status: "ATTIVO",
        ...(chapter ? { chapter } : {}),
      },
      select: {
        id: true, name: true, profession: true, company: true, chapter: true,
        phone: true, email: true, website: true, seeking: true,
        memberRole: true, buyerPersona: true,
        clientScore: true, partnerScore: true,
        oneToOneCount: true, lastOneToOneAt: true,
        bniStage: true, nextRecallAt: true,
        _count: { select: { referredLeads: true, referralsGiven: true } },
      },
    }),
    db.bniChapter.findMany({ where: { isMine: true }, select: { name: true } }),
  ]);

  const mine = new Set(myChapters.map((c) => c.name.toLowerCase()));

  const queue = membri
    .map((m) => {
      const isMyChapter = !!m.chapter && mine.has(m.chapter.toLowerCase());
      let priority = oneToOnePriority({
        clientScore: m.clientScore,
        partnerScore: m.partnerScore,
        lastOneToOneAt: m.lastOneToOneAt,
        isMyChapter,
      });

      // Un recall arrivato a scadenza è un impegno preso: deve stare sopra tutto.
      const recallDue =
        m.bniStage === "RECALL" && m.nextRecallAt && new Date(m.nextRecallAt).getTime() <= Date.now();

      // Perche' e' in coda: la ragione operativa, non il numero.
      let reason: string;
      if (recallDue) {
        priority += 1000;
        reason = "Recall arrivato a scadenza: avevi deciso di ricontattarlo ora.";
      } else if (m.oneToOneCount === 0 && isMyChapter) {
        reason = "Mai fatto un 121 e sta nel mio capitolo: e' una lacuna da chiudere.";
      } else if (m.oneToOneCount === 0) {
        reason = "Mai incontrato in 121.";
      } else if (!m.lastOneToOneAt) {
        reason = "Nessuna data sull'ultimo 121.";
      } else {
        const days = Math.floor((Date.now() - new Date(m.lastOneToOneAt).getTime()) / 86_400_000);
        const months = Math.floor(days / 30);
        reason =
          months >= 4
            ? `Ultimo 121 ${months} mesi fa: il rapporto si sta raffreddando.`
            : `Ultimo 121 ${months >= 1 ? `${months} mes${months === 1 ? "e" : "i"}` : `${days} giorni`} fa.`;
      }

      const roleMeta = ROLE_LABELS[(m.memberRole as MemberRole) ?? "NEUTRO"];

      return {
        ...m,
        isMyChapter,
        priority,
        reason,
        roleLabel: roleMeta.label,
        roleIcon: roleMeta.icon,
        referralsReceived: m._count.referredLeads,
        referralsGiven: m._count.referralsGiven,
      };
    })
    // I concorrenti non vanno in coda 121: non e' li' che si gioca la partita.
    .filter((m) => m.memberRole !== "CONCORRENTE")
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit);

  return NextResponse.json({ queue });
}
