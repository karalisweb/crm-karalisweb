import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET - Recupera categorie e localita
export async function GET() {
  try {
    const [categories, locations] = await Promise.all([
      db.searchCategory.findMany({
        where: { active: true },
        orderBy: { order: "asc" },
      }),
      db.searchLocation.findMany({
        where: { active: true },
        orderBy: { order: "asc" },
      }),
    ]);

    return NextResponse.json({ categories, locations });
  } catch (error) {
    console.error("Error fetching search config:", error);
    return NextResponse.json(
      { error: "Errore nel recupero configurazione" },
      { status: 500 }
    );
  }
}

// POST - Aggiunge categoria o localita
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, ...data } = body;

    if (type === "category") {
      const category = await db.searchCategory.create({
        data: {
          label: data.label,
          icon: data.icon || "🏢",
          order: data.order || 0,
        },
      });
      return NextResponse.json(category);
    } else if (type === "location") {
      const location = await db.searchLocation.create({
        data: {
          name: data.name,
          order: data.order || 0,
        },
      });
      return NextResponse.json(location);
    }

    return NextResponse.json({ error: "Tipo non valido" }, { status: 400 });
  } catch (error) {
    console.error("Error creating search config:", error);
    return NextResponse.json(
      { error: "Errore nella creazione" },
      { status: 500 }
    );
  }
}

// PUT - Aggiorna ordine o stato
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { type, id, ...data } = body;

    if (type === "category") {
      const category = await db.searchCategory.update({
        where: { id },
        data,
      });
      return NextResponse.json(category);
    } else if (type === "location") {
      const location = await db.searchLocation.update({
        where: { id },
        data,
      });
      return NextResponse.json(location);
    }

    return NextResponse.json({ error: "Tipo non valido" }, { status: 400 });
  } catch (error) {
    console.error("Error updating search config:", error);
    return NextResponse.json(
      { error: "Errore nell'aggiornamento" },
      { status: 500 }
    );
  }
}

// DELETE - Rimuove categoria o localita
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const id = searchParams.get("id");

    if (!type || !id) {
      return NextResponse.json(
        { error: "Parametri mancanti" },
        { status: 400 }
      );
    }

    if (type === "category") {
      await db.searchCategory.delete({ where: { id } });
    } else if (type === "location") {
      await db.searchLocation.delete({ where: { id } });
    } else {
      return NextResponse.json({ error: "Tipo non valido" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting search config:", error);
    return NextResponse.json(
      { error: "Errore nell'eliminazione" },
      { status: 500 }
    );
  }
}
