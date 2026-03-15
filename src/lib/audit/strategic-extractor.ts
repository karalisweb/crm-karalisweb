import * as cheerio from "cheerio";

// ==========================================
// TIPI
// ==========================================

export interface StrategicExtractionResult {
  company_name: string;
  home_text: string;
  about_text: string | null;
  services_text: string | null;
  // RESET v3.1: tracking e ads sono separati. Mai confondere GA/GTM con "fare ads"
  tracking_tools_found: string[];  // Solo informativo: GA, GTM, Clarity, ecc.
  // Cliché detector deterministico
  cliche_status: "PASS" | "FAIL" | "ERROR";
  cliches_found: ClicheMatch[];
}

export interface ClicheMatch {
  phrase: string;     // La frase cliché trovata
  tag: string;        // h1, h2, h3, p
  context: string;    // Frase completa dove è stato trovato
}

type CheerioRoot = ReturnType<typeof cheerio.load>;

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
};

const MAX_TEXT_LENGTH = 3000;
const MAX_HTML_SIZE = 5_000_000; // 5 MB

// ==========================================
// CLICHÉ DETECTOR (DETERMINISTICO)
// ==========================================

const CLICHE_PATTERNS: string[] = [
  "leader di settore",
  "leader del settore",
  "360 gradi",
  "a 360 gradi",
  "a 360°",
  "qualità e cortesia",
  "cortesia e qualità",
  "soddisfazione del cliente",
  "soddisfazione cliente",
  "soddisfazione dei clienti",
  "team di esperti",
  "team di professionisti",
  "all'avanguardia",
  "all'avanguardia",
  "avanguardia",
  "professionalità e competenza",
  "competenza e professionalità",
  "professionalità",
  "esperienza pluriennale",
  "anni di esperienza",
  "passione e dedizione",
  "passione per il",
  "soluzioni su misura",
  "soluzioni personalizzate",
  "chiavi in mano",
  "punto di riferimento",
  "siamo specializzati",
  "siamo un'azienda",
  "la nostra mission",
  "al vostro servizio",
  "al tuo servizio",
  "affidabilità e serietà",
  "qualità dei materiali",
  "materiali di prima scelta",
  "garanzia di qualità",
];

interface ClicheDetectionResult {
  status: "PASS" | "FAIL";
  matches: ClicheMatch[];
}

/**
 * Cerca cliché nei tag visibili del DOM.
 * PASS: cliché in H1 OR almeno 2 cliché in h2/h3/p
 * FAIL: nessun cliché trovato
 */
function detectCliches($: CheerioRoot): ClicheDetectionResult {
  const matches: ClicheMatch[] = [];
  const noiseSelectors = "nav, footer, aside, [role='navigation']";

  const isInsideNoise = (el: cheerio.Element): boolean => {
    return $(el).parents(noiseSelectors).length > 0 || $(el).is(noiseSelectors);
  };

  const searchInTag = (tagName: string) => {
    $(tagName).each((_, el) => {
      if (isInsideNoise(el)) return;
      const text = $(el).text().trim().toLowerCase();
      if (text.length < 5) return;

      for (const cliche of CLICHE_PATTERNS) {
        if (text.includes(cliche.toLowerCase())) {
          // Evita duplicati
          const alreadyFound = matches.some(
            (m) => m.phrase === cliche && m.context === text
          );
          if (!alreadyFound) {
            matches.push({
              phrase: cliche,
              tag: tagName,
              context: text.length > 200 ? text.substring(0, 200) + "..." : text,
            });
          }
        }
      }
    });
  };

  searchInTag("h1");
  searchInTag("h2");
  searchInTag("h3");
  searchInTag("p");

  // Logica PASS/FAIL
  const h1Matches = matches.filter((m) => m.tag === "h1");
  const otherMatches = matches.filter((m) => m.tag !== "h1");

  if (h1Matches.length > 0 || otherMatches.length >= 2) {
    return { status: "PASS", matches };
  }

  return { status: "FAIL", matches };
}

// ==========================================
// TRACKING TOOLS DETECTION (solo informativo)
// ==========================================

/**
 * Rileva tool di tracking/analytics installati.
 * NOTA: Questo NON significa che facciano Ads.
 * GA/GTM/Clarity/Hotjar = analytics, NON ads.
 */
function detectTrackingTools(html: string): string[] {
  const found: string[] = [];

  const patterns: Array<{ name: string; regex: RegExp }> = [
    { name: "Google Analytics (GA4)", regex: /gtag\s*\(\s*['"]config['"]\s*,\s*['"]G-|G-[A-Z0-9]{10,}/ },
    { name: "Google Tag Manager", regex: /googletagmanager\.com\/gtm\.js|GTM-[A-Z0-9]{6,}/ },
    { name: "Google Ads Tag", regex: /gtag\s*\(\s*['"]config['"]\s*,\s*['"]AW-|AW-\d{9,}/ },
    { name: "Meta Pixel", regex: /fbq\s*\(\s*['"]init['"]|connect\.facebook\.net.*fbevents\.js/ },
    { name: "LinkedIn Insight", regex: /snap\.licdn\.com|_linkedin_partner_id/ },
    { name: "TikTok Pixel", regex: /analytics\.tiktok\.com|ttq\.load/ },
    { name: "Microsoft Clarity", regex: /clarity\.ms\/tag/ },
    { name: "Hotjar", regex: /static\.hotjar\.com|hotjar\.com\/c\/hotjar/ },
  ];

  for (const { name, regex } of patterns) {
    if (regex.test(html)) {
      found.push(name);
    }
  }

  return found;
}

// ==========================================
// HOME TEXT EXTRACTION
// ==========================================

function extractHomeText($: CheerioRoot): string {
  const parts: string[] = [];
  const noiseTagSelectors = "nav, footer, aside, [role='navigation']";

  const isInsideNoise = (el: cheerio.Element): boolean => {
    return $(el).parents(noiseTagSelectors).length > 0 || $(el).is(noiseTagSelectors);
  };

  // 1. H1
  $("h1").each((_, el) => {
    if (isInsideNoise(el)) return;
    const text = $(el).text().trim();
    if (text && text.length > 3) parts.push(text);
  });

  // 2. H2
  $("h2").each((_, el) => {
    if (isInsideNoise(el)) return;
    const text = $(el).text().trim();
    if (text && text.length > 5) parts.push(text);
  });

  // 3. H3
  $("h3").slice(0, 10).each((_, el) => {
    if (isInsideNoise(el)) return;
    const text = $(el).text().trim();
    if (text && text.length > 5) parts.push(text);
  });

  // 4. Paragrafi (> 20 char)
  $("p").each((_, el) => {
    if (isInsideNoise(el)) return;
    const text = $(el).text().trim();
    if (text && text.length > 20) parts.push(text);
  });

  // 5. Liste
  $("main li, [class*='content'] li, [class*='service'] li, [class*='feature'] li, section li")
    .slice(0, 15)
    .each((_, el) => {
      if (isInsideNoise(el)) return;
      const text = $(el).text().trim();
      if (text && text.length > 15) parts.push(`• ${text}`);
    });

  // 6. Span/div con testo diretto in aree content
  $("main, section, article, [class*='content'], [class*='hero'], [class*='banner'], [class*='intro'], [role='main'], #content, .entry-content")
    .find("span, div, strong, em, blockquote")
    .each((_, el) => {
      if (isInsideNoise(el)) return;
      const $el = $(el);
      const directText = $el.contents().filter((__, node) => node.type === "text").text().trim();
      if (directText && directText.length > 25) parts.push(directText);
    });

  const unique = [...new Set(parts)];
  let result = unique.join("\n\n");

  // Fallback: se sotto 50 char, prendi body pulito
  if (result.trim().length < 50) {
    const bodyClone = $.root().clone();
    bodyClone.find("nav, footer, aside, script, style, noscript, iframe, svg, [class*='cookie'], [class*='popup'], [class*='modal']").remove();
    const bodyText = bodyClone.find("body").text().replace(/\s+/g, " ").trim();
    if (bodyText.length > result.length) {
      result = bodyText;
    }
  }

  return result.length > MAX_TEXT_LENGTH
    ? result.substring(0, MAX_TEXT_LENGTH) + "..."
    : result;
}

// ==========================================
// NAVIGAZIONE PAGINE INTERNE
// ==========================================

function findInternalLink(
  $: CheerioRoot,
  baseUrl: string,
  patterns: RegExp[]
): string | null {
  let foundUrl: string | null = null;

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    const text = $(el).text().trim().toLowerCase();

    if (href.startsWith("mailto:") || href.startsWith("tel:") || href === "#") {
      return;
    }

    const matchesHref = patterns.some((p) => p.test(href));
    const matchesText = patterns.some((p) => p.test(text));

    if (matchesHref || matchesText) {
      try {
        foundUrl = href.startsWith("http")
          ? href
          : new URL(href, baseUrl).toString();
      } catch {
        // URL non valido
      }
      return false;
    }
  });

  return foundUrl;
}

async function fetchAndExtractPageText(url: string): Promise<string | null> {
  try {
    const { validatePublicUrl } = await import("@/lib/url-validator");
    validatePublicUrl(url);
    const response = await fetch(url, {
      signal: AbortSignal.timeout(12000),
      headers: FETCH_HEADERS,
    });

    if (!response.ok) return null;

    const html = await response.text();
    if (html.length > MAX_HTML_SIZE) return null;
    const $ = cheerio.load(html);

    $(
      "nav, footer, aside, script, style, noscript, iframe, svg, " +
      "[class*='sidebar'], [class*='menu'], [class*='cookie'], " +
      "[class*='popup'], [class*='modal'], [class*='header'], [class*='footer']"
    ).remove();

    const parts: string[] = [];

    const contentSelectors = [
      "main", "article", "[class*='content']", "[class*='page']",
      "[role='main']", ".entry-content", "#content",
    ];

    let foundContent = false;
    for (const selector of contentSelectors) {
      const container = $(selector).first();
      if (container.length > 0) {
        container.find("h1, h2, h3, p, li, span, div, strong, blockquote").each((_, el) => {
          const text = $(el).text().trim();
          if (text && text.length > 10) parts.push(text);
        });
        if (parts.length > 0) {
          foundContent = true;
          break;
        }
      }
    }

    if (!foundContent) {
      $("body").find("h1, h2, h3, p, li, span, div")
        .slice(0, 30)
        .each((_, el) => {
          const text = $(el).text().trim();
          if (text && text.length > 10) parts.push(text);
        });
    }

    if (parts.length === 0) {
      const bodyText = $("body").text().replace(/\s+/g, " ").trim();
      if (bodyText.length > 20) parts.push(bodyText);
    }

    if (parts.length === 0) return null;

    const unique = [...new Set(parts)];
    const result = unique.join("\n\n");
    return result.length > MAX_TEXT_LENGTH
      ? result.substring(0, MAX_TEXT_LENGTH) + "..."
      : result;
  } catch {
    return null;
  }
}

// ==========================================
// PAGINE INTERNE
// ==========================================

const ABOUT_PATTERNS = [
  /chi[- ]?siamo/i, /about[- ]?us/i, /\/about\/?$/i,
  /l['\u2019]azienda/i, /la[- ]?nostra[- ]?storia/i,
  /\/company\/?$/i, /\/storia\/?$/i, /who[- ]?we[- ]?are/i,
];

const SERVICES_PATTERNS = [
  /servizi/i, /services/i, /cosa[- ]?facciamo/i,
  /what[- ]?we[- ]?do/i, /soluzioni/i, /solutions/i,
  /\/prodotti\/?$/i, /\/products\/?$/i, /catalogo/i,
  /le[- ]?nostre[- ]?competenze/i, /aree[- ]?di[- ]?intervento/i, /attivit[aà]/i,
];

// ==========================================
// ENTRY POINT
// ==========================================

export async function extractStrategicData(
  html: string,
  baseUrl: string,
  companyName: string
): Promise<StrategicExtractionResult> {
  if (html.length > MAX_HTML_SIZE) {
    throw new Error(`HTML troppo grande (${(html.length / 1_000_000).toFixed(1)}MB, max ${MAX_HTML_SIZE / 1_000_000}MB)`);
  }

  // 1. Tracking tools (solo informativo, MAI usato come "has_active_ads")
  const trackingTools = detectTrackingTools(html);

  // 2. DOM per navigazione
  const $nav = cheerio.load(html);
  $nav("script, style, noscript, iframe, svg").remove();

  const aboutUrl = findInternalLink($nav, baseUrl, ABOUT_PATTERNS);
  const servicesUrl = findInternalLink($nav, baseUrl, SERVICES_PATTERNS);

  // 3. Estrai home text
  const $content = cheerio.load(html);
  $content("script, style, noscript, iframe, svg").remove();
  const home_text = extractHomeText($content);

  // 4. Cliché detection sul DOM pulito
  const clicheResult = detectCliches($content);

  // 5. Scarica About + Services in parallelo
  const [about_text, services_text] = await Promise.all([
    aboutUrl ? fetchAndExtractPageText(aboutUrl) : Promise.resolve(null),
    servicesUrl ? fetchAndExtractPageText(servicesUrl) : Promise.resolve(null),
  ]);

  console.log(
    `[STRATEGIC] ${companyName}: home=${home_text.length}ch, ` +
    `about=${about_text?.length ?? 0}ch, services=${services_text?.length ?? 0}ch, ` +
    `tracking=[${trackingTools.join(", ")}], ` +
    `cliche=${clicheResult.status} (${clicheResult.matches.length} match)`
  );

  return {
    company_name: companyName,
    home_text,
    about_text,
    services_text,
    tracking_tools_found: trackingTools,
    cliche_status: clicheResult.status,
    cliches_found: clicheResult.matches,
  };
}
