import { describe, it, expect } from "vitest";
import { detectTracking } from "../tracking-detector";

describe("detectTracking", () => {
  it("rileva Google Analytics Universal (UA)", () => {
    const html = `<html><head><script>UA-12345678-1</script></head><body></body></html>`;
    const result = detectTracking(html);
    expect(result.hasGoogleAnalytics).toBe(true);
  });

  it("rileva GA tramite analytics.js URL", () => {
    const html = `<html><head><script src="https://www.google-analytics.com/analytics.js"></script></head><body></body></html>`;
    const result = detectTracking(html);
    expect(result.hasGoogleAnalytics).toBe(true);
  });

  it("rileva GA4", () => {
    const html = `<html><head><script>G-ABC1234567</script></head><body></body></html>`;
    const result = detectTracking(html);
    expect(result.hasGA4).toBe(true);
  });

  it("rileva GTM con ID", () => {
    const html = `<html><head><script>GTM-ABCDEF1</script></head><body></body></html>`;
    const result = detectTracking(html);
    expect(result.hasGTM).toBe(true);
    expect(result.gtmId).toBe("GTM-ABCDEF1");
  });

  it("rileva GTM tramite URL googletagmanager", () => {
    const html = `<html><head><script src="https://www.googletagmanager.com/gtm.js?id=GTM-XXXYYY"></script></head><body></body></html>`;
    const result = detectTracking(html);
    expect(result.hasGTM).toBe(true);
  });

  it("rileva Facebook Pixel con fbq init", () => {
    const html = `<html><head><script>fbq('init', '1234567890')</script></head><body></body></html>`;
    const result = detectTracking(html);
    expect(result.hasFacebookPixel).toBe(true);
    expect(result.fbPixelId).toBe("1234567890");
  });

  it("rileva Facebook Pixel tramite fbevents.js", () => {
    const html = `<html><head><script src="https://connect.facebook.net/en_US/fbevents.js"></script></head><body></body></html>`;
    const result = detectTracking(html);
    expect(result.hasFacebookPixel).toBe(true);
  });

  it("rileva Google Ads tag con ID", () => {
    const html = `<html><head><script>AW-123456789</script></head><body></body></html>`;
    const result = detectTracking(html);
    expect(result.hasGoogleAdsTag).toBe(true);
    expect(result.googleAdsId).toBe("AW-123456789");
  });

  it("rileva Google Ads tramite doubleclick", () => {
    const html = `<html><head><script src="https://googleads.g.doubleclick.net/pagead/viewthroughconversion/"></script></head><body></body></html>`;
    const result = detectTracking(html);
    expect(result.hasGoogleAdsTag).toBe(true);
  });

  it("rileva Hotjar", () => {
    const html = `<html><head><script src="https://static.hotjar.com/c/hotjar-12345.js"></script></head><body></body></html>`;
    const result = detectTracking(html);
    expect(result.hasHotjar).toBe(true);
  });

  it("rileva Microsoft Clarity", () => {
    const html = `<html><head><script src="https://www.clarity.ms/tag/abc123"></script></head><body></body></html>`;
    const result = detectTracking(html);
    expect(result.hasClarity).toBe(true);
  });

  it("rileva LinkedIn Insight", () => {
    const html = `<html><head><script src="https://snap.licdn.com/li.lms-analytics/insight.min.js"></script></head><body></body></html>`;
    const result = detectTracking(html);
    expect(result.hasLinkedInInsight).toBe(true);
  });

  it("rileva TikTok Pixel", () => {
    const html = `<html><head><script src="https://analytics.tiktok.com/i18n/pixel/events.js"></script></head><body></body></html>`;
    const result = detectTracking(html);
    expect(result.hasTikTokPixel).toBe(true);
  });

  it("ritorna tutto false su HTML vuoto", () => {
    const html = `<html><head></head><body><p>Sito semplice</p></body></html>`;
    const result = detectTracking(html);
    expect(result.hasGoogleAnalytics).toBe(false);
    expect(result.hasGA4).toBe(false);
    expect(result.hasGTM).toBe(false);
    expect(result.hasFacebookPixel).toBe(false);
    expect(result.hasGoogleAdsTag).toBe(false);
    expect(result.hasHotjar).toBe(false);
    expect(result.hasClarity).toBe(false);
    expect(result.hasLinkedInInsight).toBe(false);
    expect(result.hasTikTokPixel).toBe(false);
    expect(result.gtmId).toBeNull();
    expect(result.fbPixelId).toBeNull();
    expect(result.googleAdsId).toBeNull();
  });

  it("rileva multipli tracker contemporaneamente", () => {
    const html = `<html><head>
      <script>G-ABC1234567</script>
      <script>GTM-ABCDEF1</script>
      <script>fbq('init', '9876543210')</script>
      <script src="https://www.clarity.ms/tag/abc"></script>
    </head><body></body></html>`;
    const result = detectTracking(html);
    expect(result.hasGA4).toBe(true);
    expect(result.hasGTM).toBe(true);
    expect(result.hasFacebookPixel).toBe(true);
    expect(result.hasClarity).toBe(true);
    expect(result.fbPixelId).toBe("9876543210");
  });
});
