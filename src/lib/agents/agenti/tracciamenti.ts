/**
 * Agente 5 — Tracciamenti (e la parte "tag" dell'agente 4 Google Ads).
 * Ricicla `detectTracking` (testato). Legge solo l'HTML statico: i tag caricati
 * dentro Google Tag Manager non si vedono, e lo dice.
 */
import { detectTracking } from "@/lib/audit/tracking-detector";
import type { TrackingAudit } from "@/types";
import type { AgenteEseguibile, Leva, Prova, Referto } from "../tipi";

export function refertoTracciamenti(t: TrackingAudit, fonte: string): Referto {
  const levers: Leva[] = [];
  const evidence: Prova[] = [];
  const trovati: string[] = [];

  const segna = (presente: boolean, nome: string, id?: string | null) => {
    if (!presente) return;
    trovati.push(nome);
    evidence.push({ cosa: `${nome} installato`, fonte, citazione: id ?? undefined });
  };
  segna(t.hasGA4, "Google Analytics 4");
  segna(t.hasGoogleAnalytics && !t.hasGA4, "Google Analytics (vecchio)");
  segna(t.hasGTM, "Google Tag Manager", t.gtmId);
  segna(t.hasFacebookPixel, "Pixel Meta", t.fbPixelId);
  segna(t.hasGoogleAdsTag, "Tag Google Ads", t.googleAdsId);
  segna(t.hasHotjar, "Hotjar");
  segna(t.hasClarity, "Microsoft Clarity");
  segna(t.hasLinkedInInsight, "LinkedIn Insight");
  segna(t.hasTikTokPixel, "Pixel TikTok");

  // Con GTM i tag possono stare dentro il contenitore: un "assente" è solo probabile.
  const nota = t.hasGTM ? " (potrebbe essere dentro Tag Manager: da verificare)" : "";

  if (!t.hasGA4 && !t.hasGoogleAnalytics) {
    levers.push({ servizio: "tracciamento", testo: `Nessun Google Analytics${nota}: non sanno quanti visitatori hanno né da dove arrivano`, prova: "Nessuno script Analytics in homepage" });
  } else if (t.hasGoogleAnalytics && !t.hasGA4) {
    levers.push({ servizio: "tracciamento", testo: "Usano ancora il vecchio Universal Analytics, spento da Google: i dati non arrivano più", prova: "Codice UA- presente, nessun G-" });
  }
  if (t.hasGoogleAdsTag) {
    levers.push({ servizio: "google_ads", testo: "Hanno il tag Google Ads: stanno già investendo (o hanno investito) in pubblicità su Google", prova: t.googleAdsId ?? "Tag AW- in homepage" });
  }
  if (t.hasFacebookPixel) {
    levers.push({ servizio: "meta_ads", testo: "Hanno il Pixel Meta: fanno (o hanno fatto) pubblicità su Facebook/Instagram", prova: t.fbPixelId ? `Pixel ${t.fbPixelId}` : "Script fbevents in homepage" });
  } else {
    levers.push({ servizio: "meta_ads", testo: `Nessun Pixel Meta${nota}: non possono fare remarketing su chi visita il sito`, prova: "Nessuno script fbevents in homepage" });
  }

  return {
    summary: trovati.length ? trovati.join(" · ") : "Nessun tracciamento trovato",
    findings: { ...t },
    levers,
    evidence,
    confidence: t.hasGTM ? "MEDIA" : "ALTA",
  };
}

export const agenteTracciamenti: AgenteEseguibile = {
  chiave: "tracciamenti",
  fase: "base",
  aPagamento: false,
  validitaGiorni: 60,
  async esegui(ctx) {
    const p = await ctx.pagina();
    return refertoTracciamenti(detectTracking(p.html), p.url);
  },
};
