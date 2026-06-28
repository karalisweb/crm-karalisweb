import { db } from "@/lib/db";
import { getGeminiClient } from "@/lib/gemini";
import { checkCopy } from "@/lib/copy-guard";

/**
 * Generazione AI della MAIL 1 (primo contatto): parte da UN gancio di dolore vero e
 * invita a compilare un breve QUESTIONARIO (self-assessment). NON propone il video:
 * il video è il primo passo del trattamento CALDO, non della sequenza fredda.
 *
 * Il testo NON è fisso: lo scrive l'AI su misura per ogni azienda, scegliendo UN
 * solo "gancio" concreto e VERO dai dati reali (recensioni, valutazione, testo
 * del sito). Le istruzioni (prompt) sono modificabili da Impostazioni.
 *
 * UN SOLO link in tutta la mail: il questionario ({{QUESTIONARIO}}) — più link da
 * dominio giovane peggiorano la deliverability.
 *
 * L'oggetto NON è qui: arriva dalla lista oggetti a rotazione (deliverability).
 * Qui si produce solo { body, hook }.
 */

export const DEFAULT_EMAIL_GEN_PROMPT = `Sei Alessio Loi, fondatore di Karalisweb. Scrivi UNA email di primo contatto a un'azienda, in italiano, calda e personale — come la scriveresti tu a mano, non come un venditore.

Obiettivo: parti da UNA cosa concreta e vera che hai notato su questa azienda (il "gancio di dolore") e invitala a compilare un breve questionario di pochi minuti, il cui link è: {{QUESTIONARIO}}. Serve a TE per capire in che direzione vogliono portare l'azienda prima di dire se e come puoi aiutarli. NON proporre un video. NON vendere, NON nominare prezzi.

REGOLE FERREE:
- Corta: massimo ~120 parole.
- UN SOLO link in tutta la mail: il questionario ({{QUESTIONARIO}}). Nessun altro link.
- Inserisci UN SOLO "gancio" concreto e VERO su QUESTA azienda, preso SOLO dai DATI qui sotto (poche recensioni, valutazione bassa, o qualcosa nel testo del loro sito). NON inventare MAI nulla. Se non c'è un gancio chiaro, usa un'osservazione onesta e generica sul settore.
- Parla di DIREZIONE, non di "analisi" o "audit" del sito (non definirti così).
- VIETATE queste parole/frasi: "trasformazione digitale", "soluzione 360"/"a 360", "partner di fiducia", "ROI garantito", "innovativo", "rivoluzionario", "gratis", "offerta". Non ripetere mai frasi-cliché del prospect.
- Tono: prima persona, diretto, umano. Niente firma (la aggiungo io dopo). Chiudi invitando gentilmente a compilare il questionario.

DATI AZIENDA:
- Nome: {{AZIENDA}}
- Settore: {{SETTORE}}
- Recensioni Google: {{RECENSIONI}} — valutazione {{RATING}}
- Testo dal loro sito (estratto): {{TESTO_SITO}}

Rispondi SOLO con questo JSON, niente altro testo prima o dopo:
{"gancio": "il gancio concreto, in una frase", "testo": "il corpo della mail, senza oggetto e senza firma"}`;

export interface OutreachEmailDraft {
  body: string;
  hook: string;
}

export async function generateOutreachEmail(leadId: string): Promise<OutreachEmailDraft> {
  const lead = await db.lead.findUnique({
    where: { id: leadId },
    select: {
      id: true,
      name: true,
      segment: true,
      category: true,
      googleRating: true,
      googleReviewsCount: true,
      auditData: true,
    },
  });
  if (!lead) throw new Error("Lead non trovato");

  const client = getGeminiClient();
  if (!client) throw new Error("Gemini non configurato");

  const settings = await db.settings.findUnique({
    where: { id: "default" },
    select: { emailGenPrompt: true, sdLandingUrl: true, alessioLinkedinUrl: true, questionnaireUrl: true },
  });

  const auditData = lead.auditData as Record<string, unknown> | null;
  const siteText =
    auditData && typeof auditData.home_text === "string"
      ? (auditData.home_text as string).slice(0, 1200)
      : "(non disponibile)";

  const reviews =
    lead.googleReviewsCount != null ? String(lead.googleReviewsCount) : "non disponibile";
  const rating =
    lead.googleRating != null ? String(Number(lead.googleRating)) : "non disponibile";

  const template = settings?.emailGenPrompt || DEFAULT_EMAIL_GEN_PROMPT;
  const prompt = template
    .replace(/\{\{AZIENDA\}\}/g, lead.name)
    .replace(/\{\{SETTORE\}\}/g, lead.segment || lead.category || "non specificato")
    .replace(/\{\{RECENSIONI\}\}/g, reviews)
    .replace(/\{\{RATING\}\}/g, rating)
    .replace(/\{\{TESTO_SITO\}\}/g, siteText)
    .replace(/\{\{QUESTIONARIO\}\}/g, settings?.questionnaireUrl || "")
    .replace(/\{\{LINKEDIN\}\}/g, settings?.alessioLinkedinUrl || "")
    .replace(
      /\{\{METODO\}\}/g,
      settings?.sdLandingUrl || "https://www.karalisweb.net/web-marketing"
    );

  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const model = client.getGenerativeModel({ model: modelName });

  const result = await Promise.race([
    model.generateContent(prompt),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Timeout: nessuna risposta in 30 secondi")), 30_000)
    ),
  ]);

  const raw = result.response.text().trim();
  const parsed = parseDraft(raw);
  const body = (parsed.testo || "").trim();
  const hook = (parsed.gancio || "").trim();
  if (!body) throw new Error("L'AI non ha prodotto il testo della mail");

  // Filtro "Carta": segnala (non blocca) eventuali termini vietati sfuggiti all'AI.
  const guard = checkCopy(body);
  if (!guard.ok) {
    console.warn(
      `[copy-guard] ${lead.name}: termini vietati nella mail → ${guard.violations
        .map((v) => `"${v.match}"`)
        .join(", ")}`
    );
  }

  return { body, hook };
}

function parseDraft(raw: string): { gancio?: string; testo?: string } {
  let t = raw.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "").trim();
  }
  try {
    return JSON.parse(t);
  } catch {
    const m = t.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        /* ignore */
      }
    }
    return { testo: raw };
  }
}
