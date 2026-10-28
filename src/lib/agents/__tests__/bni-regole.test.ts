import { describe, expect, it } from "vitest";
import { capitoloSenza121 } from "../bni-regole";

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
