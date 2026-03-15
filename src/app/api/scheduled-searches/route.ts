import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod/v4";

const scheduledSearchesSchema = z.object({
  searches: z
    .array(
      z.object({
        query: z.string().min(1).max(255),
        location: z.string().min(1).max(255),
        priority: z.number().int().min(0).optional(),
      })
    )
    .min(1)
    .max(50),
});

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

    const body = await request.json();
    const parsed = scheduledSearchesSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dati non validi", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const data = parsed.data.searches.map((s, i) => ({
      query: s.query,
      location: s.location,
      priority: s.priority ?? i,
    }));

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
