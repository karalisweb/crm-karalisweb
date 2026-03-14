import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getGeminiClient } from "@/lib/gemini";

/**
 * POST /api/leads/[id]/gemini-precision
 *
 * "Correttore di Precisione": riscrive Atto 3 e Atto 4 del teleprompter
 * usando i dati Ads reali (googleAdsCopy, metaAdsCopy, landingPageText).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const lead = await db.lead.findUnique({
      where: { id },
      select: {
        name: true,
        geminiAnalysis: true,
        geminiAnalyzedAt: true,
        googleAdsCopy: true,
        metaAdsCopy: true,
        landingPageText: true,
        landingPageUrl: true,
        hasActiveGoogleAds: true,
        hasActiveMetaAds: true,
        adsCheckedAt: true,
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead non trovato" }, { status: 404 });
    }

    if (!lead.geminiAnalysis) {
      return NextResponse.json(
        { error: "Analisi Gemini non ancora generata. Genera prima l'analisi strategica." },
        { status: 400 }
      );
    }

    if (!lead.adsCheckedAt) {
      return NextResponse.json(
        { error: "Investigazione Ads non ancora eseguita. Avvia prima l'investigazione Ads." },
        { status: 400 }
      );
    }

    const hasAdsData = lead.googleAdsCopy || lead.metaAdsCopy;
    if (!hasAdsData) {
      return NextResponse.json(
        { error: "Nessun dato Ads trovato. L'investigazione non ha trovato annunci attivi." },
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

    const analysis = lead.geminiAnalysis as Record<string, unknown>;
    const script = analysis.teleprompter_script as Record<string, string>;

    // Prompt specializzato per riscrivere Atto 3 + Atto 4
    const precisionPrompt = `Sei un Senior Brand Strategist con 20 anni di esperienza. Devi riscrivere SOLO l'Atto 3 ("I Soldi") e l'Atto 4 ("La Soluzione") di un copione teleprompter commerciale.

CONTESTO:
- Azienda: ${lead.name}
- Atto 1 e Atto 2 attuali (NON modificare, solo contesto):
  Atto 1: ${script.atto_1?.substring(0, 200)}...
  Atto 2: ${script.atto_2?.substring(0, 200)}...

DATI ADS REALI TROVATI:
${lead.googleAdsCopy ? `- Google Ads copy: "${lead.googleAdsCopy}"` : "- Google Ads: nessun annuncio trovato"}
${lead.metaAdsCopy ? `- Meta Ads copy: "${lead.metaAdsCopy}"` : "- Meta Ads: nessun annuncio trovato"}
${lead.landingPageText ? `- Testo Landing Page (${lead.landingPageUrl}): "${lead.landingPageText.substring(0, 500)}"` : "- Landing Page: testo non disponibile"}

ISTRUZIONI PER ATTO 3 ("I Soldi"):
Riscrivi l'Atto 3 confrontando l'annuncio con il sito/landing page. Se l'annuncio promette X ma la landing page parla di Y, sottolinea questa incoerenza come causa di spreco budget. Tono: esperto che ha scovato un errore tecnico grave, non accusatorio ma fattuale. Cita i dati reali dell'annuncio.

ISTRUZIONI PER ATTO 4 ("La Soluzione"):
Riscrivi l'Atto 4 facendo riferimento specifico allo spreco Ads scoperto. Il ponte verso il video master deve partire dal problema Ads concreto. Chiudi con: "Ti scrivo qui in chat, a tra poco."

REGOLE:
- Scrivi in prima persona (Alessio, Founder di Karalisweb)
- Tono: diretto, esperto, fattuale
- Cita numeri/frasi reali dagli annunci
- NON inventare dati che non hai
- Output: JSON con campi "atto_3" e "atto_4" (stringhe)`;

    const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const model = client.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const result = await model.generateContent(precisionPrompt);
    const text = result.response.text();

    let parsed: { atto_3: string; atto_4: string };
    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "Risposta Gemini non è JSON valido" },
        { status: 500 }
      );
    }

    if (!parsed.atto_3 || !parsed.atto_4) {
      return NextResponse.json(
        { error: "Risposta Gemini incompleta: mancano atto_3 o atto_4" },
        { status: 500 }
      );
    }

    // Merge: mantieni Atto 1 + 2, sostituisci Atto 3 + 4
    const updatedAnalysis = {
      ...analysis,
      teleprompter_script: {
        ...script,
        atto_3: parsed.atto_3,
        atto_4: parsed.atto_4,
      },
      analysisVersion: "precision-v1",
      precisionAppliedAt: new Date().toISOString(),
    };

    await db.lead.update({
      where: { id },
      data: {
        geminiAnalysis: updatedAnalysis,
      },
    });

    return NextResponse.json({
      success: true,
      atto_3: parsed.atto_3,
      atto_4: parsed.atto_4,
    });
  } catch (error) {
    console.error("[API] gemini-precision error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore precisione Gemini" },
      { status: 500 }
    );
  }
}
