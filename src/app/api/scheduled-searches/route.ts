import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

// GET — Lista ricerche programmate
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const searches = await db.scheduledSearch.findMany({
      orderBy: [{ status: "asc" }, { priority: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json(searches);
  } catch (error) {
    console.error("Error fetching scheduled searches:", error);
    return NextResponse.json(
      { error: "Errore nel recupero ricerche programmate" },
      { status: 500 }
    );
  }
}

// POST — Aggiunge ricerche alla coda (bulk)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const { searches } = await request.json();

    if (!Array.isArray(searches) || searches.length === 0) {
      return NextResponse.json(
        { error: "Fornire un array di ricerche" },
        { status: 400 }
      );
    }

    const data = searches.map(
      (s: { query: string; location: string; priority?: number }, i: number) => ({
        query: s.query,
        location: s.location,
        priority: s.priority ?? i,
      })
    );

    const result = await db.scheduledSearch.createMany({
      data,
      skipDuplicates: true,
    });

    return NextResponse.json({
      created: result.count,
      message: `${result.count} ricerche aggiunte alla coda`,
    });
  } catch (error) {
    console.error("Error creating scheduled searches:", error);
    return NextResponse.json(
      { error: "Errore nella creazione ricerche programmate" },
      { status: 500 }
    );
  }
}
