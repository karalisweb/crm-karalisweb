import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/api-auth";
import { generateOutreachEmail } from "@/lib/gemini-outreach-email";
import { pickSubjectVariant } from "@/lib/workflow-templates";
import { Prisma } from "@prisma/client";

/**
 * GET /api/leads/[id]/first-touch-draft
 *
 * Bozza della mail 1 (primo tocco) per la schermata di approvazione: { subject, body }.
 * Se il lead ha già una bozza cachata (outreachDraft) la ritorna; altrimenti la genera
 * con Gemini (gancio di dolore + invito al questionario), la salva e la ritorna.
 */

const FALLBACK_SUBJECTS = [
  "Una cosa che ho notato su {azienda}",
  "{azienda}: una domanda veloce",
  "Ho guardato il sito di {azienda}",
];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;

  try {
    const { id } = await params;
    // ?regenerate=1 → ignora la bozza cachata e rigenera da zero (la sovrascrive).
    const regenerate = new URL(request.url).searchParams.get("regenerate") === "1";
    const lead = await db.lead.findUnique({
      where: { id },
      select: { id: true, name: true, outreachDraft: true },
    });
    if (!lead) return NextResponse.json({ error: "Lead non trovato" }, { status: 404 });

    const settings = await db.settings.findUnique({
      where: { id: "default" },
      select: { optInSubjects: true, signatureAlessio: true, questionnaireUrl: true },
    });
    const questionnaireConfigured = !!(settings?.questionnaireUrl && settings.questionnaireUrl.trim());

    // Bozza già pronta → ritornala (Alessio la rivede), salvo richiesta esplicita di rigenerare.
    const cached = lead.outreachDraft as { subject?: string; body?: string } | null;
    if (!regenerate && cached?.subject && cached?.body) {
      return NextResponse.json({ subject: cached.subject, body: cached.body, questionnaireConfigured, cached: true });
    }

    // Genera con Gemini (gancio + questionario) + oggetto a rotazione + firma
    const draft = await generateOutreachEmail(lead.id);
    const firma = settings?.signatureAlessio || "Alessio Loi\nKaralisweb";
    const subjectsField =
      settings?.optInSubjects && settings.optInSubjects.trim()
        ? settings.optInSubjects
        : FALLBACK_SUBJECTS.join("\n");
    const subject = pickSubjectVariant(subjectsField, lead.name.length).replace(/\{azienda\}/g, lead.name);
    const body = `${draft.body}\n\n${firma}`;

    const record: Prisma.InputJsonValue = {
      subject,
      body,
      hook: draft.hook || "",
      generatedAt: new Date().toISOString(),
    };
    await db.lead.update({ where: { id: lead.id }, data: { outreachDraft: record } });

    return NextResponse.json({ subject, body, questionnaireConfigured, cached: false });
  } catch (error) {
    console.error("[API] first-touch-draft error:", error);
    return NextResponse.json({ error: "Errore nella generazione bozza" }, { status: 500 });
  }
}
