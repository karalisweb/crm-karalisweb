import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/db", () => ({ db: {} }));
import { dominiDaEmail, dominiDaNome, paroleNome, punteggioHome } from "../trova-sito";
import { passoRicerca, prioritaChiave, nellaZona, zoneDisponibili } from "../regole";
import { analizzaContatto } from "@/lib/agents/agenti/arricchimento";
import { siglaProvincia } from "../casi-studio";

describe("Trova sito", () => {
  it("ricava le parole e i domini dal nome", () => {
    expect(paroleNome("Officina 3MT S.a.s.")).toEqual(["officina", "3mt"]);
    expect(dominiDaNome("Officina 3MT")).toContain("officina3mt.it");
    expect(dominiDaNome("AD Solutions")).toContain("adsolutions.it");
  });
  it("prende i domini dalle email, non le caselle gratuite", () => {
    expect(dominiDaEmail(["Tel: 070-8630094 Email: info@officina3mt.it #3MT", "scrivi a mario@gmail.com"])).toEqual(["officina3mt.it"]);
  });
  it("il telefono uguale vale più di un nome nei crediti", () => {
    const crediti = `<title>ASD Karalis Eventi</title><body>Sito realizzato da Karalisweb</body>`;
    expect(punteggioHome(crediti, "asdkaraliseventi.it", "Karalisweb")).toBeLessThan(2);
    const vero = `<title>Accadueo - piscine</title><body>Chiama 070 2110084</body>`;
    expect(punteggioHome(vero, "accadueosardegna.it", "Accadueo Srl", "+390702110084")).toBeGreaterThanOrEqual(5);
  });
});

describe("Nicchia, settore e provincia", () => {
  it("la nicchia salta la provincia del cliente", () => {
    expect(zoneDisponibili(["CA"])[0]).toBe("Iglesias");
    expect(passoRicerca(["costruzione piscine"], 0, ["CA"])).toEqual({ termine: "costruzione piscine", zona: "Iglesias" });
    expect(passoRicerca(["piscine"], 0)).toEqual({ termine: "piscine", zona: "Cagliari" });
    expect(nellaZona("Via Roma 1, 09045 Quartu Sant'Elena CA", "Iglesias", ["CA"])).toBe(false);
  });
  it("prima la nicchia, ma la Sardegna prima di tutto", () => {
    expect(prioritaChiave("AZIENDA", "Sassari")).toBeLessThan(prioritaChiave("SETTORE", "Cagliari"));
    expect(prioritaChiave("SETTORE", "Cagliari")).toBeLessThan(prioritaChiave("AZIENDA", "Roma"));
  });
  it("legge la sigla della provincia", () => {
    expect(siglaProvincia("ca")).toBe("CA");
    expect(siglaProvincia("Cagliari (CA)")).toBe("CA");
    expect(siglaProvincia("")).toBeNull();
  });
});

describe("Dal cliente al contatto", () => {
  it("vede telefono non cliccabile, WhatsApp e modulo", () => {
    const html = `<header><nav><a href="/contatti">Contatti</a></nav></header><body>Chiamaci allo 070 2110084<form><input name="n"><textarea></textarea></form></body>`;
    const a = analizzaContatto(html, "https://esempio.it");
    expect(a.telefonoScritto).toBe(true);
    expect(a.telefonoCliccabile).toBe(false);
    expect(a.whatsapp).toBe(false);
    expect(a.moduloInHome).toBe(true);
    expect(a.paginaContatti).toBe("https://esempio.it/contatti");
  });
});

describe("Posizioni: il servizio dal titolo del sito", () => {
  it("toglie nome e città", async () => {
    const { servizioDalTitolo } = await import("@/lib/agents/agenti/posizioni");
    expect(servizioDalTitolo("<title>Acquisto macchine movimento terra - Officina 3MT Cagliari</title>", "Officina 3MT", "Sinnai")).toBe("acquisto macchine movimento terra");
    expect(servizioDalTitolo("<title>Home - Officina 3MT</title>", "Officina 3MT", null)).toBeNull();
  });
});

describe("Trova sito: domini parcheggiati", () => {
  it("una pagina in vendita non è il sito di nessuno", async () => {
    const { punteggioHome } = await import("../trova-sito");
    expect(punteggioHome("<title>adsolutions.net</title><body>Diese Website steht zum Verkauf!</body>", "adsolutions.net", "AD Solutions")).toBe(0);
  });
});

describe("Catalogo degli agenti", () => {
  it("automatici per momento e per posto, secondo il modo scelto", async () => {
    const { CATALOGO, automatici } = await import("@/lib/agents/catalogo");
    const modi = Object.fromEntries(CATALOGO.map((v) => [v.chiave, v.modo]));
    expect(automatici(modi, "trovata")).toEqual(["trova_sito", "posizioni", "sito_visto", "contatto", "lettore", "recensioni"]);
    expect(automatici(modi, "approfondisci", "mac")).toEqual(["instagram"]);
    expect(automatici({ ...modi, decision_maker: "auto" }, "approfondisci", "mac")).toEqual(["instagram", "decision_maker"]);
    expect(automatici({ ...modi, google_ads: "mano" }, "approfondisci", "server")).not.toContain("google_ads");
  });
});

describe("Segnali dell'elenco", () => {
  it("ricava pubblicità, sito vecchio, sito che non comunica, non si fa trovare e chi decide", async () => {
    const { segnaliDa } = await import("@/lib/agents/segnali");
    const s = segnaliDa({
      google_ads: { attiviOra: 3 },
      sito_visto: { sembra_anno: "circa 2014" },
      lettore: { domande_cliente: [{ risposta: "no" }, { risposta: "no" }, { risposta: "sì" }], come_lo_dice: { chiarezza: 4 } },
      posizioni: { posizione: 19 },
      decision_maker: { persone: [] },
    }, false);
    expect(s).toEqual({ chiDecide: "da_trovare", pubblicita: true, sitoVecchio: true, sitoNonComunica: true, nonSiTrova: true });
    const t = segnaliDa({ meta_ads: { inserzioniAttive: 0 }, sito_visto: { sembra_anno: "recente" }, posizioni: { posizione: 2 } }, true);
    expect(t).toEqual({ chiDecide: "noto", pubblicita: false, sitoVecchio: false, sitoNonComunica: false, nonSiTrova: false });
  });
});
