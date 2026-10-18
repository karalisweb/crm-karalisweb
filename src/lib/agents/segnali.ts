/**
 * I segnali di un'azienda, ricavati dai referti degli agenti: servono all'elenco per far vedere
 * a colpo d'occhio cosa conta (e per filtrare). Logica pura: niente DB.
 */
export interface Segnali {
  /** null = la ricerca non è ancora stata fatta. */
  chiDecide: "noto" | "da_trovare" | null;
  pubblicita: boolean;
  sitoVecchio: boolean;
  sitoNonComunica: boolean;
  nonSiTrova: boolean;
}

type Findings = Record<string, unknown> | undefined;

export function segnaliDa(referti: Record<string, Findings>, haPersona: boolean): Segnali {
  const n = (v: unknown) => (typeof v === "number" ? v : null);
  const ads = referti.google_ads;
  const meta = referti.meta_ads;
  const visto = referti.sito_visto;
  const lettore = referti.lettore;
  const pos = referti.posizioni;
  const dm = referti.decision_maker;

  const domande = Array.isArray(lettore?.domande_cliente) ? (lettore!.domande_cliente as { risposta?: string }[]) : [];
  const chiarezza = n((lettore?.come_lo_dice as { chiarezza?: unknown } | undefined)?.chiarezza);

  return {
    chiDecide: haPersona ? "noto" : dm ? "da_trovare" : null,
    pubblicita: (n(ads?.attiviOra) ?? 0) > 0 || (n(meta?.inserzioniAttive) ?? 0) > 0,
    sitoVecchio: typeof visto?.sembra_anno === "string" && /20(0\d|1[0-6])/.test(visto.sembra_anno),
    sitoNonComunica: domande.filter((d) => d.risposta === "no").length >= 2 || (chiarezza != null && chiarezza <= 3),
    nonSiTrova: !!pos && (pos.posizione === null || (n(pos.posizione) ?? 0) > 10),
  };
}
