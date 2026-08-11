/**
 * Accesso unico — il CRM è il fornitore d'identità (piano, criticità 4).
 *
 * Emette un token firmato, di vita breve e a uso singolo per applicazione.
 * Le altre tre app non condividono la sessione: la validano e ne creano una
 * propria. Nessuna password viaggia, nessuna sessione è condivisa.
 */
import crypto from "crypto";

export const SSO_APPS = ["gads", "seoi", "hub"] as const;
export type SsoApp = (typeof SSO_APPS)[number];

/** Vita del token: deve bastare a un redirect, non a una navigazione. */
const TTL_SECONDI = 120;

export interface SsoPayload {
  sub: string;      // id utente nel CRM
  email: string;
  name?: string;
  /** Ruolo di piattaforma, tradotto da chi riceve nei propri termini. */
  role: string;
  aud: SsoApp;      // applicazione di destinazione: un token non vale altrove
  iss: "orchestra-crm";
  iat: number;
  exp: number;
  jti: string;      // uso singolo
}

function b64url(b: Buffer | string) {
  return Buffer.from(b).toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function secret(): string {
  const s = process.env.ORCHESTRA_SSO_SECRET;
  // Nessun valore di riserva: un segreto mancante deve fermare, non degradare.
  if (!s || s.length < 32) {
    throw new Error("ORCHESTRA_SSO_SECRET mancante o troppo corta (min 32 caratteri)");
  }
  return s;
}

export function issueSsoToken(input: {
  userId: string; email: string; name?: string | null; role: string; app: SsoApp;
}): { token: string; expiresAt: Date } {
  const now = Math.floor(Date.now() / 1000);
  const payload: SsoPayload = {
    sub: input.userId,
    email: input.email,
    name: input.name ?? undefined,
    role: input.role,
    aud: input.app,
    iss: "orchestra-crm",
    iat: now,
    exp: now + TTL_SECONDI,
    jti: crypto.randomUUID(),
  };
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(payload));
  const firma = b64url(
    crypto.createHmac("sha256", secret()).update(`${header}.${body}`).digest());
  return { token: `${header}.${body}.${firma}`, expiresAt: new Date(payload.exp * 1000) };
}

/** URL a cui mandare l'utente perché l'app di destinazione lo faccia entrare. */
export function ssoRedirectUrl(app: SsoApp, token: string): string {
  const base: Record<SsoApp, string> = {
    gads: process.env.SSO_URL_GADS ?? "https://gads.karalisdemo.it",
    seoi: process.env.SSO_URL_SEOI ?? "https://seoi.karalisdemo.it",
    hub: process.env.SSO_URL_HUB ?? "https://hub.karalisdemo.it",
  };
  // GADS ha prefisso globale "api" e nginx instrada al backend solo /api:
  // il suo endpoint sta li, gli altri due lo espongono alla radice.
  const percorso: Record<SsoApp, string> = {
    gads: "/api/sso/accept",
    seoi: "/sso/accept",
    hub: "/sso/accept",
  };
  return `${base[app]}${percorso[app]}?token=${encodeURIComponent(token)}`;
}
