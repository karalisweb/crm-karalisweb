/**
 * Fase 2 — Arricchimento: gli agenti nuovi del giro veloce e del giro completo.
 *
 *   trova_sito  — il sito per più strade, e se cercando il nome su Google esce
 *   sito_visto  — il sito GUARDATO: foto su telefono e computer (Chromium sul server), velocità, se sembra vecchio
 *   contatto    — dal cliente al contatto: telefono cliccabile, WhatsApp, modulo, quanti clic
 *   recensioni  — cosa lodano e di cosa si lamentano i clienti, con le loro parole
 *   concorrenti — chi esce prima su Google Maps per la stessa ricerca, e con che numeri
 *
 * Ogni leva ha la sua prova (numero, link o citazione): niente consigli generici.
 */
import * as cheerio from "cheerio";
import { chiediJSON, REGOLE_COMUNI, type Schema } from "../ai";
import { chiamaDataForSeo, dominio, LOCATION_ITALIA } from "../dataforseo";
import { usdInCentesimiEuro } from "../costi";
import { scaricaTesto } from "../pagina";
import type { AgenteEseguibile, Leva, Prova } from "../tipi";
import { trovaSito } from "@/lib/ricerca/trova-sito";
import { fotografaSito } from "../fotografo";
import { norm } from "../bni-regole";

// ─── Trova sito ────────────────────────────────────────────────────────────

export const agenteTrovaSito: AgenteEseguibile = {
  chiave: "trova_sito",
  fase: "base",
  validitaGiorni: 90,
  aPagamento: true,
  async esegui(ctx) {
    const l = ctx.lead;
    let t = await trovaSito({ nome: l.name, citta: l.citta, telefono: l.phone, sitoNoto: l.website || null });
    // Google cambia da una ricerca all'altra: "non esce" si dice solo se non esce nemmeno col nome da solo.
    if (t.sito && t.posizioneNome === null && l.citta) {
      const t2 = await trovaSito({ nome: l.name, telefono: l.phone, sitoNoto: t.sito });
      t = { ...t2, costCents: t.costCents + t2.costCents };
    }
    const levers: Leva[] = [];
    const evidence: Prova[] = [];
    if (!t.sito) {
      levers.push({ servizio: "sito", testo: "Non hanno un sito: chi li cerca trova solo schede di altri (Facebook, elenchi)", prova: `Ricerca "${t.ricercaNome}": ${t.primiNome.join(", ") || "nessun risultato utile"}` });
    } else if (t.posizioneNome === null) {
      levers.push({ servizio: "seo", testo: `Chi li cerca per nome su Google non trova il loro sito: escono ${t.primiNome.join(", ")}`, prova: `Ricerca "${t.ricercaNome}": il sito ${dominio(t.sito)} non è nei primi 20 risultati` });
    } else if (t.posizioneNome > 3) {
      levers.push({ servizio: "seo", testo: `Cercando il loro nome, il sito esce solo in posizione ${t.posizioneNome}: prima ci sono ${t.primiNome.join(", ")}`, prova: `Ricerca "${t.ricercaNome}"` });
    }
    if (t.sito) evidence.push({ cosa: `Sito trovato (${t.come})`, fonte: t.sito });
    return {
      summary: t.sito ? `Sito ${dominio(t.sito)}${t.posizioneNome ? `, cercando il nome esce ${t.posizioneNome}°` : ", cercando il nome NON esce"}` : "Sito non trovato",
      findings: { ...t },
      levers,
      evidence,
      confidence: t.sito ? "ALTA" : "MEDIA",
      costCents: t.costCents,
    };
  },
};

// ─── Sito visto ────────────────────────────────────────────────────────────

interface RispostaVisto {
  sembra_anno: string;
  impressione: string;
  cosa_si_vede_subito: string;
  sul_telefono: string;
  problemi: { problema: string; dove: string }[];
}

const SCHEMA_VISTO: Schema = {
  type: "object",
  properties: {
    sembra_anno: { type: "string", description: "Di che anni sembra il design (es. 'circa 2015', 'recente'), con il perché in poche parole" },
    impressione: { type: "string", description: "La prima impressione di un cliente in 3 secondi, in una frase concreta" },
    cosa_si_vede_subito: { type: "string", description: "Cosa c'è nella parte visibile senza scorrere: titolo, immagine, pulsanti" },
    sul_telefono: { type: "string", description: "Come si legge e si usa sul telefono: testi, pulsanti, menu" },
    problemi: {
      type: "array",
      description: "Al massimo 4 problemi che si VEDONO nelle foto, concreti (non consigli generici)",
      items: { type: "object", properties: { problema: { type: "string" }, dove: { type: "string", description: "telefono o computer, e in che punto" } }, required: ["problema", "dove"] },
    },
  },
  required: ["sembra_anno", "impressione", "cosa_si_vede_subito", "sul_telefono", "problemi"],
};

export const agenteSitoVisto: AgenteEseguibile = {
  chiave: "sito_visto",
  fase: "base",
  validitaGiorni: 90,
  aPagamento: true,
  async esegui(ctx) {
    const url = (await ctx.pagina()).url;
    const { telefono: tel, computer: pc } = await fotografaSito(url);
    const levers: Leva[] = [];
    const evidence: Prova[] = [];
    const sec = (n: number | null) => (n != null ? String(n).replace(".", ",") : "?");
    if (tel.lcpSecondi != null && tel.lcpSecondi >= 4) {
      levers.push({ servizio: "sito", testo: `Nel test di velocità come quello di Google (telefono con 4G lento) il sito ci mette ${sec(tel.lcpSecondi)} secondi a mostrare il contenuto principale: chi ha una connessione debole se ne va prima`, prova: "Homepage aperta come un telefono con 4G lento (150 ms, 1,6 Mbit/s), lo stesso profilo dei test di Google PageSpeed" });
    }
    evidence.push({ cosa: `Sul telefono con 4G lento il contenuto principale si vede dopo ${sec(tel.lcpSecondi)} s`, fonte: url });

    const immagini = [tel.jpeg, pc?.jpeg]
      .filter((f): f is string => !!f)
      .map((f) => ({ mime: "image/jpeg", data: f.slice(f.indexOf(",") + 1) }));
    let visto: RispostaVisto | null = null;
    let costCents = 0;
    {
      const ai = await chiediJSON<RispostaVisto>({
        sistema: `${REGOLE_COMUNI}\n\nGuardi le foto della homepage di un'azienda: la prima è sul telefono${immagini.length > 1 ? ", la seconda sul computer" : ""}. Giudichi come la vede un potenziale cliente: se sembra vecchio, se si capisce cosa fanno, se si legge sul telefono. Scrivi solo quello che si vede davvero nelle foto (un banner dei cookie in primo piano è normale: non è un problema del sito).`,
        testo: `Azienda: ${ctx.lead.name}${ctx.lead.category ? ` (${ctx.lead.category})` : ""}. Sito: ${url}`,
        immagini,
        schema: SCHEMA_VISTO,
      });
      visto = ai.dati;
      costCents = ai.costCents;
      if (/20(0\d|1[0-6])/.test(visto.sembra_anno)) {
        levers.push({ servizio: "sito", testo: `Il sito sembra fatto ${visto.sembra_anno.replace(/^circa\s+/i, "nel ")}: ${visto.impressione}`, prova: "Foto della homepage su telefono e computer" });
      }
      for (const p of visto.problemi.slice(0, 2)) levers.push({ servizio: "sito", testo: p.problema, prova: `Si vede nella foto (${p.dove})` });
    }
    return {
      summary: `Sembra ${visto.sembra_anno}. Telefono con 4G lento: si vede in ${sec(tel.lcpSecondi)} s`,
      findings: {
        telefono: { lcpSecondi: tel.lcpSecondi, caricamentoSecondi: tel.caricamentoSecondi },
        computer: pc ? { lcpSecondi: pc.lcpSecondi, caricamentoSecondi: pc.caricamentoSecondi } : null,
        foto: { telefono: tel.jpeg, computer: pc?.jpeg ?? null },
        ...(visto ?? {}),
      },
      levers,
      evidence,
      confidence: "ALTA",
      costCents,
    };
  },
};

// ─── Contatto ──────────────────────────────────────────────────────────────

const PAROLE_CONTATTO = /preventiv|contatt|chiam|prenot|richied|scrivi|parla|whatsapp|appuntament/i;

export interface AnalisiContatto {
  telefonoCliccabile: boolean;
  telefonoScritto: boolean;
  whatsapp: boolean;
  email: boolean;
  moduloInHome: boolean;
  paginaContatti: string | null;
  moduloInContatti: boolean | null;
  pulsantiInAlto: string[];
}

/** Legge l'HTML: come può un cliente mettersi in contatto, e quanti clic servono. */
export function analizzaContatto(html: string, origin: string): Omit<AnalisiContatto, "moduloInContatti"> {
  const $ = cheerio.load(html);
  const href = $("a[href]").map((_, a) => $(a).attr("href") ?? "").get();
  const testo = $("body").text();
  const moduli = $("form").filter((_, f) => $(f).find("input, textarea").length >= 2 && !/search|cerca/i.test($(f).attr("role") ?? $(f).attr("class") ?? ""));
  const pagina = $("a[href]")
    .filter((_, a) => /contatt|contact|preventiv/i.test(`${$(a).attr("href")} ${$(a).text()}`))
    .map((_, a) => $(a).attr("href") ?? "")
    .get()
    .find((h) => h && !h.startsWith("#") && !h.startsWith("mailto:") && !h.startsWith("tel:"));
  let paginaContatti: string | null = null;
  try {
    paginaContatti = pagina ? new URL(pagina, origin).toString() : null;
  } catch {
    paginaContatti = null;
  }
  const inAlto = $("header a, header button, nav a, .hero a, [class*=hero] a, [class*=banner] a")
    .map((_, a) => $(a).text().replace(/\s+/g, " ").trim())
    .get()
    .filter((t) => t.length > 2 && t.length < 40 && PAROLE_CONTATTO.test(t));
  return {
    telefonoCliccabile: href.some((h) => h.startsWith("tel:")),
    telefonoScritto: /(\+39\s?)?\b0\d{1,3}[\s./-]?\d{5,8}\b|\b3\d{2}[\s./-]?\d{6,7}\b/.test(testo),
    whatsapp: href.some((h) => /wa\.me|whatsapp/i.test(h)) || /whatsapp/i.test(html.slice(0, 2_000_000)),
    email: href.some((h) => h.startsWith("mailto:")),
    moduloInHome: moduli.length > 0,
    paginaContatti,
    pulsantiInAlto: [...new Set(inAlto)].slice(0, 5),
  };
}

export const agenteContatto: AgenteEseguibile = {
  chiave: "contatto",
  fase: "base",
  validitaGiorni: 90,
  aPagamento: false,
  async esegui(ctx) {
    const p = await ctx.pagina();
    const a: AnalisiContatto = { ...analizzaContatto(p.html, p.origin), moduloInContatti: null };
    if (!a.moduloInHome && a.paginaContatti) {
      const html = await scaricaTesto(a.paginaContatti);
      if (html) a.moduloInContatti = cheerio.load(html)("form").filter((_, f) => cheerio.load(html)(f).find("input, textarea").length >= 2).length > 0;
    }
    const clic = a.moduloInHome ? 0 : a.moduloInContatti ? 1 : null;
    const levers: Leva[] = [];
    if (a.telefonoScritto && !a.telefonoCliccabile) levers.push({ servizio: "sito", testo: "Il numero di telefono è scritto ma non si può toccare per chiamare: dal telefono il cliente deve copiarlo a mano", prova: `Nessun link "tel:" nella homepage di ${dominio(p.url)}` });
    if (!a.whatsapp) levers.push({ servizio: "sito", testo: "Nessun WhatsApp sul sito: chi preferisce scrivere non ha un modo veloce", prova: `Nessun link a WhatsApp in ${dominio(p.url)}` });
    if (clic === null) levers.push({ servizio: "sito", testo: "Non c'è un modulo per chiedere un preventivo, né in homepage né nella pagina contatti", prova: a.paginaContatti ? `Pagina contatti: ${a.paginaContatti}` : "Nessuna pagina contatti trovata nel menu" });
    if (!a.pulsantiInAlto.length) levers.push({ servizio: "sito", testo: "In alto non c'è nessun pulsante per contattarli o chiedere un preventivo: chi arriva non sa cosa fare", prova: `Menu e testata di ${dominio(p.url)}` });
    const modi = [a.telefonoCliccabile && "telefono", a.whatsapp && "WhatsApp", a.email && "email", clic === 0 ? "modulo in home" : clic === 1 ? "modulo a 1 clic" : null].filter(Boolean);
    return {
      summary: `Per contattarli: ${modi.join(", ") || "niente di immediato"}${a.pulsantiInAlto.length ? `; in alto "${a.pulsantiInAlto[0]}"` : ""}`,
      findings: { ...a, clicPerIlModulo: clic },
      levers,
      evidence: [{ cosa: "Homepage letta", fonte: p.url }],
      confidence: "ALTA",
    };
  },
};

// ─── Recensioni ────────────────────────────────────────────────────────────

interface ItemRecensione {
  rating?: { value?: number };
  review_text?: string;
  timestamp?: string;
  owner_answer?: string | null;
  profile_name?: string;
}

interface RispostaRecensioni {
  lodano: { cosa: string; citazione: string }[];
  lamentano: { cosa: string; citazione: string }[];
  sintesi: string;
}

const SCHEMA_RECENSIONI: Schema = {
  type: "object",
  properties: {
    lodano: { type: "array", description: "Fino a 3 cose che i clienti lodano", items: { type: "object", properties: { cosa: { type: "string" }, citazione: { type: "string", description: "Parole COPIATE da una recensione" } }, required: ["cosa", "citazione"] } },
    lamentano: { type: "array", description: "Fino a 3 cose di cui si lamentano (lista vuota se non ce ne sono)", items: { type: "object", properties: { cosa: { type: "string" }, citazione: { type: "string", description: "Parole COPIATE da una recensione" } }, required: ["cosa", "citazione"] } },
    sintesi: { type: "string", description: "Una frase: cosa dicono di loro i clienti" },
  },
  required: ["lodano", "lamentano", "sintesi"],
};

/** Le recensioni su DataForSEO sono un lavoro asincrono: si accoda e si aspetta (al massimo ~2 minuti). */
async function recensioniGoogle(task: Record<string, unknown>): Promise<{ items: ItemRecensione[]; rating: number | null; totale: number | null; costCents: number }> {
  const auth = Buffer.from(`${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`).toString("base64");
  const h = { Authorization: `Basic ${auth}`, "Content-Type": "application/json" };
  const r = await fetch("https://api.dataforseo.com/v3/business_data/google/reviews/task_post", { method: "POST", headers: h, body: JSON.stringify([task]), signal: AbortSignal.timeout(30_000) });
  const d = await r.json();
  const t = d?.tasks?.[0];
  if (!t?.id || t.status_code >= 40000) throw new Error(`Recensioni: ${t?.status_message ?? d?.status_message ?? "errore"}`);
  const costo = Number(t.cost) || 0;
  for (let i = 0; i < 24; i++) {
    await new Promise((res) => setTimeout(res, 5000));
    const g = await fetch(`https://api.dataforseo.com/v3/business_data/google/reviews/task_get/${t.id}`, { headers: h, signal: AbortSignal.timeout(30_000) });
    const gd = await g.json();
    const gt = gd?.tasks?.[0];
    if (gt?.status_code === 20000 && gt.result?.[0]) {
      const res0 = gt.result[0];
      return { items: res0.items ?? [], rating: res0.rating?.value ?? null, totale: res0.reviews_count ?? null, costCents: usdInCentesimiEuro(costo) };
    }
    if (gt?.status_code && gt.status_code >= 40000 && gt.status_code !== 40602) throw new Error(`Recensioni: ${gt.status_message}`);
  }
  throw new Error("Recensioni: Google non ha risposto in tempo");
}

export const agenteRecensioni: AgenteEseguibile = {
  chiave: "recensioni",
  fase: "base",
  validitaGiorni: 60,
  aPagamento: true,
  async esegui(ctx) {
    const l = ctx.lead;
    // Senza la scheda Maps precisa (place_id) la ricerca per nome prende facilmente un'altra
    // attività con lo stesso nome: meglio dire che non si sa che dare recensioni sbagliate.
    if (!l.placeId) {
      return {
        summary: "Scheda Google non collegata con certezza: recensioni non lette",
        findings: { schedaTrovata: null },
        levers: [],
        evidence: [],
        confidence: "BASSA",
      };
    }
    const task: Record<string, unknown> = { language_code: "it", depth: 40, sort_by: "newest", location_code: LOCATION_ITALIA, place_id: l.placeId };
    let r: Awaited<ReturnType<typeof recensioniGoogle>>;
    try {
      r = await recensioniGoogle(task);
    } catch (err) {
      // Nessuna scheda trovata è già un'informazione (e un gancio), non un errore.
      if (!(err instanceof Error && /No Search Results/i.test(err.message))) throw err;
      return {
        summary: "Nessuna scheda Google trovata",
        findings: { rating: null, totale: 0, schedaTrovata: false },
        levers: [{ servizio: "seo", testo: "Cercandoli su Google Maps non esce la loro scheda: niente recensioni, niente telefono, niente indicazioni per chi li cerca", prova: `Ricerca "${[l.name, l.citta].filter(Boolean).join(" ")}" su Google Maps` }],
        evidence: [],
        confidence: "MEDIA",
      };
    }
    const conTesto = r.items.filter((i) => i.review_text && i.review_text.length > 20);
    const levers: Leva[] = [];
    const evidence: Prova[] = [];
    const totale = r.totale ?? l.googleReviewsCount ?? r.items.length;
    const rating = r.rating ?? l.googleRating;
    const senzaRisposta = r.items.filter((i) => !i.owner_answer).length;
    const ultima = r.items.map((i) => i.timestamp).filter(Boolean).sort().pop() ?? null;
    const giorniUltima = ultima ? Math.round((ctx.oggi.getTime() - new Date(ultima.replace(" +00:00", "Z")).getTime()) / 86400_000) : null;
    if (r.items.length >= 5 && senzaRisposta / r.items.length > 0.8) levers.push({ servizio: "social", testo: `Non rispondono alle recensioni: ${senzaRisposta} delle ultime ${r.items.length} sono senza risposta`, prova: "Scheda Google" });
    if (giorniUltima != null && giorniUltima > 120) levers.push({ servizio: "seo", testo: `L'ultima recensione è di ${Math.round(giorniUltima / 30)} mesi fa: la scheda Google sembra ferma`, prova: `Ultima recensione: ${ultima?.slice(0, 10)}` });
    if ((totale ?? 0) < 20) levers.push({ servizio: "seo", testo: `Solo ${totale ?? 0} recensioni su Google: chi confronta sceglie chi ne ha di più`, prova: "Scheda Google" });

    let analisi: RispostaRecensioni | null = null;
    let costAi = 0;
    if (conTesto.length >= 3) {
      const testi = conTesto.slice(0, 30).map((i, n) => `${n + 1}. (${i.rating?.value ?? "?"}★, ${i.timestamp?.slice(0, 10) ?? ""}) ${i.review_text}`).join("\n");
      const ai = await chiediJSON<RispostaRecensioni>({
        sistema: `${REGOLE_COMUNI}\n\nLeggi le recensioni Google di un'azienda e dici cosa lodano e di cosa si lamentano i clienti, ogni punto con parole copiate da una recensione.`,
        testo: `Azienda: ${l.name}\n\nRECENSIONI:\n${testi}`,
        schema: SCHEMA_RECENSIONI,
      });
      analisi = ai.dati;
      costAi = ai.costCents;
      const tutto = norm(testi);
      for (const x of [...analisi.lodano, ...analisi.lamentano]) {
        if (tutto.includes(norm(x.citazione).slice(0, 40))) evidence.push({ cosa: x.cosa, fonte: "Recensioni Google", citazione: x.citazione });
      }
      const lamentela = analisi.lamentano.find((x) => tutto.includes(norm(x.citazione).slice(0, 40)));
      if (lamentela) levers.push({ servizio: "social", testo: `I clienti si lamentano di: ${lamentela.cosa}`, prova: `"${lamentela.citazione}"` });
    }
    return {
      summary: `${rating ?? "?"}★ su ${totale ?? "?"} recensioni${giorniUltima != null ? `, l'ultima ${giorniUltima} giorni fa` : ""}${analisi ? `. ${analisi.sintesi}` : ""}`,
      findings: { rating, totale, ultima, giorniUltima, senzaRisposta, lette: r.items.length, ...(analisi ?? {}) },
      levers,
      evidence,
      confidence: analisi ? "ALTA" : "MEDIA",
      costCents: r.costCents + costAi,
    };
  },
};

// ─── Concorrenti ───────────────────────────────────────────────────────────

interface ItemMaps {
  type?: string;
  rank_group?: number;
  title?: string;
  domain?: string;
  url?: string;
  place_id?: string;
  phone?: string;
  rating?: { value?: number; votes_count?: number };
}

export const agenteConcorrenti: AgenteEseguibile = {
  chiave: "concorrenti",
  fase: "approfondimento",
  validitaGiorni: 60,
  aPagamento: true,
  async esegui(ctx) {
    const l = ctx.lead;
    // La stessa ricerca di Posizioni (nicchia o servizio dal titolo del sito), non la categoria di Maps.
    const daPosizioni = (await ctx.referti()).find((r) => r.agent === "posizioni")?.findings.parolaChiave;
    const cosa = l.ricerca ?? l.category;
    if (typeof daPosizioni !== "string" && (!cosa || !l.citta)) throw new Error("Manca cosa cercare o la città");
    const ricerca = typeof daPosizioni === "string" ? daPosizioni : `${cosa} ${l.citta}`.toLowerCase();
    const { result, costCents } = await chiamaDataForSeo<{ items?: ItemMaps[] }>("/serp/google/maps/live/advanced", {
      keyword: ricerca, location_code: LOCATION_ITALIA, language_code: "it", depth: 20,
    });
    const items = (result?.items ?? []).filter((i) => i.type === "maps_search" && i.title);
    const mioDom = l.website ? dominio(l.website) : null;
    const eLui = (i: ItemMaps) => (!!l.placeId && i.place_id === l.placeId) || (!!mioDom && !!i.domain && dominio(i.domain) === mioDom);
    const lui = items.find(eLui);
    const posizione = lui ? items.indexOf(lui) + 1 : null;
    const altri = items.filter((i) => !eLui(i)).slice(0, 3);
    // Il confronto delle recensioni solo se si sa quante ne hanno loro (scheda Maps collegata).
    const mie = l.googleReviewsCount ?? lui?.rating?.votes_count ?? null;
    const levers: Leva[] = [];
    const evidence: Prova[] = altri.map((i, n) => ({
      cosa: `${n + 1}. ${i.title}: ${i.rating?.value ?? "?"}★, ${i.rating?.votes_count ?? 0} recensioni${i.domain ? `, sito ${i.domain}` : ", senza sito"}`,
      fonte: `Google Maps: "${ricerca}"`,
    }));
    if (posizione === null) levers.push({ servizio: "seo", testo: `Chi cerca "${ricerca}" su Google Maps non li trova nei primi 20: escono ${altri.map((a) => a.title).join(", ")}`, prova: `Google Maps, ricerca "${ricerca}"` });
    else if (posizione > 3) levers.push({ servizio: "seo", testo: `Su Google Maps per "${ricerca}" sono ${posizione}°: i primi tre (${altri.map((a) => a.title).join(", ")}) prendono quasi tutte le chiamate`, prova: `Google Maps, ricerca "${ricerca}"` });
    const piuForte = [...altri].sort((a, b) => (b.rating?.votes_count ?? 0) - (a.rating?.votes_count ?? 0))[0];
    if (piuForte && mie != null && (piuForte.rating?.votes_count ?? 0) >= Math.max(20, mie * 2)) {
      levers.push({ servizio: "seo", testo: `${piuForte.title} ha ${piuForte.rating?.votes_count} recensioni, loro ${mie}: chi confronta su Maps sceglie l'altro`, prova: `Google Maps, ricerca "${ricerca}"` });
    }
    return {
      summary: posizione ? `Su Maps per "${ricerca}": ${posizione}°` : `Su Maps per "${ricerca}": non nei primi 20`,
      findings: {
        ricerca,
        posizione,
        concorrenti: altri.map((i) => ({ nome: i.title, rating: i.rating?.value ?? null, recensioni: i.rating?.votes_count ?? 0, sito: i.domain ?? null })),
      },
      levers,
      evidence,
      confidence: "ALTA",
      costCents,
    };
  },
};

// ─── I 3 ganci ─────────────────────────────────────────────────────────────

interface RispostaGanci {
  ganci: { leva: number; frase: string }[];
  apertura: string;
}

const SCHEMA_GANCI: Schema = {
  type: "object",
  properties: {
    ganci: {
      type: "array",
      description: "Esattamente 3 ganci, il più forte per primo",
      items: {
        type: "object",
        properties: {
          leva: { type: "integer", description: "Il numero della leva da cui nasce il gancio (dalla lista)" },
          frase: { type: "string", description: "Come Alessio lo dice al titolare al telefono: una frase, con il numero o il fatto preciso della leva, senza tecnicismi" },
        },
        required: ["leva", "frase"],
      },
    },
    apertura: { type: "string", description: "La prima frase della chiamata, che usa il gancio più forte" },
  },
  required: ["ganci", "apertura"],
};

/**
 * Alla fine: dai referti, i 3 ganci con i numeri. L'AI può solo SCEGLIERE fra le leve trovate
 * dagli agenti (per numero) e riscriverle da dire al telefono: la prova resta quella originale.
 */
export const agenteGanci: AgenteEseguibile = {
  chiave: "ganci",
  fase: "sintesi",
  validitaGiorni: 30,
  aPagamento: true,
  async esegui(ctx) {
    // Non i ganci di prima: si riscelgono dalle leve fresche degli agenti.
    const referti = (await ctx.referti()).filter((r) => r.agent !== "ganci");
    const leve = referti.flatMap((r) => r.levers.map((l) => ({ ...l, agente: r.agent })));
    if (leve.length < 2) throw new Error("Troppo poche leve per scegliere i ganci");
    const lista = leve.map((l, i) => `${i + 1}. [${l.agente}] ${l.testo} — prova: ${l.prova}`).join("\n");
    const riassunti = referti.map((r) => `- ${r.agent}: ${r.summary}`).join("\n");
    const ai = await chiediJSON<RispostaGanci>({
      sistema: `${REGOLE_COMUNI}\n\nScegli i 3 ganci più forti per la prima telefonata di Alessio al titolare. Preferisci i fatti con un numero o un confronto con i concorrenti, quelli che il titolare può verificare da solo e che toccano i clienti persi. Scarta i consigli generici. Usa SOLO le leve della lista e riporta ogni numero con le sue condizioni (es. "nel test con 4G lento"): il titolare deve poterlo verificare e trovarlo vero.`,
      testo: `Azienda: ${ctx.lead.name}${ctx.lead.category ? ` (${ctx.lead.category})` : ""}, ${ctx.lead.citta ?? ""}\n\nCOSA HANNO TROVATO GLI AGENTI:\n${riassunti}\n\nLEVE:\n${lista}`,
      schema: SCHEMA_GANCI,
    });
    const scelti = ai.dati.ganci
      .filter((g) => g.leva >= 1 && g.leva <= leve.length)
      .slice(0, 3)
      .map((g) => ({ frase: g.frase, prova: leve[g.leva - 1].prova, servizio: leve[g.leva - 1].servizio, agente: leve[g.leva - 1].agente }));
    if (!scelti.length) throw new Error("L'AI non ha scelto ganci validi");
    return {
      summary: scelti.map((g, i) => `${i + 1}) ${g.frase}`).join(" "),
      findings: { ganci: scelti, apertura: ai.dati.apertura },
      levers: scelti.map((g) => ({ servizio: g.servizio, testo: g.frase, prova: g.prova })),
      evidence: [],
      confidence: "ALTA",
      costCents: ai.costCents,
    };
  },
};
