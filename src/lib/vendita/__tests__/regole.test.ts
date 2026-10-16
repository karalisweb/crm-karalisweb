import { describe, it, expect } from "vitest";
import { agenteDaFare, puoPassare, prossimaDataDefault, inRitardo, type TrattativaPerRegole } from "../regole";

const oggi = new Date("2026-10-16T10:00:00Z");
const ore = (n: number) => new Date(oggi.getTime() + n * 3600_000);
const giorni = (n: number) => new Date(oggi.getTime() + n * 86400_000);
const t = (x: Partial<TrattativaPerRegole>): TrattativaPerRegole => ({
  stadio: "CALL_FISSATA", callAt: null, trascrizione: null, prossimaData: null, recallFatti: 0,
  ultimoNurturingAt: null, stadioDal: giorni(-1), giaFatto: new Set(), ...x,
});

describe("passaggi di stadio", () => {
  it("segue la pipeline di Alessio", () => {
    expect(puoPassare("CALL_FISSATA", "CALL_FATTA")).toBe(true);
    expect(puoPassare("CALL_FATTA", "LETTERA_INVIATA")).toBe(true);
    expect(puoPassare("LETTERA_INVIATA", "RECALL")).toBe(true);
    expect(puoPassare("RECALL", "INCARICO")).toBe(true);
    expect(puoPassare("NURTURING", "CALL_FISSATA")).toBe(true);
  });
  it("incarico ed exit sono la fine; non si salta la call", () => {
    expect(puoPassare("INCARICO", "EXIT")).toBe(false);
    expect(puoPassare("EXIT", "NURTURING")).toBe(false);
    expect(puoPassare("CALL_FISSATA", "LETTERA_INVIATA")).toBe(false);
  });
  it("date di default", () => {
    expect(prossimaDataDefault("LETTERA_INVIATA", oggi)?.toISOString()).toBe(giorni(7).toISOString());
    expect(prossimaDataDefault("NURTURING", oggi)?.toISOString()).toBe(giorni(45).toISOString());
    expect(prossimaDataDefault("INCARICO", oggi)).toBeNull();
  });
});

describe("quale agente lavora", () => {
  it("Preparatore: entro 36 ore dalla call, una volta", () => {
    expect(agenteDaFare(t({ callAt: ore(20) }), oggi)).toBe("preparazione_call");
    expect(agenteDaFare(t({ callAt: ore(60) }), oggi)).toBeNull();
    expect(agenteDaFare(t({ callAt: ore(20), giaFatto: new Set(["preparazione_call"]) }), oggi)).toBeNull();
    expect(agenteDaFare(t({ callAt: ore(-5) }), oggi)).toBeNull();
  });
  it("Dopo-call: solo con una trascrizione vera", () => {
    expect(agenteDaFare(t({ stadio: "CALL_FATTA", trascrizione: "troppo corta" }), oggi)).toBeNull();
    expect(agenteDaFare(t({ stadio: "CALL_FATTA", trascrizione: "x".repeat(300) }), oggi)).toBe("dopo_call");
  });
  it("Recall: quando la data è passata e non c'è già una proposta aperta", () => {
    expect(agenteDaFare(t({ stadio: "LETTERA_INVIATA", prossimaData: giorni(-1) }), oggi)).toBe("recall");
    expect(agenteDaFare(t({ stadio: "LETTERA_INVIATA", prossimaData: giorni(2) }), oggi)).toBeNull();
    expect(agenteDaFare(t({ stadio: "RECALL", prossimaData: giorni(-1), giaFatto: new Set(["recall"]) }), oggi)).toBeNull();
  });
  it("Nurturing: ogni 45 giorni", () => {
    expect(agenteDaFare(t({ stadio: "NURTURING", stadioDal: giorni(-10) }), oggi)).toBeNull();
    expect(agenteDaFare(t({ stadio: "NURTURING", stadioDal: giorni(-50) }), oggi)).toBe("nurturing");
    expect(agenteDaFare(t({ stadio: "NURTURING", stadioDal: giorni(-200), ultimoNurturingAt: giorni(-20) }), oggi)).toBeNull();
  });
  it("in ritardo: call passata da più di un giorno, o data superata", () => {
    expect(inRitardo({ stadio: "CALL_FISSATA", callAt: giorni(-2), prossimaData: null }, oggi)).toBe(true);
    expect(inRitardo({ stadio: "LETTERA_INVIATA", callAt: null, prossimaData: giorni(-1) }, oggi)).toBe(true);
    expect(inRitardo({ stadio: "INCARICO", callAt: null, prossimaData: giorni(-9) }, oggi)).toBe(false);
  });
});
