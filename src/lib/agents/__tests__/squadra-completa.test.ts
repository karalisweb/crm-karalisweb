import { describe, it, expect, vi } from "vitest";

// Qui si provano solo funzioni pure: il database non serve (e non deve essere toccato).
vi.mock("@/lib/db", () => ({ db: {} }));
import { browserDaAccodare, prontoPerSintesi, sintesiDaFare, AGENTI_BROWSER_AZIENDA, type StatoAgenteSuAzienda } from "../regista";
import { stessoRuolo, eSardo, formatoDa, dirigenzaDa } from "../bni-regole";
import { refertoPosizioni, parolaChiave } from "../agenti/posizioni";
import { refertoGoogleAds } from "../agenti/google-ads";
import { eNonAzienda, nomeDaTitolo } from "../esploratore";
import { citazioneVera } from "../materiali";
import { cittaDaIndirizzo } from "../turno";
import { SchemaChiusura } from "../browser";
import type { RefertoLetto } from "../tipi";

const oggi = new Date("2026-10-16T10:00:00Z");
const giorni = (n: number) => new Date(oggi.getTime() + n * 86400_000);
const stato = (agente: string, x: Partial<StatoAgenteSuAzienda> = {}): StatoAgenteSuAzienda => ({
  agente, validoFino: null, fallimentiDiFila: 0, ultimoFallimento: null, inCorso: false, ...x,
});

describe("Regista: approfondimento e sintesi", () => {
  it("accoda i lavori di browser una volta sola, non li riprova se falliti", () => {
    expect(browserDaAccodare([], oggi)).toEqual([...AGENTI_BROWSER_AZIENDA]);
    const piano = browserDaAccodare([
      stato("social", { inCorso: true }),
      stato("meta_ads", { fallimentiDiFila: 1 }),
      stato("linkedin_azienda", { validoFino: giorni(10) }),
      stato("decision_maker", { validoFino: giorni(-1) }),
    ], oggi);
    expect(piano).toEqual(["decision_maker"]);
  });

  it("la sintesi aspetta che tutti abbiano chiuso, anche fallendo", () => {
    const tutti = ["lettore", "posizioni", "google_ads", ...AGENTI_BROWSER_AZIENDA];
    const chiusi = tutti.map((a) => stato(a, { validoFino: giorni(5) }));
    expect(prontoPerSintesi(chiusi, oggi)).toBe(true);
    const unoInCoda = chiusi.map((s) => (s.agente === "social" ? { ...s, validoFino: null, inCorso: true } : s));
    expect(prontoPerSintesi(unoInCoda, oggi)).toBe(false);
    const unoFallito = chiusi.map((s) => (s.agente === "social" ? { ...s, validoFino: null, fallimentiDiFila: 1 } : s));
    expect(prontoPerSintesi(unoFallito, oggi)).toBe(true);
  });

  it("la catena di sintesi si rifà se manca anche un solo anello", () => {
    const fatta = ["coerenza", "regista_video", "scheda_leve", "aggancio"].map((a) => stato(a, { validoFino: giorni(10) }));
    expect(sintesiDaFare(fatta, oggi)).toBe(false);
    expect(sintesiDaFare(fatta.slice(0, 3), oggi)).toBe(true);
  });
});

describe("Regole BNI: riconoscimenti", () => {
  it("riconosce chi fa il mio mestiere", () => {
    expect(stessoRuolo("Web Agency")).toBe(true);
    expect(stessoRuolo("Consulente marketing digitale")).toBe(true);
    expect(stessoRuolo("Social media manager")).toBe(true);
    expect(stessoRuolo("Commercialista")).toBe(false);
    expect(stessoRuolo("Serramenti e infissi")).toBe(false);
  });

  it("capitoli sardi, formato e dirigenza", () => {
    expect(eSardo({ regioneItaliana: "Sardegna" })).toBe(true);
    expect(eSardo({ region: "sardegna_sud" })).toBe(true);
    expect(eSardo({ regioneItaliana: "Lazio", region: "altro" })).toBe(false);
    expect(formatoDa("Ibrido (presenza + online)")).toBe("IBRIDO");
    expect(formatoDa("Online")).toBe("ONLINE");
    expect(formatoDa(null)).toBe("PRESENZA");
    expect(dirigenzaDa("Vice Presidente")).toBe("VICEPRESIDENTE");
    expect(dirigenzaDa("Presidente")).toBe("PRESIDENTE");
    expect(dirigenzaDa("Coordinatore Formazione")).toBe("FORMAZIONE");
    expect(dirigenzaDa("Coordinatore eventi")).toBe("EVENTI");
    expect(dirigenzaDa("Membro")).toBeNull();
  });
});

describe("Posizioni su Google", () => {
  const items = [
    { type: "organic", rank_absolute: 1, domain: "www.concorrente.it", url: "https://www.concorrente.it/", title: "Concorrente" },
    { type: "local_pack", title: "Mappa" },
    { type: "organic", rank_absolute: 14, domain: "rossi.it", url: "https://rossi.it/", title: "Rossi" },
  ];

  it("costruisce la ricerca da categoria e città", () => {
    expect(parolaChiave("Negozio di Piastrelle", "Cagliari")).toBe("negozio di piastrelle cagliari");
    expect(parolaChiave(null, "Cagliari")).toBeNull();
  });

  it("seconda pagina → leva con i concorrenti davanti", () => {
    const r = refertoPosizioni("piastrelle cagliari", items, "https://www.rossi.it", 1);
    expect(r.findings.posizione).toBe(14);
    expect(r.levers[0].testo).toContain("seconda pagina");
    expect(r.levers[0].prova).toContain("concorrente.it");
  });

  it("assenti → leva; primi tre → nessuna leva", () => {
    expect(refertoPosizioni("x", items, "https://bianchi.it", 1).levers[0].testo).toContain("non li trova");
    expect(refertoPosizioni("x", items, "https://concorrente.it", 1).levers).toHaveLength(0);
  });
});

describe("Google Ads", () => {
  const ref = (agent: string, findings: Record<string, unknown>): RefertoLetto => ({
    agent, findings, summary: "", levers: [], evidence: [], confidence: "ALTA", collectedAt: oggi,
  });

  it("annunci attivi senza conversioni → spendono al buio", () => {
    const r = refertoGoogleAds([{ title: "Ad", last_shown: "2026-10-15 06:03:01 +00:00" }], "https://x.it", [ref("tracciamenti", { hasGoogleAdsTag: true, hasConversionTracking: false })], 0, oggi);
    expect(r.levers[0].testo).toContain("non misura le conversioni");
    expect(r.findings.attiviOra).toBe(1);
  });

  it("solo annunci vecchi → hanno smesso", () => {
    const r = refertoGoogleAds([{ title: "Ad", first_shown: "2024-01-01 00:00:00 +00:00", last_shown: "2025-03-01 00:00:00 +00:00" }], "https://x.it", [], 0, oggi);
    expect(r.levers[0].testo).toContain("hanno smesso");
    expect(r.findings.attiviOra).toBe(0);
  });

  it("tag ma nessun annuncio → campagne ferme", () => {
    const r = refertoGoogleAds([], "https://x.it", [ref("tracciamenti", { hasGoogleAdsTag: true })], 0);
    expect(r.levers[0].testo).toContain("ferme");
  });

  it("niente ads e assenti da Google → leva; niente ads ma primi su Google → nessuna leva", () => {
    const assenti = refertoGoogleAds([], "https://x.it", [ref("posizioni", { parolaChiave: "infissi cagliari", posizione: null })], 0);
    expect(assenti.levers[0].testo).toContain("infissi cagliari");
    const primi = refertoGoogleAds([], "https://x.it", [ref("posizioni", { parolaChiave: "infissi cagliari", posizione: 2 })], 0);
    expect(primi.levers).toHaveLength(0);
  });
});

describe("Esploratore", () => {
  it("scarta portali e directory", () => {
    expect(eNonAzienda("paginegialle.it")).toBe(true);
    expect(eNonAzienda("it.tripadvisor.com")).toBe(true);
    expect(eNonAzienda("rossiinfissi.it")).toBe(false);
  });

  it("ricava il nome dal titolo", () => {
    expect(nomeDaTitolo("Rossi Infissi | Serramenti a Cagliari", "rossiinfissi.it")).toBe("Rossi Infissi");
    expect(nomeDaTitolo("Finestre in pvc a Parma! Serramenti a Parma", "moskito.it")).toBe("Moskito");
    expect(nomeDaTitolo("Serramenti Parma - Gemme Srls", "gemme-srls.it")).toBe("Gemme Srls");
    expect(nomeDaTitolo("Inf.All Vendita Serramenti Infissi Parma Sostituzione Porte", "infall.eu")).toBe("Infall");
  });
});

describe("Utilità", () => {
  it("una citazione vale solo se è davvero nel testo", () => {
    const testo = "Siamo leader nel settore dal 1980. Qualità e cortesia.";
    expect(citazioneVera("leader nel settore dal 1980", testo)).toBe(true);
    expect(citazioneVera("“Leader  nel settore dal 1980”", testo)).toBe(true);
    expect(citazioneVera("i migliori della Sardegna", testo)).toBe(false);
    expect(citazioneVera("dal", testo)).toBe(false);
    expect(citazioneVera("Prodotti / Arredo bagno", "Prodotti Arredo bagno Box doccia")).toBe(true);
    expect(citazioneVera("Prodotti / Cucine inventate", "Prodotti Arredo bagno")).toBe(false);
  });

  it("ricava la città dall'indirizzo", () => {
    expect(cittaDaIndirizzo("Via Roma 1, 09100 Cagliari CA, Italia")).toBe("Cagliari");
    expect(cittaDaIndirizzo("Viale Italia 5, 07100 Sassari SS")).toBe("Sassari");
    expect(cittaDaIndirizzo("Cagliari")).toBe("Cagliari");
    expect(cittaDaIndirizzo("Via senza cap 3, Italia")).toBeNull();
  });

  it("il referto del browser deve rispettare lo schema", () => {
    const id = "0b9d6f0e-8a8c-4e5c-9a3b-2c1d0e9f8a7b";
    const buono = { runId: id, esito: "FATTO", referto: { summary: "Instagram fermo da 8 mesi", findings: { profili: [] }, levers: [{ servizio: "social", testo: "Instagram fermo", prova: "ultimo post 2026-02-01" }], confidence: "ALTA" } };
    expect(SchemaChiusura.safeParse(buono).success).toBe(true);
    expect(SchemaChiusura.safeParse({ ...buono, referto: { ...buono.referto, levers: [{ servizio: "radio", testo: "x", prova: "y" }] } }).success).toBe(false);
    expect(SchemaChiusura.safeParse({ runId: id, esito: "FALLITO", errore: "CAPTCHA su LinkedIn" }).success).toBe(true);
    expect(SchemaChiusura.safeParse({ runId: "non-uuid", esito: "FALLITO", errore: "x x x" }).success).toBe(false);
  });
});
