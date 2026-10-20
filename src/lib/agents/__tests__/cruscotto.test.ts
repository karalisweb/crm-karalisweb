import { vi } from "vitest";
vi.mock("@/lib/db", () => ({ db: {} }));
import { describe, expect, it } from "vitest";
import { valuta, type Grezzi } from "../cruscotto";

const base: Grezzi = {
  richiesteMandate: 20, richiesteValutate: 20, richiesteAccettate: 10, fatti121: 9, vocaliInTempo: 9, pontiConfermati: 9,
  presentazioniOttenute: 4, presentazioniDueSettimane: 6, segnalazioniDate: 9, incontri: 2, proposte: 1, clienti: 0,
  invitiInviati: 40, invitiAccettati: 25, bloccoLinkedin: false, aziendeVerificate: 14, aziendeConPonte: 7,
};
const stato = (g: Grezzi, k: string) => valuta(g).find((m) => m.chiave === k)!.stato;

describe("cruscotto", () => {
  it("ha 11 misure, tutte ok in una settimana buona", () => {
    const m = valuta(base);
    expect(m).toHaveLength(11);
    expect(m.filter((x) => x.stato === "allarme")).toHaveLength(0);
  });
  it("accende gli allarmi alle soglie del diagramma", () => {
    expect(stato({ ...base, richiesteMandate: 14 }, "richieste")).toBe("allarme");
    expect(stato({ ...base, richiesteAccettate: 5 }, "accettate")).toBe("allarme");
    expect(stato({ ...base, fatti121: 5 }, "fatti")).toBe("allarme");
    expect(stato({ ...base, vocaliInTempo: 7 }, "vocali")).toBe("allarme");
    expect(stato({ ...base, pontiConfermati: 2 }, "ponti")).toBe("allarme");
    expect(stato({ ...base, presentazioniOttenute: 0, presentazioniDueSettimane: 0 }, "presentazioni")).toBe("allarme");
    expect(stato({ ...base, segnalazioniDate: 0 }, "segnalati")).toBe("allarme");
    expect(stato({ ...base, incontri: 0 }, "incontri")).toBe("allarme");
    expect(stato({ ...base, bloccoLinkedin: true }, "inviti")).toBe("allarme");
    expect(stato({ ...base, aziendeConPonte: 3 }, "serbatoio")).toBe("allarme");
  });
  it("senza dati non inventa: stato non disponibile", () => {
    expect(stato({ ...base, fatti121: 0, vocaliInTempo: 0 }, "vocali")).toBe("nd");
    expect(stato({ ...base, aziendeVerificate: 0, aziendeConPonte: 0 }, "serbatoio")).toBe("nd");
  });
});
