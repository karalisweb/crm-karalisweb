import { describe, it, expect } from "vitest";
import { detectTech } from "../tech-detector";

describe("detectTech", () => {
  // CMS Detection
  it("rileva WordPress", () => {
    const html = `<html><head><link rel="stylesheet" href="/wp-content/themes/theme/style.css"></head><body></body></html>`;
    const result = detectTech(html);
    expect(result.cms).toBe("WordPress");
    expect(result.stack).toContain("WordPress");
  });

  it("rileva WordPress con versione", () => {
    const html = `<html><head><meta name="generator" content="WordPress 6.4.2"></head><body></body></html>`;
    const result = detectTech(html);
    expect(result.cms).toBe("WordPress");
    expect(result.cmsVersion).toBe("6.4.2");
  });

  it("rileva Shopify", () => {
    const html = `<html><head><link href="https://cdn.shopify.com/s/files/theme.css"></head><body></body></html>`;
    const result = detectTech(html);
    expect(result.cms).toBe("Shopify");
  });

  it("rileva Wix", () => {
    const html = `<html><head><script src="https://static.parastorage.com/services/wix.js"></script></head><body></body></html>`;
    const result = detectTech(html);
    expect(result.cms).toBe("Wix");
  });

  it("rileva Squarespace", () => {
    const html = `<html><head><link href="https://static1.squarespace.com/static/css/main.css"></head><body></body></html>`;
    const result = detectTech(html);
    expect(result.cms).toBe("Squarespace");
  });

  it("rileva Webflow", () => {
    const html = `<html><head><link href="https://uploads-ssl.webflow.com/style.css"></head><body></body></html>`;
    const result = detectTech(html);
    expect(result.cms).toBe("Webflow");
  });

  it("rileva Joomla", () => {
    const html = `<html><head><script src="/media/system/js/core.js"></script></head><body></body></html>`;
    const result = detectTech(html);
    expect(result.cms).toBe("Joomla");
  });

  it("rileva Drupal", () => {
    const html = `<html><body><img src="/sites/default/files/logo.png"></body></html>`;
    const result = detectTech(html);
    expect(result.cms).toBe("Drupal");
  });

  it("rileva PrestaShop", () => {
    const html = `<html><head><link href="/modules/ps_banner/style.css"></head><body></body></html>`;
    const result = detectTech(html);
    expect(result.cms).toBe("PrestaShop");
  });

  // Framework JS
  it("rileva Next.js", () => {
    const html = `<html><head></head><body><script id="__NEXT_DATA__" type="application/json">{}</script></body></html>`;
    const result = detectTech(html);
    expect(result.stack).toContain("Next.js");
  });

  it("rileva jQuery", () => {
    const html = `<html><head><script src="https://code.jquery.com/jquery-3.7.1.min.js"></script></head><body></body></html>`;
    const result = detectTech(html);
    expect(result.stack).toContain("jQuery");
  });

  it("rileva Bootstrap", () => {
    const html = `<html><head><link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css"></head><body></body></html>`;
    const result = detectTech(html);
    expect(result.stack).toContain("Bootstrap");
  });

  it("rileva WooCommerce su WordPress", () => {
    const html = `<html><head><link href="/wp-content/plugins/woocommerce/assets/css/woocommerce.css"></head><body></body></html>`;
    const result = detectTech(html);
    expect(result.cms).toBe("WordPress");
    expect(result.stack).toContain("WooCommerce");
  });

  // PHP version
  it("rileva versione PHP", () => {
    const html = `<html><head><!-- PHP/7.4.33 --></head><body></body></html>`;
    const result = detectTech(html);
    expect(result.phpVersion).toBe("7.4.33");
    expect(result.stack).toContain("PHP 7.4.33");
  });

  // Outdated check
  it("segnala PHP < 8.0 come outdated", () => {
    const html = `<html><head><!-- PHP/7.2.5 --></head><body></body></html>`;
    const result = detectTech(html);
    expect(result.isOutdated).toBe(true);
  });

  it("segnala WordPress < 6.0 come outdated", () => {
    const html = `<html><head><meta name="generator" content="WordPress 5.8"></head><body></body></html>`;
    const result = detectTech(html);
    expect(result.isOutdated).toBe(true);
  });

  it("non segnala outdated su stack moderno", () => {
    const html = `<html><head><script id="__NEXT_DATA__">{}</script></head><body></body></html>`;
    const result = detectTech(html);
    expect(result.isOutdated).toBe(false);
  });

  // Sito vuoto
  it("ritorna valori default su HTML minimale", () => {
    const html = `<html><head><title>Test</title></head><body></body></html>`;
    const result = detectTech(html);
    expect(result.cms).toBeNull();
    expect(result.cmsVersion).toBeNull();
    expect(result.phpVersion).toBeNull();
    expect(result.stack).toEqual([]);
    expect(result.isOutdated).toBe(false);
  });
});
