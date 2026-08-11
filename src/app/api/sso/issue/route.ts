import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import prisma from "@/lib/db";
import { SSO_APPS, issueSsoToken, ssoRedirectUrl, type SsoApp } from "@/lib/sso/token";

/**
 * Emette un token di accesso per un'altra applicazione della piattaforma.
 * Richiede una sessione valida nel CRM: chi non è già dentro non ottiene nulla.
 */
export async function POST(req: Request) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;

  let app: string | undefined;
  try {
    ({ app } = (await req.json()) as { app?: string });
  } catch {
    return NextResponse.json({ error: "Corpo non valido" }, { status: 400 });
  }

  if (!app || !(SSO_APPS as readonly string[]).includes(app)) {
    return NextResponse.json(
      { error: `Applicazione sconosciuta. Ammesse: ${SSO_APPS.join(", ")}` },
      { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: gate.userId },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!user) return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });

  try {
    const { token, expiresAt } = issueSsoToken({
      userId: user.id, email: user.email, name: user.name,
      role: user.role, app: app as SsoApp,
    });
    return NextResponse.json({
      url: ssoRedirectUrl(app as SsoApp, token),
      expiresAt: expiresAt.toISOString(),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Errore" }, { status: 500 });
  }
}
