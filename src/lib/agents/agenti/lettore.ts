/**
 * Agente 2 — Il Lettore del sito: cosa dice il sito e come lo dice. È un lavoro di
 * comunicazione: l'offerta, a chi parla, la promessa, il tono, se si distingue.
 *
 * I testi li estrae `extractStrategicData` (home, chi siamo, servizi + cliché, deterministico);
 * l'AI li legge. Ogni problema che l'AI segnala deve citare il sito alla lettera: le
 * citazioni che non si ritrovano nei testi vengono scartate.
 */
import * as cheerio from "cheerio";
import { extractStrategicData } from "@/lib/audit/strategic-extractor";
import { scaricaTesto } from "../pagina";
import { chiediJSON, REGOLE_COMUNI, type Schema } from "../ai";
import { citazioneVera, schedaAzienda } from "../materiali";
import { SERVIZI, type AgenteEseguibile, type Leva, type Prova, type Referto, type Servizio } from "../tipi";

interface RispostaLettore {
  cosa_dice: { offerta: string; pubblico: string; promessa: string };
  domande_cliente: { domanda: string; risposta: "sì" | "in parte" | "no"; citazione: string }[];
  come_lo_dice: { tono: string; chiarezza: number; differenziazione: string; invito_all_azione: string };
  problemi: { problema: string; citazione: string; servizio: string }[];
  sintesi: string;
}

const SCHEMA: Schema = {
  type: "object",
  properties: {
    cosa_dice: {
      type: "object",
      properties: {
        offerta: { type: "string", description: "Cosa vende o offre, in una frase" },
        pubblico: { type: "string", description: "A chi si rivolge, se si capisce; altrimenti 'non si capisce'" },
        promessa: { type: "string", description: "La promessa principale al cliente, se c'è" },
      },
      required: ["offerta", "pubblico", "promessa"],
    },
    come_lo_dice: {
      type: "object",
      properties: {
        tono: { type: "string", description: "Il tono di voce, in poche parole" },
        chiarezza: { type: "integer", description: "Da 1 (confuso) a 5 (chiarissimo): si capisce in 5 secondi cosa fanno e per chi?" },
        differenziazione: { type: "string", description: "Cosa li distingue dai concorrenti, o 'niente di specifico'" },
        invito_all_azione: { type: "string", description: "Cosa chiede di fare al visitatore e quanto è chiaro" },
      },
      required: ["tono", "chiarezza", "differenziazione", "invito_all_azione"],
    },
    domande_cliente: {
      type: "array",
      description: "Le 6 domande che si fa chi cerca questo servizio prima di chiamare (quanto costa, quanto tempo ci vuole, in che zona lavorano, lavori fatti con foto, garanzie, perché proprio loro): per ognuna, se il sito risponde",
      items: {
        type: "object",
        properties: {
          domanda: { type: "string" },
          risposta: { type: "string", enum: ["sì", "in parte", "no"] },
          citazione: { type: "string", description: "Se risponde: la frase COPIATA dal sito; se non risponde: stringa vuota" },
        },
        required: ["domanda", "risposta", "citazione"],
      },
    },
    problemi: {
      type: "array",
      description: "Al massimo 4 problemi CONCRETI e specifici di questo sito (vietati i consigli generici tipo 'invito all'azione debole', 'linguaggio poco evocativo')",
      items: {
        type: "object",
        properties: {
          problema: { type: "string", description: "Il problema, detto come lo direbbe un consulente al titolare" },
          citazione: { type: "string", description: "Frase COPIATA ALLA LETTERA dai testi del sito che lo dimostra (una frase continua, non un riassunto)" },
          servizio: { type: "string", enum: Object.keys(SERVIZI) },
        },
        required: ["problema", "citazione", "servizio"],
      },
    },
    sintesi: { type: "string", description: "Due frasi: come si presenta questa azienda online" },
  },
  required: ["cosa_dice", "domande_cliente", "come_lo_dice", "problemi", "sintesi"],
};

const SISTEMA = `${REGOLE_COMUNI}

Sei il Lettore del sito. Leggi i testi del sito di un'azienda mettendoti nei panni di un cliente che sta scegliendo a chi chiedere un preventivo. Dici COSA dice il sito, a quali DOMANDE del cliente risponde e a quali no, e COME lo dice.
Sii specifico: ogni affermazione deve riguardare QUESTO sito e si deve poter verificare. Niente consigli da manuale ("migliorare la call to action", "linguaggio più evocativo"): se non hai un fatto preciso, non scriverlo.
Per ogni problema riporta una citazione copiata alla lettera dai testi: niente parafrasi. Se non trovi problemi veri, restituisci una lista vuota.`;

/** Oltre a chi siamo e servizi: le pagine che rispondono alle domande dei clienti (lavori, prezzi, FAQ…). */
const PAGINE_UTILI = /realizzazion|lavori|portfolio|progett|galler|prodott|prezz|listino|costi|faq|domande|garanzi|zone|dove-|recension|testimonian/i;

async function altrePagine(html: string, origin: string): Promise<{ url: string; testo: string }[]> {
  const $ = cheerio.load(html);
  const link = new Set<string>();
  $("a[href]").each((_, a) => {
    const h = $(a).attr("href") ?? "";
    if (!PAGINE_UTILI.test(`${h} ${$(a).text()}`)) return;
    try {
      const u = new URL(h, origin);
      if (u.origin === origin && u.pathname.length > 1) link.add(u.origin + u.pathname);
    } catch {
      /* link non valido */
    }
  });
  const out: { url: string; testo: string }[] = [];
  for (const url of [...link].slice(0, 3)) {
    const h = await scaricaTesto(url);
    if (!h) continue;
    const $p = cheerio.load(h);
    $p("script, style, nav, header, footer, noscript").remove();
    const testo = $p("body").text().replace(/\s+/g, " ").trim().slice(0, 2500);
    if (testo.length > 200) out.push({ url, testo });
  }
  return out;
}

export const agenteLettore: AgenteEseguibile = {
  chiave: "lettore",
  fase: "approfondimento",
  validitaGiorni: 90,
  aPagamento: true,
  async esegui(ctx): Promise<Referto> {
    const p = await ctx.pagina();
    const estratto = await extractStrategicData(p.html, p.origin, ctx.lead.name);
    const altre = await altrePagine(p.html, p.origin);
    const testi = [
      `HOME:\n${estratto.home_text}`,
      estratto.about_text ? `CHI SIAMO:\n${estratto.about_text}` : null,
      estratto.services_text ? `SERVIZI:\n${estratto.services_text}` : null,
      ...altre.map((a) => `PAGINA ${a.url}:\n${a.testo}`),
    ]
      .filter(Boolean)
      .join("\n\n");
    if (testi.length < 200) throw new Error("Il sito ha troppo poco testo leggibile per un'analisi");

    const ai = await chiediJSON<RispostaLettore>({
      sistema: SISTEMA,
      testo: `${schedaAzienda(ctx.lead)}\n\nTESTI DEL SITO:\n${testi}`,
      schema: SCHEMA,
    });
    const r = ai.dati;

    const levers: Leva[] = [];
    const evidence: Prova[] = [];
    let scartate = 0;
    for (const pr of r.problemi) {
      if (!citazioneVera(pr.citazione, testi)) {
        scartate++;
        continue;
      }
      const servizio = (pr.servizio in SERVIZI ? pr.servizio : "sito") as Servizio;
      levers.push({ servizio, testo: pr.problema, prova: `"${pr.citazione}"` });
      evidence.push({ cosa: pr.problema, fonte: p.url, citazione: pr.citazione });
    }
    // Le domande del cliente senza risposta sono i ganci più concreti.
    const senza = r.domande_cliente.filter((d) => d.risposta === "no");
    if (senza.length >= 2) {
      levers.push({
        servizio: "sito",
        testo: `Il sito non risponde a domande che ogni cliente si fa prima di chiamare: ${senza.slice(0, 3).map((d) => d.domanda.toLowerCase().replace(/\?$/, "")).join("; ")}`,
        prova: `Letti: home${estratto.about_text ? ", chi siamo" : ""}${estratto.services_text ? ", servizi" : ""}${altre.length ? `, ${altre.length} altre pagine` : ""}`,
      });
    }
    for (const c of estratto.cliches_found.slice(0, 3)) {
      evidence.push({ cosa: `Frase fatta (${c.tag})`, fonte: p.url, citazione: c.context });
    }
    if (estratto.cliche_status === "FAIL" && estratto.cliches_found.length) {
      levers.push({
        servizio: "sito",
        testo: `Il sito usa frasi fatte che dicono tutti ("${estratto.cliches_found[0].phrase}"): non si distingue dai concorrenti`,
        prova: `"${estratto.cliches_found[0].context}"`,
      });
    }

    return {
      summary: `${r.sintesi} Chiarezza ${r.come_lo_dice.chiarezza}/5.`,
      findings: {
        ...r,
        frasiFatte: estratto.cliches_found.map((c) => c.phrase),
        pagineLette: [p.url, ...altre.map((a) => a.url)],
        citazioniScartate: scartate,
        motoreAI: `${ai.motore} ${ai.modello}`,
      },
      levers,
      evidence,
      // Se l'AI ha "citato" frasi che non ci sono, ci si fida meno del resto.
      confidence: scartate === 0 ? "ALTA" : scartate <= 1 ? "MEDIA" : "BASSA",
      costCents: ai.costCents,
    };
  },
};
