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

import { notaInvito } from "../rete";

describe("nota dell'invito LinkedIn", () => {
  it("corta, con la persona in comune se c'è", () => {
    const n = notaInvito("Salvatore Macciocco", "Buongiorno Salvatore, sono Alessio Loi di Karalisweb (Cagliari). Abbiamo in comune Sandra Manca. Lavoro con aziende come la vostra.");
    expect(n).toContain("Buongiorno Salvatore");
    expect(n).toContain("Abbiamo in comune Sandra Manca.");
    expect(n.length).toBeLessThanOrEqual(280);
  });
  it("dopo i commenti li ricorda", () => {
    expect(notaInvito(null, "Ciao, in queste settimane ho seguito e commentato i post di X.")).toContain("commentato i vostri post");
  });
});
