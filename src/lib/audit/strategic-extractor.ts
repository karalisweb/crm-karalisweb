import * as cheerio from "cheerio";

export interface StrategicExtractionResult {
  company_name: string;
  hero_text: string;
  about_us_text: string | null;
  has_active_ads: boolean;
}

/**
 * Estrae il testo visibile "Above the Fold" (H1, H2, paragrafi iniziali)
 */
function extractHeroText($: ReturnType<typeof cheerio.load>): string {
  const parts: string[] = [];

  // H1
  $("h1").each((_, el) => {
    const text = $(el).text().trim();
    if (text) parts.push(text);
  });

  // H2 (primi 3)
  $("h2").slice(0, 3).each((_, el) => {
    const text = $(el).text().trim();
    if (text) parts.push(text);
  });

  // Paragrafi nella prima sezione / hero area
  // Cerca in header, hero, banner, main > first section, o i primi paragrafi del body
  const heroSelectors = [
    "header p",
    "[class*='hero'] p",
    "[class*='Hero'] p",
    "[class*='banner'] p",
    "[class*='Banner'] p",
    "[class*='jumbotron'] p",
    "[id*='hero'] p",
    "main > section:first-of-type p",
    "main > div:first-of-type p",
  ];

  for (const selector of heroSelectors) {
    $(selector).slice(0, 3).each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 10) parts.push(text);
    });
    if (parts.length > 3) break;
  }

  // Fallback: se non abbiamo trovato abbastanza testo, prendi i primi paragrafi del body
  if (parts.length < 2) {
    $("body p").slice(0, 5).each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 20) parts.push(text);
    });
  }

  return parts.join("\n\n");
}

/**
 * Cerca la pagina "Chi Siamo" / "About" e ne estrae il testo
 */
async function extractAboutUsText(
  $: ReturnType<typeof cheerio.load>,
  baseUrl: string
): Promise<string | null> {
  // Cerca link a pagine "chi siamo" / "about"
  const aboutPatterns = [
    /chi[- ]?siamo/i,
    /about[- ]?us/i,
    /about/i,
    /l['\u2019]azienda/i,
    /la[- ]?nostra[- ]?storia/i,
    /company/i,
    /who[- ]?we[- ]?are/i,
  ];

  let aboutUrl: string | null = null;

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    const text = $(el).text().trim().toLowerCase();

    // Controlla sia l'href che il testo del link
    const matchesHref = aboutPatterns.some((p) => p.test(href));
    const matchesText = aboutPatterns.some((p) => p.test(text));

    if (matchesHref || matchesText) {
      try {
        aboutUrl = href.startsWith("http")
          ? href
          : new URL(href, baseUrl).toString();
      } catch {
        // URL non valido, ignora
      }
      return false; // break
    }
  });

  if (!aboutUrl) return null;

  try {
    const response = await fetch(aboutUrl, {
      signal: AbortSignal.timeout(10000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    });

    if (!response.ok) return null;

    const aboutHtml = await response.text();
    const $about = cheerio.load(aboutHtml);

    // Rimuovi nav, footer, sidebar per pulire il contenuto
    $about("nav, footer, aside, [class*='sidebar'], [class*='menu'], script, style").remove();

    // Estrai il testo principale della pagina about
    const parts: string[] = [];

    $about("main, article, [class*='content'], [class*='about'], [role='main']")
      .first()
      .find("h1, h2, h3, p, li")
      .each((_, el) => {
        const text = $about(el).text().trim();
        if (text && text.length > 10) parts.push(text);
      });

    // Fallback: prendi dal body direttamente
    if (parts.length === 0) {
      $about("body")
        .find("h1, h2, p")
        .slice(0, 10)
        .each((_, el) => {
          const text = $about(el).text().trim();
          if (text && text.length > 10) parts.push(text);
        });
    }

    const result = parts.join("\n\n");
    // Limita a ~2000 caratteri per non sovraccaricare il prompt
    return result.length > 2000 ? result.substring(0, 2000) + "..." : result;
  } catch {
    return null;
  }
}

/**
 * Rileva se ci sono pixel Meta o tag Google Ads attivi
 */
function detectActiveAds(html: string): boolean {
  // Facebook/Meta Pixel
  const hasMetaPixel =
    /fbq\s*\(\s*['"]init['"]/.test(html) ||
    /connect\.facebook\.net.*fbevents\.js/.test(html);

  // Google Ads tag
  const hasGoogleAds =
    /AW-\d{9,}/.test(html) ||
    /googleads\.g\.doubleclick\.net/.test(html);

  return hasMetaPixel || hasGoogleAds;
}

/**
 * Estrazione strategica: testo visibile + ads detection
 * Sostituisce il vecchio audit tecnico per alimentare Gemini
 */
export async function extractStrategicData(
  html: string,
  baseUrl: string,
  companyName: string
): Promise<StrategicExtractionResult> {
  const $ = cheerio.load(html);

  // Rimuovi elementi non visibili
  $("script, style, noscript, iframe, svg").remove();

  const hero_text = extractHeroText($);
  const about_us_text = await extractAboutUsText($, baseUrl);
  const has_active_ads = detectActiveAds(html);

  return {
    company_name: companyName,
    hero_text,
    about_us_text,
    has_active_ads,
  };
}
