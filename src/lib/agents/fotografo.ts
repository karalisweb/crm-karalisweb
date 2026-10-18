/**
 * Il fotografo del sito: apre la homepage in un browser invisibile (Chromium sul server) come
 * telefono e come computer, fa la foto della parte visibile e misura dopo quanto si vede il
 * contenuto principale (LCP). Sul telefono la connessione è rallentata come un 4G normale.
 *
 * Non dipende da Google PageSpeed (chiavi scadute, quota finita il 2026-10-18).
 * Sicurezza: il browser non può aprire indirizzi interni (localhost, reti private).
 */
import { existsSync } from "node:fs";
import type { Browser, Page } from "playwright-core";

export interface Foto {
  jpeg: string; // data:image/jpeg;base64,…
  lcpSecondi: number | null;
  caricamentoSecondi: number | null;
}

// Sul server Chromium è installato in /opt/pw-browsers (vedi TECHNICAL-DOCS, Fase 2).
if (!process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync("/opt/pw-browsers")) process.env.PLAYWRIGHT_BROWSERS_PATH = "/opt/pw-browsers";

const INTERNO = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.0\.0\.0|\[?::1\]?|\[?f[cd][0-9a-f]{2}:)/i;

async function blindaPagina(p: Page) {
  await p.route("**/*", (r) => {
    try {
      const u = new URL(r.request().url());
      if (!/^https?:$/.test(u.protocol) || INTERNO.test(u.hostname)) return r.abort();
    } catch {
      return r.abort();
    }
    return r.continue();
  });
}

async function misura(p: Page): Promise<{ lcp: number | null; carico: number | null }> {
  return p.evaluate(
    () =>
      new Promise<{ lcp: number | null; carico: number | null }>((ok) => {
        let lcp: number | null = null;
        try {
          new PerformanceObserver((l) => {
            const e = l.getEntries();
            if (e.length) lcp = e[e.length - 1].startTime;
          }).observe({ type: "largest-contentful-paint", buffered: true });
        } catch {
          /* browser senza LCP */
        }
        setTimeout(() => {
          const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
          ok({ lcp, carico: nav && nav.loadEventEnd > 0 ? nav.loadEventEnd : null });
        }, 500);
      })
  );
}

/**
 * Il banner dei cookie copre il sito (soprattutto sul telefono): si chiude come farebbe una persona
 * attenta alla privacy, prima "solo necessari / rifiuta", poi "chiudi", e solo in fondo "accetta".
 */
async function chiudiCookie(p: Page) {
  for (const testo of [/solo (i )?necessari|rifiuta|nega|reject|only necessary/i, /^\s*(chiudi|close|×|x)\s*$/i, /accett|accept|ok,? ho capito|consenti/i]) {
    const b = p.getByRole("button", { name: testo }).or(p.getByRole("link", { name: testo })).first();
    if (await b.isVisible({ timeout: 300 }).catch(() => false)) {
      await b.click({ timeout: 2000 }).catch(() => {});
      await p.waitForTimeout(700);
      return;
    }
  }
}

async function scatta(browser: Browser, url: string, telefono: boolean): Promise<Foto> {
  const ctx = await browser.newContext(
    telefono
      ? {
          viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "it-IT",
          userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
        }
      : { viewport: { width: 1366, height: 860 }, locale: "it-IT" }
  );
  try {
    const p = await ctx.newPage();
    await blindaPagina(p);
    if (telefono) {
      // Un 4G normale: 150 ms di latenza, ~1,6 Mbit/s in download (come i test di Google).
      const cdp = await ctx.newCDPSession(p);
      await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
    }
    await p.goto(url, { waitUntil: "load", timeout: 45_000 }).catch(async () => {
      // Pagine che non finiscono mai di caricare: si fotografa quello che c'è.
      await p.waitForTimeout(1000);
    });
    await p.waitForTimeout(1500);
    const m = await misura(p).catch(() => ({ lcp: null, carico: null }));
    await chiudiCookie(p);
    const buf = await p.screenshot({ type: "jpeg", quality: 55, fullPage: false });
    const s = (ms: number | null) => (ms != null ? Math.round(ms / 100) / 10 : null);
    return { jpeg: `data:image/jpeg;base64,${buf.toString("base64")}`, lcpSecondi: s(m.lcp), caricamentoSecondi: s(m.carico) };
  } finally {
    await ctx.close();
  }
}

/** Foto su telefono e computer. Un browser per volta: il server ha 8 GB e altro da fare. */
export async function fotografaSito(url: string): Promise<{ telefono: Foto; computer: Foto | null }> {
  if (INTERNO.test(new URL(url).hostname)) throw new Error("Indirizzo non pubblico");
  const { chromium } = await import("playwright-core");
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  try {
    const telefono = await scatta(browser, url, true);
    const computer = await scatta(browser, url, false).catch(() => null);
    return { telefono, computer };
  } finally {
    await browser.close();
  }
}


/**
 * Apre una pagina pubblica nel browser invisibile e ne restituisce il testo visibile e l'HTML
 * (per Facebook e la libreria delle inserzioni di Meta, che si leggono senza account).
 */
export async function leggiPaginaPubblica(url: string, attesaMs = 5000): Promise<{ url: string; testo: string; html: string }> {
  if (INTERNO.test(new URL(url).hostname)) throw new Error("Indirizzo non pubblico");
  const { chromium } = await import("playwright-core");
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  try {
    const ctx = await browser.newContext({
      locale: "it-IT", viewport: { width: 1366, height: 900 },
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36",
    });
    const p = await ctx.newPage();
    await blindaPagina(p);
    await p.goto(url, { waitUntil: "domcontentloaded", timeout: 40_000 });
    await p.waitForTimeout(attesaMs);
    await chiudiCookie(p);
    // Facebook mostra un riquadro "Accedi" sopra la pagina: si chiude se c'è.
    await p.getByRole("button", { name: /chiudi|close/i }).first().click({ timeout: 1500 }).catch(() => {});
    await p.mouse.wheel(0, 2500).catch(() => {});
    await p.waitForTimeout(1500);
    const testo = (await p.evaluate(() => document.body.innerText)).replace(/[ \t]+/g, " ").replace(/\n{2,}/g, "\n");
    return { url: p.url(), testo, html: await p.content() };
  } finally {
    await browser.close();
  }
}
