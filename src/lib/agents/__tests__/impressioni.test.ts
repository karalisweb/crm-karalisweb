import { describe, expect, it } from "vitest";
import { leveDaNote, noteDaReferti } from "../impressioni-sezioni";

describe("impressioni di Alessio", () => {
  it("legge le note dal referto alessio, vuote se non c'è", () => {
    expect(noteDaReferti([{ agent: "social", findings: {} }])).toEqual({ impressioni: {}, social: {} });
    const n = noteDaReferti([{ agent: "alessio", findings: { impressioni: { sito: "non è il loro" }, social: { instagram: "https://www.instagram.com/x" } } }]);
    expect(n.impressioni.sito).toBe("non è il loro");
    expect(n.social.instagram).toBe("https://www.instagram.com/x");
  });

  it("le impressioni con un servizio diventano leve, le altre restano contesto", () => {
    const leve = leveDaNote({ impressioni: { sito: "sembra del 2010", telefono: "ci siamo visti al BNI", linkedin: "" }, social: {} });
    expect(leve).toEqual([{ servizio: "sito", testo: "sembra del 2010", prova: "L'ha visto Alessio (Il sito)" }]);
  });
});

describe("i 3 ganci con le impressioni", () => {
  it("passano all'AI le note di Alessio e la regola della precedenza", async () => {
    const { vi } = await import("vitest");
    let chiesto = { sistema: "", testo: "" };
    vi.doMock("@/lib/db", () => ({ db: {} }));
    vi.doMock("../ai", async (orig) => ({
      ...(await orig<typeof import("../ai")>()),
      chiediJSON: async (p: { sistema: string; testo: string }) => {
        chiesto = p;
        return { dati: { ganci: [{ leva: 2, frase: "Ho visto che il sito è curato" }], apertura: "Buongiorno" }, costCents: 0 };
      },
    }));
    const { agenteGanci } = await import("../agenti/arricchimento");
    const referti = [
      { agent: "sito_visto", summary: "Sito lento", findings: {}, levers: [{ servizio: "sito", testo: "Il sito ci mette 29 secondi", prova: "4G lento" }], evidence: [], confidence: "ALTA", collectedAt: new Date() },
      { agent: "alessio", summary: "1 impressione", findings: { impressioni: { sito: "curato, il titolare ci tiene" }, social: { instagram: "https://www.instagram.com/x" } }, levers: leveDaNote({ impressioni: { sito: "curato, il titolare ci tiene" }, social: {} }), evidence: [], confidence: "ALTA", collectedAt: new Date() },
    ];
    const r = await agenteGanci.esegui({ lead: { id: "l", name: "Prova", website: "", category: null, address: null, phone: null, googleRating: null, googleReviewsCount: null, citta: "Cagliari" }, pagina: async () => { throw new Error("no"); }, referti: async () => referti, oggi: new Date() } as never);
    expect(chiesto.testo).toContain("QUELLO CHE HA VISTO ALESSIO DI PERSONA");
    expect(chiesto.testo).toContain("Il sito: curato, il titolare ci tiene");
    expect(chiesto.testo).toContain("instagram: https://www.instagram.com/x");
    expect(chiesto.testo).toContain("[alessio] curato, il titolare ci tiene");
    expect(chiesto.sistema).toContain("valgono più di quelle degli agenti");
    expect((r.findings as { ganci: { agente: string }[] }).ganci[0].agente).toBe("alessio");
  });
});
