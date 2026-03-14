/**
 * Script standalone per eseguire batch analisi strategica v2.0
 * Esegui: DATABASE_URL="..." GEMINI_API_KEY="..." node scripts/batch-analysis-v2.mjs
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
};

async function main() {
  // Importa dinamicamente i moduli del progetto
  const cheerio = await import("cheerio");
  const { GoogleGenerativeAI, SchemaType } = await import("@google/generative-ai");

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    console.error("❌ GEMINI_API_KEY non configurata!");
    process.exit(1);
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

  // =========================================
  // STRATEGIC EXTRACTOR (inline)
  // =========================================
  function extractHomeText($) {
    const parts = [];
    const noiseTagSelectors = "nav, footer, aside, [role='navigation']";
    const isInsideNoise = (el) => {
      return $(el).parents(noiseTagSelectors).length > 0 || $(el).is(noiseTagSelectors);
    };

    $("h1").each((_, el) => { if (!isInsideNoise(el)) { const t = $(el).text().trim(); if (t && t.length > 3) parts.push(t); }});
    $("h2").each((_, el) => { if (!isInsideNoise(el)) { const t = $(el).text().trim(); if (t && t.length > 5) parts.push(t); }});
    $("h3").slice(0, 10).each((_, el) => { if (!isInsideNoise(el)) { const t = $(el).text().trim(); if (t && t.length > 5) parts.push(t); }});
    $("p").each((_, el) => { if (!isInsideNoise(el)) { const t = $(el).text().trim(); if (t && t.length > 20) parts.push(t); }});
    $("main li, section li, [class*='content'] li, [class*='service'] li").slice(0, 15).each((_, el) => {
      if (!isInsideNoise(el)) { const t = $(el).text().trim(); if (t && t.length > 15) parts.push("• " + t); }
    });
    $("main, section, article, [class*='content'], [class*='hero'], [class*='banner'], [role='main']")
      .find("span, div, strong, blockquote")
      .each((_, el) => {
        if (!isInsideNoise(el)) {
          const dt = $(el).contents().filter((__, node) => node.type === "text").text().trim();
          if (dt && dt.length > 25) parts.push(dt);
        }
      });

    const unique = [...new Set(parts)];
    let result = unique.join("\n\n");

    // Fallback
    if (result.trim().length < 50) {
      const bodyClone = $.root().clone();
      bodyClone.find("nav, footer, aside, script, style, noscript, iframe, svg").remove();
      const bodyText = bodyClone.find("body").text().replace(/\s+/g, " ").trim();
      if (bodyText.length > result.length) result = bodyText;
    }

    return result.length > 3000 ? result.substring(0, 3000) + "..." : result;
  }

  function findInternalLink($, baseUrl, patterns) {
    let foundUrl = null;
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") || "";
      const text = $(el).text().trim().toLowerCase();
      if (href.startsWith("mailto:") || href.startsWith("tel:") || href === "#") return;
      if (patterns.some(p => p.test(href)) || patterns.some(p => p.test(text))) {
        try { foundUrl = href.startsWith("http") ? href : new URL(href, baseUrl).toString(); } catch {}
        return false;
      }
    });
    return foundUrl;
  }

  async function fetchPageText(url) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(12000), headers: FETCH_HEADERS });
      if (!r.ok) return null;
      const html = await r.text();
      const $ = cheerio.load(html);
      $("nav, footer, aside, script, style, noscript, iframe, svg, [class*='cookie'], [class*='popup']").remove();
      const parts = [];
      $("body").find("h1, h2, h3, p, li").slice(0, 30).each((_, el) => {
        const t = $(el).text().trim();
        if (t && t.length > 10) parts.push(t);
      });
      if (parts.length === 0) {
        const bt = $("body").text().replace(/\s+/g, " ").trim();
        if (bt.length > 20) parts.push(bt);
      }
      const unique = [...new Set(parts)];
      const result = unique.join("\n\n");
      return result.length > 3000 ? result.substring(0, 3000) + "..." : result;
    } catch { return null; }
  }

  function detectAds(html, $) {
    const networks = [];
    const patterns = [
      { name: "Google Ads", re: [/AW-\d{9,}/, /googleads\.g\.doubleclick\.net/, /google_conversion/i] },
      { name: "Google Tag Manager", re: [/googletagmanager\.com\/gtm\.js/, /GTM-[A-Z0-9]{6,}/] },
      { name: "Google Analytics", re: [/googletagmanager\.com\/gtag\/js/, /G-[A-Z0-9]{10,}/] },
      { name: "Meta Pixel", re: [/connect\.facebook\.net.*fbevents\.js/, /fbq\s*\(\s*['"]init['"]/, /facebook\.com\/tr/] },
      { name: "LinkedIn Insight", re: [/snap\.licdn\.com/] },
      { name: "TikTok Pixel", re: [/analytics\.tiktok\.com/] },
      { name: "Microsoft Clarity", re: [/clarity\.ms\/tag/] },
      { name: "Hotjar", re: [/static\.hotjar\.com/] },
    ];
    const scriptContent = [];
    $("script[src]").each((_, el) => scriptContent.push($(el).attr("src") || ""));
    $("script:not([src])").each((_, el) => scriptContent.push($(el).html() || ""));
    const all = html + "\n" + scriptContent.join("\n");
    for (const net of patterns) {
      for (const r of net.re) { if (r.test(all)) { networks.push(net.name); break; } }
    }
    return { hasActiveAds: networks.length > 0, networksFound: [...new Set(networks)] };
  }

  const ABOUT_PATTERNS = [/chi[- ]?siamo/i, /about/i, /l['']azienda/i, /la[- ]?nostra[- ]?storia/i, /company/i];
  const SERVICES_PATTERNS = [/servizi/i, /services/i, /cosa[- ]?facciamo/i, /soluzioni/i, /prodotti/i, /catalogo/i];

  // =========================================
  // GEMINI ANALYSIS (inline)
  // =========================================
  const SYSTEM_PROMPT = `Agisci come un Senior Brand Strategist. Il tuo obiettivo è analizzare l'intero ecosistema comunicativo dell'azienda combinando home_text, about_text e services_text. Devi valutare il sito contro questi 3 PATTERN DI ERRORE STRATEGICO:

1. L'Effetto 'Lista della Spesa': Il sito elenca servizi senza un angolo differenziante, rendendo l'azienda una commodity (scelta solo per il prezzo).
2. La Sindrome dell'Ego: Il testo è pieno di 'La nostra azienda', 'Siamo nati nel...', ma non parla mai del problema specifico del cliente.
3. Il Target Fantasma: Non c'è una dichiarazione chiara di CHI è il loro cliente ideale (cercano di vendere a tutti).

Trova il Pattern PIÙ GRAVE ed estrai dal testo una [FRASE CLICHÉ] esatta che lo dimostri. Poi verifica se sono presenti anche gli altri pattern per il 'multi-errore'.

STRUTTURA DEL COPIONE (Genera il testo in prima persona, come se parlasse Alessio, il Founder):

[ATTO 1 - Ghiaccio, Autorità e Anti-Operatività] 'Ciao {company_name}. Rompiamo subito il ghiaccio: sì, questo è un video commerciale, ma ci metto la faccia io come fondatore perché seleziono personalmente gli imprenditori con cui parlare. Lavoro nel digitale da oltre 20 anni e te lo dico subito per togliere ogni dubbio: NON sono qui per venderti un nuovo sito web, una campagnetta social o la gestione SEO. Quelli sono solo strumenti. Io mi occupo di strategia. Ho analizzato il vostro posizionamento e, per usare una metafora culinaria, [INSERIRE QUI UNA METAFORA SUL CUCINARE INGREDIENTI OTTIMI MA SENZA UNA VERA RICETTA].'

[ATTO 2 - La Scena del Crimine (Colpa al Sistema + Multi-Errore)] 'Sono sul vostro sito. È un peccato, perché la vostra azienda è solida, ma siete caduti in una trappola comunissima. È normale, perché purtroppo oggi lo standard del mercato web vi spinge a [INSERIRE IL PATTERN PIÙ GRAVE TROVATO]. Guarda questa frase esatta che avete online: "[INSERISCI FRASE CLICHÉ ESTRATTA]". Se coprissi il vostro logo con quello di un concorrente, funzionerebbe lo stesso. E attenzione, questo è solo il problema principale, perché lo "standard" vi ha portato anche a [CITARE RAPIDAMENTE GLI ALTRI ERRORI TROVATI TRA I 3 PATTERN].'

[ATTO 3 - I Soldi (Condizionale su has_active_ads)] SE has_active_ads è TRUE: 'Dato che state pagando Google/Meta per le Ads, mandare traffico su una pagina che vi fa percepire come gli altri significa letteralmente bruciare budget per far rimbalzare gli utenti e finanziare la guerra dei prezzi.' SE has_active_ads è FALSE: 'Anche se oggi non fate Ads, con queste fondamenta ogni euro che deciderete di investire in futuro per portarvi traffico andrà letteralmente bruciato.'

[ATTO 4 - La Soluzione e Il Ponte verso il Video Master] 'Il problema non siete voi, ma l'assenza di un'architettura logica a monte. È esattamente quello che costruiamo in Karalisweb con il nostro Metodo Strategico Digitale (MSD), che applico da anni sulle PMI. Per mostrarti di cosa si tratta senza farti perdere tempo, ho attaccato subito dopo questa mia analisi una breve presentazione video che spiega come funziona l'MSD e come ferma lo spreco di budget. Guardala, dura pochissimo. Ti scrivo qui in chat, a tra poco.'`;

  const RESPONSE_SCHEMA = {
    type: SchemaType.OBJECT,
    properties: {
      cliche_found: { type: SchemaType.STRING, description: "La frase esatta estratta dal sito" },
      primary_error_pattern: { type: SchemaType.STRING, description: "Pattern principale: Lista della Spesa, Sindrome dell'Ego, o Target Fantasma" },
      teleprompter_script: {
        type: SchemaType.OBJECT,
        properties: {
          atto_1: { type: SchemaType.STRING },
          atto_2: { type: SchemaType.STRING },
          atto_3: { type: SchemaType.STRING },
          atto_4: { type: SchemaType.STRING },
        },
        required: ["atto_1", "atto_2", "atto_3", "atto_4"],
      },
      strategic_note: { type: SchemaType.STRING, description: "Nota interna" },
    },
    required: ["cliche_found", "primary_error_pattern", "teleprompter_script", "strategic_note"],
  };

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json", responseSchema: RESPONSE_SCHEMA },
    systemInstruction: SYSTEM_PROMPT,
  });

  // =========================================
  // MAIN BATCH LOOP
  // =========================================
  const leads = await db.lead.findMany({
    where: { website: { not: null } },
    select: { id: true, name: true, website: true },
    orderBy: { createdAt: "desc" },
  });

  console.log(`\n=== BATCH ANALISI STRATEGICA v2.0 ===`);
  console.log(`Lead con sito: ${leads.length}`);
  console.log(`====================================\n`);

  let ok = 0, errors = 0, skipped = 0;

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    const idx = `[${i + 1}/${leads.length}]`;

    try {
      let url = lead.website;
      if (!url.startsWith("http://") && !url.startsWith("https://")) url = "https://" + url;

      // Fetch HTML
      let html;
      try {
        const r = await fetch(url, { signal: AbortSignal.timeout(15000), headers: FETCH_HEADERS });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        html = await r.text();
      } catch (e) {
        console.log(`${idx} ❌ ${lead.name} — Fetch: ${e.message}`);
        errors++;
        continue;
      }

      const baseUrl = new URL(url).origin;
      const $raw = cheerio.load(html);
      const ads = detectAds(html, $raw);

      const $nav = cheerio.load(html);
      $nav("script, style, noscript, iframe, svg").remove();
      const aboutUrl = findInternalLink($nav, baseUrl, ABOUT_PATTERNS);
      const servicesUrl = findInternalLink($nav, baseUrl, SERVICES_PATTERNS);

      const $content = cheerio.load(html);
      $content("script, style, noscript, iframe, svg").remove();
      const home_text = extractHomeText($content);

      const [about_text, services_text] = await Promise.all([
        aboutUrl ? fetchPageText(aboutUrl) : null,
        servicesUrl ? fetchPageText(servicesUrl) : null,
      ]);

      const total = [home_text, about_text, services_text].filter(Boolean).join(" ").trim();
      if (total.length < 10) {
        console.log(`${idx} ❌ ${lead.name} — Testo insufficiente (${total.length}ch)`);
        errors++;
        continue;
      }

      const finalHomeText = home_text && home_text.trim().length >= 10
        ? home_text
        : (about_text || services_text || "");

      console.log(`${idx} 🔄 ${lead.name} — home=${home_text.length}ch about=${about_text?.length ?? 0}ch services=${services_text?.length ?? 0}ch ads=${ads.networksFound.join(",") || "NONE"}`);

      // Gemini
      const userPrompt = JSON.stringify({
        company_name: lead.name,
        home_text: finalHomeText,
        about_text,
        services_text,
        has_active_ads: ads.hasActiveAds,
      });

      const result = await model.generateContent(userPrompt);
      const text = result.response.text();
      const parsed = JSON.parse(text);

      if (!parsed.teleprompter_script || !parsed.cliche_found) {
        throw new Error("Risposta Gemini incompleta");
      }

      const analysis = {
        ...parsed,
        has_active_ads: ads.hasActiveAds,
        ads_networks_found: ads.networksFound,
        generatedAt: new Date().toISOString(),
        model: "gemini-2.5-flash",
        analysisVersion: "2.0",
      };

      await db.lead.update({
        where: { id: lead.id },
        data: {
          geminiAnalysis: analysis,
          geminiAnalyzedAt: new Date(),
        },
      });

      console.log(`${idx} ✅ ${lead.name} — Pattern: ${parsed.primary_error_pattern}`);
      ok++;

      // Pausa 2 sec
      await new Promise(r => setTimeout(r, 2000));

    } catch (e) {
      console.log(`${idx} ❌ ${lead.name} — ${e.message}`);
      errors++;
    }
  }

  console.log(`\n====================================`);
  console.log(`RISULTATI:`);
  console.log(`  ✅ Successi: ${ok}`);
  console.log(`  ❌ Errori:   ${errors}`);
  console.log(`  ⏭  Skip:     ${skipped}`);
  console.log(`  📊 Totale:   ${leads.length}`);
  console.log(`====================================\n`);

  await db.$disconnect();
}

main().catch(e => {
  console.error("Fatal:", e);
  process.exit(1);
});
