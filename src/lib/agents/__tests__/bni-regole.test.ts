import { describe, expect, it } from "vitest";
import { capitoloSenza121, eAlessio, nomeCapitoloBase, stessoCapitolo } from "../bni-regole";

describe("capitoloSenza121", () => {
  it("toglie Atlantide e I Visionari, anche scritti diversi", () => {
    expect(capitoloSenza121("Atlantide")).toBe(true);
    expect(capitoloSenza121("I Visionari")).toBe(true);
    expect(capitoloSenza121("BNI ATLANTIDE")).toBe(true);
  });
  it("lascia gli altri capitoli", () => {
    expect(capitoloSenza121("Saint Remy")).toBe(false);
    expect(capitoloSenza121(null)).toBe(false);
  });
});

describe("nomeCapitoloBase / stessoCapitolo", () => {
  it("toglie il BNI davanti, anche ripetuto", () => {
    expect(nomeCapitoloBase("BNI Atlantide")).toBe("Atlantide");
    expect(nomeCapitoloBase("BNI BNI  Karalis ")).toBe("Karalis");
    expect(nomeCapitoloBase("Saint Remy")).toBe("Saint Remy");
    expect(nomeCapitoloBase("BNI")).toBe("BNI");
  });
  it("riconosce lo stesso capitolo scritto in due modi", () => {
    expect(stessoCapitolo("BNI KARIM Porto Cervo", "KARIM Porto Cervo")).toBe(true);
    expect(stessoCapitolo("bni golfo degli angeli", "Golfo Degli Angeli")).toBe(true);
    expect(stessoCapitolo("BNI Maestrale", "Maestrale 2")).toBe(false);
    expect(stessoCapitolo(null, "Atlantide")).toBe(false);
  });
});

describe("eAlessio", () => {
  it("riconosce Alessio nella lista dei membri", () => {
    expect(eAlessio("Alessio Loi")).toBe(true);
    expect(eAlessio(" ALESSIO  LOI ")).toBe(true);
    expect(eAlessio("Alessio Meloni")).toBe(false);
  });
});
