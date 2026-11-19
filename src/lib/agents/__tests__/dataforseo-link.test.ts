import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/db", () => ({ db: {} }));
import { linkDiGoogle, linkVero, sistemaLinkGoogle } from "../dataforseo";
import { aggiungiProfili } from "../chi-decide-regole";

// v3.135: dall'8 novembre Google dà "google.com/goto?url=…" invece dell'indirizzo vero.
const GOTO = "https://google.com/goto?url=CAESZwHEIkXX&gsessionid=abc";

afterEach(() => vi.unstubAllGlobals());

describe("link di Google", () => {
  it("riconosce goto e url, non gli altri indirizzi di Google", () => {
    expect(linkDiGoogle(GOTO)).toBe(true);
    expect(linkDiGoogle("https://www.google.com/url?q=https://example.it")).toBe(true);
    expect(linkDiGoogle("https://sites.google.com/view/antedil360/home")).toBe(false);
    expect(linkDiGoogle("https://it.linkedin.com/in/stefania-dedoni")).toBe(false);
  });

  it("legge l'indirizzo scritto nel link senza chiamare nessuno", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    expect(await linkVero("https://www.google.com/url?q=https://example.it/chi-siamo")).toBe("https://example.it/chi-siamo");
    expect(f).not.toHaveBeenCalled();
  });

  it("segue i salti fino al profilo vero e sistema url e dominio", async () => {
    const salti: Record<string, string> = {
      [GOTO]: "https://www.google.com/goto?url=CAESZwHEIkXX-lungo",
      "https://www.google.com/goto?url=CAESZwHEIkXX-lungo": "https://it.linkedin.com/in/stefania-dedoni",
    };
    vi.stubGlobal("fetch", vi.fn(async (u: string) => ({ headers: new Headers(salti[u] ? { location: salti[u] } : {}) })));
    const result = { items: [{ type: "organic", url: GOTO, domain: "google.com", title: "Stefania Dedoni - Social Media Strategist" }] };
    await sistemaLinkGoogle(result);
    expect(result.items[0].url).toBe("https://it.linkedin.com/in/stefania-dedoni");
    expect(result.items[0].domain).toBe("it.linkedin.com");
  });

  it("se il link non si segue lo lascia com'è", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("rete"); }));
    expect(await linkVero(GOTO)).toBeNull();
  });
});

describe("profilo di chi decide dopo il link sistemato", () => {
  it("il profilo LinkedIn ora si riconosce", () => {
    const p = { nome: "Stefania Dedoni", ruolo: "Titolare", fonte: "x", citazione: "x", profilo: null, profiloInstagram: null };
    const fonti = [{ url: "https://it.linkedin.com/in/stefania-dedoni", titolo: "Stefania Dedoni - Social Media Strategist", testo: "", delSito: false }];
    expect(aggiungiProfili(p, "Stefania Dedoni - Social Media Manager", fonti).profilo).toBe("https://it.linkedin.com/in/stefania-dedoni");
  });
});

describe("omonimi (v3.136)", () => {
  const p = { nome: "Sergio Meloni", ruolo: "Titolare", fonte: "x", citazione: "x", profilo: null, profiloInstagram: null };
  const azienda = "Impresa Edile Ing. Sergio Meloni";
  it("col solo nome non prende un profilo LinkedIn di un altro paese", () => {
    const fonti = [{ url: "https://cz.linkedin.com/in/sergiusxp", titolo: "Sergio Meloni - Praha", testo: "", delSito: false }];
    expect(aggiungiProfili(p, azienda, fonti).profilo).toBeNull();
  });
  it("prende quello italiano, e prima quello che parla dell'azienda", () => {
    const fonti = [
      { url: "https://it.linkedin.com/in/sergio-meloni-1", titolo: "Sergio Meloni - Cagliari", testo: "", delSito: false },
      { url: "https://it.linkedin.com/in/sergio-meloni-2", titolo: "Sergio Meloni - Impresa Edile Ing. Sergio Meloni", testo: "", delSito: false },
    ];
    expect(aggiungiProfili(p, azienda, fonti.slice(0, 1)).profilo).toBe("https://it.linkedin.com/in/sergio-meloni-1");
    expect(aggiungiProfili({ ...p, nome: "Stefania Dedoni" }, "Studio Dedoni Social", [
      { url: "https://de.linkedin.com/in/stefania-dedoni", titolo: "Stefania Dedoni - Studio Dedoni Social", testo: "", delSito: false },
    ]).profilo).toBe("https://de.linkedin.com/in/stefania-dedoni");
  });
});
