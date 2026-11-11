import { describe, expect, it } from "vitest";
import {
  capienzaLavorazione, forzaAzienda, nomiDaConfermare, prossimaAzione, settimanaConPosto, stessaPersona, strade, testoRichiestaPonte,
  type DatiAzienda,
  frequenzaTesto, canaliInOrdine, paginaPreferita, piattaformaConsigliata, piattaformaDi, testoContattoDopoCommenti, testoMessaggioPagina, piattaformaPersona,
  pulisciContattoManuale, testoCambioCanale, canaleDallaNota,
} from "../rete-regole";

describe("contatto trovato a mano (v3.125)", () => {
  it("un cellulare vale per WhatsApp, in qualunque modo sia scritto", () => {
    for (const t of ["347 123 4567", "+39 347.123.4567", "00393471234567", "3471234567"]) {
      expect(pulisciContattoManuale({ telefono: t })).toEqual({ ok: true, email: null, telefono: "+393471234567", whatsapp: "393471234567" });
    }
  });
  it("un cellulare che inizia per 39 non perde il prefisso", () => {
    expect(pulisciContattoManuale({ telefono: "392 123 4567" })).toMatchObject({ whatsapp: "393921234567" });
  });
  it("un fisso si salva ma WhatsApp no", () => {
    expect(pulisciContattoManuale({ telefono: "070 123456" })).toEqual({ ok: true, email: null, telefono: "+39070123456", whatsapp: null });
  });
  it("un numero estero vale per WhatsApp", () => {
    expect(pulisciContattoManuale({ telefono: "+41 79 123 45 67" })).toMatchObject({ telefono: "+41791234567", whatsapp: "41791234567" });
  });
  it("la mail si mette in ordine, quelle sbagliate no", () => {
    expect(pulisciContattoManuale({ email: " Mario.Rossi@Azienda.IT " })).toMatchObject({ ok: true, email: "mario.rossi@azienda.it" });
    expect(pulisciContattoManuale({ email: "mario@azienda" })).toEqual({ ok: false, errore: "La mail non sembra giusta" });
  });
  it("niente da salvare o numero assurdo: errore", () => {
    expect(pulisciContattoManuale({ email: " ", telefono: "" }).ok).toBe(false);
    expect(pulisciContattoManuale({ telefono: "12345" })).toEqual({ ok: false, errore: "Il numero non sembra giusto" });
  });
  it("il messaggio dice da dove gli avevi scritto", () => {
    expect(testoCambioCanale("Mario Rossi", "LinkedIn")).toContain("Ciao Mario, ti avevo scritto su LinkedIn");
    expect(testoCambioCanale(null, "email")).toContain("Ciao, ti avevo scritto per email");
    expect(testoCambioCanale("Mario Rossi", null, true)).toContain("ti avevo mandato il caso studio qualche giorno fa");
  });
  it("il canale si legge dalla nota dell'invio", () => {
    expect(canaleDallaNota("Mandato via WhatsApp")).toBe("WhatsApp");
    expect(canaleDallaNota("Messaggio mandato su LinkedIn dal CRM")).toBe("LinkedIn");
    expect(canaleDallaNota(null)).toBeNull();
  });
});

const accadueo: DatiAzienda = {
  decisori: [{ nome: "Accadueo Sardegna (socio)", grado: 2, contattiInComune: ["Giorgio Fodde", "Salvatore Moi"] }],
  pontiBni: [{ membroId: "m1", membro: "Giorgio Fodde", decisore: "Accadueo Sardegna (socio)" }],
  scaldata: false,
};
const piscine2000: DatiAzienda = {
  decisori: [{ nome: "Piermario Testoni", grado: 1, contattiInComune: ["Marco Coronzu"] }],
  pontiBni: [],
  scaldata: false,
};

describe("cerchia e persone", () => {
  it("riconosce la stessa persona anche con un secondo nome o maiuscole diverse", () => {
    expect(stessaPersona("Francesco BUDRONI", "Francesco Budroni")).toBe(true);
    expect(stessaPersona("Sergio S Mameli", "Sergio Mameli")).toBe(true);
    expect(stessaPersona("Cristian Mameli", "Sergio Mameli")).toBe(false);
    expect(stessaPersona("Mario", "Mario Rossi")).toBe(false);
  });
});

describe("strade", () => {
  it("prima il membro BNI della cerchia, poi gli altri contatti della cerchia", () => {
    const s = strade(accadueo, ["Giorgio Fodde", "Salvatore Moi"]);
    expect(s.map((x) => `${x.strada}:${x.nome}`)).toEqual(["BNI:Giorgio Fodde", "CERCHIA:Salvatore Moi"]);
  });
  it("un membro BNI fuori dalla cerchia (nessun 121) non vale", () => {
    expect(strade(accadueo, [])).toEqual([]);
  });
  it("un ponte che sta già presentando un'altra azienda aspetta", () => {
    expect(strade(accadueo, ["Giorgio Fodde", "Salvatore Moi"], [], ["Giorgio Fodde"]).map((x) => x.nome)).toEqual(["Salvatore Moi"]);
  });
  it("salta i ponti già provati", () => {
    expect(strade(accadueo, ["Giorgio Fodde", "Salvatore Moi"], ["Giorgio Fodde"]).map((x) => x.nome)).toEqual(["Salvatore Moi"]);
  });
  it("chi decide nella cerchia è un contatto diretto; scaldato se ha risposto ai commenti", () => {
    expect(strade(piscine2000, ["Piermario Testoni"])[0]).toMatchObject({ strada: "DIRETTO", nome: "Piermario Testoni" });
    expect(strade({ ...piscine2000, scaldata: true }, [])[0]).toMatchObject({ strada: "SCALDATO" });
  });
  it("senza strade si chiede 'lo conosci?' sui nomi visti, prima chi decide se è già collegato", () => {
    expect(nomiDaConfermare(piscine2000, [])).toEqual(["Piermario Testoni", "Marco Coronzu"]);
    expect(nomiDaConfermare(accadueo, ["Giorgio Fodde"], ["Salvatore Moi"])).toEqual([]);
  });
  it("la forza ordina le aziende per il posto che si libera", () => {
    expect(forzaAzienda(accadueo, ["Giorgio Fodde"])).toBe(4);
    expect(forzaAzienda(piscine2000, ["Marco Coronzu"])).toBe(3);
    expect(forzaAzienda(piscine2000, [])).toBe(1);
  });
});

describe("il seguito", () => {
  const oggi = new Date("2026-11-10T10:00:00+01:00");
  const fa = (g: number) => new Date(oggi.getTime() - g * 86400_000);
  it("promemoria dopo 5 giorni, cambio ponte dopo 10, pausa dopo 3 tentativi", () => {
    expect(prossimaAzione({ fase: "CHIESTA", chiestaAt: fa(3), promemoriaAt: null, tentativi: 0, pausaFino: null }, oggi)).toBe("NIENTE");
    expect(prossimaAzione({ fase: "CHIESTA", chiestaAt: fa(6), promemoriaAt: null, tentativi: 0, pausaFino: null }, oggi)).toBe("PROMEMORIA");
    expect(prossimaAzione({ fase: "CHIESTA", chiestaAt: fa(6), promemoriaAt: fa(1), tentativi: 0, pausaFino: null }, oggi)).toBe("NIENTE");
    expect(prossimaAzione({ fase: "CHIESTA", chiestaAt: fa(11), promemoriaAt: fa(5), tentativi: 0, pausaFino: null }, oggi)).toBe("CAMBIA_PONTE");
    expect(prossimaAzione({ fase: "CHIESTA", chiestaAt: fa(11), promemoriaAt: fa(5), tentativi: 2, pausaFino: null }, oggi)).toBe("PAUSA");
    expect(prossimaAzione({ fase: "PAUSA", chiestaAt: null, promemoriaAt: null, tentativi: 3, pausaFino: fa(1) }, oggi)).toBe("RIENTRA");
  });
});

describe("agenda e capienza", () => {
  it("le richieste atterrano nella prima settimana con posto, fino a due settimane avanti", () => {
    expect(settimanaConPosto([8, 8, 3])).toBe(2);
    expect(settimanaConPosto([2, 8, 8])).toBe(0);
    expect(settimanaConPosto([8, 9, 8])).toBeNull();
  });
  it("20 aziende per passo, 60 in lavorazione", () => {
    expect(capienzaLavorazione(new Date("2026-10-25T10:00:00+02:00"))).toBe(60);
    expect(capienzaLavorazione(new Date("2026-11-25T10:00:00+01:00"))).toBe(60);
  });
  it("il messaggio al ponte usa il nome proprio e non cita il cliente del caso", () => {
    const t = testoRichiestaPonte("Giorgio Fodde", "Mario Rossi", "Accadueo", "Abbiamo aiutato un'azienda di piscine in Sardegna a ricevere richieste migliori.");
    expect(t.startsWith("Ciao Giorgio,")).toBe(true);
    expect(t).toContain("Mario Rossi di Accadueo");
    expect(testoRichiestaPonte("Giorgio Fodde", "Accadueo Sardegna (socio)", "Accadueo Srl", null)).toContain("conosci il socio di Accadueo Srl?");
  });
});

describe("entrare in relazione: commenti sulle pagine", () => {
  const oggi = new Date("2026-10-25T10:00:00Z");
  it("riconosce la piattaforma dal link", () => {
    expect(piattaformaDi("https://www.facebook.com/pizzeria")).toBe("facebook");
    expect(piattaformaDi("https://www.instagram.com/x")).toBe("instagram");
    expect(piattaformaDi("https://it.linkedin.com/company/x")).toBe("linkedin");
    expect(piattaformaDi("https://x.it")).toBeNull();
  });
  it("scrive quanto pubblica", () => {
    expect(frequenzaTesto({ postUltimi3Mesi: 26, ultimoPost: "2026-10-22" }, oggi)).toBe("circa 2 a settimana · ultimo 3 giorni fa");
    expect(frequenzaTesto({ postUltimi3Mesi: 6, ultimoPost: null }, oggi)).toBe("circa 2 al mese");
    expect(frequenzaTesto({ postUltimi3Mesi: 0, ultimoPost: "2026-05-01" }, oggi)).toBe("ferma da 6 mesi");
    expect(frequenzaTesto({ postUltimi3Mesi: null, ultimoPost: null }, oggi)).toBe("non si sa");
  });
  it("consiglia la pagina viva che pubblica di più", () => {
    const pagine = [
      { piattaforma: "facebook" as const, url: "f", postUltimi3Mesi: 30, ultimoPost: "2026-03-01" },
      { piattaforma: "instagram" as const, url: "i", postUltimi3Mesi: 10, ultimoPost: "2026-10-20" },
      { piattaforma: "linkedin" as const, url: "l", postUltimi3Mesi: 2, ultimoPost: "2026-10-24" },
    ];
    expect(piattaformaConsigliata(pagine, oggi)).toBe("instagram");
    expect(piattaformaConsigliata([], oggi)).toBeNull();
  });
  it("i messaggi: dopo i commenti e alla pagina", () => {
    expect(testoContattoDopoCommenti("Mario Rossi", "Piscine Blu", "instagram", null)).toMatch(/^Ciao Mario, .*seguito i tuoi post su Instagram/);
    // v3.117: chi decide non pubblica: si scrive dopo il collegamento, senza parlare di commenti.
    expect(testoContattoDopoCommenti("Mario Rossi", "Piscine Blu", null, null, false, false)).toMatch(/^Ciao Mario, sono Alessio Loi di Karalisweb \(Cagliari\)\./);
    // v3.127: a chi non ti conosce si dice che non vi conoscete.
    expect(testoContattoDopoCommenti("Sergio Bianchi", "Piscine Blu", null, null, false, false, false, true)).toMatch(/^Ciao Sergio, .*Non ci conosciamo ancora/);
    expect(testoContattoDopoCommenti(null, "Piscine Blu", null, null)).toMatch(/^Buongiorno[\s\S]*titolare[\s\S]*Posso mandarglielo\?/);
    expect(testoMessaggioPagina("Piscine Blu", "Ho aiutato un'azienda simile.")).toContain("Ho aiutato un'azienda simile. Ho raccolto tutto in un breve caso studio");
  });
});

describe("strade dalla zona (v3.68)", () => {
  it("un membro BNI già incontrato nella zona fa da ponte, dopo LinkedIn e solo se si sa chi decide", () => {
    const conZona: DatiAzienda = { ...piscine2000, pontiZona: [{ membroId: "laura", membro: "Maria Laura Uleri" }] };
    const s = strade(conZona, ["Maria Laura Uleri", "Marco Coronzu"]);
    expect(s.map((x) => [x.strada, x.nome])).toEqual([["CERCHIA", "Marco Coronzu"], ["BNI", "Maria Laura Uleri"]]);
    expect(s[1]).toMatchObject({ decisore: "Piermario Testoni", membroId: "laura" });
    // Non incontrata: non vale.
    expect(strade(conZona, ["Marco Coronzu"]).map((x) => x.nome)).toEqual(["Marco Coronzu"]);
    // Senza chi decide non si chiede.
    expect(strade({ ...conZona, decisori: [] }, ["Maria Laura Uleri"])).toEqual([]);
  });
});

describe("v3.103 follow-up al contatto", () => {
  it("breve, col nome proprio, senza chi decide generico", async () => {
    const { testoFollowupContatto } = await import("../rete-regole");
    expect(testoFollowupContatto("Mario Rossi")).toMatch(/^Ciao Mario, ti riscrivo/);
    expect(testoFollowupContatto("chi decide")).toMatch(/^Ciao, ti riscrivo/);
    expect(testoFollowupContatto(null).length).toBeLessThan(220);
  });
});


describe("punti di contatto in ordine (v3.115)", () => {
  it("prima WhatsApp, poi mail, poi LinkedIn, poi le pagine", () => {
    expect(canaliInOrdine({ email: "a@b.it", whatsapp: "39333", linkedin: "x", pagina: "p", piattaformaPagina: "facebook" })).toEqual(["whatsapp", "email", "linkedin", "pagina_facebook"]);
    expect(canaliInOrdine({ pagina: "p", piattaformaPagina: "linkedin" })).toEqual(["pagina_linkedin"]);
  });
  it("la pagina: Instagram, poi Facebook, poi LinkedIn", () => {
    expect(paginaPreferita([{ piattaforma: "linkedin" as const }, { piattaforma: "facebook" as const }])?.piattaforma).toBe("facebook");
    expect(paginaPreferita([{ piattaforma: "facebook" as const }, { piattaforma: "instagram" as const }])?.piattaforma).toBe("instagram");
  });
  it("il testo per l'azienda va bene anche su WhatsApp", () => {
    expect(testoMessaggioPagina("Piscine Blu", null)).not.toContain("seguo la pagina");
  });
});

describe("v3.117: dove commentare chi decide", () => {
  it("prima Instagram, poi LinkedIn; resta dove ha cominciato; mai Facebook", () => {
    expect(piattaformaPersona({ instagram: "https://instagram.com/mario", linkedin: "https://linkedin.com/in/mario" }, null)).toBe("instagram");
    expect(piattaformaPersona({ instagram: "https://instagram.com/mario", linkedin: "https://linkedin.com/in/mario" }, "linkedin")).toBe("linkedin");
    expect(piattaformaPersona({ instagram: null, linkedin: "https://linkedin.com/in/mario" }, "facebook")).toBe("linkedin");
    expect(piattaformaPersona({ instagram: null, linkedin: "https://linkedin.com/in/mario" }, null, false)).toBeNull();
    expect(piattaformaPersona({ instagram: null, linkedin: null }, null)).toBeNull();
  });
});

import { segnaleDiRisposta, stradaContatto } from "../rete-regole";

describe("WhatsApp e mail solo a chi ti conosce (v3.127)", () => {
  const base = { conosce: false, whatsapp: false, email: false, linkedin: true, instagram: false };
  it("ti conosce (BNI, cerchia, presentato, ha risposto): messaggio subito", () => {
    expect(stradaContatto({ ...base, conosce: true, whatsapp: true })).toBe("contatta");
    expect(stradaContatto({ ...base, conosce: true, linkedin: false, email: true })).toBe("contatta");
  });
  it("non ti conosce: si scalda anche se ha WhatsApp o mail (Sergio, 2026-11-11)", () => {
    expect(stradaContatto({ ...base, whatsapp: true })).toBe("scalda");
    expect(stradaContatto({ ...base, email: true })).toBe("scalda");
    expect(stradaContatto({ ...base, linkedin: false, instagram: true, whatsapp: true })).toBe("scalda");
  });
  it("non ti conosce e non ha profili: pausa, mai a freddo", () => {
    expect(stradaContatto({ ...base, linkedin: false, whatsapp: true, email: true })).toBe("pausa");
  });
  it("solo una risposta o un messaggio contano, un like no", () => {
    expect(segnaleDiRisposta("Segnale: risposta")).toBe(true);
    expect(segnaleDiRisposta("Segnale: messaggio")).toBe(true);
    expect(segnaleDiRisposta("Segnale: like")).toBe(false);
    expect(segnaleDiRisposta("Segnale: collegamento")).toBe(false);
    expect(segnaleDiRisposta(null)).toBe(false);
  });
});
