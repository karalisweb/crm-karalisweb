import { describe, expect, it } from "vitest";
import { controllaTesto, paroleVietate, richiamoDovuto, seguitoDopo121 } from "../msd-regole";

// L'esempio di tono della scheda MSD: deve passare tutti i controlli.
const ESEMPIO = `Ciao Marco, grazie per il 121 di martedì. Mi è rimasta in testa una cosa che hai detto: vuoi rifare il sito perché quello di oggi non ti porta richieste. È una richiesta giusta. Ma un sito nuovo, senza aver deciso prima a chi parla e cosa deve vendere, rischia di essere solo un sito più bello che non porta richieste lo stesso.

Per questo, prima di qualsiasi strumento, faccio un percorso di 21 giorni che si chiama Metodo Strategico Digitale™: un'intervista di 90 minuti, un documento strategico di oltre 30 pagine su chi sei, a chi parli e cosa vendi davvero, e un piano operativo a 12 mesi. Costa 2.000€ + IVA. Con quel documento in mano decidi il sito, e ogni altro investimento, con un criterio, chiunque lo realizzi.

Se pensi che abbia senso per la tua azienda, candidati per parlarne: scegli un orario qui [calendario].`;

describe("seguito del 121 con MSD", () => {
  it("l'esempio della scheda passa", () => {
    expect(controllaTesto(ESEMPIO)).toEqual([]);
  });
  it("trova le parole vietate, intere", () => {
    expect(paroleVietate("Ti faccio un audit gratuito, prenota ora")).toEqual(["audit", "prenota"]);
    expect(paroleVietate("Un metodo brevettato e scientifico")).toEqual(["scientific", "brevett"]);
    expect(paroleVietate("Il sito è curato e il lavoro accurato")).toEqual([]);
  });
  it("segnala prezzo, candidati, ®, elenchi e promesse di numeri", () => {
    const a = controllaTesto("Ciao, ti propongo il Metodo Strategico Digitale®.\n- intervista\n- documento\nRaddoppi il fatturato. Prenota qui.");
    expect(a.join(" | ")).toMatch(/prenota/);
    expect(a.join(" | ")).toMatch(/®/);
    expect(a.join(" | ")).toMatch(/elenchi/);
    expect(a.join(" | ")).toMatch(/numeri/);
    expect(a.join(" | ")).toMatch(/prezzo/);
    expect(a.join(" | ")).toMatch(/candidati/);
  });
  it("il richiamo non chiede prezzo né candidati", () => {
    expect(controllaTesto("Ciao Marco, ripensavo a quando mi hai detto del cantiere di Quartu. Alessio", "richiamo")).toEqual([]);
  });
  it("sceglie il seguito", () => {
    expect(seguitoDopo121("per_se", "dentro")).toBe("proposta");
    expect(seguitoDopo121("per_se", "fuori")).toBe("fuori_target");
    expect(seguitoDopo121("per_se", "incerto")).toBe("fuori_target");
    expect(seguitoDopo121("segnalare", "dentro")).toBe("niente");
  });
  it("il richiamo dopo una settimana, una volta sola", () => {
    const oggi = new Date("2026-10-26T09:00:00Z");
    expect(richiamoDovuto(new Date("2026-10-18T09:00:00Z"), false, oggi)).toBe(true);
    expect(richiamoDovuto(new Date("2026-10-22T09:00:00Z"), false, oggi)).toBe(false);
    expect(richiamoDovuto(new Date("2026-10-18T09:00:00Z"), true, oggi)).toBe(false);
    expect(richiamoDovuto(null, false, oggi)).toBe(false);
  });
});
