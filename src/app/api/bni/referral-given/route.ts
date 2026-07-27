import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/api-auth";
import { z } from "zod/v4";

/**
 * REFERENZE DATE — l'altra meta' del Givers Gain.
 *
 * Il CRM tracciava solo le referenze RICEVUTE. Ma nel BNI si riceve perche' si da':
 * senza misurare cosa do, non so con chi sono in credito e con chi in debito.
 *
 * GET   /api/bni/referral-given?membroId=xxx  → referenze date (a un membro o a tutti)
 * POST  /api/bni/referral-given               → registra una referenza data
 * PATCH /api/bni/referral-given               → aggiorna l'esito
 */

const createSchema = z.object({
  membroId: z.string().min(1),
  contactName: z.string().min(1, "Serve il nome del contatto").max(255),
  contactInfo: z.string().max(500).optional(),
  leadId: z.string().optional(),
  note: z.string().max(2000).optional(),
  outcome: z.enum(["PROPOSTO", "ACCETTATO", "CHIUSO", "NULLA"]).optional(),
});

const updateSchema = z.object({
  id: z.string().min(1),
  outcome: z.enum(["PROPOSTO", "ACCETTATO", "CHIUSO", "NULLA"]).optional(),
  note: z.string().max(2000).nullable().optional(),
});

const clean = (v?: string | null) => {
  if (v === null) return null;
  const t = v?.trim();
  return t ? t : null;
};

export async function GET(request: NextRequest) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;

  const membroId = request.nextUrl.searchParams.get("membroId")?.trim();
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get("limit") || "50", 10) || 50, 200);

  const referrals = await db.referralGiven.findMany({
    where: membroId ? { membroId } : {},
    orderBy: { givenAt: "desc" },
    take: limit,
    include: { membro: { select: { id: true, name: true, company: true, chapter: true } } },
  });

  return NextResponse.json({ referrals });
}

export async function POST(request: NextRequest) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;

  try {
    const body = await request.json();
    const data = createSchema.parse(body);

    const membro = await db.bniMembro.findUnique({ where: { id: data.membroId } });
    if (!membro) {
      return NextResponse.json({ error: "Membro non trovato" }, { status: 404 });
    }

    const referral = await db.referralGiven.create({
      data: {
        membroId: membro.id,
        contactName: data.contactName.trim(),
        contactInfo: clean(data.contactInfo),
        leadId: clean(data.leadId),
        note: clean(data.note),
        outcome: data.outcome ?? "PROPOSTO",
        createdBy: gate.userId,
      },
    });

    // Se il contatto regalato e' un lead del CRM, lascio traccia sulla sua timeline:
    // serve a ricostruire perche' quel contatto e' stato condiviso e con chi.
    if (referral.leadId) {
      const lead = await db.lead.findUnique({ where: { id: referral.leadId }, select: { id: true } });
      if (lead) {
        await db.activity.create({
          data: {
            leadId: lead.id,
            type: "NOTE",
            notes: `Contatto segnalato a ${membro.name} (BNI)${data.note ? ` — ${data.note}` : ""}.`,
            createdBy: gate.userId,
          },
        });
      }
    }

    return NextResponse.json({ success: true, referral });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dati non validi", details: error.issues }, { status: 400 });
    }
    console.error("[BNI] Errore registrazione referenza data:", error);
    return NextResponse.json({ error: "Errore nella registrazione della referenza" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;

  try {
    const body = await request.json();
    const data = updateSchema.parse(body);

    const update: Record<string, unknown> = {};
    if (data.outcome !== undefined) update.outcome = data.outcome;
    if (data.note !== undefined) update.note = clean(data.note);

    const referral = await db.referralGiven.update({ where: { id: data.id }, data: update });
    return NextResponse.json({ success: true, referral });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dati non validi", details: error.issues }, { status: 400 });
    }
    console.error("[BNI] Errore aggiornamento referenza data:", error);
    return NextResponse.json({ error: "Errore nell'aggiornamento della referenza" }, { status: 500 });
  }
}
