import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const EMAIL_FIELDS = [
  "emailFromAddress",
  "emailFromName",
  "emailSubjectFirst",
  "emailSubjectFollowup",
  "tplFirstWa",
  "tplFirstEmail",
  "tplFollowup1Wa",
  "tplFollowup1Email",
  "tplFollowup2Wa",
  "tplFollowup2Email",
  "tplFollowup3Wa",
  "tplFollowup3Email",
  "gdprCompanyName",
  "gdprAddress",
  "gdprVatNumber",
  "gdprFooterText",
  "gdprUnsubscribeText",
  "notificationEmails",
] as const;

// GET - Recupera impostazioni email e messaggi
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const settings = await db.settings.findUnique({
      where: { id: "default" },
    });

    const result: Record<string, string | null> = {};
    for (const field of EMAIL_FIELDS) {
      result[field] = (settings as Record<string, unknown>)?.[field] as string | null ?? null;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching email settings:", error);
    return NextResponse.json(
      { error: "Errore nel recupero impostazioni email" },
      { status: 500 }
    );
  }
}

// PUT - Aggiorna impostazioni email e messaggi
export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string })?.role;
    if (userRole !== "ADMIN") {
      return NextResponse.json(
        { error: "Solo gli admin possono modificare le impostazioni" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Costruisci oggetto update con solo i campi validi
    const updateData: Record<string, string | null> = {};
    for (const field of EMAIL_FIELDS) {
      if (body[field] !== undefined) {
        updateData[field] = body[field] || null;
      }
    }

    const settings = await db.settings.upsert({
      where: { id: "default" },
      update: updateData,
      create: { id: "default", ...updateData },
    });

    const result: Record<string, string | null> = {};
    for (const field of EMAIL_FIELDS) {
      result[field] = (settings as Record<string, unknown>)?.[field] as string | null ?? null;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating email settings:", error);
    return NextResponse.json(
      { error: "Errore nel salvataggio impostazioni email" },
      { status: 500 }
    );
  }
}
