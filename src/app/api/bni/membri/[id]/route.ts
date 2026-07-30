import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/api-auth";
import { z } from "zod/v4";
import { classifyMembro } from "@/lib/bni/member-classifier";
import { extractSeekingTags, serializeTags } from "@/lib/bni/reciprocity";
import { loadMyChapterNames, isMyChapter } from "@/lib/bni/my-chapters";

/**
 * Rete BNI — dettaglio e aggiornamento di un singolo membro.
 *
 * GET   /api/bni/membri/[id]  → scheda completa: 121, referenze ricevute e DATE,
 *                               classificazione sui due assi, bilancio reciprocita'.
 * PATCH /api/bni/membri/[id]  → aggiorna il membro (ri-classifica se cambiano i dati
 *                               che influenzano la classificazione, a meno di roleLocked).
 */

interface RouteParams {
  params: Promise<{ id: string }>;
}

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  profession: z.string().max(255).nullable().optional(),
  company: z.string().max(255).nullable().optional(),
  chapter: z.string().max(255).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  email: z.string().max(255).nullable().optional(),
  website: z.string().max(500).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  status: z.enum(["ATTIVO", "VISITATORE", "EX_MEMBRO"]).optional(),
  seeking: z.string().max(2000).nullable().optional(),
  // Override manuale della classificazione: se passato, blocca la riclassificazione automatica.
  memberRole: z.enum(["CLIENTE", "PARTNER", "CONCORRENTE", "NEUTRO"]).optional(),
  buyerPersona: z.enum(["CASA", "MICROTURISMO", "PERSONA", "ALTRO"]).nullable().optional(),
  // Pipeline di vendita BNI
  bniStage: z.enum([
    "DA_AVVICINARE", "RICHIESTA_121", "PREP_REFERENZE", "FATTO_121", "OFFERTA", "RECALL", "CONSOLIDATO",
  ]).optional(),
  nextRecallAt: z.string().nullable().optional(),
  next121At: z.string().nullable().optional(),
  isCustomer: z.boolean().optional(),
  // Data dell'ultimo 121 (per marcare 121 già fatti in passato, senza registrarli uno a uno).
  lastOneToOneAt: z.string().nullable().optional(),
});

/** Stadi pipeline che implicano un 121 già avvenuto. */
const STAGES_AFTER_121 = new Set(["FATTO_121", "OFFERTA", "RECALL", "CONSOLIDATO"]);

const clean = (v?: string | null) => {
  if (v === null) return null;
  const t = v?.trim();
  return t ? t : null;
};

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;

  const { id } = await params;

  const membro = await db.bniMembro.findUnique({
    where: { id },
    include: {
      oneToOnes: {
        orderBy: { date: "desc" },
        include: {
          generatedLeads: {
            select: { id: true, name: true, bniOriginType: true, pipelineStage: true },
          },
        },
      },
      referredLeads: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          pipelineStage: true,
          bniOriginType: true,
          referralNeed: true,
          createdAt: true,
        },
      },
      referralsGiven: { orderBy: { givenAt: "desc" } },
    },
  });

  if (!membro) {
    return NextResponse.json({ error: "Membro non trovato" }, { status: 404 });
  }

  // Spiegazione della classificazione: ricalcolata al volo, non salvata.
  // Serve alla UI per dire *perche'* questo membro e' prioritario.
  const myChapters = await loadMyChapterNames();
  const classification = classifyMembro(
    {
      profession: membro.profession,
      company: membro.company,
      website: membro.website,
      notes: membro.notes,
    },
    { isMyChapter: isMyChapter(myChapters, membro.chapter) }
  );

  // Bilancio della reciprocita': do' piu' di quanto ricevo, o viceversa?
  const received = membro.referredLeads.filter((l) => l.bniOriginType === "referral").length;
  const given = membro.referralsGiven.length;
  const clientsFromMembro = membro.referredLeads.filter((l) => l.pipelineStage === "CLIENTE").length;

  return NextResponse.json({
    membro,
    classification,
    reciprocity: {
      given,
      received,
      // >0 = sono in credito (ho dato piu' di quanto ricevuto), <0 = sono in debito
      balance: given - received,
      clientsFromMembro,
    },
  });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;

  try {
    const { id } = await params;
    const body = await request.json();
    const data = updateSchema.parse(body);

    const existing = await db.bniMembro.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Membro non trovato" }, { status: 404 });
    }

    const update: Record<string, unknown> = {};
    if (data.name !== undefined) update.name = data.name.trim();
    if (data.profession !== undefined) update.profession = clean(data.profession);
    if (data.company !== undefined) update.company = clean(data.company);
    if (data.chapter !== undefined) update.chapter = clean(data.chapter);
    if (data.phone !== undefined) update.phone = clean(data.phone);
    if (data.email !== undefined) update.email = clean(data.email);
    if (data.website !== undefined) update.website = clean(data.website);
    if (data.notes !== undefined) update.notes = clean(data.notes);
    if (data.status !== undefined) update.status = data.status;
    if (data.isCustomer !== undefined) update.isCustomer = data.isCustomer;

    // Pipeline di vendita BNI: avanzamento stadio + data di recall.
    if (data.bniStage !== undefined) update.bniStage = data.bniStage;
    if (data.nextRecallAt !== undefined) {
      const d = data.nextRecallAt ? new Date(data.nextRecallAt) : null;
      update.nextRecallAt = d && !isNaN(d.getTime()) ? d : null;
    }
    if (data.next121At !== undefined) {
      const d = data.next121At ? new Date(data.next121At) : null;
      update.next121At = d && !isNaN(d.getTime()) ? d : null;
    }

    // Data 121 esplicita (marca un 121 già fatto in passato).
    if (data.lastOneToOneAt !== undefined) {
      const d = data.lastOneToOneAt ? new Date(data.lastOneToOneAt) : null;
      update.lastOneToOneAt = d && !isNaN(d.getTime()) ? d : null;
      if (update.lastOneToOneAt && existing.oneToOneCount === 0) update.oneToOneCount = 1;
    }

    // Portare un membro a "121 fatto" (o oltre) implica che il 121 c'è stato:
    // se non ne risultava nessuno, lo registriamo (data = oggi salvo diversa indicazione)
    // così sparisce da "mai fatto un 121" nella coda.
    if (data.bniStage && STAGES_AFTER_121.has(data.bniStage) && existing.oneToOneCount === 0) {
      if (update.oneToOneCount === undefined) update.oneToOneCount = 1;
      if (update.lastOneToOneAt === undefined) update.lastOneToOneAt = new Date();
    }

    // "Chi cerca": ogni volta che cambia, si rigenerano i tag del matcher.
    if (data.seeking !== undefined) {
      const seeking = clean(data.seeking);
      update.seeking = seeking;
      update.seekingTags = serializeTags(extractSeekingTags(seeking));
    }

    // Override manuale: vince sempre sull'automatico e lo blocca per il futuro.
    const manualOverride = data.memberRole !== undefined || data.buyerPersona !== undefined;
    if (data.memberRole !== undefined) {
      update.memberRole = data.memberRole;
      // Allineo i punteggi al ruolo scelto (così la priorità in coda ha senso),
      // senza sovrascrivere un punteggio già presente e coerente.
      if (data.memberRole === "CLIENTE") {
        update.clientScore = existing.clientScore || 70;
        update.partnerScore = 0;
      } else if (data.memberRole === "PARTNER") {
        update.partnerScore = existing.partnerScore || 55;
        update.clientScore = 0;
      } else {
        update.clientScore = 0;
        update.partnerScore = 0;
      }
    }
    if (data.buyerPersona !== undefined) update.buyerPersona = data.buyerPersona;
    if (manualOverride) update.roleLocked = true;

    // Riclassifica se sono cambiati i dati che la determinano — ma solo se
    // Alessio non ha gia' deciso a mano (roleLocked).
    const classInputsChanged =
      data.profession !== undefined || data.company !== undefined ||
      data.website !== undefined || data.notes !== undefined;

    if (classInputsChanged && !existing.roleLocked && !manualOverride) {
      const myChapters = await loadMyChapterNames();
      const cls = classifyMembro(
        {
          profession: (update.profession ?? existing.profession) as string | null,
          company: (update.company ?? existing.company) as string | null,
          website: (update.website ?? existing.website) as string | null,
          notes: (update.notes ?? existing.notes) as string | null,
        },
        { isMyChapter: isMyChapter(myChapters, (update.chapter ?? existing.chapter) as string | null) }
      );
      update.buyerPersona = cls.buyerPersona;
      update.memberRole = cls.memberRole;
      update.clientScore = cls.clientScore;
      update.partnerScore = cls.partnerScore;
      update.personasServed = cls.personasServed.join(",") || null;
      update.classifiedAt = new Date();
    }

    const membro = await db.bniMembro.update({ where: { id }, data: update });
    return NextResponse.json({ success: true, membro });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dati non validi", details: error.issues }, { status: 400 });
    }
    console.error("[BNI] Errore aggiornamento membro:", error);
    return NextResponse.json({ error: "Errore nell'aggiornamento del membro" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;

  try {
    const { id } = await params;
    await db.bniMembro.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[BNI] Errore eliminazione membro:", error);
    return NextResponse.json({ error: "Errore nell'eliminazione del membro" }, { status: 500 });
  }
}
