/**
 * PageSpeed Insights API Integration
 *
 * Documentazione: https://developers.google.com/speed/docs/insights/v5/get-started
 *
 * Limiti gratuiti: 25.000 richieste/giorno (senza API key: 1/sec, con key: 400/100sec)
 *
 * Per ottenere una API key:
 * 1. Vai su https://console.cloud.google.com/
 * 2. Crea un progetto o selezionane uno esistente
 * 3. Vai su "APIs & Services" > "Library"
 * 4. Cerca "PageSpeed Insights API" e abilitala
 * 5. Vai su "APIs & Services" > "Credentials"
 * 6. Clicca "Create Credentials" > "API Key"
 * 7. Copia la chiave e aggiungila al .env come PAGESPEED_API_KEY
 */

export interface PageSpeedResult {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  loadTime: number; // Speed Index in secondi
  firstContentfulPaint: number; // FCP in secondi
  largestContentfulPaint: number; // LCP in millisecondi
  totalBlockingTime: number; // TBT in millisecondi (proxy per FID)
  cumulativeLayoutShift: number; // CLS
  mobile: boolean; // Se il sito e' mobile-friendly
  timeToInteractive: number; // TTI in secondi
}

interface LighthouseAudit {
  score: number | null;
  numericValue?: number;
  displayValue?: string;
}

interface LighthouseCategory {
  score: number | null;
}

interface PageSpeedResponse {
  lighthouseResult?: {
    categories: {
      performance?: LighthouseCategory;
      accessibility?: LighthouseCategory;
      "best-practices"?: LighthouseCategory;
      seo?: LighthouseCategory;
    };
    audits: {
      "speed-index"?: LighthouseAudit;
      "first-contentful-paint"?: LighthouseAudit;
      "largest-contentful-paint"?: LighthouseAudit;
      "total-blocking-time"?: LighthouseAudit;
      "cumulative-layout-shift"?: LighthouseAudit;
      "interactive"?: LighthouseAudit;
      "viewport"?: LighthouseAudit;
    };
  };
  error?: {
    code: number;
    message: string;
  };
}

const PAGESPEED_API_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

/**
 * Esegue un'analisi PageSpeed Insights su un URL
 *
 * @param url - URL del sito da analizzare
 * @param strategy - "mobile" o "desktop" (default: mobile)
 * @returns Risultati dell'analisi o null se fallisce
 */
export async function runPageSpeedAnalysis(
  url: string,
  strategy: "mobile" | "desktop" = "mobile"
): Promise<PageSpeedResult | null> {
  const apiKey = process.env.PAGESPEED_API_KEY;

  // Normalizza URL
  let normalizedUrl = url;
  if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
    normalizedUrl = "https://" + normalizedUrl;
  }

  // Costruisci URL API
  const apiUrl = new URL(PAGESPEED_API_URL);
  apiUrl.searchParams.set("url", normalizedUrl);
  apiUrl.searchParams.set("strategy", strategy);
  apiUrl.searchParams.append("category", "performance");
  apiUrl.searchParams.append("category", "accessibility");
  apiUrl.searchParams.append("category", "best-practices");
  apiUrl.searchParams.append("category", "seo");

  if (apiKey) {
    apiUrl.searchParams.set("key", apiKey);
  }

  try {
    console.log(`[PageSpeed] Analyzing ${normalizedUrl} (${strategy})...`);

    const response = await fetch(apiUrl.toString(), {
      signal: AbortSignal.timeout(60000), // 60 secondi timeout (PageSpeed puo' essere lento)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[PageSpeed] API error: ${response.status} - ${errorText}`);
      return null;
    }

    const data: PageSpeedResponse = await response.json();

    if (data.error) {
      console.error(`[PageSpeed] Error: ${data.error.message}`);
      return null;
    }

    if (!data.lighthouseResult) {
      console.error("[PageSpeed] No lighthouse result in response");
      return null;
    }

    const { categories, audits } = data.lighthouseResult;

    // Estrai scores (0-100)
    const performance = Math.round((categories.performance?.score ?? 0) * 100);
    const accessibility = Math.round((categories.accessibility?.score ?? 0) * 100);
    const bestPractices = Math.round((categories["best-practices"]?.score ?? 0) * 100);
    const seo = Math.round((categories.seo?.score ?? 0) * 100);

    // Estrai metriche specifiche
    const speedIndex = audits["speed-index"]?.numericValue ?? 3000;
    const fcp = audits["first-contentful-paint"]?.numericValue ?? 2000;
    const lcp = audits["largest-contentful-paint"]?.numericValue ?? 2500;
    const tbt = audits["total-blocking-time"]?.numericValue ?? 200;
    const cls = audits["cumulative-layout-shift"]?.numericValue ?? 0.1;
    const tti = audits["interactive"]?.numericValue ?? 4000;

    // Check mobile-friendly (viewport audit)
    const viewportScore = audits["viewport"]?.score ?? 0;
    const mobile = viewportScore === 1;

    const result: PageSpeedResult = {
      performance,
      accessibility,
      bestPractices,
      seo,
      loadTime: speedIndex / 1000, // Converti in secondi
      firstContentfulPaint: fcp / 1000,
      largestContentfulPaint: lcp, // Mantieni in ms per Core Web Vitals
      totalBlockingTime: tbt, // Mantieni in ms
      cumulativeLayoutShift: cls,
      mobile,
      timeToInteractive: tti / 1000,
    };

    console.log(`[PageSpeed] Analysis complete: Performance ${performance}, LCP ${lcp}ms, CLS ${cls}`);

    return result;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "TimeoutError" || error.name === "AbortError") {
        console.error("[PageSpeed] Request timeout");
      } else {
        console.error(`[PageSpeed] Error: ${error.message}`);
      }
    }
    return null;
  }
}

/**
 * Verifica se l'API PageSpeed e' configurata
 */
export function isPageSpeedConfigured(): boolean {
  return !!process.env.PAGESPEED_API_KEY;
}

/**
 * Interpreta i Core Web Vitals
 */
export function interpretCoreWebVitals(result: PageSpeedResult): {
  lcp: "good" | "needs-improvement" | "poor";
  fid: "good" | "needs-improvement" | "poor";
  cls: "good" | "needs-improvement" | "poor";
} {
  // LCP: Good < 2.5s, Poor > 4s
  let lcp: "good" | "needs-improvement" | "poor";
  if (result.largestContentfulPaint < 2500) {
    lcp = "good";
  } else if (result.largestContentfulPaint < 4000) {
    lcp = "needs-improvement";
  } else {
    lcp = "poor";
  }

  // FID (usiamo TBT come proxy): Good < 100ms, Poor > 300ms
  let fid: "good" | "needs-improvement" | "poor";
  if (result.totalBlockingTime < 100) {
    fid = "good";
  } else if (result.totalBlockingTime < 300) {
    fid = "needs-improvement";
  } else {
    fid = "poor";
  }

  // CLS: Good < 0.1, Poor > 0.25
  let cls: "good" | "needs-improvement" | "poor";
  if (result.cumulativeLayoutShift < 0.1) {
    cls = "good";
  } else if (result.cumulativeLayoutShift < 0.25) {
    cls = "needs-improvement";
  } else {
    cls = "poor";
  }

  return { lcp, fid, cls };
}
