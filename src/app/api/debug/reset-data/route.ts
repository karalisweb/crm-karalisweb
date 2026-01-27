import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

/**
 * POST /api/debug/reset-data
 * Elimina tutti i lead e le ricerche per ripartire da zero
 * ATTENZIONE: operazione distruttiva!
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    // Conta prima di eliminare
    const leadCount = await db.lead.count();
    const searchCount = await db.search.count();
    const activityCount = await db.activity.count();

    // Elimina in ordine per rispettare le foreign key
    // 1. Activities (riferiscono leads)
    await db.activity.deleteMany({});

    // 2. Leads (riferiscono searches)
    await db.lead.deleteMany({});

    // 3. Searches
    await db.search.deleteMany({});

    return NextResponse.json({
      success: true,
      deleted: {
        leads: leadCount,
        searches: searchCount,
        activities: activityCount,
      },
      message: `Eliminati ${leadCount} lead, ${searchCount} ricerche, ${activityCount} attività. Database pronto per nuovi dati.`,
    });
  } catch (error) {
    console.error("Error resetting data:", error);
    return NextResponse.json(
      { error: "Failed to reset data" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/debug/reset-data
 * Mostra cosa verrebbe eliminato (dry run)
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const leadCount = await db.lead.count();
    const searchCount = await db.search.count();
    const activityCount = await db.activity.count();

    return NextResponse.json({
      wouldDelete: {
        leads: leadCount,
        searches: searchCount,
        activities: activityCount,
      },
      message: `Verrebbero eliminati ${leadCount} lead, ${searchCount} ricerche, ${activityCount} attività.`,
    });
  } catch (error) {
    console.error("Error checking data:", error);
    return NextResponse.json(
      { error: "Failed to check data" },
      { status: 500 }
    );
  }
}
