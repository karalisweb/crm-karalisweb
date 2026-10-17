import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireSession, enforceUserRateLimit } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { sincronizzaIncontri } from "@/lib/ricerca/calendario";

/** GET /api/ricerca/bni/calendario — se il calendario è collegato e com'è andata l'ultima lettura (il link non esce mai). */
export async function GET() {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  const s = await db.settings.findUnique({ where: { id: "default" }, select: { calendarIcsUrl: true, calendarSyncedAt: true, calendarSyncError: true, calendarSyncInfo: true } });
  return NextResponse.json({ collegato: !!s?.calendarIcsUrl, ultimaLettura: s?.calendarSyncedAt ?? null, errore: s?.calendarSyncError ?? null, esito: s?.calendarSyncInfo ?? null });
}

const Schema = z.union([
  z.object({ url: z.string().url().max(1000) }),
  z.object({ azione: z.enum(["leggi", "scollega"]) }),
]);

/** POST /api/ricerca/bni/calendario — collega (link segreto iCal), rilegge adesso o scollega. */
export async function POST(request: NextRequest) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  const limited = enforceUserRateLimit("calendario", gate.userId, 10, 10 * 60_000);
  if (limited) return limited;
  try {
    const body = Schema.parse(await request.json());
    if ("url" in body) {
      const url = body.url.trim();
      if (!/^https:\/\//.test(url) || !/\.ics(\?|$)/.test(url)) {
        return NextResponse.json({ error: "Serve il link segreto in formato iCal (finisce con .ics)" }, { status: 400 });
      }
      await db.settings.upsert({ where: { id: "default" }, create: { id: "default", calendarIcsUrl: url }, update: { calendarIcsUrl: url, calendarSyncError: null } });
    } else if (body.azione === "scollega") {
      await db.settings.update({ where: { id: "default" }, data: { calendarIcsUrl: null, calendarSyncError: null, calendarSyncInfo: null } });
      return NextResponse.json({ success: true, collegato: false });
    }
    const esito = await sincronizzaIncontri();
    if (esito.errore) return NextResponse.json({ error: `Non riesco a leggere il calendario: ${esito.errore}` }, { status: 400 });
    return NextResponse.json({ success: true, ...esito });
  } catch (e) {
    if (e instanceof ZodError) return NextResponse.json({ error: "Link non valido" }, { status: 400 });
    throw e;
  }
}
