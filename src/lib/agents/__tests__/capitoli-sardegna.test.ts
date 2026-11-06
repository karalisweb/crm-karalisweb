import { describe, expect, it } from "vitest";
import { capitoliInCorso, type CapitoloPerScelta } from "../bni-regole";

const c = (id: string, sardo: boolean, conosciuti: number, totale: number, daChiedere: number): CapitoloPerScelta => ({ id, nome: id, sardo, mio: false, conosciuti, totale, daChiedere });

describe("prima tutta la Sardegna, poi il Lazio (v3.113)", () => {
  it("con la Sardegna da finire il Lazio non entra, anche se i sardi non hanno nessuno da chiedere adesso", () => {
    expect(capitoliInCorso([c("cagliari", true, 5, 20, 0), c("roma", false, 0, 30, 10)], 10).map((x) => x.id)).toEqual([]);
  });
  it("con la Sardegna da finire si lavorano solo i sardi", () => {
    expect(capitoliInCorso([c("roma", false, 0, 30, 10), c("sassari", true, 2, 20, 4)], 10).map((x) => x.id)).toEqual(["sassari"]);
  });
  it("Sardegna finita: si passa al Lazio", () => {
    expect(capitoliInCorso([c("cagliari", true, 20, 20, 0), c("roma", false, 0, 30, 10)], 10).map((x) => x.id)).toEqual(["roma"]);
  });
});
