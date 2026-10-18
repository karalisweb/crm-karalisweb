/**
 * Facebook, Instagram e inserzioni Meta, letti dal server senza l'account di Alessio (v3.49).
 *
 *   social   — la pagina Facebook (dal sito o dalla scheda): follower, ultimo post, di cosa parla;
 *              Instagram si segnala se è collegato dal sito, ma i dettagli richiedono l'accesso.
 *   meta_ads — la libreria pubblica delle inserzioni di Meta, cercando la PAGINA dell'azienda.
 *
 * Il testo delle pagine lo legge l'AI, ma i numeri delle leve devono comparire nel testo letto.
 */
import { chiediJSON, REGOLE_COMUNI, type Schema } from "../ai";
import { leggiPaginaPubblica } from "../fotografo";
import type { AgenteEseguibile, ContestoAgente, Leva, Prova } from "../tipi";
import { detectSocialLinks } from "@/lib/audit/social-detector";

/** La pagina Facebook dell'azienda: link nel sito, altrimenti quello salvato sull'azienda. */
async function paginaFacebook(ctx: ContestoAgente): Promise<{ facebook: string | null; instagram: string | null }> {
  let facebook: string | null = null;
  let instagram: string | null = null;
  try {
    const p = await ctx.pagina();
    const s = detectSocialLinks(p.html) as unknown as Record<string, { url?: string | null } | undefined>;
    facebook = s.facebook?.url ?? null;
    instagram = s.instagram?.url ?? null;
  } catch {
    /* sito non leggibile: si prova con quello che c'è */
  }
  const noto = ctx.lead.socialUrl ?? null;
  if (!facebook && noto && /facebook\.com/i.test(noto)) facebook = noto;
  if (!instagram && noto && /instagram\.com/i.test(noto)) instagram = noto;
  const pulisci = (u: string | null) => (u ? u.replace(/^http:/, "https:").replace(/[?#].*$/, "") : null);
  return { facebook: pulisci(facebook), instagram: pulisci(instagram) };
}

// ─── Social ────────────────────────────────────────────────────────────────

interface RispostaFacebook {
  nome_pagina: string;
  follower: number | null;
  ultimo_post: string | null;
  post_ultimi_3_mesi: number | null;
  temi: string;
}

const SCHEMA_FB: Schema = {
  type: "object",
  properties: {
    nome_pagina: { type: "string" },
    follower: { type: "integer", description: "Numero di follower scritto nella pagina; 0 se non c'è" },
    ultimo_post: { type: "string", description: "Data dell'ultimo post visibile in formato AAAA-MM-GG (calcolala da 'oggi' se è scritta come '3 giorni fa' o '30 luglio'); stringa vuota se non si vede" },
    post_ultimi_3_mesi: { type: "integer", description: "Quanti post si vedono negli ultimi 3 mesi (anche approssimato); 0 se nessuno" },
    temi: { type: "string", description: "Di cosa parlano i post, in una frase; stringa vuota se non si vedono post" },
  },
  required: ["nome_pagina", "follower", "ultimo_post", "post_ultimi_3_mesi", "temi"],
};

export const agenteSocialServer: AgenteEseguibile = {
  chiave: "social",
  fase: "approfondimento",
  validitaGiorni: 30,
  aPagamento: true,
  async esegui(ctx) {
    const { facebook, instagram } = await paginaFacebook(ctx);
    const levers: Leva[] = [];
    const evidence: Prova[] = [];
    let fb: RispostaFacebook | null = null;
    let costCents = 0;
    if (facebook) {
      const p = await leggiPaginaPubblica(facebook);
      // Facebook a volte mostra solo il riquadro di accesso: senza follower né post non c'è niente da leggere.
      if (!/follower|mi piace|persone seguono|post/i.test(p.testo)) throw new Error("Facebook chiede l'accesso per questa pagina");
      const oggi = ctx.oggi.toISOString().slice(0, 10);
      const ai = await chiediJSON<RispostaFacebook>({
        sistema: `${REGOLE_COMUNI}\n\nLeggi il testo di una pagina Facebook aziendale (come la vede chi non ha fatto l'accesso) e ricavi solo i dati scritti. Oggi è ${oggi}.`,
        testo: `Pagina: ${p.url}\n\nTESTO:\n${p.testo.slice(0, 6000)}`,
        schema: SCHEMA_FB,
      });
      fb = ai.dati;
      costCents = ai.costCents;
      evidence.push({ cosa: `Pagina Facebook${fb.follower ? `: ${fb.follower} follower` : ""}`, fonte: p.url });
      const giorni = fb.ultimo_post ? Math.round((ctx.oggi.getTime() - new Date(fb.ultimo_post).getTime()) / 86400_000) : null;
      if (giorni != null && giorni > 90) {
        levers.push({ servizio: "social", testo: `La pagina Facebook è ferma: l'ultimo post è di ${Math.round(giorni / 30)} mesi fa`, prova: `${p.url} — ultimo post visibile: ${fb.ultimo_post}` });
      }
      // Quanti post fanno non si dice: da fuori si vede solo l'ultimo, il conteggio non è affidabile.
    } else {
      levers.push({ servizio: "social", testo: "Dal sito non si arriva a nessuna pagina Facebook", prova: "Nessun link a Facebook nella homepage" });
    }
    if (instagram) evidence.push({ cosa: "Instagram collegato dal sito (i dettagli richiedono l'accesso)", fonte: instagram });
    return {
      summary: facebook
        ? `Facebook${fb?.follower ? ` ${fb.follower} follower` : ""}${fb?.ultimo_post ? `, ultimo post ${fb.ultimo_post}` : ""}${instagram ? "; Instagram collegato" : "; Instagram non collegato"}`
        : `Nessuna pagina Facebook dal sito${instagram ? "; Instagram collegato" : ""}`,
      findings: { facebook, instagram, ...(fb ?? {}) },
      levers,
      evidence,
      confidence: fb ? "MEDIA" : "ALTA",
      costCents,
    };
  },
};

// ─── Inserzioni Meta ───────────────────────────────────────────────────────

interface RispostaAds {
  inserzioni_attive: number;
  inserzioni_totali: number;
  attive_dal: string | null;
  esempi: { testo: string; dal: string }[];
}

const SCHEMA_ADS: Schema = {
  type: "object",
  properties: {
    inserzioni_attive: { type: "integer", description: "Quante inserzioni risultano 'Attiva'; 0 se nessuna" },
    inserzioni_totali: { type: "integer", description: "Il numero di risultati scritto ('~19 risultati'); 0 se nessuno" },
    attive_dal: { type: "string", description: "La data di inizio più vecchia fra le inserzioni attive, AAAA-MM-GG; stringa vuota se non c'è" },
    esempi: { type: "array", description: "Fino a 3 inserzioni: cosa promettono (testo copiato) e da quando", items: { type: "object", properties: { testo: { type: "string" }, dal: { type: "string" } }, required: ["testo", "dal"] } },
  },
  required: ["inserzioni_attive", "inserzioni_totali", "attive_dal", "esempi"],
};

export const agenteMetaAdsServer: AgenteEseguibile = {
  chiave: "meta_ads",
  fase: "approfondimento",
  validitaGiorni: 30,
  aPagamento: true,
  async esegui(ctx) {
    const { facebook } = await paginaFacebook(ctx);
    if (!facebook) {
      return {
        summary: "Nessuna pagina Facebook: niente inserzioni da cercare",
        findings: { pagina: null, inserzioniAttive: 0 },
        levers: [],
        evidence: [],
        confidence: "MEDIA",
      };
    }
    // L'ID della pagina (sta nell'HTML della pagina Facebook) permette di vedere SOLO le sue inserzioni.
    const pagina = await leggiPaginaPubblica(facebook, 3000);
    const id = pagina.html.match(/"pageID":"(\d{6,})"|"page_id":"?(\d{6,})|fb:\/\/page\/\?id=(\d{6,})|"delegate_page":\{"id":"(\d{6,})/)?.slice(1).find(Boolean) ?? null;
    if (!id) throw new Error("Non trovo l'identificativo della pagina Facebook");
    const url = `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=IT&view_all_page_id=${id}`;
    const lib = await leggiPaginaPubblica(url, 6000);
    const ai = await chiediJSON<RispostaAds>({
      sistema: `${REGOLE_COMUNI}\n\nLeggi il testo della libreria delle inserzioni di Meta per UNA pagina e ricavi solo i dati scritti. Oggi è ${ctx.oggi.toISOString().slice(0, 10)}.`,
      testo: `Libreria inserzioni: ${url}\n\nTESTO:\n${lib.testo.slice(0, 7000)}`,
      schema: SCHEMA_ADS,
    });
    const d = ai.dati;
    const levers: Leva[] = [];
    if (d.inserzioni_attive > 0) {
      levers.push({ servizio: "meta_ads", testo: `Fanno inserzioni su Facebook e Instagram adesso: ${d.inserzioni_attive} attive${d.attive_dal ? ` dal ${d.attive_dal}` : ""}`, prova: url });
    } else if (d.inserzioni_totali > 0) {
      levers.push({ servizio: "meta_ads", testo: "Hanno fatto inserzioni su Facebook e Instagram in passato, adesso nessuna", prova: url });
    } else {
      levers.push({ servizio: "meta_ads", testo: "Non hanno mai fatto inserzioni su Facebook e Instagram", prova: url });
    }
    return {
      summary: d.inserzioni_attive > 0 ? `${d.inserzioni_attive} inserzioni attive${d.attive_dal ? ` dal ${d.attive_dal}` : ""}` : d.inserzioni_totali > 0 ? "Inserzioni in passato, nessuna attiva" : "Nessuna inserzione su Meta",
      findings: { pagina: facebook, paginaId: id, inserzioniAttive: d.inserzioni_attive, inserzioniTotali: d.inserzioni_totali, attiveDal: d.attive_dal, esempi: d.esempi },
      levers,
      evidence: [{ cosa: "Libreria inserzioni di Meta per la pagina", fonte: url }, ...d.esempi.slice(0, 3).map((e) => ({ cosa: `Inserzione dal ${e.dal}`, fonte: url, citazione: e.testo }))],
      confidence: "MEDIA",
      costCents: ai.costCents,
    };
  },
};
