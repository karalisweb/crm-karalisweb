import * as cheerio from "cheerio";
import type { ContentAudit } from "@/types";

export async function checkBlog(
  html: string,
  baseUrl: string
): Promise<ContentAudit> {
  const $ = cheerio.load(html);

  // Cerca link al blog
  const blogPatterns = ["/blog", "/news", "/articoli", "/magazine", "/journal", "/notizie"];
  let blogUrl: string | null = null;

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    if (blogPatterns.some((p) => href.toLowerCase().includes(p))) {
      blogUrl = href.startsWith("http")
        ? href
        : new URL(href, baseUrl).toString();
      return false;
    }
  });

  if (!blogUrl) {
    return {
      hasBlog: false,
      blogUrl: null,
      lastPostDate: null,
      daysSinceLastPost: null,
      estimatedPostCount: 0,
    };
  }

  // Prova a recuperare la pagina blog e cercare date
  try {
    const blogResponse = await fetch(blogUrl, {
      signal: AbortSignal.timeout(10000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!blogResponse.ok) {
      return {
        hasBlog: true,
        blogUrl,
        lastPostDate: null,
        daysSinceLastPost: null,
        estimatedPostCount: 0,
      };
    }

    const blogHtml = await blogResponse.text();
    const $blog = cheerio.load(blogHtml);

    // Cerca date nei post (pattern comuni)
    const datePatterns = [
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/, // DD/MM/YYYY o DD-MM-YYYY
      /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/, // YYYY-MM-DD
      /(\d{1,2})\s+(gen|feb|mar|apr|mag|giu|lug|ago|set|ott|nov|dic)[a-z]*\s+(\d{4})/i,
      /(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/i,
    ];

    let lastDate: Date | null = null;
    const textContent = $blog(
      "article, .post, .entry, [class*='blog'], time, .date"
    ).text();

    for (const pattern of datePatterns) {
      const matches = textContent.matchAll(new RegExp(pattern, "gi"));
      for (const match of matches) {
        try {
          const parsed = new Date(match[0]);
          if (!isNaN(parsed.getTime()) && (!lastDate || parsed > lastDate)) {
            lastDate = parsed;
          }
        } catch {
          // Ignora date non parsabili
        }
      }
    }

    // Prova anche con tag time
    $blog("time[datetime]").each((_, el) => {
      const datetime = $blog(el).attr("datetime");
      if (datetime) {
        try {
          const parsed = new Date(datetime);
          if (!isNaN(parsed.getTime()) && (!lastDate || parsed > lastDate)) {
            lastDate = parsed;
          }
        } catch {
          // Ignora
        }
      }
    });

    // Conta articoli (euristica)
    const articleCount = $blog(
      'article, .post, .entry, [class*="post-item"], [class*="blog-item"]'
    ).length;

    const daysSinceLastPost = lastDate
      ? Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      hasBlog: true,
      blogUrl,
      lastPostDate: lastDate?.toISOString().split("T")[0] || null,
      daysSinceLastPost,
      estimatedPostCount: articleCount,
    };
  } catch {
    // Se non riesce a recuperare il blog, segnala solo che esiste
    return {
      hasBlog: true,
      blogUrl,
      lastPostDate: null,
      daysSinceLastPost: null,
      estimatedPostCount: 0,
    };
  }
}
