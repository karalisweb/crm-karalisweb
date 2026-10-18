/**
 * Agente 4 — Google Ads.
 * Cerca gli annunci del dominio su Google Ads Transparency (via DataForSEO) e li incrocia
 * con il tag Google Ads trovato dall'agente Tracciamenti e con le posizioni su Google.
 *
 * Ogni annuncio ha la data della prima e dell'ultima volta che è stato mostrato: se l'ultima
 * è recente (ultimi 14 giorni) l'azienda fa pubblicità ADESSO. Formato della chiamata
 * verificato sull'API vera il 2026-10-16 (`target` = dominio).
 */
import { chiamaDataForSeo, dominio, LOCATION_ITALIA } from "../dataforseo";
import type { AgenteEseguibile, Leva, Prova, Referto, RefertoLetto } from "../tipi";

interface ItemAds {
  type?: string;
  advertiser_id?: string;
  title?: string;
  url?: string;
  first_shown?: string;
  last_shown?: string;
  format?: string;
}

/** Un annuncio visto negli ultimi 14 giorni conta come "attivo adesso". */
export const GIORNI_ANNUNCIO_ATTIVO = 14;

export function refertoGoogleAds(items: ItemAds[], sito: string, altri: RefertoLetto[], costCents: number, oggi = new Date()): Referto {
  const tracciamenti = altri.find((r) => r.agent === "tracciamenti")?.findings ?? {};
  const posizioni = altri.find((r) => r.agent === "posizioni")?.findings ?? {};
  const haTag = tracciamenti.hasGoogleAdsTag === true;
  const haConversioni = tracciamenti.hasConversionTracking === true;
  // Con Tag Manager il tracciamento delle conversioni sta dentro il contenitore: da fuori non si vede.
  const haGtm = tracciamenti.hasGTM === true;
  const posizione = typeof posizioni.posizione === "number" ? posizioni.posizione : null;
  const parola = typeof posizioni.parolaChiave === "string" ? posizioni.parolaChiave : null;

  const annunci = items.length;
  const ultimo = items.map((i) => i.last_shown).filter(Boolean).sort().pop() ?? null;
  const primo = items.map((i) => i.first_shown).filter(Boolean).sort()[0] ?? null;
  const soglia = oggi.getTime() - GIORNI_ANNUNCIO_ATTIVO * 86400_000;
  const attivi = items.filter((i) => i.last_shown && new Date(i.last_shown.replace(" +00:00", "Z")).getTime() >= soglia).length;
  const levers: Leva[] = [];
  const evidence: Prova[] = items.slice(0, 5).map((i) => ({
    cosa: `Annuncio${i.format ? ` (${i.format})` : ""}${i.last_shown ? `, visto l'ultima volta il ${i.last_shown.slice(0, 10)}` : ""}`,
    fonte: i.url ?? "Google Ads Transparency",
    citazione: i.title,
  }));
  evidence.push({ cosa: `Tag Google Ads nel sito: ${haTag ? "sì" : "no"}`, fonte: "agente Tracciamenti" });

  const quando = `${annunci} annunci su Google Ads Transparency${primo ? ` dal ${primo.slice(0, 10)}` : ""}${ultimo ? `, l'ultimo visto il ${ultimo.slice(0, 10)}` : ""}`;
  if (attivi > 0 && !haConversioni && !haGtm) {
    levers.push({
      servizio: "google_ads",
      testo: "Stanno facendo pubblicità su Google adesso, ma nel codice del sito non si vede il tracciamento delle conversioni: da chiedere se sanno quali annunci portano clienti",
      prova: `${attivi} annunci attivi negli ultimi ${GIORNI_ANNUNCIO_ATTIVO} giorni; nel sito nessun codice di conversione e nessun Tag Manager`,
    });
  } else if (attivi > 0) {
    levers.push({
      servizio: "google_ads",
      testo: `Stanno investendo in Google Ads adesso (${attivi} annunci attivi): c'è budget, da capire se rende`,
      prova: quando,
    });
  } else if (annunci > 0) {
    levers.push({
      servizio: "google_ads",
      testo: `Hanno fatto Google Ads${ultimo ? ` fino al ${ultimo.slice(0, 10)}` : " in passato"} e poi hanno smesso`,
      prova: quando,
    });
  } else if (haTag) {
    levers.push({
      servizio: "google_ads",
      testo: "Il codice di Google Ads è nel sito, ma su Google non risultano annunci collegati al loro sito",
      prova: "Tag AW- presente; nessun annuncio su Google Ads Transparency per questo dominio",
    });
  } else if (parola && (posizione === null || posizione > 10)) {
    levers.push({
      servizio: "google_ads",
      testo: `Non fanno Google Ads e non compaiono in prima pagina per "${parola}": chi cerca quel servizio trova solo i concorrenti`,
      prova: `Nessun annuncio su Transparency; ${posizione === null ? "assenti nei primi 20 risultati" : `posizione ${posizione}`}`,
    });
  }

  return {
    summary: attivi > 0 ? `Google Ads attivo: ${attivi} annunci negli ultimi ${GIORNI_ANNUNCIO_ATTIVO} giorni (${annunci} in tutto)` : annunci > 0 ? `${annunci} annunci passati, nessuno recente` : "Nessun annuncio su Google Ads Transparency",
    findings: { dominio: dominio(sito), annunci, attiviOra: attivi, primoVisto: primo, ultimoVisto: ultimo, haTag, haConversioni },
    levers,
    evidence,
    // Le date le dà Google: se ci sono, il dato è solido.
    confidence: ultimo ? "ALTA" : "MEDIA",
    costCents,
  };
}

export const agenteGoogleAds: AgenteEseguibile = {
  chiave: "google_ads",
  fase: "approfondimento",
  validitaGiorni: 30,
  aPagamento: true,
  async esegui(ctx) {
    const { result, costCents } = await chiamaDataForSeo<{ items?: ItemAds[] }>("/serp/google/ads_search/live/advanced", {
      target: dominio(ctx.lead.website),
      location_code: LOCATION_ITALIA,
    });
    return refertoGoogleAds(result?.items ?? [], ctx.lead.website, await ctx.referti(), costCents, ctx.oggi);
  },
};
