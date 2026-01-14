import * as cheerio from "cheerio";
import type { TrackingAudit } from "@/types";

export function detectTracking(html: string): TrackingAudit {
  const $ = cheerio.load(html);
  const scripts = $("script")
    .map((_, el) => $(el).html() || "")
    .get()
    .join(" ");
  const allHtml = html;

  // Google Analytics (Universal)
  const hasGoogleAnalytics =
    /UA-\d{4,10}-\d{1,4}/.test(allHtml) ||
    /google-analytics\.com\/analytics\.js/.test(allHtml);

  // GA4
  const hasGA4 =
    /G-[A-Z0-9]{10,}/.test(allHtml) || /gtag.*config.*G-/.test(scripts);

  // Google Tag Manager
  const gtmMatch = allHtml.match(/GTM-[A-Z0-9]{6,}/);
  const hasGTM = !!gtmMatch || /googletagmanager\.com\/gtm\.js/.test(allHtml);

  // Facebook Pixel
  const fbMatch = allHtml.match(/fbq\s*\(\s*['"]init['"]\s*,\s*['"](\d+)['"]/);
  const hasFacebookPixel =
    !!fbMatch || /connect\.facebook\.net.*fbevents\.js/.test(allHtml);

  // Google Ads
  const gadsMatch = allHtml.match(/AW-\d{9,}/);
  const hasGoogleAdsTag =
    !!gadsMatch || /googleads\.g\.doubleclick\.net/.test(allHtml);

  // Conversion Tracking (generic check)
  const hasConversionTracking =
    /conversion/.test(scripts.toLowerCase()) ||
    /gtag.*conversion/.test(scripts);

  // Hotjar
  const hasHotjar =
    /hotjar\.com/.test(allHtml) || /hj\s*\(\s*['"]/.test(scripts);

  // Microsoft Clarity
  const hasClarity = /clarity\.ms/.test(allHtml);

  // LinkedIn Insight
  const hasLinkedInInsight =
    /snap\.licdn\.com/.test(allHtml) || /linkedin\.com\/px/.test(allHtml);

  // TikTok Pixel
  const hasTikTokPixel = /analytics\.tiktok\.com/.test(allHtml);

  return {
    hasGoogleAnalytics,
    hasGA4,
    hasGTM,
    gtmId: gtmMatch?.[0] || null,
    hasFacebookPixel,
    fbPixelId: fbMatch?.[1] || null,
    hasGoogleAdsTag,
    googleAdsId: gadsMatch?.[0] || null,
    hasConversionTracking,
    hasHotjar,
    hasClarity,
    hasLinkedInInsight,
    hasTikTokPixel,
  };
}
