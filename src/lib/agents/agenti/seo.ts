/**
 * Agente 3 — SEO (parte on-page).
 * Ricicla `checkSEO` (testato). Le posizioni su Google per le parole "normali"
 * arriveranno con la raccolta approfondita (DataForSEO): qui non si inventano.
 */
import { checkSEO } from "@/lib/audit/seo-checker";
import type { AgenteEseguibile, Leva, Prova, Referto } from "../tipi";

type EsitoSeo = Awaited<ReturnType<typeof checkSEO>>;

export function refertoSeo(seo: EsitoSeo, fonte: string): Referto {
  const levers: Leva[] = [];
  const evidence: Prova[] = [];

  if (seo.metaTitle) evidence.push({ cosa: "Titolo della pagina", fonte, citazione: seo.metaTitle });
  if (seo.metaDescription) evidence.push({ cosa: "Meta description", fonte, citazione: seo.metaDescription });
  if (seo.h1Text?.length) evidence.push({ cosa: "Titolo principale (H1)", fonte, citazione: seo.h1Text[0] });

  if (!seo.hasMetaTitle) {
    levers.push({ servizio: "seo", testo: "La homepage non ha un titolo: Google non sa di cosa parla", prova: "Tag <title> assente" });
  } else if (seo.metaTitleOptimized === false && seo.metaTitleIssues?.length) {
    levers.push({ servizio: "seo", testo: `Titolo della homepage debole: ${seo.metaTitleIssues[0]}`, prova: `"${seo.metaTitle}"` });
  }
  if (!seo.hasMetaDescription) {
    levers.push({ servizio: "seo", testo: "Manca la meta description: nei risultati Google appare testo casuale", prova: "Tag meta description assente" });
  }
  if (!seo.hasH1) {
    levers.push({ servizio: "seo", testo: "Manca il titolo principale (H1) della pagina", prova: "Nessun tag <h1> in homepage" });
  }
  if (!seo.hasSitemap) {
    levers.push({ servizio: "seo", testo: "Nessuna sitemap: Google può non trovare tutte le pagine", prova: "/sitemap.xml non risponde" });
  }
  if (!seo.hasSchemaMarkup) {
    levers.push({ servizio: "seo", testo: "Nessun dato strutturato: niente stelline o schede ricche su Google", prova: "Nessun JSON-LD/microdata in homepage" });
  }
  if (seo.mobileFriendly === false) {
    levers.push({
      servizio: "sito",
      testo: `Il sito non è adatto allo smartphone${seo.mobileIssues?.[0] ? `: ${seo.mobileIssues[0].toLowerCase()}` : ""}`,
      prova: seo.mobileIssues?.join("; ") || "Controllo mobile non superato",
    });
  }

  const ok = [seo.hasMetaTitle, seo.hasMetaDescription, seo.hasH1, seo.hasSitemap, seo.hasSchemaMarkup].filter(Boolean).length;
  return {
    summary: `On-page: ${ok}/5 elementi base presenti${seo.mobileFriendly === false ? " · non mobile" : ""}`,
    findings: { ...seo },
    levers,
    evidence,
    confidence: "ALTA",
  };
}

export const agenteSeo: AgenteEseguibile = {
  chiave: "seo",
  fase: "base",
  aPagamento: false,
  validitaGiorni: 60,
  async esegui(ctx) {
    const p = await ctx.pagina();
    return refertoSeo(await checkSEO(p.html, p.origin), p.url);
  },
};
