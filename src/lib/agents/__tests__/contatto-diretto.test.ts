import { describe, expect, it } from "vitest";
import { testoContattoDiretto, testoDirettoConPonte } from "../rete-regole";

// v3.87: si scrive a chi decide, citando chi avete in comune solo se è vero.
describe("messaggio diretto a chi decide", () => {
  it("cita la persona in comune e il caso", () => {
    const t = testoDirettoConPonte("Giacomo Giordo", "Sorgente Solare", "Dario Piu", "Ho aiutato un'azienda di piscine a trovare clienti.");
    expect(t).toContain("Buongiorno Giacomo");
    expect(t).toContain("Abbiamo in comune Dario Piu.");
    expect(t).toContain("Ho aiutato un'azienda di piscine");
  });
  it("offre il caso studio e chiede il permesso, senza chiedere una call (v3.90)", () => {
    const t = testoDirettoConPonte("Giacomo Giordo", "Sorgente Solare", null, "Un'azienda come la vostra aveva il marketing a strappi.");
    expect(t).toContain("breve caso studio");
    expect(t).toContain("Posso mandarglielo?");
    expect(t).not.toMatch(/20 minuti/);
    expect(testoContattoDiretto("Mario Rossi", "Piscine Blu", null, true)).toMatch(/^Ciao Mario[\s\S]*Te lo mando\?/);
    // Senza un caso studio non si promette un caso studio.
    expect(testoContattoDiretto("Mario Rossi", "Piscine Blu", null, false)).not.toContain("caso studio");
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

import { soloInvito } from "../rete";

// v3.119: chi ha ricevuto solo la richiesta di collegamento dal Mac non è "contattato".
describe("solo invito LinkedIn", () => {
  const invito = { kind: "RETE_DIRETTO", note: "Richiesta di collegamento senza nota mandata su LinkedIn dal CRM" };
  it("solo inviti del Mac: sì", () => {
    expect(soloInvito([invito])).toBe(true);
    expect(soloInvito([{ ...invito, note: "Richiesta di collegamento con nota mandata su LinkedIn dal CRM" }])).toBe(true);
  });
  it("un messaggio vero, segnato a mano o col follow-up: no", () => {
    expect(soloInvito([invito, { kind: "RETE_FOLLOWUP", note: null }])).toBe(false);
    expect(soloInvito([{ kind: "RETE_DIRETTO", note: "Messaggio mandato su LinkedIn dal CRM" }])).toBe(false);
    expect(soloInvito([{ kind: "RETE_DIRETTO", note: null }])).toBe(false);
    expect(soloInvito([{ kind: "RETE_CONTATTO", note: "Richiesta di collegamento senza nota mandata su LinkedIn dal CRM" }])).toBe(false);
    expect(soloInvito([])).toBe(false);
  });
});
