import { describe, it, expect } from "vitest";
import { annoCopyright, phpDaHeader, analizzaTecnico } from "../agenti/tecnico";
import { articoliDaWordPress, articoliDaFeed, linkFeed, refertoBlog } from "../agenti/blog";
import { refertoTracciamenti } from "../agenti/tracciamenti";
import { refertoSeo } from "../agenti/seo";
import type { TrackingAudit } from "@/types";

const oggi = new Date("2026-10-15T10:00:00Z");

describe("Tecnico", () => {
  it("legge l'anno più recente nel piè di pagina, anche negli intervalli", () => {
    expect(annoCopyright(`<footer>© 2012-2019 Rossi Srl · P.IVA</footer>`)?.anno).toBe(2019);
    expect(annoCopyright(`<footer>Copyright 2021 Bianchi</footer>`)?.anno).toBe(2021);
    expect(annoCopyright(`<footer>Tutti i diritti riservati</footer>`)).toBeNull();
  });

  it("legge PHP dall'header X-Powered-By", () => {
    expect(phpDaHeader({ "x-powered-by": "PHP/7.4.33" })).toBe("7.4.33");
    expect(phpDaHeader({})).toBeNull();
  });

  it("sito fermo da anni, PHP vecchio e senza HTTPS diventano leve con prova", () => {
    const r = analizzaTecnico(
      { url: "http://rossi.it", origin: "http://rossi.it", html: `<body><footer>© 2018 Rossi</footer></body>`, headers: { "x-powered-by": "PHP/7.2.1" } },
      oggi
    );
    const testi = r.levers.map((l) => l.testo).join(" | ");
    expect(testi).toContain("PHP 7.2.1");
    expect(testi).toContain("fermo da 8 anni");
    expect(testi).toContain("HTTPS");
    expect(r.levers.every((l) => l.prova.length > 0)).toBe(true);
  });

  it("sito moderno: nessuna leva", () => {
    const r = analizzaTecnico(
      { url: "https://ok.it", origin: "https://ok.it", html: `<body><footer>© 2026 Ok</footer></body>`, headers: {} },
      oggi
    );
    expect(r.levers).toHaveLength(0);
  });
});

describe("Blog", () => {
  it("legge gli articoli dall'API di WordPress", () => {
    const a = articoliDaWordPress(JSON.stringify([
      { date: "2025-03-01T10:00:00", title: { rendered: "Come scegliere gli infissi &amp; le finestre" }, link: "https://x.it/a" },
    ]));
    expect(a).toEqual([{ titolo: "Come scegliere gli infissi & le finestre", data: "2025-03-01", link: "https://x.it/a" }]);
    expect(articoliDaWordPress(`{"code":"rest_no_route"}`)).toBeNull();
  });

  it("legge RSS e Atom", () => {
    const rss = `<rss><channel><item><title>Primo</title><link>https://x.it/1</link><pubDate>Mon, 02 Jun 2025 08:00:00 +0000</pubDate></item></channel></rss>`;
    const atom = `<feed><entry><title>Secondo</title><link href="https://x.it/2"/><published>2024-01-05T00:00:00Z</published></entry></feed>`;
    expect(articoliDaFeed(rss)?.[0]).toMatchObject({ titolo: "Primo", data: "2025-06-02" });
    expect(articoliDaFeed(atom)?.[0]).toMatchObject({ titolo: "Secondo", link: "https://x.it/2" });
    expect(articoliDaFeed("<html></html>")).toBeNull();
  });

  it("trova il feed dichiarato ma scarta quello dei commenti", () => {
    expect(linkFeed(`<link rel="alternate" type="application/rss+xml" href="/feed/">`, "https://x.it")).toBe("https://x.it/feed/");
    expect(linkFeed(`<link rel="alternate" type="application/rss+xml" href="/comments/feed/">`, "https://x.it")).toBeNull();
  });

  it("blog fermo da più di 6 mesi è una leva con il titolo dell'ultimo articolo", () => {
    const r = refertoBlog([{ titolo: "Vecchio post", data: "2025-01-10", link: null }], "API WordPress", null, oggi);
    expect(r.levers[0].testo).toContain("fermo da");
    expect(r.levers[0].prova).toContain("Vecchio post");
    expect(r.confidence).toBe("ALTA");
    expect(refertoBlog([{ titolo: "x", data: "2019-03-27", link: null }], "feed", null, oggi).levers[0].testo).toContain("fermo da 7 anni");
  });

  it("nessun blog è una leva; blog recente no", () => {
    expect(refertoBlog(null, null, { hasBlog: false, blogUrl: null, lastPostDate: null }, oggi).levers).toHaveLength(1);
    expect(refertoBlog([{ titolo: "Nuovo", data: "2026-10-01", link: null }], "feed", null, oggi).levers).toHaveLength(0);
  });
});

describe("Tracciamenti", () => {
  const vuoto: TrackingAudit = {
    hasGoogleAnalytics: false, hasGA4: false, hasGTM: false, gtmId: null, hasFacebookPixel: false, fbPixelId: null,
    hasGoogleAdsTag: false, googleAdsId: null, hasConversionTracking: false, hasHotjar: false, hasClarity: false,
    hasLinkedInInsight: false, hasTikTokPixel: false,
  };

  it("niente analytics e niente pixel: due leve, fiducia alta", () => {
    const r = refertoTracciamenti(vuoto, "https://x.it");
    expect(r.levers.map((l) => l.servizio).sort()).toEqual(["meta_ads", "tracciamento"]);
    expect(r.confidence).toBe("ALTA");
  });

  it("con Tag Manager l'assenza è solo probabile: lo dice e abbassa la fiducia", () => {
    const r = refertoTracciamenti({ ...vuoto, hasGTM: true, gtmId: "GTM-ABC123" }, "https://x.it");
    expect(r.levers[0].testo).toContain("Tag Manager");
    expect(r.confidence).toBe("MEDIA");
  });

  it("il tag Google Ads è un segnale di spesa", () => {
    const r = refertoTracciamenti({ ...vuoto, hasGA4: true, hasGoogleAdsTag: true, googleAdsId: "AW-123456789" }, "https://x.it");
    expect(r.levers.find((l) => l.servizio === "google_ads")?.prova).toBe("AW-123456789");
  });
});

describe("SEO", () => {
  it("ogni mancanza diventa una leva, il sito non mobile va sul servizio sito", () => {
    const r = refertoSeo(
      { hasMetaTitle: true, metaTitle: "Home", metaTitleOptimized: false, metaTitleIssues: ["Titolo troppo corto"], hasMetaDescription: false, hasH1: true, h1Text: ["Benvenuti"], hasSitemap: false, hasSchemaMarkup: true, mobileFriendly: false, mobileIssues: ["Manca il viewport"] },
      "https://x.it"
    );
    expect(r.levers.map((l) => l.servizio)).toEqual(["seo", "seo", "seo", "sito"]);
    expect(r.summary).toContain("non mobile");
    expect(r.evidence.find((p) => p.cosa.includes("H1"))?.citazione).toBe("Benvenuti");
  });
});
