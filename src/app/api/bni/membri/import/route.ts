import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/api-auth";
import { z } from "zod/v4";
import { parseMembers } from "@/lib/bni/member-parser";
import { classifyMembro } from "@/lib/bni/member-classifier";

/**
 * IMPORT MASSIVO MEMBRI BNI
 *
 * Il modulo BNI ha un collo di bottiglia banale ma decisivo: l'anagrafica è vuota
 * (1 membro su tutto il CRM). Digitare 30 membri a mano per ogni capitolo da
 * visitare non succederà mai — quindi il resto del modulo resta inutilizzabile.
 *
 * POST /api/bni/membri/import
 *   { raw, chapter?, mode: "preview" | "commit" }
 *
 * "preview" non tocca il database: interpreta, classifica sui due assi e segnala
 * i duplicati. Alessio vede cosa ha capito il parser PRIMA di scrivere.
 * "commit" salva solo i nuovi (i duplicati vengono saltati, non sovrascritti:
 * non voglio che un import cancelli il "chi cerca" raccolto in un 121).
 */

const importSchema = z.object({
  raw: z.string().min(1, "Incolla almeno una riga").max(200_000),
  chapter: z.string().max(255).nullable().optional(),
  mode: z.enum(["preview", "commit"]).default("preview"),
  status: z.enum(["ATTIVO", "VISITATORE", "EX_MEMBRO"]).default("ATTIVO"),
});

const MAX_MEMBERS = 300;

export async function POST(request: NextRequest) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;

  try {
    const body = await request.json();
    const data = importSchema.parse(body);
    const chapter = data.chapter?.trim() || null;

    const parsed = parseMembers(data.raw);
    if (parsed.length === 0) {
      return NextResponse.json({
        error: "Non ho riconosciuto nessun membro. Una riga per persona, es. \"Mario Rossi - Commercialista - Studio Rossi\".",
      }, { status: 400 });
    }

    const truncated = parsed.length > MAX_MEMBERS;
    const members = parsed.slice(0, MAX_MEMBERS);

    // Duplicati: stesso nome nello stesso capitolo. Confronto case-insensitive.
    const existing = await db.bniMembro.findMany({
      where: chapter ? { chapter } : {},
      select: { id: true, name: true, chapter: true },
    });
    const existingNames = new Set(existing.map((e) => e.name.trim().toLowerCase()));

    const rows = members.map((m) => {
      const cls = classifyMembro({
        profession: m.profession,
        company: m.company,
        website: null,
        notes: null,
      });
      return {
        ...m,
        duplicate: existingNames.has(m.name.toLowerCase()),
        memberRole: cls.memberRole,
        buyerPersona: cls.buyerPersona,
        clientScore: cls.clientScore,
        partnerScore: cls.partnerScore,
        personasServed: cls.personasServed,
        reasons: cls.reasons,
      };
    });

    const toCreate = rows.filter((r) => !r.duplicate);

    const summary = {
      parsed: rows.length,
      duplicates: rows.length - toCreate.length,
      newOnes: toCreate.length,
      partners: toCreate.filter((r) => r.memberRole === "PARTNER").length,
      clients: toCreate.filter((r) => r.memberRole === "CLIENTE").length,
      competitors: toCreate.filter((r) => r.memberRole === "CONCORRENTE").length,
      neutral: toCreate.filter((r) => r.memberRole === "NEUTRO").length,
      truncated,
    };

    if (data.mode === "preview") {
      return NextResponse.json({ mode: "preview", summary, rows, chapter });
    }

    // ── COMMIT ────────────────────────────────────────────────────────────────
    if (toCreate.length === 0) {
      return NextResponse.json({ mode: "commit", created: 0, summary, chapter });
    }

    const now = new Date();
    const created = await db.bniMembro.createMany({
      data: toCreate.map((r) => ({
        name: r.name,
        profession: r.profession,
        company: r.company,
        phone: r.phone,
        email: r.email,
        chapter,
        status: data.status,
        memberRole: r.memberRole,
        buyerPersona: r.buyerPersona,
        clientScore: r.clientScore,
        partnerScore: r.partnerScore,
        personasServed: r.personasServed.join(",") || null,
        classifiedAt: now,
      })),
      skipDuplicates: true,
    });

    // Censisco il capitolo se è nuovo, così compare subito nella scheda Capitoli
    // con lo stato giusto ("analizzato": i membri li conosco, la visita no).
    if (chapter) {
      await db.bniChapter.upsert({
        where: { name: chapter },
        update: {},
        create: { name: chapter, visitStatus: "ANALIZZATO" },
      });
    }

    return NextResponse.json({
      mode: "commit",
      created: created.count,
      summary,
      chapter,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dati non validi", details: error.issues }, { status: 400 });
    }
    console.error("[BNI] Errore import membri:", error);
    return NextResponse.json({ error: "Errore nell'import dei membri" }, { status: 500 });
  }
}
