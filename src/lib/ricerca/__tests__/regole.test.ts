import { describe, it, expect } from "vitest";
import {
  gruppiCapitolo, prossimiDelCapitolo, capitoliInCorso, dirigenzaNota, visitaDaProporre, settimanaDi, coperturaCapitolo,
  type MembroPerRegole, type CapitoloPerScelta,
} from "@/lib/agents/bni-regole";
import {
  prossimaChiave, passoRicerca, terminiDi, normalizzaLinkedin, stessoNome, punteggioBisogno, chiaveUsabile,
  type ChiavePerScelta, type MembroPerBisogno,
} from "../regole";

const oggi = new Date("2026-10-17T08:00:00Z");
const giorni = (n: number) => new Date(oggi.getTime() + n * 86400_000);

const m = (x: Partial<MembroPerRegole> & { id: string }): MembroPerRegole => ({
  name: x.id, profession: null, company: null, phone: "333", leadershipRole: null,
  conosciuto: false, indicato: false, richiestaAt: null, fissato121At: null, rinviato: false, ...x,
});

describe("Ordine nel capitolo", () => {
  it("con un collega del mio ruolo: collega → presidente e formazione/eventi → indicati → altri", () => {
    const g = gruppiCapitolo([
      m({ id: "altro" }),
      m({ id: "vice", leadershipRole: "VICEPRESIDENTE" }),
      m({ id: "pres", leadershipRole: "PRESIDENTE" }),
      m({ id: "form", leadershipRole: "FORMAZIONE" }),
      m({ id: "web", profession: "Web designer" }),
      m({ id: "ind", indicato: true }),
    ]);
    expect(g.map((x) => [x.motivo, x.membri.map((y) => y.id)])).toEqual([
      ["STESSO_RUOLO", ["web"]],
      ["DIRIGENZA", ["form", "pres"]],
      ["INDICATO", ["ind"]],
      ["ALTRI", ["altro", "vice"]],
    ]);
  });

  it("senza collega: prima il presidente, poi chi indica, poi tutti gli altri", () => {
    const g = gruppiCapitolo([
      m({ id: "form", leadershipRole: "FORMAZIONE" }),
      m({ id: "pres", leadershipRole: "PRESIDENTE" }),
      m({ id: "ind", indicato: true }),
    ]);
    expect(g.map((x) => x.motivo)).toEqual(["PRESIDENTE", "INDICATO", "ALTRI"]);
    expect(g[2].membri.map((y) => y.id)).toEqual(["form"]);
  });

  it("chi viene dopo aspetta finché il gruppo prima non è chiuso", () => {
    const membri = [m({ id: "pres", leadershipRole: "PRESIDENTE" }), m({ id: "a" }), m({ id: "b" })];
    expect(prossimiDelCapitolo(membri, oggi).map((p) => p.membro.id)).toEqual(["pres"]);
    // Al presidente è stato chiesto 2 giorni fa: si aspetta, nessun altro.
    membri[0].richiestaAt = giorni(-2);
    expect(prossimiDelCapitolo(membri, oggi)).toEqual([]);
    // Non risponde da 8 giorni: si passa agli altri.
    membri[0].richiestaAt = giorni(-8);
    expect(prossimiDelCapitolo(membri, oggi).map((p) => p.membro.id)).toEqual(["a", "b"]);
    // Il presidente è conosciuto: anche così si va avanti.
    membri[0].richiestaAt = null;
    membri[0].conosciuto = true;
    expect(prossimiDelCapitolo(membri, oggi).map((p) => p.motivo)).toEqual(["ALTRI", "ALTRI"]);
  });

  it("una richiesta scartata da Alessio non blocca chi viene dopo e non si ripropone", () => {
    const membri = [m({ id: "pres", leadershipRole: "PRESIDENTE", rinviato: true }), m({ id: "a" })];
    expect(prossimiDelCapitolo(membri, oggi).map((p) => p.membro.id)).toEqual(["a"]);
  });

  it("senza la dirigenza (capitolo mai letto da BNI Connect) si parte solo da chi fa il mio mestiere", () => {
    const membri = [m({ id: "web", profession: "Web agency" }), m({ id: "a" })];
    expect(prossimiDelCapitolo(membri, oggi, false).map((p) => p.membro.id)).toEqual(["web"]);
    expect(prossimiDelCapitolo([m({ id: "a" })], oggi, false)).toEqual([]);
    expect(dirigenzaNota({ mappedAt: null }, [m({ id: "a" })])).toBe(false);
    expect(dirigenzaNota({ mappedAt: oggi }, [m({ id: "a" })])).toBe(true);
    expect(dirigenzaNota({ mappedAt: null }, [m({ id: "p", leadershipRole: "PRESIDENTE" })])).toBe(true);
  });

  it("un 121 in calendario tiene il gruppo aperto anche dopo 7 giorni", () => {
    const membri = [m({ id: "pres", leadershipRole: "PRESIDENTE", richiestaAt: giorni(-9), fissato121At: giorni(1) }), m({ id: "a" })];
    expect(prossimiDelCapitolo(membri, oggi)).toEqual([]);
  });

  it("copertura", () => {
    expect(coperturaCapitolo([{ conosciuto: true }, { conosciuto: false }, { conosciuto: false }])).toEqual({ totale: 3, conosciuti: 1, percentuale: 33 });
  });
});

describe("Capitoli in corso e visita", () => {
  const c = (x: Partial<CapitoloPerScelta> & { id: string }): CapitoloPerScelta => ({
    nome: x.id, sardo: true, mio: false, conosciuti: 0, totale: 30, daChiedere: 5, ...x,
  });

  it("prima la Sardegna, prima quelli iniziati, poi il mio", () => {
    const scelti = capitoliInCorso([
      c({ id: "lazio", sardo: false, conosciuti: 10 }),
      c({ id: "nuovo" }),
      c({ id: "mio", mio: true }),
      c({ id: "iniziato", conosciuti: 4 }),
      c({ id: "finito", conosciuti: 30 }),
      c({ id: "fermo", conosciuti: 2, daChiedere: 0 }),
    ]);
    expect(scelti.map((x) => x.id)).toEqual(["iniziato", "mio"]);
  });

  it("visita quando hai conosciuto un terzo, una volta sola", () => {
    expect(visitaDaProporre({ conosciuti: 9, totale: 30, visitStatus: "DA_ANALIZZARE" })).toBe(false);
    expect(visitaDaProporre({ conosciuti: 10, totale: 30, visitStatus: "DA_ANALIZZARE" })).toBe(true);
    expect(visitaDaProporre({ conosciuti: 20, totale: 30, visitStatus: "VISITATO" })).toBe(false);
    expect(visitaDaProporre({ conosciuti: 20, totale: 30, visitStatus: null, mio: true })).toBe(false);
  });

  it("la settimana parte il lunedì a mezzanotte, ora di Roma", () => {
    const s = settimanaDi(new Date("2026-10-17T08:00:00Z")); // sabato
    expect(s.inizio.toISOString()).toBe("2026-10-11T22:00:00.000Z"); // lunedì 12 ottobre 00:00 (ora legale)
    expect(s.fine.getTime() - s.inizio.getTime()).toBe(7 * 86400_000);
    const inverno = settimanaDi(new Date("2026-12-07T10:00:00Z")); // lunedì
    expect(inverno.inizio.toISOString()).toBe("2026-12-06T23:00:00.000Z");
  });
});

describe("Chiavi di ricerca", () => {
  const k = (x: Partial<ChiavePerScelta> & { id: string }): ChiavePerScelta => ({
    tipo: "SETTORE", attiva: true, scadeAt: giorni(100), esauritaAt: null, ultimoUsoAt: null, createdAt: giorni(-10), ...x,
  });

  it("usa la chiave usata meno di recente, fra quelle valide del tipo giusto", () => {
    const chiavi = [
      k({ id: "usata", ultimoUsoAt: giorni(-1) }),
      k({ id: "scaduta", scadeAt: giorni(-1) }),
      k({ id: "persona", tipo: "PERSONA" }),
      k({ id: "vecchia", ultimoUsoAt: giorni(-5) }),
    ];
    expect(prossimaChiave(chiavi, ["SETTORE", "AZIENDA"], oggi)?.id).toBe("vecchia");
    expect(prossimaChiave(chiavi, ["PERSONA", "RETE_MEMBRO"], oggi)?.id).toBe("persona");
    expect(chiaveUsabile(k({ id: "x", esauritaAt: giorni(-1) }), oggi)).toBe(false);
  });

  it("alterna termini e zone: prima tutta la Sardegna", () => {
    const t = terminiDi("piscine", ["Costruzione piscine", "PISCINE", "xy"]);
    expect(t).toEqual(["piscine", "Costruzione piscine"]);
    expect(passoRicerca(t, 0)).toEqual({ termine: "piscine", zona: "Cagliari" });
    expect(passoRicerca(t, 1)).toEqual({ termine: "Costruzione piscine", zona: "Cagliari" });
    expect(passoRicerca(t, 2)).toEqual({ termine: "piscine", zona: "Quartu Sant'Elena" });
    expect(passoRicerca(t, 10_000)).toBeNull();
  });
});

describe("Doppioni", () => {
  it("profili LinkedIn in forma unica", () => {
    expect(normalizzaLinkedin("https://it.linkedin.com/in/Fabrizio-Coni-123/?originalSubdomain=it")).toBe("https://www.linkedin.com/in/fabrizio-coni-123");
    expect(normalizzaLinkedin("linkedin.com/company/iem-piscine/")).toBe("https://www.linkedin.com/company/iem-piscine");
    expect(normalizzaLinkedin("https://example.com")).toBeNull();
  });

  it("stessa azienda anche con forma societaria e punteggiatura diverse", () => {
    expect(stessoNome("IEM Piscine S.r.l.", "iem piscine")).toBe(true);
    expect(stessoNome("Rossi & Figli snc", "ROSSI FIGLI")).toBe(true);
    expect(stessoNome("IEM Piscine", "Piscine Bianchi")).toBe(false);
  });
});

describe("Ricerca per bisogno fra i membri", () => {
  const b = (x: Partial<MembroPerBisogno>): MembroPerBisogno => ({
    name: "X", profession: null, company: null, chapter: null, cosaFa: null, seeking: null, referenzePuoDare: null, conosciuto: false, ...x,
  });

  it("il mestiere conta più delle note; chi non c'entra resta fuori", () => {
    const commercialista = b({ profession: "Commercialista", chapter: "Karalis" });
    const nominato = b({ profession: "Avvocato", cosaFa: "lavora spesso con un commercialista" });
    const fuori = b({ profession: "Fotografo" });
    const q = "mi serve un commercialista";
    expect(punteggioBisogno(q, commercialista)).toBeGreaterThan(punteggioBisogno(q, nominato));
    expect(punteggioBisogno(q, fuori)).toBe(0);
    expect(punteggioBisogno("commercialisti", commercialista)).toBeGreaterThan(0);
  });

  it("chi conosce aziende di piscine: cerca nelle referenze che può dare", () => {
    const fornitore = b({ profession: "Materiali edili", referenzePuoDare: "imprese edili e aziende di piscine della zona" });
    expect(punteggioBisogno("chi conosce aziende di piscine", fornitore)).toBeGreaterThan(0);
  });
});
