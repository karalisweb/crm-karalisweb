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
