import { describe, expect, it } from "vitest";
import { eAutomatica, filtroMittente, stessoMittente, testoRisposta } from "../risposte-regole";

describe("risposte alle mail", () => {
  it("dominio aziendale: vale anche un collega; casella gratuita: solo quella", () => {
    expect(filtroMittente("info@piscine.it")).toBe("@piscine.it");
    expect(stessoMittente("mario@piscine.it", "@piscine.it")).toBe(true);
    expect(filtroMittente("mario.rossi@gmail.com")).toBe("mario.rossi@gmail.com");
    expect(stessoMittente("altro@gmail.com", "mario.rossi@gmail.com")).toBe(false);
  });
  it("riconosce fuori ufficio e mancati recapiti", () => {
    expect(eAutomatica("Risposta automatica: fuori ufficio", "a@b.it")).toBe(true);
    expect(eAutomatica("Undelivered Mail", "MAILER-DAEMON@x.it")).toBe(true);
    expect(eAutomatica("Re: il caso studio", "a@b.it", "auto-replied")).toBe(true);
    expect(eAutomatica("Re: il caso studio", "a@b.it", "no")).toBe(false);
  });
  it("toglie la mail citata", () => {
    expect(testoRisposta("Sì, mandamelo pure.\n\nIl 5 nov 2026, Alessio ha scritto:\n> Posso mandarglielo?")).toBe("Sì, mandamelo pure.");
  });
});
