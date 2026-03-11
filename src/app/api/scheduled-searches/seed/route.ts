import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

// Le 39 ricerche predefinite
const DEFAULT_SEARCHES = [
  // Infissi & Serramenti
  { query: "Infissi", location: "Lecce" },
  { query: "Serramenti", location: "Lecce" },
  { query: "Vendita Piscine", location: "Lecce" },
  { query: "Infissi", location: "Taranto" },
  { query: "Serramenti", location: "Taranto" },
  { query: "Vendita Piscine", location: "Taranto" },
  { query: "Infissi", location: "Latina" },
  { query: "Serramenti", location: "Latina" },
  { query: "Impianti Climatizzazione", location: "Latina" },
  { query: "Infissi", location: "Salerno" },
  { query: "Serramenti", location: "Salerno" },
  { query: "Impianti Domotici", location: "Salerno" },

  // Sanita
  { query: "Studi Radiologici", location: "Udine" },
  { query: "Cliniche Odontoiatriche", location: "Udine" },
  { query: "Centri Fisioterapici", location: "Udine" },
  { query: "Studi Radiologici", location: "Pescara" },
  { query: "Cliniche Odontoiatriche", location: "Pescara" },
  { query: "Centri Fisioterapici", location: "Pescara" },
  { query: "Studi Radiologici", location: "Bolzano" },
  { query: "Centri Fisioterapici", location: "Bolzano" },
  { query: "Studi Radiologici", location: "Trento" },
  { query: "Centri Fisioterapici", location: "Trento" },

  // Turismo & Hospitality
  { query: "Property Manager", location: "Cagliari" },
  { query: "Strutture Ricettive", location: "Cagliari" },
  { query: "Property Manager", location: "Sassari" },
  { query: "Strutture Ricettive", location: "Sassari" },
  { query: "Property Manager", location: "Rimini" },
  { query: "Strutture Ricettive", location: "Rimini" },

  // Architettura & Design
  { query: "Studi Architettura", location: "Ferrara" },
  { query: "Interior Designer", location: "Ferrara" },
  { query: "Studi Architettura", location: "Novara" },
  { query: "Interior Designer", location: "Novara" },
  { query: "Studi Architettura", location: "Ancona" },
  { query: "Interior Designer", location: "Ancona" },

  // Artigianato & Servizi specializzati
  { query: "Artigiani Ceramiche", location: "Faenza" },
  { query: "Sartorie su Misura", location: "Lucca" },
  { query: "Wedding Planner", location: "Lucca" },
  { query: "Noleggio Piattaforme Aeree", location: "Pistoia" },
  { query: "Giardinieri e Vivai", location: "Pistoia" },
];

// POST — Carica le ricerche predefinite
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const data = DEFAULT_SEARCHES.map((s, i) => ({
      query: s.query,
      location: s.location,
      priority: i,
    }));

    const result = await db.scheduledSearch.createMany({
      data,
      skipDuplicates: true,
    });

    return NextResponse.json({
      created: result.count,
      total: DEFAULT_SEARCHES.length,
      message: `${result.count} ricerche caricate (${DEFAULT_SEARCHES.length - result.count} gia presenti)`,
    });
  } catch (error) {
    console.error("Error seeding scheduled searches:", error);
    return NextResponse.json(
      { error: "Errore nel caricamento ricerche" },
      { status: 500 }
    );
  }
}
