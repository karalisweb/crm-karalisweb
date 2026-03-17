import { describe, it, expect, vi } from "vitest";
import { checkSEO } from "../seo-checker";

// Mock fetch per sitemap e robots.txt
vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

describe("checkSEO", () => {
  const baseUrl = "https://example.com";

  it("rileva meta title", async () => {
    const html = `<html><head><title>Ristorante La Bella Napoli | Cucina Napoletana a Milano</title></head><body></body></html>`;
    const result = await checkSEO(html, baseUrl);
    expect(result.hasMetaTitle).toBe(true);
    expect(result.metaTitle).toBe("Ristorante La Bella Napoli | Cucina Napoletana a Milano");
    expect(result.metaTitleLength).toBeGreaterThan(0);
  });

  it("rileva meta title mancante", async () => {
    const html = `<html><head></head><body></body></html>`;
    const result = await checkSEO(html, baseUrl);
    expect(result.hasMetaTitle).toBe(false);
    expect(result.metaTitle).toBeNull();
    expect(result.metaTitleLength).toBe(0);
  });

  it("rileva meta description", async () => {
    const html = `<html><head><meta name="description" content="Il miglior ristorante di Milano"></head><body></body></html>`;
    const result = await checkSEO(html, baseUrl);
    expect(result.hasMetaDescription).toBe(true);
    expect(result.metaDescription).toBe("Il miglior ristorante di Milano");
  });

  it("rileva meta description mancante", async () => {
    const html = `<html><head><title>Test</title></head><body></body></html>`;
    const result = await checkSEO(html, baseUrl);
    expect(result.hasMetaDescription).toBe(false);
    expect(result.metaDescription).toBeNull();
  });

  it("rileva H1", async () => {
    const html = `<html><body><h1>Benvenuti al Ristorante</h1></body></html>`;
    const result = await checkSEO(html, baseUrl);
    expect(result.hasH1).toBe(true);
    expect(result.h1Count).toBe(1);
    expect(result.h1Text).toEqual(["Benvenuti al Ristorante"]);
  });

  it("rileva multipli H1", async () => {
    const html = `<html><body><h1>Primo</h1><h1>Secondo</h1></body></html>`;
    const result = await checkSEO(html, baseUrl);
    expect(result.h1Count).toBe(2);
    expect(result.h1Text).toEqual(["Primo", "Secondo"]);
  });

  it("rileva H1 mancante", async () => {
    const html = `<html><body><h2>Solo H2</h2></body></html>`;
    const result = await checkSEO(html, baseUrl);
    expect(result.hasH1).toBe(false);
    expect(result.h1Count).toBe(0);
  });

  it("rileva canonical URL", async () => {
    const html = `<html><head><link rel="canonical" href="https://example.com/page"></head><body></body></html>`;
    const result = await checkSEO(html, baseUrl);
    expect(result.hasCanonical).toBe(true);
    expect(result.canonicalUrl).toBe("https://example.com/page");
  });

  it("rileva Open Graph tags", async () => {
    const html = `<html><head>
      <meta property="og:title" content="Titolo">
      <meta property="og:description" content="Descrizione">
      <meta property="og:image" content="https://example.com/img.jpg">
    </head><body></body></html>`;
    const result = await checkSEO(html, baseUrl);
    expect(result.hasOpenGraph).toBe(true);
    expect(result.openGraph?.title).toBe("Titolo");
    expect(result.openGraph?.description).toBe("Descrizione");
  });

  it("conta immagini senza alt", async () => {
    const html = `<html><body>
      <img src="a.jpg" alt="Con alt">
      <img src="b.jpg">
      <img src="c.jpg" alt="">
      <img src="d.jpg" alt="Altra immagine">
    </body></html>`;
    const result = await checkSEO(html, baseUrl);
    expect(result.totalImages).toBe(4);
    expect(result.imagesWithoutAlt).toBe(2);
  });

  it("rileva Schema markup JSON-LD", async () => {
    const html = `<html><head><script type="application/ld+json">{"@type":"LocalBusiness"}</script></head><body></body></html>`;
    const result = await checkSEO(html, baseUrl);
    expect(result.hasSchemaMarkup).toBe(true);
  });

  it("rileva Schema markup microdata", async () => {
    const html = `<html><body><div itemtype="https://schema.org/Restaurant">test</div></body></html>`;
    const result = await checkSEO(html, baseUrl);
    expect(result.hasSchemaMarkup).toBe(true);
  });

  it("rileva mobile friendly con viewport corretto", async () => {
    const html = `<html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body></body></html>`;
    const result = await checkSEO(html, baseUrl);
    expect(result.mobileFriendly).toBe(true);
  });

  it("rileva non mobile friendly senza viewport", async () => {
    const html = `<html><head></head><body></body></html>`;
    const result = await checkSEO(html, baseUrl);
    expect(result.mobileFriendly).toBe(false);
  });

  it("sito completo con tutto presente", async () => {
    const html = `<html><head>
      <title>Ristorante La Bella Napoli | Milano</title>
      <meta name="description" content="Cucina napoletana autentica a Milano">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="canonical" href="https://example.com">
      <meta property="og:title" content="La Bella Napoli">
      <script type="application/ld+json">{"@type":"Restaurant"}</script>
    </head><body>
      <h1>La Bella Napoli</h1>
      <img src="foto.jpg" alt="Ristorante">
    </body></html>`;
    const result = await checkSEO(html, baseUrl);
    expect(result.hasMetaTitle).toBe(true);
    expect(result.hasMetaDescription).toBe(true);
    expect(result.hasH1).toBe(true);
    expect(result.hasCanonical).toBe(true);
    expect(result.hasOpenGraph).toBe(true);
    expect(result.hasSchemaMarkup).toBe(true);
    expect(result.mobileFriendly).toBe(true);
    expect(result.imagesWithoutAlt).toBe(0);
  });
});
