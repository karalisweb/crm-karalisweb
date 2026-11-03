import { describe, expect, it } from "vitest";
import { componiReport, type DatiReport } from "@/lib/daily-report";

const base: DatiReport = {
  giorno: "martedì 3 novembre",
  oggi: { incontri: [{ nome: "Sergio Piras", ora: "10:20" }], call: [], vendita: [], messaggiDaMandare: 2, membriDaContattare: 5, daPreparare: 0, daRegistrare: 0, aziendeDaDecidere: 0 },
  ieri: { approvateDaTe: 3, fatti121: 1, presentazioniChieste: 0, presentazioniOttenute: 0, commentiCrm: 4, messaggiCrm: 1, callFissate: 0 },
  soldi: { trattativeAperte: 2, valoreAperte: 8000, clientiMese: 1, valoreMese: 4000 },
  daSistemare: { presentazioniFerme: 0, segnalazioni: 0 },
  cassettaTotale: 40,
  url: "https://crm.example",
};

describe("report del mattino", () => {
  it("mette prima le cose di oggi e conta solo quelle nell'oggetto", () => {
    const r = componiReport(base);
    expect(r.oggetto).toBe("☀️ Oggi: 3 cose da fare");
    expect(r.testo.indexOf("OGGI")).toBeLessThan(r.testo.indexOf("IERI"));
    expect(r.testo).toContain("121 alle 10:20 con Sergio Piras");
    expect(r.testo).toContain("Il CRM da solo: 4 commenti pubblicati, 1 messaggio LinkedIn a chi decide");
    expect(r.testo).toContain("8.000 € in ballo");
  });

  it("nasconde il blocco da sistemare se non c'è niente", () => {
    expect(componiReport(base).testo).not.toContain("DA SISTEMARE");
    expect(componiReport({ ...base, daSistemare: { presentazioniFerme: 2, segnalazioni: 0 } }).testo).toContain("DA SISTEMARE");
  });

  it("scappa i nomi nell'HTML", () => {
    const r = componiReport({ ...base, oggi: { ...base.oggi, incontri: [{ nome: "A <b>", ora: "9:00" }] } });
    expect(r.html).toContain("A &lt;b&gt;");
  });
});
