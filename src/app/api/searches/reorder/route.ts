import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod/v4";

const reorderSchema = z.object({
  orderedIds: z.array(z.string().uuid()),
});

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderedIds } = reorderSchema.parse(body);

    // Aggiorna sortOrder per ogni ricerca nell'ordine specificato
    await db.$transaction(
      orderedIds.map((id, index) =>
        db.search.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dati non validi", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error reordering searches:", error);
    return NextResponse.json(
      { error: "Errore nel riordinamento" },
      { status: 500 }
    );
  }
}
