import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET - Recupera le impostazioni CRM
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    // Prova a recuperare le settings, se non esistono le crea con valori default
    let settings = await db.settings.findUnique({
      where: { id: "default" },
    });

    if (!settings) {
      settings = await db.settings.create({
        data: {
          id: "default",
          scoreThreshold: 60,
          ghostOfferDays: 20,
          maxCallAttempts: 3,
          followUpDaysVideo: 7,
          followUpDaysLetter: 7,
          recontactMonths: 6,
          scheduledSearchesPerRun: 1,
          scheduledSearchHour: 2,
          scheduledLeadsPerSearch: 50,
        },
      });
    }

    return NextResponse.json({
      scoreThreshold: settings.scoreThreshold,
      ghostOfferDays: settings.ghostOfferDays,
      maxCallAttempts: settings.maxCallAttempts,
      followUpDaysVideo: settings.followUpDaysVideo,
      followUpDaysLetter: settings.followUpDaysLetter,
      recontactMonths: settings.recontactMonths,
      scheduledSearchesPerRun: settings.scheduledSearchesPerRun,
      scheduledSearchHour: settings.scheduledSearchHour,
      scheduledLeadsPerSearch: settings.scheduledLeadsPerSearch,
    });
  } catch (error) {
    console.error("Error fetching CRM settings:", error);
    return NextResponse.json(
      { error: "Errore nel recupero impostazioni" },
      { status: 500 }
    );
  }
}

// PUT - Aggiorna le impostazioni CRM
export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    // Verifica che l'utente sia admin
    const userRole = (session.user as { role?: string })?.role;
    if (userRole !== "ADMIN") {
      return NextResponse.json(
        { error: "Solo gli admin possono modificare le impostazioni" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      scoreThreshold,
      ghostOfferDays,
      maxCallAttempts,
      followUpDaysVideo,
      followUpDaysLetter,
      recontactMonths,
      scheduledSearchesPerRun,
      scheduledSearchHour,
      scheduledLeadsPerSearch,
    } = body;

    // Validazione
    if (scoreThreshold !== undefined && (scoreThreshold < 0 || scoreThreshold > 100)) {
      return NextResponse.json(
        { error: "Score threshold deve essere tra 0 e 100" },
        { status: 400 }
      );
    }

    if (ghostOfferDays !== undefined && ghostOfferDays < 1) {
      return NextResponse.json(
        { error: "Giorni ghost offerta deve essere almeno 1" },
        { status: 400 }
      );
    }

    if (maxCallAttempts !== undefined && maxCallAttempts < 1) {
      return NextResponse.json(
        { error: "Tentativi massimi chiamata deve essere almeno 1" },
        { status: 400 }
      );
    }

    if (followUpDaysVideo !== undefined && followUpDaysVideo < 1) {
      return NextResponse.json(
        { error: "Giorni follow-up video deve essere almeno 1" },
        { status: 400 }
      );
    }

    if (followUpDaysLetter !== undefined && followUpDaysLetter < 1) {
      return NextResponse.json(
        { error: "Giorni follow-up lettera deve essere almeno 1" },
        { status: 400 }
      );
    }

    if (recontactMonths !== undefined && recontactMonths < 1) {
      return NextResponse.json(
        { error: "Mesi di ricontatto deve essere almeno 1" },
        { status: 400 }
      );
    }

    if (scheduledSearchesPerRun !== undefined && (scheduledSearchesPerRun < 1 || scheduledSearchesPerRun > 5)) {
      return NextResponse.json(
        { error: "Ricerche per esecuzione deve essere tra 1 e 5" },
        { status: 400 }
      );
    }

    if (scheduledSearchHour !== undefined && (scheduledSearchHour < 0 || scheduledSearchHour > 23)) {
      return NextResponse.json(
        { error: "Ora esecuzione deve essere tra 0 e 23" },
        { status: 400 }
      );
    }

    if (scheduledLeadsPerSearch !== undefined && (scheduledLeadsPerSearch < 10 || scheduledLeadsPerSearch > 100)) {
      return NextResponse.json(
        { error: "Lead per ricerca deve essere tra 10 e 100" },
        { status: 400 }
      );
    }

    const settings = await db.settings.upsert({
      where: { id: "default" },
      update: {
        ...(scoreThreshold !== undefined && { scoreThreshold }),
        ...(ghostOfferDays !== undefined && { ghostOfferDays }),
        ...(maxCallAttempts !== undefined && { maxCallAttempts }),
        ...(followUpDaysVideo !== undefined && { followUpDaysVideo }),
        ...(followUpDaysLetter !== undefined && { followUpDaysLetter }),
        ...(recontactMonths !== undefined && { recontactMonths }),
        ...(scheduledSearchesPerRun !== undefined && { scheduledSearchesPerRun }),
        ...(scheduledSearchHour !== undefined && { scheduledSearchHour }),
        ...(scheduledLeadsPerSearch !== undefined && { scheduledLeadsPerSearch }),
        updatedAt: new Date(),
      },
      create: {
        id: "default",
        scoreThreshold: scoreThreshold ?? 60,
        ghostOfferDays: ghostOfferDays ?? 20,
        maxCallAttempts: maxCallAttempts ?? 3,
        followUpDaysVideo: followUpDaysVideo ?? 7,
        followUpDaysLetter: followUpDaysLetter ?? 7,
        recontactMonths: recontactMonths ?? 6,
        scheduledSearchesPerRun: scheduledSearchesPerRun ?? 1,
        scheduledSearchHour: scheduledSearchHour ?? 2,
        scheduledLeadsPerSearch: scheduledLeadsPerSearch ?? 50,
      },
    });

    return NextResponse.json({
      scoreThreshold: settings.scoreThreshold,
      ghostOfferDays: settings.ghostOfferDays,
      maxCallAttempts: settings.maxCallAttempts,
      followUpDaysVideo: settings.followUpDaysVideo,
      followUpDaysLetter: settings.followUpDaysLetter,
      recontactMonths: settings.recontactMonths,
      scheduledSearchesPerRun: settings.scheduledSearchesPerRun,
      scheduledSearchHour: settings.scheduledSearchHour,
      scheduledLeadsPerSearch: settings.scheduledLeadsPerSearch,
    });
  } catch (error) {
    console.error("Error updating CRM settings:", error);
    return NextResponse.json(
      { error: "Errore nel salvataggio impostazioni" },
      { status: 500 }
    );
  }
}
