import { describe, expect, it } from "vitest";
import {
  capienzaLavorazione, forzaAzienda, nomiDaConfermare, prossimaAzione, settimanaConPosto, stessaPersona, strade, testoRichiestaPonte,
  type DatiAzienda,
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
  it("15 aziende il primo mese, 30 dal secondo", () => {
    expect(capienzaLavorazione(new Date("2026-10-25T10:00:00+02:00"))).toBe(15);
    expect(capienzaLavorazione(new Date("2026-11-25T10:00:00+01:00"))).toBe(30);
  });
  it("il messaggio al ponte usa il nome proprio e non cita il cliente del caso", () => {
    const t = testoRichiestaPonte("Giorgio Fodde", "Mario Rossi", "Accadueo", "Abbiamo aiutato un'azienda di piscine in Sardegna a ricevere richieste migliori.");
    expect(t.startsWith("Ciao Giorgio,")).toBe(true);
    expect(t).toContain("Mario Rossi di Accadueo");
    expect(testoRichiestaPonte("Giorgio Fodde", "Accadueo Sardegna (socio)", "Accadueo Srl", null)).toContain("conosci il socio di Accadueo Srl?");
  });
});
