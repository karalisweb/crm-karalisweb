import * as cheerio from "cheerio";
import type { SEOAudit } from "@/types";

// Verifica se il meta title è ottimizzato per SEO
function isMetaTitleOptimized(title: string | null, companyName?: string): {
  isOptimized: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (!title) {
    return { isOptimized: false, issues: ["Meta title mancante"] };
  }

  const titleLength = title.length;

  // Check lunghezza (ottimale 50-60 caratteri)
  if (titleLength < 30) {
    issues.push("Title troppo corto (< 30 caratteri)");
  } else if (titleLength > 60) {
    issues.push("Title troppo lungo (> 60 caratteri, verrà tagliato su Google)");
  }

  // Check se è solo il nome dell'azienda (senza keywords)
  const titleLower = title.toLowerCase();
  const commonWords = ["home", "homepage", "benvenuto", "welcome", "pagina principale"];
  const isJustCompanyName = commonWords.some(w => titleLower.includes(w)) || titleLength < 25;

  // Se il title contiene separatori come | - : probabilmente ha keywords
  const hasSeparators = /[|–—:\-]/.test(title);

  if (!hasSeparators && isJustCompanyName) {
    issues.push("Title generico (solo nome azienda, mancano keywords)");
  }

  return {
    isOptimized: issues.length === 0,
    issues,
  };
}

// Verifica se il sito è mobile-friendly senza PageSpeed API
function checkMobileFriendly(html: string, $: ReturnType<typeof cheerio.load>): {
  isMobileFriendly: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // 1. Check viewport meta tag
  const viewport = $('meta[name="viewport"]').attr("content") || "";
  if (!viewport) {
    issues.push("Manca meta viewport");
  } else {
    // Verifica che contenga width=device-width
    if (!viewport.includes("width=device-width")) {
      issues.push("Viewport non responsive (manca width=device-width)");
    }
  }

  // 2. Check per layout non responsive
  // Cerca elementi con width fisso in pixel inline
  const elementsWithFixedWidth = $('[style*="width"]').filter((_, el) => {
    const style = $(el).attr("style") || "";
    // Cerca width: XXXpx dove XXX > 400 (probabile layout fisso)
    const widthMatch = style.match(/width\s*:\s*(\d+)px/i);
    if (widthMatch && parseInt(widthMatch[1]) > 400) {
      return true;
    }
    return false;
  });

  if (elementsWithFixedWidth.length > 3) {
    issues.push("Molti elementi con larghezza fissa (possibile layout non responsive)");
  }

  // 3. Check per tabelle usate per layout
  const layoutTables = $("table").filter((_, el) => {
    // Se la tabella contiene div, p, form è probabilmente usata per layout
    const hasLayoutElements = $(el).find("div, form, section, article").length > 0;
    // Se la tabella è molto larga
    const width = $(el).attr("width");
    const isWide = width ? parseInt(width) > 600 : false;
    return hasLayoutElements || isWide;
  });

  if (layoutTables.length > 0) {
    issues.push("Tabelle usate per layout (non responsive)");
  }

  // 4. Check font size - cerca font-size inline molto piccoli
  const smallFonts = $('[style*="font-size"]').filter((_, el) => {
    const style = $(el).attr("style") || "";
    const sizeMatch = style.match(/font-size\s*:\s*(\d+)px/i);
    if (sizeMatch && parseInt(sizeMatch[1]) < 12) {
      return true;
    }
    return false;
  });

  if (smallFonts.length > 5) {
    issues.push("Font troppo piccoli per mobile");
  }

  // 5. Check per Flash o tecnologie obsolete
  if ($("object, embed, applet").length > 0) {
    issues.push("Contiene Flash o plugin obsoleti (non funzionano su mobile)");
  }

  // 6. Check per framework responsive
  const hasBootstrap = html.includes("bootstrap") || $('[class*="col-"]').length > 0;
  const hasTailwind = html.includes("tailwind") || $('[class*="sm:"], [class*="md:"], [class*="lg:"]').length > 0;
  const hasFoundation = html.includes("foundation");
  const hasResponsiveClasses = $('[class*="responsive"], [class*="mobile"]').length > 0;

  const likelyResponsive = hasBootstrap || hasTailwind || hasFoundation || hasResponsiveClasses;

  // Se non usa framework responsive E ha problemi, probabilmente non è mobile friendly
  if (!likelyResponsive && issues.length > 0) {
    issues.push("Non usa framework CSS responsive");
  }

  // Considera mobile friendly se ha viewport corretto e max 1 issue minore
  const isMobileFriendly = viewport.includes("width=device-width") && issues.length <= 1;

  return {
    isMobileFriendly,
    issues,
  };
}

export async function checkSEO(html: string, baseUrl: string): Promise<Partial<SEOAudit> & {
  metaTitleOptimized?: boolean;
  metaTitleIssues?: string[];
  mobileFriendly?: boolean;
  mobileIssues?: string[];
}> {
  const $ = cheerio.load(html);

  // Meta title
  const metaTitle = $("title").text().trim() || null;

  // Check ottimizzazione title
  const titleCheck = isMetaTitleOptimized(metaTitle);

  // Check mobile friendly
  const mobileCheck = checkMobileFriendly(html, $);

  // Meta description
  const metaDescription =
    $('meta[name="description"]').attr("content")?.trim() || null;

  // H1
  const h1Elements = $("h1");
  const h1Text = h1Elements
    .map((_, el) => $(el).text().trim())
    .get()
    .filter((t) => t.length > 0);

  // Canonical
  const canonicalUrl = $('link[rel="canonical"]').attr("href") || null;

  // Open Graph
  const openGraph: Record<string, string> = {};
  $('meta[property^="og:"]').each((_, el) => {
    const property = $(el).attr("property")?.replace("og:", "");
    const content = $(el).attr("content");
    if (property && content) {
      openGraph[property] = content;
    }
  });

  // Images without alt
  const images = $("img");
  let imagesWithoutAlt = 0;
  images.each((_, el) => {
    const alt = $(el).attr("alt");
    if (!alt || alt.trim() === "") {
      imagesWithoutAlt++;
    }
  });

  // Schema markup (JSON-LD)
  const hasSchemaMarkup =
    $('script[type="application/ld+json"]').length > 0 ||
    $("[itemtype]").length > 0;

  // Check sitemap.xml
  let hasSitemap = false;
  try {
    const sitemapUrl = new URL("/sitemap.xml", baseUrl).toString();
    const response = await fetch(sitemapUrl, {
      method: "HEAD",
      signal: AbortSignal.timeout(5000),
    });
    hasSitemap = response.ok;
  } catch {
    // Sitemap non trovato
  }

  // Check robots.txt
  let hasRobotsTxt = false;
  try {
    const robotsUrl = new URL("/robots.txt", baseUrl).toString();
    const response = await fetch(robotsUrl, {
      method: "HEAD",
      signal: AbortSignal.timeout(5000),
    });
    hasRobotsTxt = response.ok;
  } catch {
    // robots.txt non trovato
  }

  return {
    hasMetaTitle: !!metaTitle,
    metaTitle,
    metaTitleLength: metaTitle?.length || 0,
    metaTitleOptimized: titleCheck.isOptimized,
    metaTitleIssues: titleCheck.issues,
    hasMetaDescription: !!metaDescription,
    metaDescription,
    metaDescriptionLength: metaDescription?.length || 0,
    hasH1: h1Elements.length > 0,
    h1Count: h1Elements.length,
    h1Text,
    hasCanonical: !!canonicalUrl,
    canonicalUrl,
    hasOpenGraph: Object.keys(openGraph).length > 0,
    openGraph,
    imagesWithoutAlt,
    totalImages: images.length,
    hasSchemaMarkup,
    hasSitemap,
    hasRobotsTxt,
    mobileFriendly: mobileCheck.isMobileFriendly,
    mobileIssues: mobileCheck.issues,
  };
}
