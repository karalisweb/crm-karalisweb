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

export const DEFAULT_EMAIL_GEN_PROMPT = `Sei Alessio Loi, fondatore di Karalisweb. Scrivi UNA email di primo contatto a un'azienda, in italiano, come la scriveresti TU a mano — diretta, umana, niente piaggeria e ZERO piglio da venditore.

Obiettivo: apri con UNA o DUE osservazioni CONCRETE e VERE su QUESTA azienda (le trovi in FATTI VERIFICATI qui sotto) e invitala a compilare un breve questionario di pochi minuti, il cui link è: {{QUESTIONARIO}}.

PERCHÉ A LORO CONVIENE COMPILARLO — dillo in modo esplicito nella mail: in base alle LORO risposte, registri TU per loro un video di 2-3 minuti in cui mostri le 2-3 cose concrete che hai notato e in che direzione potrebbero muoversi. Non è un preventivo, non è automatico, non è un commerciale che richiama: è materiale utile a loro a prescindere. Il questionario serve solo a rendere quel video davvero su misura. Il video è la RICOMPENSA del questionario, non un di più.

REGOLE FERREE:
- Corta: massimo ~130 parole.
- UN SOLO link in tutta la mail: il questionario ({{QUESTIONARIO}}). Nessun altro link.
- I "ganci" devono venire SOLO da FATTI VERIFICATI o dai DATI qui sotto. NON inventare MAI nulla. Se FATTI VERIFICATI è vuoto, usa un'osservazione onesta e generica sul settore senza spacciarla per un dato.
- Se tra i fatti risulta che stanno GIÀ investendo in pubblicità (tag Google Ads o Meta Pixel), il taglio è "vedo che state già spendendo in pubblicità, il punto è indirizzare bene quella spesa" — MAI "vi vendo qualcosa da zero".
- NON girare il discorso su di te: VIETATO scrivere che vuoi "essere utile", "aiutarli", "propormi" o offrire "soluzioni". La mail resta su DI LORO e sulla loro direzione.
- NON definirti né definire il tuo lavoro: niente "analisi", "audit", "esperto", "consulente". Parla solo di cose che hai notato e di direzione.
- VIETATE queste parole/frasi: "esservi utile", "potrei aiutarvi", "come posso aiutarvi", "soluzione"/"soluzioni", "propormi", "trasformazione digitale", "soluzione 360"/"a 360", "partner di fiducia", "ROI garantito", "innovativo", "rivoluzionario", "gratis", "offerta". Non ripetere mai le frasi-cliché del prospect.
- Tono: prima persona, diretto, umano. Niente firma (la aggiungo io dopo). Chiudi invitando con gentilezza a compilare il questionario PER ricevere il video.

FATTI VERIFICATI (cose che ho realmente riscontrato su questa azienda — usa i 1-2 più rilevanti, non inventarne altri):
{{VERIFICHE}}

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

/**
 * Costruisce in CODICE l'elenco dei fatti realmente verificati su un lead, a partire
 * dai segnali deterministici dell'audit (strategic-extractor) + dati Google Maps.
 *
 * Perché in codice e non lasciato all'AI: i segnali (tag pubblicitari, cliché, recensioni)
 * sono fatti binari verificati. Passandoli a Gemini come FATTI evitiamo che si inventi
 * "ganci" inesistenti. La mail può citarne più di uno (es. "fate già Google Ads" + "sito
 * pieno di frasi generiche"). Se la lista è vuota, l'AI ripiega su un'osservazione generica.
 */
function buildVerifiedFacts(
  auditData: Record<string, unknown> | null,
  reviewsCount: number | null,
  rating: number | null
): string[] {
  const facts: string[] = [];

  // ── Tracking / pubblicità (segnali di spesa) ──────────────────────────────
  const tracking = Array.isArray(auditData?.tracking_tools_found)
    ? (auditData!.tracking_tools_found as unknown[]).filter(
        (t): t is string => typeof t === "string"
      )
    : [];
  const hasGoogleAds = tracking.some((t) => /google ads/i.test(t));
  const hasMetaPixel = tracking.some((t) => /meta pixel|facebook/i.test(t));
  const hasAnalytics = tracking.some((t) =>
    /analytics|ga4|tag manager|clarity|hotjar|linkedin|tiktok/i.test(t)
  );

  if (hasGoogleAds) {
    facts.push(
      "Sul loro sito è installato il TAG DI CONVERSIONE GOOGLE ADS: stanno già investendo soldi in pubblicità su Google. Il tema non è 'iniziare', ma capire se quella spesa è indirizzata bene."
    );
  }
  if (hasMetaPixel) {
    facts.push(
      "Sul loro sito è attivo il META PIXEL: tracciano i visitatori per campagne / remarketing su Facebook e Instagram (quindi investono, o vogliono investire, su Meta)."
    );
  }
  if (!hasGoogleAds && !hasMetaPixel && hasAnalytics) {
    facts.push(
      "Hanno strumenti di sola misurazione (analytics) ma NESSUN tag pubblicitario: misurano il traffico ma non stanno facendo — o non tracciano — campagne a pagamento."
    );
  }
  if (tracking.length === 0) {
    facts.push(
      "NESSUNO strumento di misurazione sul sito: non sanno quanti visitatori ricevono né da dove arrivano."
    );
  }

  // ── Cliché del loro stesso sito (leva su direzione / posizionamento) ──────
  const cliches = Array.isArray(auditData?.cliches_found)
    ? (auditData!.cliches_found as Array<{ phrase?: unknown }>)
        .map((c) => c?.phrase)
        .filter((p): p is string => typeof p === "string")
    : [];
  if (cliches.length > 0) {
    const sample = [...new Set(cliches)].slice(0, 3).map((p) => `«${p}»`).join(", ");
    facts.push(
      `Il loro sito si descrive con frasi generiche come ${sample}: comunicazione che non li distingue dai concorrenti.`
    );
  }

  // ── Reputazione Google ────────────────────────────────────────────────────
  if (reviewsCount != null && reviewsCount < 20) {
    facts.push(`Solo ${reviewsCount} recensioni Google (poche per farsi scegliere da chi cerca).`);
  }
  if (rating != null && rating > 0 && rating < 4.0) {
    facts.push(`Valutazione Google ${rating}, sotto la soglia psicologica di 4.0.`);
  }

  return facts;
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

  const facts = buildVerifiedFacts(
    auditData,
    lead.googleReviewsCount ?? null,
    lead.googleRating != null ? Number(lead.googleRating) : null
  );
  const verifiche =
    facts.length > 0
      ? facts.map((f) => `- ${f}`).join("\n")
      : "(nessun fatto verificato disponibile: usa un'osservazione onesta e generica sul settore, senza spacciarla per un dato)";

  const template = settings?.emailGenPrompt || DEFAULT_EMAIL_GEN_PROMPT;
  const prompt = template
    .replace(/\{\{AZIENDA\}\}/g, lead.name)
    .replace(/\{\{SETTORE\}\}/g, lead.segment || lead.category || "non specificato")
    .replace(/\{\{RECENSIONI\}\}/g, reviews)
    .replace(/\{\{RATING\}\}/g, rating)
    .replace(/\{\{VERIFICHE\}\}/g, verifiche)
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
