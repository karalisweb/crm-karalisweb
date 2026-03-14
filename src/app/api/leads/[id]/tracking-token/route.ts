import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";

/**
 * GET /api/leads/[id]/tracking-token
 * Ritorna il token tracking esistente.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const lead = await db.lead.findUnique({
      where: { id },
      select: { videoTrackingToken: true },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead non trovato" }, { status: 404 });
    }

    return NextResponse.json({ token: lead.videoTrackingToken });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/leads/[id]/tracking-token
 * Genera un nuovo videoTrackingToken (o ritorna l'esistente).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const lead = await db.lead.findUnique({
      where: { id },
      select: { videoTrackingToken: true },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead non trovato" }, { status: 404 });
    }

    // Se il token esiste già, ritornalo
    if (lead.videoTrackingToken) {
      return NextResponse.json({ token: lead.videoTrackingToken, existing: true });
    }

    // Genera nuovo token (UUID senza trattini per brevità)
    const token = randomUUID().replace(/-/g, "");

    await db.lead.update({
      where: { id },
      data: { videoTrackingToken: token },
    });

    return NextResponse.json({ token, existing: false });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore" },
      { status: 500 }
    );
  }
}
