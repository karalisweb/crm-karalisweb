import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET/PUT /api/settings/outreach-mail
 *
 * Configurazione dell'unico motore di invio email automatico (opt-in-mailer):
 * oggetti mail a rotazione, istruzioni AI, firma, landing e cap giornaliero.
 * Sostituisce la vecchia /api/settings/workflow-steps (workflow-engine rimosso).
 */

const FIELDS = {
  sdLandingUrl: true,
  alessioLinkedinUrl: true,
  questionnaireUrl: true,
  emailDailyCap: true,
  optInSubjects: true,
  emailGenPrompt: true,
  signatureAlessio: true,
} as const;

export async function GET() {
  try {
    const settings = await db.settings.findFirst({ select: FIELDS });
    return NextResponse.json({ settings: settings || {} });
  } catch (error) {
    console.error("Error fetching outreach-mail settings:", error);
    return NextResponse.json({ error: "Errore nel recupero impostazioni" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    // Whitelist: accetta solo i campi noti della config opt-in
    const data: Record<string, unknown> = {};
    for (const key of Object.keys(FIELDS) as (keyof typeof FIELDS)[]) {
      if (key in body) data[key] = body[key];
    }

    const settings = await db.settings.upsert({
      where: { id: "default" },
      update: data,
      create: { id: "default", ...data },
      select: FIELDS,
    });
    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Error updating outreach-mail settings:", error);
    return NextResponse.json({ error: "Errore nell'aggiornamento" }, { status: 500 });
  }
}
