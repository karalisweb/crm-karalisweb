/**
 * Agente 3 (seconda parte) — Posizioni su Google.
 * Cerca su Google (via DataForSEO) la ricerca più "normale" per questa azienda:
 * "<categoria> <città>", e guarda dove compare il suo sito nei primi 20 risultati.
 */
import { chiamaDataForSeo, dominio, LOCATION_ITALIA } from "../dataforseo";
import type { AgenteEseguibile, Leva, Prova, Referto } from "../tipi";

interface ItemSerp {
  type: string;
  rank_absolute?: number;
  domain?: string;
  url?: string;
  title?: string;
}

export function parolaChiave(categoria: string | null, citta: string | null): string | null {
  if (!categoria || !citta) return null;
  return `${categoria} ${citta}`.toLowerCase().replace(/\s+/g, " ").trim();
}

export function refertoPosizioni(parola: string, items: ItemSerp[], sito: string, costCents: number): Referto {
  const mio = dominio(sito);
  const organici = items.filter((i) => i.type === "organic" && i.domain);
  const trovato = organici.find((i) => dominio(i.domain!) === mio || dominio(i.domain!).endsWith(`.${mio}`));
  const posizione = trovato?.rank_absolute ?? null;
  const primi = organici.filter((i) => dominio(i.domain!) !== mio).slice(0, 3);

  const levers: Leva[] = [];
  const evidence: Prova[] = primi.map((i) => ({
    cosa: `Posizione ${i.rank_absolute}: ${i.domain}`,
    fonte: i.url ?? `google: ${parola}`,
    citazione: i.title,
  }));
  if (trovato) evidence.unshift({ cosa: `Il loro sito è in posizione ${posizione}`, fonte: trovato.url ?? mio, citazione: trovato.title });

  const chiPrimo = primi.map((i) => i.domain).join(", ");
  if (posizione === null) {
    levers.push({
      servizio: "seo",
      testo: `Chi cerca "${parola}" su Google non li trova: non sono nei primi 20 risultati`,
      prova: chiPrimo ? `Ai primi posti: ${chiPrimo}` : `Ricerca "${parola}"`,
    });
  } else if (posizione > 10) {
    levers.push({
      servizio: "seo",
      testo: `Per "${parola}" sono in seconda pagina (posizione ${posizione}): quasi nessuno ci arriva`,
      prova: `Posizione ${posizione}; ai primi posti: ${chiPrimo}`,
    });
  } else if (posizione > 3) {
    levers.push({
      servizio: "seo",
      testo: `Per "${parola}" sono in posizione ${posizione}: in prima pagina ma sotto i primi tre, che prendono la maggior parte dei clic`,
      prova: `Posizione ${posizione}`,
    });
  }

  return {
    summary: posizione ? `"${parola}": posizione ${posizione}` : `"${parola}": non nei primi 20`,
    findings: { parolaChiave: parola, posizione, primi: primi.map((i) => ({ posizione: i.rank_absolute, dominio: i.domain })) },
    levers,
    evidence,
    confidence: "ALTA",
    costCents,
  };
}

export const agentePosizioni: AgenteEseguibile = {
  chiave: "posizioni",
  fase: "approfondimento",
  validitaGiorni: 60,
  aPagamento: true,
  async esegui(ctx) {
    const parola = parolaChiave(ctx.lead.category, ctx.lead.citta);
    if (!parola) throw new Error("Manca la categoria o la città: non so quale ricerca fare su Google");
    const { result, costCents } = await chiamaDataForSeo<{ items?: ItemSerp[] }>("/serp/google/organic/live/advanced", {
      keyword: parola,
      location_code: LOCATION_ITALIA,
      language_code: "it",
      depth: 20,
    });
    return refertoPosizioni(parola, result?.items ?? [], ctx.lead.website, costCents);
  },
};
