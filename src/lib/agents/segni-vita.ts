/**
 * "Il sito è attivo?" — i segni di vita letti dall'HTML della homepage, senza AI:
 * l'anno nel piè di pagina (© 2019) e la data più recente scritta nella pagina
 * (notizie, articoli, date di pubblicazione o modifica).
 */
import * as cheerio from "cheerio";

export interface SegniDiVita {
  annoPiePagina: number | null;
  ultimaData: string | null; // AAAA-MM-GG
  giorniUltimaData: number | null;
}

const MESI: Record<string, number> = {
  gen: 1, feb: 2, mar: 3, apr: 4, mag: 5, giu: 6, lug: 7, ago: 8, set: 9, ott: 10, nov: 11, dic: 12,
  jan: 1, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, dec: 12,
};

function data(a: number, m: number, g: number): Date | null {
  if (a < 2000 || m < 1 || m > 12 || g < 1 || g > 31) return null;
  const d = new Date(Date.UTC(a, m - 1, g));
  return d.getUTCMonth() === m - 1 ? d : null;
}

export function segniDiVita(html: string, oggi: Date): SegniDiVita {
  const $ = cheerio.load(html);
  $("script, style, noscript").remove();
  const annoOggi = oggi.getUTCFullYear();

  // Il piè di pagina: <footer>, altrimenti la fine della pagina. "© 2015-2019" → 2019.
  const piede = ($("footer").text() || $("body").text().slice(-3000)).replace(/\s+/g, " ");
  const anni = [...piede.matchAll(/(?:©|&copy;|\(c\)|copyright)\s*(?:\d{4}\s*[-–]\s*)?(\d{4})|(\d{4})\s*[-–]\s*(\d{4})\s*(?:©|copyright)/gi)]
    .flatMap((m) => [m[1], m[3]].filter(Boolean).map(Number))
    .filter((a) => a >= 1995 && a <= annoOggi);
  const annoPiePagina = anni.length ? Math.max(...anni) : null;

  // Le date scritte: attributi (time, meta di pubblicazione/modifica, JSON-LD) e testo.
  const candidati: Date[] = [];
  const iso = (s: string | undefined) => {
    const m = s?.match(/(\d{4})-(\d{2})-(\d{2})/);
    const d = m && data(+m[1], +m[2], +m[3]);
    if (d) candidati.push(d);
  };
  $("time[datetime]").each((_, el) => iso($(el).attr("datetime")));
  $('meta[property="article:published_time"], meta[property="article:modified_time"], meta[itemprop="datePublished"], meta[itemprop="dateModified"]').each((_, el) => iso($(el).attr("content")));
  for (const m of html.matchAll(/"date(?:Published|Modified)"\s*:\s*"([^"]+)"/g)) iso(m[1]);
  const testo = $("body").text().replace(/\s+/g, " ");
  for (const m of testo.matchAll(/\b(\d{1,2})[/.-](\d{1,2})[/.-](20\d{2})\b/g)) {
    const d = data(+m[3], +m[2], +m[1]);
    if (d) candidati.push(d);
  }
  for (const m of testo.matchAll(/\b(\d{1,2})\s+(gen|feb|mar|apr|mag|giu|lug|ago|set|ott|nov|dic|jan|may|jun|jul|aug|sep|oct|dec)[a-z]*\.?\s+(20\d{2})\b/gi)) {
    const d = data(+m[3], MESI[m[2].toLowerCase()], +m[1]);
    if (d) candidati.push(d);
  }
  const valide = candidati.filter((d) => d.getTime() <= oggi.getTime() + 86400_000);
  const ultima = valide.length ? new Date(Math.max(...valide.map((d) => d.getTime()))) : null;
  return {
    annoPiePagina,
    ultimaData: ultima ? ultima.toISOString().slice(0, 10) : null,
    giorniUltimaData: ultima ? Math.round((oggi.getTime() - ultima.getTime()) / 86400_000) : null,
  };
}
