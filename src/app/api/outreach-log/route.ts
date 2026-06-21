import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/api-auth";
import { PipelineStage } from "@prisma/client";

/**
 * GET /api/outreach-log
 *
 * Registro delle mail di outreach opt-in: a chi è stata inviata, chi ha ricevuto
 * il follow-up, chi ha risposto, chi è uscito (archiviato) per mancata risposta.
 * Alimenta la pagina /registro-email.
 */
export async function GET() {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;

  const leads = await db.lead.findMany({
    where: { optInSentAt: { not: null } },
    select: {
      id: true,
      name: true,
      email: true,
      optInSentAt: true,
      optInFollowupAt: true,
      respondedAt: true,
      respondedVia: true,
      unsubscribed: true,
      pipelineStage: true,
      outreachMailSent: true,
    },
    orderBy: { optInSentAt: "desc" },
    take: 500,
  });

  const entries = leads.map((l) => {
    const mail = l.outreachMailSent as
      | { subject?: string; hook?: string; body?: string; generatedAt?: string }
      | null;

    // Stato derivato dal percorso del lead
    let status: "sent" | "followup" | "responded" | "expired" | "unsubscribed";
    if (l.respondedAt) status = "responded";
    else if (l.unsubscribed) status = "unsubscribed";
    else if (l.pipelineStage === PipelineStage.ARCHIVIATO) status = "expired";
    else if (l.optInFollowupAt) status = "followup";
    else status = "sent";

    return {
      id: l.id,
      name: l.name,
      email: l.email,
      sentAt: l.optInSentAt,
      followupAt: l.optInFollowupAt,
      respondedAt: l.respondedAt,
      respondedVia: l.respondedVia,
      subject: mail?.subject ?? null,
      hook: mail?.hook ?? null,
      body: mail?.body ?? null,
      status,
    };
  });

  const stats = {
    total: entries.length,
    sent: entries.filter((e) => e.status === "sent").length,
    followup: entries.filter((e) => e.status === "followup").length,
    responded: entries.filter((e) => e.status === "responded").length,
    expired: entries.filter((e) => e.status === "expired").length,
    unsubscribed: entries.filter((e) => e.status === "unsubscribed").length,
  };

  return NextResponse.json({ entries, stats });
}
