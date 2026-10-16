/**
 * Agente 2.5 — Il Tecnico.
 * Con che cosa è fatto il sito, se è aggiornato e da quando non viene toccato.
 * Ricicla `detectTech`; aggiunge l'età (anno del © nel piè di pagina) e la
 * versione PHP dichiarata negli header HTTP.
 */
import * as cheerio from "cheerio";
import { detectTech } from "@/lib/audit/tech-detector";
import type { AgenteEseguibile, Leva, PaginaScaricata, Prova, Referto } from "../tipi";

/** Anno più recente scritto dopo ©/copyright, oppure null. */
export function annoCopyright(html: string): { anno: number; citazione: string } | null {
  const $ = cheerio.load(html);
  const testo = $("footer").text() || $("body").text();
  const re = /(?:©|\(c\)|copyright)\s*(?:\d{4}\s*[-–—]\s*)?(\d{4})/gi;
  let migliore: { anno: number; citazione: string } | null = null;
  for (const m of testo.matchAll(re)) {
    const anno = Number(m[1]);
    if (anno >= 1995 && anno <= 2100 && (!migliore || anno > migliore.anno)) {
      migliore = { anno, citazione: m[0].replace(/\s+/g, " ").trim() };
    }
  }
  return migliore;
}

/** Versione PHP dichiarata dall'header X-Powered-By (es. "PHP/7.4.33"). */
export function phpDaHeader(headers: Record<string, string>): string | null {
  const m = (headers["x-powered-by"] || "").match(/PHP\/(\d+\.\d+(?:\.\d+)?)/i);
  return m ? m[1] : null;
}

export function analizzaTecnico(pagina: PaginaScaricata, oggi: Date): Referto {
  const tech = detectTech(pagina.html);
  const php = phpDaHeader(pagina.headers) ?? tech.phpVersion;
  const copyright = annoCopyright(pagina.html);
  const anniFermo = copyright ? oggi.getFullYear() - copyright.anno : null;
  const https = pagina.url.startsWith("https://");

  const levers: Leva[] = [];
  const evidence: Prova[] = [];
  const fonte = pagina.url;

  if (tech.cms) {
    evidence.push({ cosa: `CMS: ${tech.cms}${tech.cmsVersion ? ` ${tech.cmsVersion}` : ""}`, fonte });
  }
  if (php) {
    evidence.push({ cosa: `PHP ${php}`, fonte: "header X-Powered-By o sorgente pagina" });
    if (parseFloat(php) < 8.1) {
      levers.push({
        servizio: "sito",
        testo: `Il sito gira su PHP ${php}, versione non più supportata: rischi di sicurezza e lentezza`,
        prova: `PHP ${php} dichiarato dal server`,
      });
    }
  }
  if (tech.cms === "WordPress" && tech.cmsVersion && parseFloat(tech.cmsVersion) < 6.0) {
    levers.push({
      servizio: "sito",
      testo: `WordPress ${tech.cmsVersion}: non aggiornato da anni`,
      prova: `Versione WordPress ${tech.cmsVersion} letta nel sorgente`,
    });
  }
  if (copyright) {
    evidence.push({ cosa: `Anno nel piè di pagina: ${copyright.anno}`, fonte, citazione: copyright.citazione });
    if (anniFermo !== null && anniFermo >= 3) {
      levers.push({
        servizio: "sito",
        testo: `Il piè di pagina dice ${copyright.anno}: il sito sembra fermo da ${anniFermo} anni`,
        prova: copyright.citazione,
      });
    }
  }
  if (!https) {
    levers.push({
      servizio: "sito",
      testo: `Il sito non è in HTTPS: Chrome lo segna come "Non sicuro"`,
      prova: `Raggiungibile solo su ${pagina.url}`,
    });
  }

  const pezzi = [
    tech.cms ? `${tech.cms}${tech.cmsVersion ? ` ${tech.cmsVersion}` : ""}` : "CMS non riconosciuto",
    php ? `PHP ${php}` : null,
    copyright ? `© ${copyright.anno}` : "anno non dichiarato",
    https ? null : "senza HTTPS",
  ].filter(Boolean);

  return {
    summary: pezzi.join(" · "),
    findings: { ...tech, phpVersion: php, annoCopyright: copyright?.anno ?? null, anniFermo, https },
    levers,
    evidence,
    // Il CMS da pattern può sbagliare; l'anno e l'header sono letti, non dedotti.
    confidence: tech.cms || copyright ? "MEDIA" : "BASSA",
  };
}

export const agenteTecnico: AgenteEseguibile = {
  chiave: "tecnico",
  fase: "base",
  aPagamento: false,
  validitaGiorni: 90,
  async esegui(ctx) {
    return analizzaTecnico(await ctx.pagina(), ctx.oggi);
  },
};
