import { describe, expect, it } from "vitest";
import { testoDirettoConPonte } from "../rete-regole";

// v3.87: si scrive a chi decide, citando chi avete in comune solo se è vero.
describe("messaggio diretto a chi decide", () => {
  it("cita la persona in comune e il caso", () => {
    const t = testoDirettoConPonte("Giacomo Giordo", "Sorgente Solare", "Dario Piu", "Ho aiutato un'azienda di piscine a trovare clienti.");
    expect(t).toContain("Buongiorno Giacomo");
    expect(t).toContain("Abbiamo in comune Dario Piu.");
    expect(t).toContain("Ho aiutato un'azienda di piscine");
  });
  it("senza persona in comune non la inventa", () => {
    expect(testoDirettoConPonte("Pietro Deiana", "Centro Piscine", null, null)).not.toContain("in comune");
  });
});
