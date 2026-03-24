/**
 * YouTube Data API v3 — OAuth2 + Upload
 *
 * Permette di caricare video su YouTube come "unlisted" direttamente dal CRM.
 *
 * Setup Google Cloud Console:
 * 1. Crea progetto → Abilita "YouTube Data API v3"
 * 2. Crea credenziali OAuth 2.0 (tipo: Web application)
 *    - Authorized redirect URI: https://TUODOMINIO/api/youtube/callback
 *    - (per dev: http://localhost:3003/api/youtube/callback)
 * 3. Aggiungi il tuo account Google come "Test user" nel consent screen
 *
 * Variabili .env:
 * - YOUTUBE_CLIENT_ID=xxx.apps.googleusercontent.com
 * - YOUTUBE_CLIENT_SECRET=GOCSPx-xxx
 * - YOUTUBE_REDIRECT_URI=http://localhost:3003/api/youtube/callback
 * - YOUTUBE_REFRESH_TOKEN= (viene salvato dopo il primo auth)
 */

import { google } from "googleapis";
import { db } from "./db";
import { sendVideoViewNotification } from "./email";

const YOUTUBE_CLIENT_ID = process.env.YOUTUBE_CLIENT_ID || "";
const YOUTUBE_CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET || "";
const YOUTUBE_REDIRECT_URI =
  process.env.YOUTUBE_REDIRECT_URI || "http://localhost:3003/api/youtube/callback";

const SCOPES = ["https://www.googleapis.com/auth/youtube.upload"];

function getOAuth2Client() {
  if (!YOUTUBE_CLIENT_ID || !YOUTUBE_CLIENT_SECRET) {
    throw new Error(
      "YouTube API non configurata — imposta YOUTUBE_CLIENT_ID e YOUTUBE_CLIENT_SECRET nel .env"
    );
  }
  return new google.auth.OAuth2(
    YOUTUBE_CLIENT_ID,
    YOUTUBE_CLIENT_SECRET,
    YOUTUBE_REDIRECT_URI
  );
}

/**
 * Genera l'URL per il consent screen OAuth2.
 * L'utente apre questo URL, autorizza, viene rediretto al callback.
 */
export function getAuthUrl(): string {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });
}

/**
 * Scambia il code dal callback OAuth2 per i token.
 * Restituisce il refresh_token da salvare nel .env.
 */
export async function exchangeCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string | null;
}> {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return {
    accessToken: tokens.access_token || "",
    refreshToken: tokens.refresh_token || null,
  };
}

/**
 * Crea un client YouTube autenticato con il refresh token salvato.
 */
function getAuthenticatedClient() {
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
  if (!refreshToken) {
    throw new Error(
      "YOUTUBE_REFRESH_TOKEN non configurato — vai su /settings e completa l'autorizzazione YouTube"
    );
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return google.youtube({ version: "v3", auth: oauth2Client });
}

/**
 * Carica un video su YouTube come "unlisted".
 * Restituisce videoId e URL.
 */
export async function uploadVideo(params: {
  fileBuffer: Buffer;
  title: string;
  description?: string;
}): Promise<{
  videoId: string;
  url: string;
}> {
  const youtube = getAuthenticatedClient();

  const { Readable } = await import("stream");
  const stream = Readable.from(params.fileBuffer);

  const response = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title: params.title,
        description: params.description || `Analisi personalizzata — ${params.title}`,
      },
      status: {
        privacyStatus: "unlisted",
        selfDeclaredMadeForKids: false,
      },
    },
    media: {
      body: stream,
    },
  });

  const videoId = response.data.id;
  if (!videoId) {
    throw new Error("YouTube upload riuscito ma nessun videoId restituito");
  }

  return {
    videoId,
    url: `https://youtu.be/${videoId}`,
  };
}

/**
 * Estrae il videoId da vari formati di URL YouTube.
 */
export function extractYoutubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/, // solo ID
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Registra un evento video (play, progress, complete) dal player sulla landing page.
 */
export async function recordVideoEvent(
  token: string,
  event: "play" | "progress" | "complete",
  percent?: number
): Promise<{ ok: boolean; leadId?: string }> {
  const lead = await db.lead.findUnique({
    where: { videoTrackingToken: token },
    select: {
      id: true,
      name: true,
      videoFirstPlayAt: true,
      videoMaxWatchPercent: true,
      videoCompletedAt: true,
      videoViewsCount: true,
    },
  });

  if (!lead) return { ok: true };

  const updates: Record<string, unknown> = {};
  let activityNote = "";

  switch (event) {
    case "play":
      if (!lead.videoFirstPlayAt) {
        updates.videoFirstPlayAt = new Date();
        activityNote = "Video: primo play";
      }
      // Incrementa views solo al primo play (non a ogni resume)
      if (!lead.videoFirstPlayAt) {
        updates.videoViewsCount = { increment: 1 };
        updates.videoViewedAt = new Date();
      }
      break;

    case "progress":
      if (percent && (!lead.videoMaxWatchPercent || percent > lead.videoMaxWatchPercent)) {
        updates.videoMaxWatchPercent = percent;
        // Log activity solo alle milestone
        if (percent === 25 || percent === 50 || percent === 75) {
          activityNote = `Video: guardato ${percent}%`;
        }
      }
      break;

    case "complete":
      if (!lead.videoCompletedAt) {
        updates.videoCompletedAt = new Date();
        updates.videoMaxWatchPercent = 100;
        activityNote = "Video: guardato fino alla fine!";
      }
      break;
  }

  if (Object.keys(updates).length > 0) {
    await db.lead.update({
      where: { id: lead.id },
      data: updates,
    });
  }

  if (activityNote) {
    await db.activity.create({
      data: {
        leadId: lead.id,
        type: "VIDEO_VIEWED",
        notes: activityNote,
      },
    });
  }

  // Notifica email: solo al primo play e al complete
  if (event === "play" && !lead.videoFirstPlayAt) {
    sendVideoViewNotification(lead.name, lead.id, "play").catch(() => {});
  } else if (event === "complete" && !lead.videoCompletedAt) {
    sendVideoViewNotification(lead.name, lead.id, "complete").catch(() => {});
  }

  return { ok: true, leadId: lead.id };
}
