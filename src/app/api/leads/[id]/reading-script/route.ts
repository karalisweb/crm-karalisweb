import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getGeminiClient } from "@/lib/gemini";

/**
 * POST /api/leads/[id]/reading-script
 *
 * Genera lo script finale di lettura per il video.
 * Prende il teleprompter script (4 atti) generato da Gemini
 * e lo trasforma in un testo fluido pronto da leggere durante la registrazione.
 * Elimina il passaggio manuale di copiare su Claude Chat.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const customInstructions = body.customInstructions || "";

    const lead = await db.lead.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        website: true,
        geminiAnalysis: true,
        geminiAnalyzedAt: true,
        auditData: true,
        opportunityScore: true,
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead non trovato" }, { status: 404 });
    }

    const analysis = lead.geminiAnalysis as Record<string, unknown> | null;
    if (!analysis?.teleprompter_script) {
      return NextResponse.json(
        { error: "Analisi strategica non ancora eseguita. Genera prima l'analisi Gemini." },
        { status: 400 }
      );
    }

    const client = getGeminiClient();
    if (!client) {
      return NextResponse.json(
        { error: "Gemini API key non configurata." },
        { status: 500 }
      );
    }

    const teleprompter = analysis.teleprompter_script as Record<string, string>;
    const cliche = analysis.cliche_found as string;
    const errorPattern = analysis.primary_error_pattern as string;
    const strategicNote = analysis.strategic_note as string;

    const prompt = `Sei un copywriter e coach di presentazioni video. Devi trasformare il seguente teleprompter script (diviso in 4 atti) in un UNICO testo fluido, pronto per essere letto durante la registrazione di un video personalizzato da inviare a freddo via WhatsApp a un prospect.

CONTESTO:
- Chi parla: Alessio Loi, fondatore di Karalisweb
- Prospect: ${lead.name}
- Sito: ${lead.website || "N/A"}
- Score opportunità: ${lead.opportunityScore}/100
- Pattern trovato: ${errorPattern}
- Cliché trovato: ${cliche}
- Nota strategica: ${strategicNote}

TELEPROMPTER ORIGINALE:
ATTO 1: ${teleprompter.atto_1}
ATTO 2: ${teleprompter.atto_2}
ATTO 3: ${teleprompter.atto_3}
ATTO 4: ${teleprompter.atto_4}

${customInstructions ? `ISTRUZIONI AGGIUNTIVE: ${customInstructions}` : ""}

REGOLE PER LO SCRIPT FINALE:
1. Deve essere UN FLUSSO CONTINUO senza titoli di sezione, numeri o intestazioni
2. Deve suonare naturale e conversazionale, come se parlassi a un amico imprenditore
3. Usa una METAFORA potente e coerente che aiuti il cliente a capire il MSD (Metodo Strategico Digitale)
4. Lavora sul concetto "perché devono scegliere te e non un competitor" — differenziazione
5. Usa tecniche persuasive: scarsità, autorità, prova sociale, reciprocità
6. Il tono deve essere diretto, autorevole ma non arrogante
7. NON iniziare con "ha passato la selezione" o simili — vai dritto al valore
8. All'inizio presentati come Alessio Loi, fondatore di Karalisweb
9. Lunghezza ideale: 60-90 secondi di lettura (circa 200-280 parole)
10. Chiudi con una CTA chiara che invita a rispondere al messaggio

Scrivi SOLO lo script finale, nient'altro. No commenti, no spiegazioni, no formattazione extra.`;

    const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const model = client.getGenerativeModel({ model: modelName });

    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout: nessuna risposta in 30 secondi")), 30_000)
      ),
    ]);

    const script = result.response.text().trim();

    // Salva lo script nel lead
    await db.lead.update({
      where: { id },
      data: {
        videoScriptData: {
          ...(lead.geminiAnalysis as object),
          readingScript: script,
          readingScriptGeneratedAt: new Date().toISOString(),
          readingScriptModel: modelName,
        },
      },
    });

    return NextResponse.json({
      success: true,
      script,
      model: modelName,
    });
  } catch (error) {
    console.error("[API] reading-script error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore nella generazione dello script" },
      { status: 500 }
    );
  }
}
