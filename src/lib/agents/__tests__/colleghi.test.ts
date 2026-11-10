import { describe, expect, it } from "vitest";
import { casoDaColleghi, rilevaConcorrente } from "@/lib/concorrenti";
import { offertaCaso, testoCambioCanale, testoContattoDopoCommenti, testoFollowupContatto, testoMessaggioPagina } from "../rete-regole";
import { passoDi, type Stato } from "../percorso-regole";

// v3.126 (Alessio, 2026-11-10): il collega trovato dal caso di Liliana non si toglie: gli si propone di collaborare.
describe("caso da colleghi", () => {
  it("il caso di Liliana (Consulenza B2B) parla ai colleghi", () => {
    expect(casoDaColleghi({ settore: "Consulenza B2B" })).toBe(true);
    expect(casoDaColleghi({ settore: "business coaching aziendale" })).toBe(true);
    expect(casoDaColleghi({ settore: "Marketing strategico" })).toBe(true);
  });
  it("i casi delle aziende no", () => {
    expect(casoDaColleghi({ settore: "costruzione e manutenzione piscine" })).toBe(false);
    expect(casoDaColleghi({ settore: "segnaletica stradale" })).toBe(false);
    expect(casoDaColleghi({ settore: "Finiture e ristrutturazioni" })).toBe(false);
    expect(casoDaColleghi(null)).toBe(false);
  });
  it("il concorrente resta riconosciuto (fuori dal caso di Liliana si toglie ancora)", () => {
    expect(rilevaConcorrente({ nome: "Maria Letizia Russo | Corsi Linkedin e Linkedin Sales Navigator", categoria: "Consulente di marketing" })).not.toBeNull();
  });
});

describe("messaggio al collega", () => {
  const gancio = "Ho lavorato con una consulente B2B come te: insieme abbiamo reso concreta la sua promessa.";

  it("propone di collaborare e dice cosa porta in più, non vende il caso", () => {
    const t = testoContattoDopoCommenti("Marco Rossi", "Studio Rossi", "linkedin", gancio, true, true, true);
    expect(t).toContain("Ciao Marco");
    expect(t).toContain(gancio);
    expect(t).toMatch(/collaborare/);
    expect(t).toMatch(/io aggiungo quello che a loro manca/);
    expect(t).toContain("così vedi come lavoro");
    expect(t).not.toContain("Credo che possa esserti utile");
  });
  it("senza gancio dice comunque il valore aggiunto", () => {
    const t = offertaCaso("Studio Rossi", null, true, true, true);
    expect(t).toMatch(/sito, campagne/);
    expect(t).toMatch(/collaborare/);
  });
  it("al cliente il messaggio resta quello di prima", () => {
    const t = testoContattoDopoCommenti("Marco Rossi", "Piscine Rossi", "linkedin", gancio, true, true);
    expect(t).toContain("Credo che possa esserti utile. Te lo mando?");
    expect(t).not.toMatch(/collaborare/);
  });
  it("alla pagina, follow-up e cambio canale parlano di collaborare", () => {
    expect(testoMessaggioPagina("Studio Rossi", gancio, true, true)).toMatch(/collaborare/);
    expect(testoFollowupContatto("Marco Rossi", true)).toMatch(/possiamo collaborare/);
    expect(testoFollowupContatto("Marco Rossi")).not.toMatch(/collaborare/);
    expect(testoCambioCanale("Marco Rossi", "email", false, true)).toMatch(/possiamo collaborare/);
  });
  it("nel percorso si vede che è un collega", () => {
    const s: Stato = {
      decisione: "APPROVATO", collegata: true, commenti: null, daConfermare: [],
      lav: { fase: "MAPPATA", strada: "SCALDARE", ponte: null, decisore: "Marco Rossi", chiestaAt: null, presentatoAt: null },
      voci: [{ id: "v1", kind: "RETE_CONTATTO", payload: { messaggio: "…", collega: true } }],
    };
    const e = passoDi(s, new Date());
    expect(e.dentro && e.cosa).toContain("è un collega, proponigli di collaborare");
  });
});
