import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getRecentAppointments } from "@/lib/google-calendar";

/**
 * POST /api/cron/sync-calendar
 *
 * Sincronizza appuntamenti dal Google Calendar (appointment scheduling) al CRM.
 * Cerca match tra chi ha prenotato e i lead nel DB.
 * Se trova un match, aggiorna lo stage a CALL_FISSATA e setta appointmentAt.
 *
 * Chiamato da crontab VPS ogni 15 minuti:
 * * /15 * * * * curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" https://app.domain/api/cron/sync-calendar
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.CRON_SECRET;

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const appointments = await getRecentAppointments(24);

    if (appointments.length === 0) {
      return NextResponse.json({
        synced: 0,
        message: "Nessun appuntamento trovato o Google Calendar non configurato",
      });
    }

    let synced = 0;
    let alreadySynced = 0;
    const unmatched: string[] = [];

    for (const appt of appointments) {
      // Cerca se questo evento e' gia stato sincronizzato (check by eventId in notes)
      const alreadyExists = await db.activity.findFirst({
        where: {
          notes: { contains: appt.eventId },
          type: "MEETING",
        },
      });

      if (alreadyExists) {
        alreadySynced++;
        continue;
      }

      // Cerca lead corrispondente per email, nome o telefono
      const conditions = [];

      if (appt.attendeeEmail) {
        conditions.push({ email: { equals: appt.attendeeEmail, mode: "insensitive" as const } });
      }

      if (appt.attendeeName) {
        // Match fuzzy sul nome: cerca se il nome dell'attendee contiene il nome del lead o viceversa
        conditions.push({ name: { contains: appt.attendeeName, mode: "insensitive" as const } });
      }

      if (appt.attendeePhone) {
        // Normalizza il telefono (rimuovi spazi e trattini)
        const normalizedPhone = appt.attendeePhone.replace(/[\s()-]/g, "");
        conditions.push({ phone: { contains: normalizedPhone } });
        conditions.push({ whatsappNumber: { contains: normalizedPhone } });
      }

      // Match anche sul summary dell'evento (spesso contiene il nome del lead)
      if (appt.summary) {
        conditions.push({ name: { contains: appt.summary, mode: "insensitive" as const } });
      }

      if (conditions.length === 0) {
        unmatched.push(appt.summary || "Evento senza dettagli");
        continue;
      }

      const matchedLead = await db.lead.findFirst({
        where: {
          OR: conditions,
          // Non considerare lead gia chiusi
          pipelineStage: {
            notIn: ["CLIENTE", "PERSO", "NON_TARGET", "SENZA_SITO"],
          },
        },
        orderBy: { updatedAt: "desc" },
      });

      if (!matchedLead) {
        unmatched.push(
          `${appt.summary} (${appt.attendeeEmail || appt.attendeeName || "no info"})`,
        );
        continue;
      }

      // Aggiorna lead: sposta a CALL_FISSATA e setta appointmentAt
      await db.$transaction([
        db.lead.update({
          where: { id: matchedLead.id },
          data: {
            pipelineStage: "CALL_FISSATA",
            appointmentAt: appt.startTime,
          },
        }),
        db.activity.create({
          data: {
            leadId: matchedLead.id,
            type: "MEETING",
            notes: `Appuntamento prenotato via calendario: ${appt.startTime.toLocaleDateString("it-IT", {
              weekday: "long",
              day: "numeric",
              month: "long",
              hour: "2-digit",
              minute: "2-digit",
            })} [gcal:${appt.eventId}]`,
          },
        }),
      ]);

      synced++;
      console.log(
        `[CALENDAR-SYNC] Lead "${matchedLead.name}" → CALL_FISSATA (evento: ${appt.summary})`,
      );
    }

    console.log(
      `[CALENDAR-SYNC] Totale: ${synced} sincronizzati, ${alreadySynced} gia presenti, ${unmatched.length} senza match`,
    );

    return NextResponse.json({
      synced,
      alreadySynced,
      unmatched,
      totalEvents: appointments.length,
    });
  } catch (error) {
    console.error("[CRON] Errore sync calendar:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore interno" },
      { status: 500 },
    );
  }
}
