import { describe, expect, it } from "vitest";
import { passoDi, passoDiOggi, type Stato } from "../percorso-regole";
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
      .toMatchObject({ passo: 3, tocca: "te", azione: "cassetta", cosa: "Commenta il post (3 di 7 su Facebook)" }));
  it("nessun commento pronto: il CRM cerca il post", () => expect(passo({ lav: lav({ strada: "SCALDARE" }) })).toMatchObject({ passo: 3, tocca: "crm" }));
});

describe("passo 4 — Contatto", () => {
  it("al 7° commento: scrivi a chi decide", () =>
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

describe("il passo di oggi", () => {
  it("solo dove tocca a te, prima le più vicine al contatto, poi le più vecchie", () => {
    const a = (id: string, s: Partial<Stato>, da: number) => ({ id, esito: passoDi({ ...base, ...s }, oggi), da });
    const scelte = passoDiOggi([
      a("decidi", { decisione: "IN_ATTESA", collegata: true }, 1),
      a("crm", {}, 0),
      a("contatto-nuovo", { lav: lav({ fase: "CHIESTA", strada: "BNI", presentatoAt: oggi }) }, 5),
      a("contatto-vecchio", { lav: lav({ strada: "SCALDARE" }), voci: [{ id: "k", kind: "RETE_CONTATTO", payload: {} }] }, 2),
    ], 3);
    expect(scelte.map((s) => s.id)).toEqual(["contatto-vecchio", "contatto-nuovo", "decidi"]);
  });
});

describe("i 7 commenti si contano sulla stessa piattaforma", () => {
  it("non si sommano le piattaforme", () => {
    const c = [...Array(4)].map(() => ({ piattaforma: "facebook" })).concat([...Array(3)].map(() => ({ piattaforma: "instagram" })));
    expect(piattaformaPiuCommentata(c)).toEqual({ piattaforma: "facebook", fatti: 4 });
  });
  it("il link del post vale più del campo piattaforma", () => {
    expect(piattaformaPiuCommentata([{ post: "https://www.instagram.com/p/1", piattaforma: "facebook" }])).toEqual({ piattaforma: "instagram", fatti: 1 });
  });
  it("nessun commento", () => expect(piattaformaPiuCommentata([])).toBeNull());
});
