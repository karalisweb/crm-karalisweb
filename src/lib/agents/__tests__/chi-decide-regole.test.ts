import { describe, expect, it } from "vitest";
import { contattiDaRisultati, nomePulito, parlaDi, personeVerificate, type Fonte } from "../chi-decide-regole";

const sito: Fonte = { url: "https://x.it/chi-siamo", titolo: "Sito", testo: "La ditta è guidata da Mario Rossi, titolare dal 1990.", delSito: true };
const li: Fonte = { url: "https://it.linkedin.com/in/mario-rossi-1", titolo: "Mario Rossi - Titolare - Piscine Blu | LinkedIn", testo: "Titolare presso Piscine Blu", delSito: false };
const altro: Fonte = { url: "https://y.it", titolo: "Altra azienda", testo: "Luigi Verdi, amministratore di Edil Nord.", delSito: false };

describe("chi decide dal server", () => {
  it("pulisce il nome", () => {
    expect(nomePulito("Sub Service S.r.l.")).toBe("Sub Service");
    expect(nomePulito("Network Imprenditoriamo - Consulenza aziendale")).toBe("Network Imprenditoriamo");
  });
  it("tiene chi ha una citazione vera e aggancia il profilo giusto", () => {
    const p = personeVerificate([{ nome: "Mario Rossi", ruolo: "Titolare", citazione: "guidata da Mario Rossi, titolare" }], [sito, li], "Piscine Blu Srl");
    expect(p).toHaveLength(1);
    expect(p[0].profilo).toContain("/in/mario-rossi-1");
  });
  it("scarta citazioni inventate, fonti su altre aziende e dipendenti", () => {
    expect(personeVerificate([{ nome: "Anna Bianchi", ruolo: "Titolare", citazione: "Anna Bianchi è la titolare" }], [sito], "Piscine Blu")).toHaveLength(0);
    expect(personeVerificate([{ nome: "Luigi Verdi", ruolo: "Amministratore", citazione: "Luigi Verdi, amministratore" }], [altro], "Piscine Blu")).toHaveLength(0);
    const dip: Fonte = { ...sito, testo: "Paolo Neri, commerciale della ditta." };
    expect(personeVerificate([{ nome: "Paolo Neri", ruolo: "Commerciale", citazione: "Paolo Neri, commerciale" }], [dip], "Piscine Blu")).toHaveLength(0);
  });
  it("il nome nell'azienda è il titolare", () => {
    const p = personeVerificate([{ nome: "Antonello Floris", ruolo: "", citazione: "" }], [altro], "Studio Antonello Floris");
    expect(p[0].ruolo).toBe("Titolare");
  });
  it("contatti solo dai risultati su quell'azienda, cellulare prima, niente PEC", () => {
    const f: Fonte[] = [{ url: "a", titolo: "Studio Floris Cagliari", testo: "Tel 070 123456 - cell. 347 1234567 - floris@pec.it - info@studiofloris.it", delSito: false }, { url: "b", titolo: "Altro", testo: "333 9999999 x@y.it", delSito: false }];
    expect(contattiDaRisultati(f, "Studio Antonello Floris").telefono).toBeNull();
    expect(parlaDi("Studio Antonello Floris Cagliari", "Studio Antonello Floris")).toBe(true);
    const g = contattiDaRisultati([{ ...f[0], titolo: "Studio Antonello Floris" }, f[1]], "Studio Antonello Floris");
    expect(g.telefono).toBe("3471234567");
    expect(g.email).toBe("info@studiofloris.it");
  });
});
