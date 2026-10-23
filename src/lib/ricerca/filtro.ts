/**
 * Il filtro dei "simili": una ricerca come "piscine Cagliari" porta anche piscine comunali,
 * palestre e club di nuoto. Qui l'AI tiene solo chi fa lo STESSO MESTIERE del cliente del caso
 * studio (i suoi colleghi/concorrenti), cioè le aziende a cui quel caso parla.
 */
import { chiediJSON, type Schema } from "@/lib/agents/ai";
import { lezioniDagliScarti } from "./scarti";

export interface Candidato {
  nome: string;
  categoria?: string | null;
  sito?: string | null;
}

const SCHEMA: Schema = {
  type: "object",
  properties: {
    tenere: { type: "array", items: { type: "integer" }, description: "I numeri delle attività che fanno lo stesso mestiere del cliente" },
  },
  required: ["tenere"],
};

/** Restituisce gli indici da tenere e il costo. Se l'AI non risponde, si tiene tutto (meglio un falso positivo che perdere la ricerca). */
export async function filtraSimili(contesto: string, candidati: Candidato[]): Promise<{ tenere: Set<number>; costCents: number }> {
  if (!candidati.length) return { tenere: new Set(), costCents: 0 };
  try {
    // Gli scarti di Alessio con il motivo: la ricerca non ripropone aziende come quelle.
    const lezioni = await lezioniDagliScarti().catch(() => []);
    const ai = await chiediJSON<{ tenere: number[] }>({
      sistema:
        "Selezioni aziende per Karalisweb, agenzia di web marketing. Ricevi il cliente di un caso studio e un elenco di attività trovate su Google. Tieni SOLO le imprese private che fanno lo stesso mestiere del cliente (concorrenti o colleghi: a loro il caso studio parla). Scarta enti pubblici, impianti comunali, associazioni e club sportivi, palestre, scuole, negozi o attività di un altro mestiere, portali, directory ed elenchi di imprese, catene e franchising (marchi con punti vendita in tutta Italia), negozi online nazionali e aziende che chiaramente non lavorano nella zona cercata (se è indicata). Nel dubbio, scarta.",
      testo: [
        `CLIENTE DEL CASO STUDIO: ${contesto}`,
        ...(lezioni.length ? ["", "AZIENDE CHE ALESSIO HA SCARTATO, CON IL MOTIVO (scarta anche quelle che hanno lo stesso problema):", ...lezioni.map((l) => `- ${l}`)] : []),
        "", "ATTIVITÀ TROVATE:", ...candidati.map((c, i) => `${i}. ${c.nome}${c.categoria ? ` — ${c.categoria}` : ""}${c.sito ? ` — ${c.sito}` : ""}`)].join("\n"),
      schema: SCHEMA,
    });
    return { tenere: new Set(ai.dati.tenere.filter((i) => Number.isInteger(i) && i >= 0 && i < candidati.length)), costCents: ai.costCents };
  } catch (err) {
    console.warn("[ricerca] filtro dei simili non disponibile, tengo tutto:", err instanceof Error ? err.message : err);
    return { tenere: new Set(candidati.map((_, i) => i)), costCents: 0 };
  }
}
