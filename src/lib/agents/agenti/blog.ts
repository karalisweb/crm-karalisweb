/**
 * Agente 3.5 — Il Blog.
 * Esiste un blog? Quando è uscito l'ultimo articolo? Di cosa parla?
 *
 * Fonti, dalla più affidabile: API di WordPress → feed RSS/Atom → pagina blog
 * (il vecchio `checkBlog`, che legge date "a occhio" ed è la meno precisa).
 */
import * as cheerio from "cheerio";
import { checkBlog } from "@/lib/audit/blog-detector";
import { scaricaTesto } from "../pagina";
import type { AgenteEseguibile, Leva, PaginaScaricata, Prova, Referto } from "../tipi";

export interface Articolo {
  titolo: string;
  data: string; // YYYY-MM-DD
  link: string | null;
}

function isoGiorno(d: string): string | null {
  const t = new Date(d);
  return isNaN(t.getTime()) ? null : t.toISOString().slice(0, 10);
}

function pulisci(s: string): string {
  return cheerio.load(`<x>${s}</x>`)("x").text().replace(/\s+/g, " ").trim();
}

/** Risposta di /wp-json/wp/v2/posts → articoli. Null se non è la risposta attesa. */
export function articoliDaWordPress(json: string): Articolo[] | null {
  try {
    const dati = JSON.parse(json);
    if (!Array.isArray(dati)) return null;
    const out: Articolo[] = [];
    for (const p of dati) {
      const data = typeof p?.date === "string" ? isoGiorno(p.date) : null;
      const titolo = typeof p?.title?.rendered === "string" ? pulisci(p.title.rendered) : "";
      if (data) out.push({ titolo, data, link: typeof p?.link === "string" ? p.link : null });
    }
    return out;
  } catch {
    return null;
  }
}

/** Feed RSS o Atom → articoli. Null se il testo non è un feed. */
export function articoliDaFeed(xml: string): Articolo[] | null {
  if (!/<(rss|feed)[\s>]/i.test(xml)) return null;
  const $ = cheerio.load(xml, { xmlMode: true });
  const out: Articolo[] = [];
  $("item").each((_, el) => {
    const data = isoGiorno($(el).find("pubDate").first().text());
    if (data) out.push({ titolo: pulisci($(el).find("title").first().text()), data, link: $(el).find("link").first().text().trim() || null });
  });
  $("entry").each((_, el) => {
    const data = isoGiorno($(el).find("published").first().text() || $(el).find("updated").first().text());
    if (data) out.push({ titolo: pulisci($(el).find("title").first().text()), data, link: $(el).find("link").first().attr("href") ?? null });
  });
  return out;
}

/** Indirizzo del feed dichiarato nella homepage, se c'è. */
export function linkFeed(html: string, origin: string): string | null {
  const $ = cheerio.load(html);
  const href = $('link[rel="alternate"][type="application/rss+xml"], link[rel="alternate"][type="application/atom+xml"]').first().attr("href");
  if (!href) return null;
  try {
    const u = new URL(href, origin);
    // I feed dei commenti non dicono nulla sugli articoli.
    return /comments/i.test(u.pathname) ? null : u.toString();
  } catch {
    return null;
  }
}

export function refertoBlog(
  articoli: Articolo[] | null,
  fonte: string | null,
  ripiego: { hasBlog: boolean; blogUrl: string | null; lastPostDate: string | null } | null,
  oggi: Date
): Referto {
  const levers: Leva[] = [];
  const evidence: Prova[] = [];
  const ordinati = (articoli ?? []).slice().sort((a, b) => b.data.localeCompare(a.data));
  const ultimo = ordinati[0] ?? null;

  const hasBlog = ordinati.length > 0 || !!ripiego?.hasBlog;
  const ultimaData = ultimo?.data ?? ripiego?.lastPostDate ?? null;
  const giorni = ultimaData ? Math.floor((oggi.getTime() - new Date(ultimaData).getTime()) / 86400000) : null;

  for (const a of ordinati.slice(0, 5)) {
    evidence.push({ cosa: `Articolo del ${a.data}`, fonte: a.link ?? fonte ?? "", citazione: a.titolo });
  }
  if (!ordinati.length && ripiego?.blogUrl) {
    evidence.push({ cosa: "Link a una sezione blog/news", fonte: ripiego.blogUrl });
  }

  if (!hasBlog) {
    levers.push({ servizio: "contenuti", testo: "Nessun blog: non intercettano chi cerca informazioni su Google prima di comprare", prova: "Nessun feed, nessuna API articoli, nessun link a blog/news" });
  } else if (giorni !== null && giorni > 180) {
    const mesi = Math.floor(giorni / 30);
    const durata = mesi >= 24 ? `${Math.floor(mesi / 12)} anni` : `${mesi} mesi`;
    levers.push({ servizio: "contenuti", testo: `Il blog è fermo da ${durata}: chi lo apre pensa che l'azienda sia ferma`, prova: `Ultimo articolo del ${ultimaData}${ultimo ? `: "${ultimo.titolo}"` : ""}` });
  }

  const summary = !hasBlog
    ? "Nessun blog"
    : ultimaData
      ? `Blog: ultimo articolo ${ultimaData} (${giorni} giorni fa)${ordinati.length ? ` · fonte ${fonte}` : ""}`
      : "Blog presente, data dell'ultimo articolo non leggibile";

  return {
    summary,
    findings: { hasBlog, ultimoArticolo: ultimaData, giorniDaUltimo: giorni, titoliRecenti: ordinati.slice(0, 10).map((a) => a.titolo), fonte },
    levers,
    evidence,
    // Feed e API danno date certe; la pagina blog letta a occhio no.
    confidence: ordinati.length ? "ALTA" : hasBlog ? "BASSA" : "MEDIA",
  };
}

async function cercaArticoli(p: PaginaScaricata): Promise<{ articoli: Articolo[]; fonte: string } | null> {
  const wp = await scaricaTesto(`${p.origin}/wp-json/wp/v2/posts?per_page=10&_fields=date,title,link`);
  const daWp = wp ? articoliDaWordPress(wp) : null;
  if (daWp && daWp.length) return { articoli: daWp, fonte: "API WordPress" };

  for (const url of [linkFeed(p.html, p.origin), `${p.origin}/feed`].filter(Boolean) as string[]) {
    const xml = await scaricaTesto(url);
    const daFeed = xml ? articoliDaFeed(xml) : null;
    if (daFeed && daFeed.length) return { articoli: daFeed, fonte: `feed ${url}` };
  }
  return null;
}

export const agenteBlog: AgenteEseguibile = {
  chiave: "blog",
  fase: "base",
  aPagamento: false,
  validitaGiorni: 30,
  async esegui(ctx) {
    const p = await ctx.pagina();
    const trovati = await cercaArticoli(p);
    if (trovati) return refertoBlog(trovati.articoli, trovati.fonte, null, ctx.oggi);
    const vecchio = await checkBlog(p.html, p.origin);
    return refertoBlog(null, null, vecchio, ctx.oggi);
  },
};
