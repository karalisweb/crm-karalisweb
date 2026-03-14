import * as cheerio from "cheerio";

// ==========================================
// TIPI
// ==========================================

export interface StrategicExtractionResult {
  company_name: string;
  home_text: string;
  about_text: string | null;
  services_text: string | null;
  has_active_ads: boolean;
  ads_networks_found: string[];
}

type CheerioRoot = ReturnType<typeof cheerio.load>;

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
};

const MAX_TEXT_LENGTH = 3000;

// ==========================================
// HOME TEXT (Deep - non solo hero)
// ==========================================

function extractHomeText($: CheerioRoot): string {
  // NOTA: NON rimuoviamo nav/footer qui per non mutare il DOM
  // Lavoriamo su un clone o selezioniamo solo il contenuto principale

  const parts: string[] = [];

  // Selettori per ignorare noise (senza rimuoverli dal DOM)
  const noiseSelectors =
    "nav, footer, aside, [class*='sidebar'], [class*='menu'], [class*='cookie'], [class*='popup'], [class*='modal'], [class*='nav'], [role='navigation']";

  // Funzione helper: prendi testo solo se NON è dentro noise
  const isInsideNoise = (el: cheerio.Element): boolean => {
    return $(el).parents(noiseSelectors).length > 0 || $(el).is(noiseSelectors);
  };

  // 1. Tutti gli H1 (claim principale)
  $("h1").each((_, el) => {
    if (isInsideNoise(el)) return;
    const text = $(el).text().trim();
    if (text && text.length > 3) parts.push(text);
  });

  // 2. Tutti gli H2 (sezioni pagina)
  $("h2").each((_, el) => {
    if (isInsideNoise(el)) return;
    const text = $(el).text().trim();
    if (text && text.length > 5) parts.push(text);
  });

  // 3. H3 (sotto-sezioni rilevanti)
  $("h3").slice(0, 10).each((_, el) => {
    if (isInsideNoise(el)) return;
    const text = $(el).text().trim();
    if (text && text.length > 5) parts.push(text);
  });

  // 4. Paragrafi significativi (> 20 char per evitare label/button)
  $("p").each((_, el) => {
    if (isInsideNoise(el)) return;
    const text = $(el).text().trim();
    if (text && text.length > 20) parts.push(text);
  });

  // 5. Liste descrittive (servizi elencati in li)
  $("main li, [class*='content'] li, [class*='service'] li, [class*='feature'] li, section li")
    .slice(0, 15)
    .each((_, el) => {
      if (isInsideNoise(el)) return;
      const text = $(el).text().trim();
      if (text && text.length > 15) parts.push(`• ${text}`);
    });

  // 6. Span e div con testo diretto significativo (per SPA/Wix/React)
  $("main, section, article, [class*='content'], [class*='hero'], [class*='banner'], [class*='intro'], [role='main'], #content, .entry-content")
    .find("span, div, strong, em, blockquote")
    .each((_, el) => {
      if (isInsideNoise(el)) return;
      const $el = $(el);
      // Solo testo diretto (non dei figli per evitare duplicati)
      const directText = $el.contents().filter((__, node) => node.type === "text").text().trim();
      if (directText && directText.length > 25) parts.push(directText);
    });

  // Deduplica e tronca
  const unique = [...new Set(parts)];
  let result = unique.join("\n\n");

  // === FALLBACK AGGRESSIVO ===
  // Se meno di 50 caratteri estratti, prendi TUTTO il testo visibile del body
  if (result.trim().length < 50) {
    const bodyClone = $.root().clone();
    bodyClone.find("nav, footer, aside, script, style, noscript, iframe, svg, [class*='cookie'], [class*='popup'], [class*='modal']").remove();
    const bodyText = bodyClone.find("body").text()
      .replace(/\s+/g, " ")
      .trim();
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

/**
 * Cerca un link interno che matchi i pattern forniti.
 * Controlla sia href che testo del link.
 */
function findInternalLink(
  $: CheerioRoot,
  baseUrl: string,
  patterns: RegExp[]
): string | null {
  let foundUrl: string | null = null;

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    const text = $(el).text().trim().toLowerCase();

    // Ignora link esterni, anchor, mailto, tel
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
      return false; // break
    }
  });

  return foundUrl;
}

/**
 * Scarica una pagina e ne estrae il testo visibile principale.
 */
async function fetchAndExtractPageText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(12000),
      headers: FETCH_HEADERS,
    });

    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);

    // Rimuovi noise
    $(
      "nav, footer, aside, script, style, noscript, iframe, svg, " +
      "[class*='sidebar'], [class*='menu'], [class*='cookie'], " +
      "[class*='popup'], [class*='modal'], [class*='header'], [class*='footer']"
    ).remove();

    const parts: string[] = [];

    // Cerca nel contenuto principale
    const contentSelectors = [
      "main",
      "article",
      "[class*='content']",
      "[class*='page']",
      "[role='main']",
      ".entry-content",
      "#content",
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

    // Fallback: body diretto
    if (!foundContent) {
      $("body")
        .find("h1, h2, h3, p, li, span, div")
        .slice(0, 30)
        .each((_, el) => {
          const text = $(el).text().trim();
          if (text && text.length > 10) parts.push(text);
        });
    }

    // Fallback estremo: tutto il testo del body
    if (parts.length === 0) {
      const bodyText = $("body").text().replace(/\s+/g, " ").trim();
      if (bodyText.length > 20) {
        parts.push(bodyText);
      }
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
// ABOUT PAGE
// ==========================================

const ABOUT_PATTERNS = [
  /chi[- ]?siamo/i,
  /about[- ]?us/i,
  /\/about\/?$/i,
  /l['\u2019]azienda/i,
  /la[- ]?nostra[- ]?storia/i,
  /\/company\/?$/i,
  /\/storia\/?$/i,
  /who[- ]?we[- ]?are/i,
];

async function extractAboutText(
  $: CheerioRoot,
  baseUrl: string
): Promise<string | null> {
  const aboutUrl = findInternalLink($, baseUrl, ABOUT_PATTERNS);
  if (!aboutUrl) return null;
  return fetchAndExtractPageText(aboutUrl);
}

// ==========================================
// SERVICES PAGE
// ==========================================

const SERVICES_PATTERNS = [
  /servizi/i,
  /services/i,
  /cosa[- ]?facciamo/i,
  /what[- ]?we[- ]?do/i,
  /soluzioni/i,
  /solutions/i,
  /\/prodotti\/?$/i,
  /\/products\/?$/i,
  /catalogo/i,
  /le[- ]?nostre[- ]?competenze/i,
  /aree[- ]?di[- ]?intervento/i,
  /attivit[aà]/i,
];

async function extractServicesText(
  $: CheerioRoot,
  baseUrl: string
): Promise<string | null> {
  const servicesUrl = findInternalLink($, baseUrl, SERVICES_PATTERNS);
  if (!servicesUrl) return null;
  return fetchAndExtractPageText(servicesUrl);
}

// ==========================================
// ADS DETECTION (Deep - script + network patterns)
// ==========================================

interface AdsDetectionResult {
  hasActiveAds: boolean;
  networksFound: string[];
}

/**
 * Deep check per ads: analizza script src, inline scripts, e noscript.
 * Intercetta tutti i pattern noti di tracking/ads networks.
 */
function detectActiveAds(html: string, $: CheerioRoot): AdsDetectionResult {
  const networksFound: string[] = [];

  // Pattern di ads/tracking networks con nome leggibile
  const adsPatterns: Array<{ name: string; patterns: RegExp[] }> = [
    {
      name: "Google Ads (gtag)",
      patterns: [
        /gtag\s*\(\s*['"]config['"]\s*,\s*['"]AW-/,
        /AW-\d{9,}/,
        /googleads\.g\.doubleclick\.net/,
        /google_conversion/i,
      ],
    },
    {
      name: "Google Tag Manager",
      patterns: [
        /googletagmanager\.com\/gtm\.js/,
        /GTM-[A-Z0-9]{6,}/,
      ],
    },
    {
      name: "Google Analytics (gtag.js)",
      patterns: [
        /googletagmanager\.com\/gtag\/js/,
        /gtag\s*\(\s*['"]config['"]\s*,\s*['"]G-/,
        /G-[A-Z0-9]{10,}/,
      ],
    },
    {
      name: "Meta Pixel",
      patterns: [
        /connect\.facebook\.net.*fbevents\.js/,
        /fbq\s*\(\s*['"]init['"]/,
        /facebook\.com\/tr/,
      ],
    },
    {
      name: "LinkedIn Insight",
      patterns: [
        /snap\.licdn\.com/,
        /linkedin\.com\/px/,
        /\_linkedin_partner_id/,
      ],
    },
    {
      name: "TikTok Pixel",
      patterns: [
        /analytics\.tiktok\.com/,
        /ttq\.load/,
      ],
    },
    {
      name: "Microsoft Clarity",
      patterns: [
        /clarity\.ms\/tag/,
        /clarity\.ms\/s/,
      ],
    },
    {
      name: "Hotjar",
      patterns: [
        /static\.hotjar\.com/,
        /hotjar\.com\/c\/hotjar/,
        /hj\s*\(\s*['"]/,
      ],
    },
    {
      name: "Twitter/X Pixel",
      patterns: [
        /static\.ads-twitter\.com/,
        /t\.co\/i\/adsct/,
      ],
    },
    {
      name: "Pinterest Tag",
      patterns: [
        /pintrk\s*\(/,
        /ct\.pinterest\.com/,
      ],
    },
  ];

  // Raccogli tutto il contenuto scriptabile
  const scriptSources: string[] = [];

  // 1. Script src attributes
  $("script[src]").each((_, el) => {
    const src = $(el).attr("src") || "";
    scriptSources.push(src);
  });

  // 2. Inline script content
  $("script:not([src])").each((_, el) => {
    const content = $(el).html() || "";
    scriptSources.push(content);
  });

  // 3. Noscript (spesso contiene pixel img)
  $("noscript").each((_, el) => {
    const content = $(el).html() || "";
    scriptSources.push(content);
  });

  // 4. Img src (pixel di tracciamento come <img src="...facebook.com/tr...">)
  $("img[src]").each((_, el) => {
    const src = $(el).attr("src") || "";
    if (src.includes("facebook.com") || src.includes("doubleclick") || src.includes("google")) {
      scriptSources.push(src);
    }
  });

  // Unisci tutto per la ricerca
  const allContent = html + "\n" + scriptSources.join("\n");

  // Testa ogni network
  for (const network of adsPatterns) {
    for (const pattern of network.patterns) {
      if (pattern.test(allContent)) {
        networksFound.push(network.name);
        break; // Trovato questo network, passa al prossimo
      }
    }
  }

  return {
    hasActiveAds: networksFound.length > 0,
    networksFound: [...new Set(networksFound)],
  };
}

// ==========================================
// ENTRY POINT
// ==========================================

/**
 * Deep extraction strategica:
 * 1. Scarica e analizza Home (testo completo, non solo hero)
 * 2. Cerca e scarica pagina Chi Siamo
 * 3. Cerca e scarica pagina Servizi
 * 4. Deep check ads su script src + inline + noscript + img pixel
 *
 * ORDINE CRITICO:
 * - Prima cerchiamo i link interni (About/Servizi) sul DOM PULITO ma COMPLETO (nav inclusa!)
 * - Poi estraiamo il testo della home (filtrando nav/footer via selettori, non rimuovendoli)
 */
export async function extractStrategicData(
  html: string,
  baseUrl: string,
  companyName: string
): Promise<StrategicExtractionResult> {
  // === 1. Ads detection sul DOM grezzo (inclusi script) ===
  const $raw = cheerio.load(html);
  const adsResult = detectActiveAds(html, $raw);

  // === 2. DOM per navigazione: rimuovi solo script/style, ma MANTIENI nav/footer ===
  const $nav = cheerio.load(html);
  $nav("script, style, noscript, iframe, svg").remove();

  // === 3. Cerca link About + Services PRIMA di toccare nav ===
  const aboutUrl = findInternalLink($nav, baseUrl, ABOUT_PATTERNS);
  const servicesUrl = findInternalLink($nav, baseUrl, SERVICES_PATTERNS);

  // === 4. Estrai home text (usa filtro per noise, non rimozione) ===
  const $content = cheerio.load(html);
  $content("script, style, noscript, iframe, svg").remove();
  const home_text = extractHomeText($content);

  // === 5. Scarica About + Services in parallelo ===
  const [about_text, services_text] = await Promise.all([
    aboutUrl ? fetchAndExtractPageText(aboutUrl) : Promise.resolve(null),
    servicesUrl ? fetchAndExtractPageText(servicesUrl) : Promise.resolve(null),
  ]);

  console.log(
    `[STRATEGIC] ${companyName}: home=${home_text.length}ch, ` +
    `about=${about_text?.length ?? 0}ch (${aboutUrl ?? "no link"}), ` +
    `services=${services_text?.length ?? 0}ch (${servicesUrl ?? "no link"}), ` +
    `ads=${adsResult.networksFound.length > 0 ? adsResult.networksFound.join(", ") : "NONE"}`
  );

  return {
    company_name: companyName,
    home_text,
    about_text,
    services_text,
    has_active_ads: adsResult.hasActiveAds,
    ads_networks_found: adsResult.networksFound,
  };
}
