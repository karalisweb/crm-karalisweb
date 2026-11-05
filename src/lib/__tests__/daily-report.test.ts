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

describe("report del mattino (v3.98: solo ieri)", () => {
  it("dice solo com'è andata ieri e i soldi, niente cose da fare", () => {
    const r = componiReport(base);
    expect(r.oggetto).toBe("📅 Com'è andata ieri");
    expect(r.testo).toContain("IERI");
    expect(r.testo).not.toContain("OGGI");
    expect(r.testo).not.toContain("121 alle 10:20 con Sergio Piras");
    expect(r.testo).not.toContain("DA SISTEMARE");
    expect(r.testo).not.toContain("Cassetta");
    expect(r.testo).toContain("Il CRM da solo: 4 commenti pubblicati, 1 messaggio LinkedIn a chi decide");
    expect(r.testo).toContain("8.000 € in ballo");
  });

  it("ha il pulsante per aprire Oggi", () => {
    expect(componiReport(base).html).toContain("apri Oggi");
  });
});
