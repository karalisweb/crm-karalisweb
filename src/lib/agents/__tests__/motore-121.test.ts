import { describe, expect, it } from "vitest";
import {
  bloccoLinkedin, collegamentoDa, ferialiRimasti, forzaPonte, invitiDisponibili, lettureDi, lettureDisponibili,
  messaggioPresentazione, puntiDa, richiesteDaPreparare,
} from "../motore-121";

// Date in ora di Roma (CEST, +02:00 a ottobre).
const lun = new Date("2026-10-19T14:00:00+02:00");
const mer = new Date("2026-10-21T14:00:00+02:00");
const ven = new Date("2026-10-23T14:00:00+02:00");
const sab = new Date("2026-10-24T14:00:00+02:00");

describe("richieste di 121", () => {
  it("divide le 20 della settimana sui giorni feriali che restano", () => {
    expect(ferialiRimasti(lun)).toBe(5);
    expect(richiesteDaPreparare({ preparateSettimana: 0, questaSettimana: 0, prossimaSettimana: 0 }, lun)).toBe(4);
    expect(richiesteDaPreparare({ preparateSettimana: 8, questaSettimana: 3, prossimaSettimana: 2 }, mer)).toBe(4);
    expect(richiesteDaPreparare({ preparateSettimana: 18, questaSettimana: 3, prossimaSettimana: 2 }, ven)).toBe(2);
  });
  it("niente richieste nel fine settimana né oltre le 20", () => {
    expect(richiesteDaPreparare({ preparateSettimana: 0, questaSettimana: 0, prossimaSettimana: 0 }, sab)).toBe(0);
    expect(richiesteDaPreparare({ preparateSettimana: 20, questaSettimana: 0, prossimaSettimana: 0 }, mer)).toBe(0);
  });
  it("si ferma quando il tetto di 12 121 è pieno, questa settimana o la prossima", () => {
    expect(richiesteDaPreparare({ preparateSettimana: 4, questaSettimana: 12, prossimaSettimana: 0 }, mer)).toBe(0);
    expect(richiesteDaPreparare({ preparateSettimana: 4, questaSettimana: 5, prossimaSettimana: 12 }, mer)).toBe(0);
    expect(richiesteDaPreparare({ preparateSettimana: 4, questaSettimana: 11, prossimaSettimana: 11 }, mer)).toBeGreaterThan(0);
  });
});

describe("LinkedIn", () => {
  it("inviti: 12 al giorno, 100 a settimana, mai nel fine settimana o dopo un blocco", () => {
    expect(invitiDisponibili(0, 0, mer)).toBe(12);
    expect(invitiDisponibili(5, 0, mer)).toBe(7);
    expect(invitiDisponibili(0, 95, mer)).toBe(5);
    expect(invitiDisponibili(0, 0, sab)).toBe(0);
    expect(invitiDisponibili(0, 0, mer, true)).toBe(0);
  });
  it("letture: costo per agente e stop dopo un blocco", () => {
    expect(lettureDi("decision_maker")).toBe(2);
    expect(lettureDi("linkedin_membri", { membri: [1, 2, 3] })).toBe(3);
    expect(lettureDi("rete_membro", { aziendeDaCercare: [1, 2, 3, 4] })).toBe(5);
    expect(lettureDi("tecnico")).toBe(0);
    expect(lettureDisponibili(20, false)).toBe(5);
    expect(lettureDisponibili(0, true)).toBe(0);
  });
  it("riconosce gli errori di blocco", () => {
    expect(bloccoLinkedin("Compare un CAPTCHA")).toBe(true);
    expect(bloccoLinkedin("LinkedIn chiede una verifica di sicurezza")).toBe(true);
    expect(bloccoLinkedin("Raggiunto il limite di ricerche commerciali")).toBe(true);
    expect(bloccoLinkedin("Profilo bloccato temporaneamente")).toBe(true);
    expect(bloccoLinkedin("Azienda non trovata")).toBe(false);
    expect(bloccoLinkedin("Sito non verificato, azienda incerta")).toBe(false);
    expect(bloccoLinkedin("Superato il limite di 3 ricerche per azienda")).toBe(false);
  });
});

describe("punti di contatto", () => {
  it("legge codici e parole, senza doppioni", () => {
    expect(puntiDa(["STESSA_CITTA", "stessa città", "Hanno lavorato insieme in Tiscali"])).toEqual(["STESSA_CITTA", "STESSA_AZIENDA"]);
    expect(puntiDa("si commentano i post; capitolo BNI Atlantide")).toEqual(["COMMENTI_RECIPROCI", "MEMBRO_BNI"]);
    expect(puntiDa(null)).toEqual([]);
  });
  it("la forza è la somma dei pesi, 1 se non si sa nulla", () => {
    expect(forzaPonte([])).toBe(1);
    expect(forzaPonte(["STESSA_AZIENDA", "STESSA_CITTA"])).toBe(4);
  });
});

describe("collegamento di un'azienda", () => {
  it("collegata con un contatto diretto o almeno uno in comune", () => {
    expect(collegamentoDa([{ grado: 1, contattiInComune: [] }]).collegata).toBe(true);
    expect(collegamentoDa([{ grado: 2, contattiInComune: ["Mario Rossi"] }])).toEqual({ collegata: true, inComune: 1, diretto: false });
    expect(collegamentoDa([{ grado: 2, contattiInComune: [], numeroInComune: 12 }]).inComune).toBe(12);
    expect(collegamentoDa([{ grado: 3, contattiInComune: [] }]).collegata).toBe(false);
    expect(collegamentoDa([]).collegata).toBe(false);
  });
});

describe("messaggi", () => {
  it("chiede la presentazione con il nome proprio del membro", () => {
    const m = messaggioPresentazione("Giovanni Mocci", "Pietro Deiana", "Centro Piscine");
    expect(m.startsWith("Ciao Giovanni,")).toBe(true);
    expect(m).toContain("Pietro Deiana di Centro Piscine");
  });
});
