import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/api-auth";
import { z } from "zod/v4";

/**
 * Rete BNI — registrazione di un 121 (incontro uno-a-uno).
 *
 * GET  /api/bni/one-to-one?membroId=...  → ultimi 121 (filtrabili per membro)
 * POST /api/bni/one-to-one               → registra un 121
 *
 * Registrare un 121 genera 0..N Lead nella pipeline (stage BNI_DA_LAVORARE):
 *  - se il membro è interessato → 1 lead per la sua azienda (origine "member_interest")
 *  - per ogni referenza → 1 lead (origine "referral", collegato al membro)
 * e aggiorna i contatori del membro (n° 121 + data ultimo 121).
 */

const referralSchema = z.object({
  name: z.string().min(1).max(255),
  company: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().max(255).optional(),
  website: z.string().max(500).optional(),
  need: z.string().max(2000).optional(),
});

const oneToOneSchema = z.object({
  membroId: z.string().min(1, "Membro obbligatorio"),
  date: z.string().min(1).optional(), // ISO; default = ora
  location: z.string().max(255).optional(),
  notes: z.string().max(5000).optional(),
  memberInterested: z.boolean().optional(),
  interestService: z.string().max(255).optional(),
  referrals: z.array(referralSchema).max(20).optional(),
});

const clean = (v?: string) => {
  const t = v?.trim();
  return t ? t : null;
};

// Normalizza un sito web aggiungendo lo schema se manca (coerente con leads/manual).
const normalizeWebsite = (v?: string | null): string | null => {
  const t = v?.trim();
  if (!t) return null;
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
};

export async function GET(request: NextRequest) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;

  const membroId = request.nextUrl.searchParams.get("membroId")?.trim();
  const limit = Math.min(
    parseInt(request.nextUrl.searchParams.get("limit") || "50", 10) || 50,
    200
  );

  const oneToOnes = await db.oneToOne.findMany({
    where: membroId ? { membroId } : {},
    orderBy: { date: "desc" },
    take: limit,
    include: {
      membro: { select: { id: true, name: true, company: true, chapter: true } },
      generatedLeads: {
        select: { id: true, name: true, bniOriginType: true, pipelineStage: true },
      },
    },
  });

  return NextResponse.json({ oneToOnes });
}

export async function POST(request: NextRequest) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;

  try {
    const body = await request.json();
    const data = oneToOneSchema.parse(body);

    const membro = await db.bniMembro.findUnique({ where: { id: data.membroId } });
    if (!membro) {
      return NextResponse.json({ error: "Membro non trovato" }, { status: 404 });
    }

    const date = data.date ? new Date(data.date) : new Date();
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: "Data non valida" }, { status: 400 });
    }

    const referrals = data.referrals ?? [];
    const memberInterested = data.memberInterested ?? false;

    const result = await db.$transaction(async (tx) => {
      // 1) L'evento 121
      const oneToOne = await tx.oneToOne.create({
        data: {
          membroId: membro.id,
          date,
          location: clean(data.location),
          notes: clean(data.notes),
          memberInterested,
          interestService: clean(data.interestService),
          referralsCount: referrals.length,
          createdBy: gate.userId,
        },
      });

      const createdLeadIds: string[] = [];

      // 2) Lead per l'interesse diretto del membro (la sua azienda)
      if (memberInterested) {
        const website = normalizeWebsite(membro.website);
        const lead = await tx.lead.create({
          data: {
            name: membro.company?.trim() || membro.name,
            phone: membro.phone,
            email: membro.email,
            website,
            source: "bni",
            bniOriginType: "member_interest",
            referralNeed: clean(data.interestService),
            referredByMembroId: membro.id,
            oneToOneId: oneToOne.id,
            pipelineStage: "BNI_DA_LAVORARE",
            auditStatus: website ? "PENDING" : "NO_WEBSITE",
            notes: `Interesse emerso nel 121 con ${membro.name}${
              data.interestService ? ` — servizio: ${data.interestService}` : ""
            }.`,
          },
        });
        createdLeadIds.push(lead.id);
        await tx.activity.create({
          data: {
            leadId: lead.id,
            type: "NOTE",
            notes: `Origine BNI: il membro ${membro.name} si è mostrato interessato durante il 121 del ${date.toLocaleDateString("it-IT")}.`,
            createdBy: gate.userId,
          },
        });
      }

      // 3) Un lead per ogni referenza ricevuta
      for (const ref of referrals) {
        const website = normalizeWebsite(ref.website);
        const personNote = ref.company && ref.name ? `Referente: ${ref.name}. ` : "";
        const lead = await tx.lead.create({
          data: {
            name: ref.company?.trim() || ref.name.trim(),
            phone: clean(ref.phone),
            email: clean(ref.email),
            website,
            source: "bni",
            bniOriginType: "referral",
            referralNeed: clean(ref.need),
            referredByMembroId: membro.id,
            oneToOneId: oneToOne.id,
            pipelineStage: "BNI_DA_LAVORARE",
            auditStatus: website ? "PENDING" : "NO_WEBSITE",
            notes: `Referenza da ${membro.name} (121 del ${date.toLocaleDateString("it-IT")}). ${personNote}${
              ref.need ? `Bisogno: ${ref.need}` : ""
            }`.trim(),
          },
        });
        createdLeadIds.push(lead.id);
        await tx.activity.create({
          data: {
            leadId: lead.id,
            type: "NOTE",
            notes: `Referenza ricevuta da ${membro.name} durante il 121 del ${date.toLocaleDateString("it-IT")}.`,
            createdBy: gate.userId,
          },
        });
      }

      // 4) Aggiorna i contatori denormalizzati del membro
      await tx.bniMembro.update({
        where: { id: membro.id },
        data: {
          oneToOneCount: { increment: 1 },
          // Aggiorna "ultimo 121" solo se questo è più recente di quanto registrato
          ...(!membro.lastOneToOneAt || date > membro.lastOneToOneAt
            ? { lastOneToOneAt: date }
            : {}),
        },
      });

      return { oneToOne, createdLeadIds };
    });

    return NextResponse.json({
      success: true,
      oneToOneId: result.oneToOne.id,
      leadsCreated: result.createdLeadIds.length,
      leadIds: result.createdLeadIds,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dati non validi", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[BNI] Errore registrazione 121:", error);
    return NextResponse.json(
      { error: "Errore nella registrazione del 121" },
      { status: 500 }
    );
  }
}
