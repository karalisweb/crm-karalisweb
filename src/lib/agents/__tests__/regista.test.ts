import { describe, it, expect } from "vitest";
import { agentiDaEseguire, valutaFascicolo, levePerServizio, AGENTI_ECONOMICI, SOGLIA_LEVE } from "../regista";
import type { Leva } from "../tipi";

const oggi = new Date("2026-10-15T10:00:00Z");
const giorni = (n: number) => new Date(oggi.getTime() + n * 86400_000);
const leva = (servizio: Leva["servizio"] = "seo"): Leva => ({ servizio, testo: "t", prova: "p" });

describe("agentiDaEseguire", () => {
  it("azienda mai vista: lavorano tutti gli agenti economici", () => {
    expect(agentiDaEseguire([], oggi)).toEqual([...AGENTI_ECONOMICI]);
  });

  it("non rifà chi ha un referto valido, rifà chi l'ha scaduto", () => {
    const piano = agentiDaEseguire(
      [
        { agente: "tecnico", validoFino: giorni(10), fallimentiDiFila: 0, ultimoFallimento: null, inCorso: false },
        { agente: "seo", validoFino: giorni(-1), fallimentiDiFila: 0, ultimoFallimento: null, inCorso: false },
      ],
      oggi
    );
    expect(piano).toEqual(["seo", "blog", "tracciamenti"]);
  });

  it("non tocca un lavoro in corso", () => {
    const piano = agentiDaEseguire([{ agente: "blog", validoFino: null, fallimentiDiFila: 0, ultimoFallimento: null, inCorso: true }], oggi);
    expect(piano).not.toContain("blog");
  });

  it("dopo un fallimento aspetta, dopo 3 fallimenti di fila smette", () => {
    const appena = { agente: "seo", validoFino: null, fallimentiDiFila: 1, ultimoFallimento: giorni(-0.1), inCorso: false };
    const ieri = { ...appena, ultimoFallimento: giorni(-1) };
    const troppi = { ...ieri, fallimentiDiFila: 3 };
    expect(agentiDaEseguire([appena], oggi)).not.toContain("seo");
    expect(agentiDaEseguire([ieri], oggi)).toContain("seo");
    expect(agentiDaEseguire([troppi], oggi)).not.toContain("seo");
  });
});

describe("valutaFascicolo", () => {
  const referto = (agent: string, levers: Leva[], validUntil = giorni(30)) => ({ agent, summary: agent, levers, validUntil });

  it("incompleto se manca un agente: non va in cassetta anche con molte leve", () => {
    const e = valutaFascicolo([referto("tecnico", [leva(), leva(), leva(), leva()])], oggi);
    expect(e.completo).toBe(false);
    expect(e.meritaCassetta).toBe(false);
  });

  it("completo e con abbastanza leve: va in cassetta", () => {
    const e = valutaFascicolo(
      [referto("tecnico", [leva("sito")]), referto("seo", [leva(), leva()]), referto("blog", []), referto("tracciamenti", [leva("meta_ads")])],
      oggi
    );
    expect(e.completo).toBe(true);
    expect(e.leve).toHaveLength(4);
    expect(e.meritaCassetta).toBe(true);
  });

  it("completo ma sotto soglia: si ferma al filtro", () => {
    const e = valutaFascicolo([referto("tecnico", [leva()]), referto("seo", []), referto("blog", []), referto("tracciamenti", [])], oggi);
    expect(e.completo).toBe(true);
    expect(e.leve.length).toBeLessThan(SOGLIA_LEVE);
    expect(e.meritaCassetta).toBe(false);
  });

  it("ignora i referti scaduti e conta solo il più recente per agente", () => {
    const e = valutaFascicolo(
      [
        referto("tecnico", [leva(), leva(), leva()], giorni(-1)),
        referto("tecnico", [leva()], giorni(5)),
        referto("seo", []), referto("blog", []), referto("tracciamenti", []),
      ],
      oggi
    );
    expect(e.leve).toHaveLength(1);
  });
});

describe("levePerServizio", () => {
  it("raggruppa per servizio", () => {
    const g = levePerServizio([leva("seo"), leva("sito"), leva("seo")]);
    expect(g.seo).toHaveLength(2);
    expect(g.sito).toHaveLength(1);
  });
});
