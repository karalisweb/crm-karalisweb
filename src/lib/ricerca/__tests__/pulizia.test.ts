import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));
import { nomeAziendaGenerico } from "../regole";
import { eNonAzienda } from "@/lib/agents/esploratore";
import { fallimentoTecnico } from "@/lib/agents/motore";
import { motivoDaNota, notaMotivo } from "../scarti";
import { detectFranchise } from "@/lib/franchise-brands";

describe("nomi che sono un mestiere, non un'azienda", () => {
  it("scarta i titoli generici di LinkedIn", () => {
    for (const n of ["Libero professionista", "Studio di architettura e progettazione", "Freelance", "Consulente del lavoro e aziendale", "Lavoratore autonomo", "Studio Legale", "Titolare", ""]) {
      expect(nomeAziendaGenerico(n), n).toBe(true);
    }
  });
  it("tiene i nomi con una parola propria", () => {
    for (const n of ["Studio Legale Dedoni", "MASA STP Consulenza & Partners Srl", "Dott.House", "Sardegna Piscine Srl", "Edilsud Appalti S.R.L."]) {
      expect(nomeAziendaGenerico(n), n).toBe(false);
    }
  });
});

describe("siti che non sono di un'azienda", () => {
  it("domini parcheggiati ed elenchi di imprese", () => {
    expect(eNonAzienda("parking.nidoma.com")).toBe(true);
    expect(eNonAzienda("0789845015.telefono.click")).toBe(true);
    expect(eNonAzienda("welinkbuilders.it")).toBe(true);
    expect(eNonAzienda("overplace.com")).toBe(true);
  });
  it("non tocca le aziende vere con parole simili", () => {
    expect(eNonAzienda("parkingcagliari.it")).toBe(false);
    expect(eNonAzienda("jordan.com")).toBe(false);
    expect(eNonAzienda("sardegnapiscine.it")).toBe(false);
  });
  it("Piscine Laghetto è una catena", () => {
    expect(detectFranchise("Piscinelaghetto", "https://piscinelaghetto.com")).toBeTruthy();
  });
});

describe("controllo di chi decide fallito", () => {
  it("il permesso di Chrome non conta come 'senza collegamento'", () => {
    expect(fallimentoTecnico("Permesso del browser per aprire linkedin.com non concesso: la richiesta di approvazione in Chrome è rimasta senza risposta")).toBe(true);
    expect(fallimentoTecnico("Chrome raggiungibile ma la navigazione su linkedin.com chiede un'approvazione manuale")).toBe(true);
    expect(fallimentoTecnico("Accesso a LinkedIn non autorizzato in Chrome")).toBe(true);
  });
  it("un'azienda non trovata conta", () => {
    expect(fallimentoTecnico("Azienda non presente su LinkedIn, nessun titolare trovato")).toBe(false);
    expect(fallimentoTecnico(null)).toBe(false);
  });
});

describe("motivo dello scarto", () => {
  it("si scrive e si rilegge", () => {
    expect(motivoDaNota(notaMotivo("  è una catena "))).toBe("è una catena");
    expect(motivoDaNota("Senza collegamento: chi decide non è collegato a te")).toBeNull();
  });
});

describe("Approfondisci lancia tutti gli agenti", async () => {
  const { agentiApprofondimento } = await import("@/lib/agents/catalogo");
  it("con il sito: tutti, anche quelli a mano, tranne Trova sito", () => {
    const server = agentiApprofondimento("server", true);
    expect(server).toEqual(expect.arrayContaining(["posizioni", "sito_visto", "contatto", "lettore", "recensioni", "concorrenti", "tracciamenti", "google_ads", "meta_ads", "social"]));
    expect(server).not.toContain("trova_sito");
    expect(server).not.toContain("ganci");
    expect(agentiApprofondimento("mac", true)).toEqual(["linkedin_azienda", "decision_maker"]);
  });
  it("senza sito: solo quelli che non leggono il sito", () => {
    expect(agentiApprofondimento("server", false).sort()).toEqual(["concorrenti", "meta_ads", "recensioni", "social"]);
    expect(agentiApprofondimento("mac", false)).toEqual(["linkedin_azienda", "decision_maker"]);
  });
});
