import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/api-auth";
import { warmupCap } from "@/lib/opt-in-mailer";

/**
 * GET /api/outreach/sent-today
 *
 * Quante email di outreach sono partite OGGI (T1 auto + T1 approvate a mano + follow-up
 * + break-up), per tenere d'occhio il volume ed evitare lo spam. Usa la stessa fonte e
 * lo stesso confine giornaliero (mezzanotte UTC) del cap nell'opt-in-mailer, così il
 * numero combacia con quello su cui il mailer calcola il budget.
 *
 * Conta le Activity EMAIL_OUTREACH con note "[Opt-in...]" (esclude il task telefonata).
 */

export async function GET() {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;

  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const baseWhere = {
    type: "EMAIL_OUTREACH" as const,
    createdAt: { gte: startOfDay },
  };

  const [total, followup1, followup2, breakup, queued, settings, firstAgg] = await Promise.all([
    db.activity.count({ where: { ...baseWhere, notes: { startsWith: "[Opt-in" } } }),
    db.activity.count({ where: { ...baseWhere, notes: { startsWith: "[Opt-in-FU]" } } }),
    db.activity.count({ where: { ...baseWhere, notes: { startsWith: "[Opt-in-FU2]" } } }),
    db.activity.count({ where: { ...baseWhere, notes: { startsWith: "[Opt-in-BREAKUP]" } } }),
    // HOT approvati da Alessio, in coda di drip (ancora da inviare).
    db.lead.count({ where: { outreachApprovedAt: { not: null }, optInSentAt: null, respondedAt: null, unsubscribed: false } }),
    db.settings.findUnique({ where: { id: "default" }, select: { emailDailyCap: true } }),
    db.lead.aggregate({ _min: { optInSentAt: true }, where: { optInSentAt: { not: null } } }),
  ]);

  // first = tutto ciò che è "[Opt-in" ma non FU/FU2/BREAKUP (mail 1 auto o approvata).
  const first = total - followup1 - followup2 - breakup;

  const configuredCap = settings?.emailDailyCap ?? 20;
  const effectiveCap = warmupCap(configuredCap, firstAgg._min.optInSentAt);
  const inWarmup = effectiveCap < configuredCap;

  return NextResponse.json({
    total,
    byType: { first, followup1, followup2, breakup },
    queued, // HOT approvati in coda di invio
    cap: effectiveCap,
    configuredCap,
    inWarmup,
    remaining: Math.max(0, effectiveCap - total),
  });
}
