import * as cheerio from "cheerio";
import type { SEOAudit } from "@/types";

export async function checkSEO(html: string, baseUrl: string): Promise<Partial<SEOAudit>> {
  const $ = cheerio.load(html);

  // Meta title
  const metaTitle = $("title").text().trim() || null;

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
  };
}
