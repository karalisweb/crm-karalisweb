import { describe, expect, it } from "vitest";
import { indirizzoSardo } from "../motore";

// v3.83: chi va a scaldare da solo deve essere davvero sardo, non solo "trovato a Sanluri".
describe("indirizzoSardo", () => {
  it("riconosce sigla, CAP, prefisso e nome", () => {
    expect(indirizzoSardo("Via Roma, 59, 09013 Carbonia SU")).toBe(true);
    expect(indirizzoSardo("CAP 09025 (Sanluri)")).toBe(true);
    expect(indirizzoSardo("Sassari", { nome: "Eden Sardegna" })).toBe(true);
    expect(indirizzoSardo("Iglesias", { telefono: "+39 0781 123456" })).toBe(true);
  });
  it("una città sarda da sola non basta", () => {
    expect(indirizzoSardo("Sanluri", { nome: "Rossatogroup", telefono: "+39 0423 123456" })).toBe(false);
    expect(indirizzoSardo("Iglesias", { nome: "Digital360" })).toBe(false);
    expect(indirizzoSardo("Via Milano 1, 20100 Milano MI")).toBe(false);
  });
});
