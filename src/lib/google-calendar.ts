/**
 * Client Google Calendar leggero (fetch HTTP, no SDK pesante)
 *
 * Richiede env vars:
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *   GOOGLE_REFRESH_TOKEN
 *
 * Setup:
 * 1. Google Cloud Console → abilita Calendar API
 * 2. Crea OAuth2 credentials (tipo Desktop o Web)
 * 3. Ottieni refresh token con OAuth playground:
 *    https://developers.google.com/oauthplayground/
 *    Scope: https://www.googleapis.com/auth/calendar.readonly
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;

async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) return null;

  // Usa token cached se non scaduto
  if (cachedAccessToken && Date.now() < tokenExpiresAt - 60000) {
    return cachedAccessToken;
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    console.error("[CALENDAR] Errore refresh token:", await res.text());
    return null;
  }

  const data = await res.json();
  cachedAccessToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;
  return cachedAccessToken;
}

export interface CalendarAppointment {
  eventId: string;
  summary: string;
  description: string | null;
  startTime: Date;
  endTime: Date;
  attendeeEmail: string | null;
  attendeeName: string | null;
  attendeePhone: string | null;
  createdAt: Date;
}

interface CalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  created?: string;
  attendees?: Array<{
    email?: string;
    displayName?: string;
    organizer?: boolean;
    self?: boolean;
  }>;
}

/**
 * Recupera gli appuntamenti recenti dal calendario primario.
 * Filtra solo eventi con attendees esterni (creati da appointment scheduling).
 */
export async function getRecentAppointments(
  hoursBack: number = 24,
): Promise<CalendarAppointment[]> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    console.log("[CALENDAR] Google Calendar non configurato (mancano env vars)");
    return [];
  }

  const timeMin = new Date();
  timeMin.setHours(timeMin.getHours() - hoursBack);

  const params = new URLSearchParams({
    calendarId: "primary",
    timeMin: timeMin.toISOString(),
    timeMax: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "50",
  });

  const res = await fetch(`${CALENDAR_API}/calendars/primary/events?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    console.error("[CALENDAR] Errore fetch eventi:", res.status, await res.text());
    return [];
  }

  const data = await res.json();
  const events: CalendarEvent[] = data.items || [];
  const appointments: CalendarAppointment[] = [];

  for (const event of events) {
    if (!event.attendees || event.attendees.length === 0) continue;

    const externalAttendee = event.attendees.find(
      (a) => !a.organizer && !a.self,
    );
    if (!externalAttendee) continue;

    const start = event.start?.dateTime || event.start?.date;
    const end = event.end?.dateTime || event.end?.date;
    if (!start || !end) continue;

    const phoneMatch = event.description?.match(
      /(?:tel|phone|telefono)[:\s]*([+\d\s()-]{8,})/i,
    );

    appointments.push({
      eventId: event.id,
      summary: event.summary || "",
      description: event.description || null,
      startTime: new Date(start),
      endTime: new Date(end),
      attendeeEmail: externalAttendee.email || null,
      attendeeName: externalAttendee.displayName || null,
      attendeePhone: phoneMatch?.[1]?.trim() || null,
      createdAt: new Date(event.created || start),
    });
  }

  return appointments;
}
