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
    expect(agentiApprofondimento("mac", true)).toEqual(["instagram", "linkedin_azienda", "decision_maker"]);
  });
  it("senza sito: solo quelli che non leggono il sito", () => {
    expect(agentiApprofondimento("server", false).sort()).toEqual(["concorrenti", "meta_ads", "recensioni", "scheda_google", "social"]);
    expect(agentiApprofondimento("mac", false)).toEqual(["instagram", "linkedin_azienda", "decision_maker"]);
  });
});

describe("social cercati per nome", async () => {
  const { profiliDaRisultati } = await import("@/lib/agents/social-per-nome");
  it("tiene i profili il cui titolo ha il nome, scarta gli altri", () => {
    const p = profiliDaRisultati([
      { type: "organic", url: "https://www.facebook.com/sharer/sharer.php?u=x", title: "Lotta Marco costruzioni" },
      { type: "organic", url: "https://it-it.facebook.com/lottamarcocostruzioni/?locale=it", title: "Lotta Marco Costruzioni | Siamaggiore" },
      { type: "organic", url: "https://www.instagram.com/p/ABC123/", title: "Lotta Marco su Instagram" },
      { type: "organic", url: "https://www.instagram.com/lottamarco_edilizia/", title: "Lotta Marco (@lottamarco_edilizia)" },
      { type: "organic", url: "https://it.linkedin.com/company/altra-ditta", title: "Altra Ditta Srl | LinkedIn" },
    ], "Lotta Marco");
    expect(p).toEqual({ facebook: "https://www.facebook.com/lottamarcocostruzioni", instagram: "https://www.instagram.com/lottamarco_edilizia", linkedin: null });
  });
});

describe("il sito è attivo?", async () => {
  const { segniDiVita } = await import("@/lib/agents/segni-vita");
  const oggi = new Date("2026-10-23T08:00:00Z");
  it("legge l'anno nel piè di pagina e l'ultima data", () => {
    const v = segniDiVita(`<html><body><article><time datetime="2023-04-02">2 aprile</time><p>Pubblicato il 15/06/2022</p></article><footer>© 2014-2019 Edil Srl</footer></body></html>`, oggi);
    expect(v.annoPiePagina).toBe(2019);
    expect(v.ultimaData).toBe("2023-04-02");
    expect(v.giorniUltimaData).toBeGreaterThan(900);
  });
  it("niente date: null", () => {
    expect(segniDiVita("<html><body><p>Ciao</p></body></html>", oggi)).toEqual({ annoPiePagina: null, ultimaData: null, giorniUltimaData: null });
  });
});
