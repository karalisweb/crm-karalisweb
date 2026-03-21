import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod/v4";
import { runFullAudit } from "@/lib/audit";

const manualLeadSchema = z.object({
  website: z.string().min(1).max(500),
  name: z.string().max(255).optional(),
  category: z.string().max(100).optional(),
  location: z.string().max(255).optional(),
  notes: z.string().max(5000).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = manualLeadSchema.parse(body);

    // Normalizza URL
    let website = data.website.trim();
    if (!website.startsWith("http://") && !website.startsWith("https://")) {
      website = "https://" + website;
    }

    // Controlla se esiste già un lead con questo sito
    const existing = await db.lead.findFirst({
      where: { website: { contains: new URL(website).hostname, mode: "insensitive" } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Esiste già un lead con questo sito", existingId: existing.id },
        { status: 409 }
      );
    }

    // Se non c'è il nome, prova a estrarlo dal title del sito
    let name = data.name?.trim();
    if (!name) {
      try {
        const res = await fetch(website, {
          signal: AbortSignal.timeout(8000),
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          },
        });
        const html = await res.text();
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        name = titleMatch?.[1]?.trim()?.substring(0, 200) || new URL(website).hostname;
      } catch {
        name = new URL(website).hostname;
      }
    }

    // Crea il lead
    const lead = await db.lead.create({
      data: {
        name,
        website,
        category: data.category || null,
        address: data.location || null,
        source: "manual",
        notes: data.notes || null,
        auditStatus: "RUNNING",
      },
    });

    // Avvia audit in background (non blocca la response)
    runFullAudit({ website })
      .then(async (result) => {
        await db.lead.update({
          where: { id: lead.id },
          data: {
            auditStatus: "COMPLETED",
            auditCompletedAt: new Date(),
            opportunityScore: result.opportunityScore,
            auditData: result.auditData as object,
            talkingPoints: result.talkingPoints,
          },
        });
        console.log(`[MANUAL] Audit completato per ${name}: score ${result.opportunityScore}`);
      })
      .catch(async (err) => {
        console.error(`[MANUAL] Audit fallito per ${name}:`, err);
        await db.lead.update({
          where: { id: lead.id },
          data: { auditStatus: "FAILED" },
        });
      });

    return NextResponse.json({
      success: true,
      lead: { id: lead.id, name: lead.name, website: lead.website },
      message: "Lead creato. Audit in corso...",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dati non validi", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating manual lead:", error);
    return NextResponse.json(
      { error: "Errore nella creazione del lead" },
      { status: 500 }
    );
  }
}
