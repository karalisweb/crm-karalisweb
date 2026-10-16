/**
 * Agente 2 — Il Lettore del sito: cosa dice il sito e come lo dice. È un lavoro di
 * comunicazione: l'offerta, a chi parla, la promessa, il tono, se si distingue.
 *
 * I testi li estrae `extractStrategicData` (home, chi siamo, servizi + cliché, deterministico);
 * l'AI li legge. Ogni problema che l'AI segnala deve citare il sito alla lettera: le
 * citazioni che non si ritrovano nei testi vengono scartate.
 */
import { extractStrategicData } from "@/lib/audit/strategic-extractor";
import { chiediJSON, REGOLE_COMUNI, type Schema } from "../ai";
import { citazioneVera, schedaAzienda } from "../materiali";
import { SERVIZI, type AgenteEseguibile, type Leva, type Prova, type Referto, type Servizio } from "../tipi";

interface RispostaLettore {
  cosa_dice: { offerta: string; pubblico: string; promessa: string };
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
    problemi: {
      type: "array",
      description: "Al massimo 5 problemi di comunicazione, i più importanti",
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
  required: ["cosa_dice", "come_lo_dice", "problemi", "sintesi"],
};

const SISTEMA = `${REGOLE_COMUNI}

Sei il Lettore del sito. Leggi i testi del sito di un'azienda e valuti la sua comunicazione: COSA dice (offerta, pubblico, promessa) e COME lo dice (tono, chiarezza, differenziazione, invito all'azione). Pensa a un potenziale cliente che arriva sul sito per la prima volta.
Per ogni problema riporta una citazione copiata alla lettera dai testi: niente parafrasi. Se non trovi problemi veri, restituisci una lista vuota.`;

export const agenteLettore: AgenteEseguibile = {
  chiave: "lettore",
  fase: "approfondimento",
  validitaGiorni: 90,
  aPagamento: true,
  async esegui(ctx): Promise<Referto> {
    const p = await ctx.pagina();
    const estratto = await extractStrategicData(p.html, p.origin, ctx.lead.name);
    const testi = [
      `HOME:\n${estratto.home_text}`,
      estratto.about_text ? `CHI SIAMO:\n${estratto.about_text}` : null,
      estratto.services_text ? `SERVIZI:\n${estratto.services_text}` : null,
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
