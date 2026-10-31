import { describe, expect, it } from "vitest";
import {
  SETTORI_CALDI, daChiedereOra, domandaAzienda, domandaMembro, nelSettore, ordinaAziende, ordinaMembri, stessaZona, tipoPersona, zonaDa,
  type AziendaDaPresentare, type MembroDaPresentare, type Settori,
} from "../presentazioni-regole";

const piscine: Settori = {
  caso: ["costruzione piscine", "manutenzione piscine", "installazione piscine", "riparazione piscine"],
  interesse: ["manutenzione piscine", "accessori per piscine", "spa e centri benessere"],
};

describe("che persona è", () => {
  it("il caso di Laura: web design è digital", () => {
    expect(tipoPersona("Web Design", "KAIROS COMUNICAZIONE", piscine)).toBe("DIGITAL");
  });
  it("commercialista e avvocato sono acceleratori", () => {
    expect(tipoPersona("Commercialista", "Studio Rossi", piscine)).toBe("ACCELERATORE");
    expect(tipoPersona("Avvocato civilista", null, piscine)).toBe("ACCELERATORE");
  });
  it("una ditta di piscine è nel settore del caso studio, una spa in quello che interessa", () => {
    expect(tipoPersona("Ditta specializzata in piscine", "Piscine 2000", piscine)).toBe("SETTORE_CASO");
    expect(tipoPersona("Centro benessere e spa", null, piscine)).toBe("SETTORE_INTERESSE");
    expect(tipoPersona("Ristorante", "Da Mario", piscine)).toBe("ALTRO");
  });
  it("piscina e piscine sono lo stesso settore", () => {
    expect(nelSettore("Manutenzione piscina privata", piscine.caso)).toBe(true);
    expect(nelSettore("Pizzeria", piscine.caso)).toBe(false);
  });
});

describe("i settori caldi", () => {
  const caldi: Settori = { caso: piscine.caso, interesse: Object.values(SETTORI_CALDI).flat() };
  it("casa, turismo e benessere sono caldi; le piscine restano del caso studio", () => {
    expect(tipoPersona("Serramenti e infissi", null, caldi)).toBe("SETTORE_INTERESSE");
    expect(tipoPersona("Movimento terra e scavi", null, caldi)).toBe("SETTORE_INTERESSE");
    expect(tipoPersona("Noleggio piattaforme aeree", null, caldi)).toBe("SETTORE_INTERESSE");
    expect(tipoPersona("Bed and Breakfast", null, caldi)).toBe("SETTORE_INTERESSE");
    expect(tipoPersona("Catering e banqueting", null, caldi)).toBe("SETTORE_INTERESSE");
    expect(tipoPersona("Osteopata", null, caldi)).toBe("SETTORE_INTERESSE");
    expect(tipoPersona("Centro estetico", null, caldi)).toBe("SETTORE_INTERESSE");
    expect(tipoPersona("Piscine, Spa & Saune", "Piscine Arcobaleno Srl", caldi)).toBe("SETTORE_CASO");
    expect(tipoPersona("Software gestionale", null, caldi)).toBe("ALTRO");
    expect(tipoPersona("Diritto immobiliare", "Avv. Rossi", caldi)).toBe("ACCELERATORE");
    expect(nelSettore("Servizi e prodotti multimediali", caldi.interesse)).toBe(false);
  });
});

describe("la zona", () => {
  it("legge la provincia dall'indirizzo e la città dalle note", () => {
    expect(zonaDa("Via Predda Niedda Nord, Strada 3, 07100 Sassari SS")).toEqual({ citta: "Sassari", provincia: "SS" });
    expect(zonaDa("Importato da BNI Connect il 2026-10-17 · città: Porto Torres")).toEqual({ citta: "Porto Torres", provincia: "SS" });
    expect(zonaDa(null, "", "Cagliari")).toEqual({ citta: "Cagliari", provincia: "CA" });
  });
  it("Porto Torres e Alghero sono nella stessa provincia, Cagliari no", () => {
    const laura = zonaDa("città: Porto Torres");
    expect(stessaZona(laura, zonaDa("Via Don Minzoni, 45, 07041 Alghero SS"))).toBe(true);
    expect(stessaZona(laura, zonaDa("09045 Quartu Sant'Elena CA"))).toBe(false);
    expect(stessaZona(laura, { citta: null, provincia: null })).toBe(false);
  });
});

describe("le due liste", () => {
  const m = (nome: string, tipo: MembroDaPresentare["tipo"], punteggio = 0): MembroDaPresentare => ({ id: nome, nome, categoria: null, azienda: null, tipo, punteggio });
  it("i membri: colleghi di mestiere, acceleratori, casi studio, settori caldi, altri", () => {
    const o = ordinaMembri([m("Dario", "DIGITAL"), m("Anna", "ALTRO"), m("Carla", "ACCELERATORE", 10), m("Bruno", "ACCELERATORE", 60), m("Claudio Conti", "SETTORE_CASO"), m("Elio", "SETTORE_INTERESSE")]);
    expect(o.map((x) => x.nome)).toEqual(["Dario", "Bruno", "Carla", "Claudio Conti", "Elio", "Anna"]);
  });
  it("le aziende: LinkedIn, poi rapporti stretti, poi zona; a parità il caso studio", () => {
    const a = (azienda: string, fonte: AziendaDaPresentare["fonte"], settore: AziendaDaPresentare["settore"], decisore: string | null = null): AziendaDaPresentare => ({ presentazioneId: null, leadId: null, azienda, decisore, fonte, settore, citta: null });
    const o = ordinaAziende([a("Zona interesse", "ZONA", "INTERESSE"), a("Zona caso", "ZONA", "CASO"), a("Rapporto", "RAPPORTO", null), a("Linkedin", "LINKEDIN", null)]);
    expect(o.map((x) => x.azienda)).toEqual(["Linkedin", "Rapporto", "Zona caso", "Zona interesse"]);
  });
  it("nella zona, prima la stessa città", () => {
    const z = (azienda: string, stessaCitta: boolean): AziendaDaPresentare => ({ presentazioneId: null, leadId: null, azienda, decisore: "X", fonte: "ZONA", settore: "CASO", citta: null, stessaCitta });
    expect(ordinaAziende([z("Olbia", false), z("Porto Torres", true)]).map((x) => x.azienda)).toEqual(["Porto Torres", "Olbia"]);
  });
  it("al massimo 3 richieste: fino a 2 membri, sempre almeno un'azienda", () => {
    expect(daChiedereOra([1, 2, 3], ["a", "b", "c"])).toEqual({ membri: [1, 2], aziende: ["a"] });
    expect(daChiedereOra([1], ["a", "b", "c"])).toEqual({ membri: [1], aziende: ["a", "b"] });
    expect(daChiedereOra([], ["a", "b", "c", "d"])).toEqual({ membri: [], aziende: ["a", "b", "c"] });
    expect(daChiedereOra([1, 2, 3], [])).toEqual({ membri: [1, 2], aziende: [] });
  });
});

describe("le frasi", () => {
  it("si chiede per nome di chi decide", () => {
    expect(domandaAzienda({ azienda: "Piscine 2000", decisore: "Piermario Testoni" })).toBe("Conosci Piermario Testoni di Piscine 2000? Me lo presenti?");
    expect(domandaAzienda({ azienda: "Accadueo", decisore: "Accadueo Sardegna (Socio)" })).toBe("Conosci il socio di Accadueo? Me lo presenti?");
    expect(domandaAzienda({ azienda: "Sorgente Solare", decisore: null })).toBe("Conosci qualcuno in Sorgente Solare? Chi decide lì?");
    expect(domandaAzienda({ azienda: "", decisore: "Mario Rossi" })).toBe("Conosci bene Mario Rossi? Me lo presenti?");
    expect(domandaMembro({ nome: "Mario Rossi", categoria: "Commercialista" })).toContain("Mi presenti Mario Rossi (commercialista)?");
  });
});
