import { describe, it, expect } from "vitest";
import { agentiPrendibili, AZIONI_BROWSER } from "../browser-regole";

/** Gli agenti di browser come sono nel registro (v3.133). */
const TUTTI = [
  "social", "meta_ads", "instagram", "linkedin_azienda", "decision_maker", "cartografo_bni", "rete_membro",
  "scalda", "contatta_persona", "collega", "linkedin_membri", "cerca_meta", "cerca_linkedin",
];

describe("Agente di browser: giorno e notte (v3.134)", () => {
  it("di giorno prende tutto, con i lavori BNI davanti", () => {
    const { bni, altri } = agentiPrendibili(TUTTI, false);
    expect([...bni, ...altri].sort()).toEqual([...TUTTI].sort());
    expect(bni).toEqual(["cartografo_bni", "rete_membro", "linkedin_membri"]);
    expect(altri).toContain("scalda");
  });

  it("di notte non prende i lavori che commentano, collegano o scrivono", () => {
    const { bni, altri } = agentiPrendibili(TUTTI, true);
    for (const a of AZIONI_BROWSER) expect([...bni, ...altri]).not.toContain(a);
    expect(altri).toContain("decision_maker");
    expect(bni).toContain("rete_membro");
    expect(bni.length + altri.length).toBe(TUTTI.length - AZIONI_BROWSER.length);
  });
});
