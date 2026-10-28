import { describe, expect, it } from "vitest";
import {
  capienzaLavorazione, forzaAzienda, nomiDaConfermare, prossimaAzione, settimanaConPosto, stessaPersona, strade, testoRichiestaPonte,
  type DatiAzienda,
  frequenzaTesto, piattaformaConsigliata, piattaformaDi, testoContattoDopoCommenti, testoMessaggioPagina,
} from "../rete-regole";

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
    expect(testoContattoDopoCommenti("Mario Rossi", "Piscine Blu", "instagram", null)).toMatch(/^Ciao Mario, .*Piscine Blu su Instagram/);
    expect(testoContattoDopoCommenti(null, "Piscine Blu", null, null)).toMatch(/^Buongiorno.*sentire il titolare/);
    expect(testoMessaggioPagina("Piscine Blu", "Abbiamo aiutato un'azienda simile.")).toContain("titolare: abbiamo aiutato");
  });
});
