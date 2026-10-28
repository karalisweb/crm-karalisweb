import { describe, expect, it } from "vitest";
import { coseDiOggi, passoDi, type Stato } from "../percorso-regole";
import { piattaformaPiuCommentata } from "../rete-regole";

const oggi = new Date("2026-10-27T10:00:00+01:00");
const base: Stato = { decisione: null, collegata: false, lav: null, commenti: null, voci: [], daConfermare: [] };
const lav = (x: Partial<NonNullable<Stato["lav"]>>): Stato["lav"] => ({ fase: "MAPPATA", strada: null, ponte: null, decisore: "Mario Rossi", chiestaAt: null, presentatoAt: null, ...x });
const passo = (s: Partial<Stato>) => {
  const e = passoDi({ ...base, ...s }, oggi);
  return e.dentro ? { passo: e.passo, tocca: e.tocca, azione: e.azione?.tipo ?? null, cosa: e.cosa } : { fuori: e.perche };
};

describe("passo 1 — Trovate", () => {
  it("analisi in corso: lavora il CRM", () => expect(passo({})).toMatchObject({ passo: 1, tocca: "crm" }));
  it("collegata e da decidere: tocca a te", () => expect(passo({ decisione: "IN_ATTESA", collegata: true })).toMatchObject({ passo: 1, tocca: "te", azione: "decidi" }));
  it("non ancora collegata: il CRM controlla", () => expect(passo({ decisione: "IN_ATTESA" })).toMatchObject({ passo: 1, tocca: "crm" }));
  it("approfondita, in attesa di un posto", () => expect(passo({ decisione: "APPROVATO" })).toMatchObject({ passo: 1, tocca: "crm" }));
  it("scartata: fuori", () => expect(passo({ decisione: "SCARTATO" })).toEqual({ fuori: "fuori" }));
});

describe("passo 2 — Chi me la presenta", () => {
  it("lo conosci? tocca a te con i nomi", () => expect(passo({ lav: lav({ strada: "DA_CONFERMARE" }), daConfermare: ["Giorgio Fodde"] })).toMatchObject({ passo: 2, tocca: "te", azione: "conosco" }));
  it("messaggio al ponte in Cassetta", () =>
    expect(passo({ lav: lav({ fase: "PONTE_SCELTO", strada: "BNI", ponte: "Giorgio Fodde" }), voci: [{ id: "v1", kind: "RETE_PONTE", payload: { messaggio: "Ciao" } }] }))
      .toMatchObject({ passo: 2, tocca: "te", azione: "cassetta", cosa: "Chiedi a Giorgio Fodde di presentarti Mario Rossi" }));
  it("chiesta, si aspetta il ponte (con il pulsante 'mi ha presentato')", () =>
    expect(passo({ lav: lav({ fase: "CHIESTA", strada: "CERCHIA", ponte: "Anna", chiestaAt: new Date("2026-10-24T10:00:00+01:00") }) }))
      .toMatchObject({ passo: 2, tocca: "attesa", azione: "presentato", cosa: "Aspetti Anna (3 giorni; promemoria al 5°)" }));
  it("promemoria in Cassetta: tocca a te", () =>
    expect(passo({ lav: lav({ fase: "CHIESTA", strada: "BNI", ponte: "Anna" }), voci: [{ id: "v2", kind: "RETE_PROMEMORIA", payload: {} }] })).toMatchObject({ passo: 2, tocca: "te" }));
});

describe("passo 3 — In riscaldamento", () => {
  it("commento in Cassetta, con il conto sulla piattaforma", () =>
    expect(passo({ lav: lav({ strada: "SCALDARE" }), commenti: { piattaforma: "facebook", fatti: 3 }, voci: [{ id: "c", kind: "COMMENTO_LINKEDIN", payload: { commento: "Bello!", post: "https://facebook.com/x/1" } }] }))
      .toMatchObject({ passo: 3, tocca: "te", azione: "cassetta", cosa: "Commenta il post (3 di 5 su Facebook)" }));
  it("nessun commento pronto: il CRM cerca il post", () => expect(passo({ lav: lav({ strada: "SCALDARE" }) })).toMatchObject({ passo: 3, tocca: "crm" }));
});

describe("passo 4 — Contatto", () => {
  it("al 5° commento: scrivi a chi decide", () =>
    expect(passo({ lav: lav({ strada: "SCALDARE" }), voci: [{ id: "k", kind: "RETE_CONTATTO", payload: { messaggio: "Ciao" } }] })).toMatchObject({ passo: 4, tocca: "te", azione: "cassetta" }));
  it("lo conosci tu: si salta dal 1 al 4", () =>
    expect(passo({ lav: lav({ fase: "PONTE_SCELTO", strada: "DIRETTO" }), voci: [{ id: "d", kind: "RETE_DIRETTO", payload: {} }] })).toMatchObject({ passo: 4, tocca: "te" }));
  it("presentata dal ponte: fissa l'incontro", () =>
    expect(passo({ lav: lav({ fase: "CHIESTA", strada: "BNI", ponte: "Anna", presentatoAt: oggi }) })).toMatchObject({ passo: 4, tocca: "te", azione: "incontro" }));
  it("scritto a chi decide: si aspetta la risposta", () => expect(passo({ lav: lav({ fase: "CHIESTA", strada: "SCALDATO" }) })).toMatchObject({ passo: 4, tocca: "attesa" }));
});

describe("fuori dal percorso", () => {
  it("incontro fissato: va in Trattative", () => expect(passo({ lav: lav({ fase: "INCONTRO" }) })).toEqual({ fuori: "dopo" }));
  it("in pausa", () => expect(passo({ lav: lav({ fase: "PAUSA" }) })).toEqual({ fuori: "pausa" }));
});

describe("le 3 cose di oggi", () => {
  const a = (id: string, s: Partial<Stato>, da: number) => ({ id, esito: passoDi({ ...base, ...s }, oggi), da });
  const commento = (id: string, da: number) => a(id, { lav: lav({ strada: "SCALDARE" }), voci: [{ id, kind: "COMMENTO_LINKEDIN", payload: {} }] }, da);
  const nessuna = { contatta: 0, scalda: 0, valida: 0 };
  const ids = (r: Record<string, { id: string }[]>) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v.map((x) => x.id)]));

  it("ogni azienda nella sua cosa, solo dove tocca a te, prima le più vicine al contatto", () => {
    const r = coseDiOggi([
      a("decidi", { decisione: "IN_ATTESA", collegata: true }, 1),
      a("crm", {}, 0),
      a("contatto-nuovo", { lav: lav({ fase: "CHIESTA", strada: "BNI", presentatoAt: oggi }) }, 5),
      a("contatto-vecchio", { lav: lav({ strada: "SCALDARE" }), voci: [{ id: "k", kind: "RETE_CONTATTO", payload: {} }] }, 2),
      a("ponte", { lav: lav({ fase: "PONTE_SCELTO", strada: "BNI" }), voci: [{ id: "p", kind: "RETE_PONTE", payload: {} }] }, 3),
      a("conosco", { lav: lav({ strada: "DA_CONFERMARE" }), daConfermare: ["Mario"] }, 4),
      commento("commento", 6),
    ], nessuna);
    expect(ids(r)).toEqual({ contatta: ["contatto-vecchio", "contatto-nuovo"], scalda: ["commento"], valida: ["conosco", "decidi"] });
  });

  it("al massimo 2 / 3 / 5, e quello che hai già fatto oggi scala dal conto", () => {
    const tanti = [...Array(6)].map((_, i) => commento(`c${i}`, i));
    expect(coseDiOggi(tanti, nessuna).scalda).toHaveLength(3);
    expect(coseDiOggi(tanti, { ...nessuna, scalda: 2 }).scalda.map((x) => x.id)).toEqual(["c0"]);
    expect(coseDiOggi(tanti, { ...nessuna, scalda: 4 }).scalda).toEqual([]);
  });
});

describe("i 5 commenti si contano sulla stessa piattaforma", () => {
  it("non si sommano le piattaforme", () => {
    const c = [...Array(4)].map(() => ({ piattaforma: "facebook" })).concat([...Array(3)].map(() => ({ piattaforma: "instagram" })));
    expect(piattaformaPiuCommentata(c)).toEqual({ piattaforma: "facebook", fatti: 4 });
  });
  it("il link del post vale più del campo piattaforma", () => {
    expect(piattaformaPiuCommentata([{ post: "https://www.instagram.com/p/1", piattaforma: "facebook" }])).toEqual({ piattaforma: "instagram", fatti: 1 });
  });
  it("nessun commento", () => expect(piattaformaPiuCommentata([])).toBeNull());
});
