import { describe, expect, it } from "vitest";
import { normalizzaOrigini, normalizzaPassi, passoAttuale, passoSuccessivo, promemoria, PASSI_DEFAULT, ORIGINI_DEFAULT } from "../fila";

const G = 86400_000;
const oggi = new Date("2026-11-03T09:00:00Z");
const base = { nome: "Rossi Srl", stadio: "RICHIESTA_INFO" as const, passo: "richiesta", passoDal: new Date(oggi.getTime() - 2 * G), callAt: null, updatedAt: oggi };

describe("fila della vendita", () => {
  it("ricorda di fissare la call dopo 1 giorno dalla richiesta", () => {
    expect(promemoria(base, PASSI_DEFAULT, oggi)).toEqual({ testo: "Fissa la call con Rossi Srl", giorniDiRitardo: 1 });
    expect(promemoria({ ...base, passoDal: new Date(oggi.getTime() - 3600_000) }, PASSI_DEFAULT, oggi)).toBeNull();
  });

  it("per la call conta dalla data della call", () => {
    const t = { ...base, stadio: "CALL_FISSATA" as const, passo: "call_fissata", passoDal: new Date(oggi.getTime() - 10 * G) };
    expect(promemoria({ ...t, callAt: new Date(oggi.getTime() + G) }, PASSI_DEFAULT, oggi)).toBeNull();
    expect(promemoria({ ...t, callAt: new Date(oggi.getTime() - 2 * G) }, PASSI_DEFAULT, oggi)?.testo).toBe("Segna com'è andata la call con Rossi Srl");
  });

  it("niente promemoria per exit e nurturing", () => {
    expect(promemoria({ ...base, stadio: "EXIT" }, PASSI_DEFAULT, oggi)).toBeNull();
  });

  it("le trattative vecchie (senza passo) stanno nel passo del loro stadio", () => {
    expect(passoAttuale({ passo: null, stadio: "LETTERA_INVIATA" }, PASSI_DEFAULT)?.id).toBe("preventivo");
  });

  it("il passo successivo salta quelli spenti", () => {
    const passi = [...PASSI_DEFAULT.slice(0, 3), { id: "p_x", nome: "Sopralluogo", attivo: false, giorni: 2, promemoria: "" }, ...PASSI_DEFAULT.slice(3)];
    expect(passoSuccessivo(passi[2], passi)?.id).toBe("preventivo");
    expect(passoSuccessivo(passi[passi.length - 1], passi)).toBeNull();
  });

  it("normalizza: i fissi tornano al loro posto, accesi, e non si scavalcano", () => {
    const { passi, errore } = normalizzaPassi([{ id: "call_fatta", nome: "Ci siamo sentiti", attivo: false }, { id: "p_1", nome: "Sopralluogo", giorni: 5 }]);
    expect(errore).toBeUndefined();
    // I fissi mancanti si rimettono subito dopo il fisso che li precede.
    expect(passi.map((p) => p.id)).toEqual(["richiesta", "call_fissata", "call_fatta", "preventivo", "accettato", "p_1"]);
    expect(passi.find((p) => p.id === "call_fatta")).toMatchObject({ nome: "Ci siamo sentiti", attivo: true, stadio: "CALL_FATTA" });
    expect(normalizzaPassi([{ id: "preventivo" }, { id: "call_fatta" }]).errore).toBe('"Call fatta" deve stare dopo "Preventivo mandato"');
  });

  it("origini: id dal nome, niente doppioni, lista vuota = default", () => {
    expect(normalizzaOrigini([{ nome: "Fiera Cagliari" }, { nome: "Fiera Cagliari" }])).toEqual([{ id: "fiera_cagliari", nome: "Fiera Cagliari" }]);
    expect(normalizzaOrigini([])).toBe(ORIGINI_DEFAULT);
  });
});
