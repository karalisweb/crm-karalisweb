/**
 * Modulo 1 — Check sito web
 *
 * Valuta la qualità tecnica del sito aziendale: presenza, velocità, ottimizzazione mobile.
 * Usa Google PageSpeed Insights API (gratuita).
 *
 * Modulo 1b — Detect Technologies
 * Rileva pixel di tracking e CMS tramite scansione HTML grezza.
 */

import type {
  WebsiteCheckResult,
  TechDetectionResult,
} from "@/types/qualification";
import {
  runPageSpeedAnalysis,
  isPageSpeedConfigured,
} from "@/lib/audit/pagespeed";

/**
 * Check principale del sito web (Modulo 1)
 *
 * Chiama PageSpeed con strategy=mobile, estrai performance score,
 * first contentful paint, viewport audit.
 * Timeout: 15 secondi. Se supera, considera sito assente.
 *
 * @param domain - Dominio da analizzare (es. "azienda.it")
 */
export async function checkWebsite(
  domain: string
): Promise<WebsiteCheckResult> {
  // Normalizza URL
  let url = domain;
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }

  const startTime = Date.now();

  // Se PageSpeed non è configurato, prova solo fetch diretto
  if (!isPageSpeedConfigured()) {
    console.log(`[CHECK WEBSITE] PageSpeed non configurato, provo fetch diretto per ${domain}`);
    return await checkWebsiteFallback(url);
  }

  try {
    console.log(`[CHECK WEBSITE] Analyzing ${domain} via PageSpeed (mobile)...`);

    const result = await runPageSpeedAnalysis(url, "mobile");

    if (!result) {
      // PageSpeed ha fallito, prova fetch diretto
      return await checkWebsiteFallback(url);
    }

    const latency = Date.now() - startTime;
    const performanceScore = result.performance;
    const fcp = result.firstContentfulPaint;

    // Classifica esito
    let esito: "debole" | "medio" | "buono";
    if (performanceScore < 50) {
      esito = "debole";
    } else if (performanceScore < 75) {
      esito = "medio";
    } else {
      esito = "buono";
    }

    console.log(
      `[CHECK WEBSITE] ${domain}: performance=${performanceScore}, mobile=${result.mobile}, esito=${esito} (${latency}ms)`
    );

    return {
      sito_presente: true,
      performance_score: performanceScore,
      mobile_friendly: result.mobile,
      primo_caricamento: `${fcp.toFixed(1)} s`,
      esito,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    const errMsg =
      error instanceof Error ? error.message : "Errore sconosciuto";

    if (
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError")
    ) {
      console.error(
        `[CHECK WEBSITE] Timeout per ${domain} (${latency}ms) — sito considerato assente`
      );
    } else {
      console.error(`[CHECK WEBSITE] Errore per ${domain}:`, errMsg);
    }

    return {
      sito_presente: false,
      performance_score: null,
      mobile_friendly: null,
      primo_caricamento: null,
      esito: null,
    };
  }
}

/**
 * Fallback: verifica solo se il sito è raggiungibile (senza PageSpeed)
 */
async function checkWebsiteFallback(
  url: string
): Promise<WebsiteCheckResult> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
    });

    if (response.ok) {
      return {
        sito_presente: true,
        performance_score: null,
        mobile_friendly: null,
        primo_caricamento: null,
        esito: null,
      };
    }

    return {
      sito_presente: false,
      performance_score: null,
      mobile_friendly: null,
      primo_caricamento: null,
      esito: null,
    };
  } catch {
    return {
      sito_presente: false,
      performance_score: null,
      mobile_friendly: null,
      primo_caricamento: null,
      esito: null,
    };
  }
}

/**
 * Detect Technologies (Modulo 1b)
 *
 * Rileva pixel di tracking e CMS tramite scansione HTML grezza.
 * GET sulla homepage con user-agent browser standard.
 * Timeout: 10 secondi.
 *
 * @param domain - Dominio da analizzare
 */
export async function detectTechnologies(
  domain: string
): Promise<TechDetectionResult> {
  let url = domain;
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }

  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000), // 10 secondi come da spec
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "it-IT,it;q=0.9,en;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const latency = Date.now() - startTime;

    // Cerca pattern specifici nell'HTML
    const hasFacebookPixel =
      /fbq\s*\(/.test(html) ||
      /facebook\.net\/en_US\/fbevents/.test(html) ||
      /connect\.facebook\.net.*fbevents/.test(html);

    const hasGtm =
      /googletagmanager\.com\/gtm\.js/.test(html) ||
      /GTM-[A-Z0-9]{6,}/.test(html);

    const hasGoogleAnalytics =
      /google-analytics\.com/.test(html) ||
      /gtag\s*\(/.test(html) ||
      /G-[A-Z0-9]{10,}/.test(html) ||
      /UA-\d{4,10}-\d{1,4}/.test(html);

    const cmsWordpress = /wp-content/.test(html) || /wp-includes/.test(html);

    const cmsWix =
      /wix\.com/.test(html) || /wixstatic\.com/.test(html);

    console.log(
      `[DETECT TECH] ${domain}: fb_pixel=${hasFacebookPixel}, gtm=${hasGtm}, ga=${hasGoogleAnalytics}, wp=${cmsWordpress}, wix=${cmsWix} (${latency}ms)`
    );

    return {
      has_facebook_pixel: hasFacebookPixel,
      has_gtm: hasGtm,
      has_google_analytics: hasGoogleAnalytics,
      cms_wordpress: cmsWordpress,
      cms_wix: cmsWix,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    const errMsg =
      error instanceof Error ? error.message : "Errore sconosciuto";

    console.error(
      `[DETECT TECH] Errore per ${domain}: ${errMsg} (${latency}ms)`
    );

    return {
      has_facebook_pixel: false,
      has_gtm: false,
      has_google_analytics: false,
      cms_wordpress: false,
      cms_wix: false,
      errore: errMsg,
    };
  }
}
