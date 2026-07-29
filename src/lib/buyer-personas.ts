/**
 * BUYER PERSONAS — fonte unica del "chi è il nostro cliente ideale"
 *
 * Prima di questo file la definizione di target viveva in TRE tassonomie che si
 * contraddicevano fra loro:
 *   1. `segments.ts`            → 15 micro-segmenti (infissi, ristorazione, ...)
 *   2. cluster/subcluster       → Casa / Microturismo / Persona (config ricerche)
 *   3. `scoring/lead-score.ts`  → high_ticket / low_ticket / standard
 * Esempio di conflitto: "ristorazione" era segmento attivo nel (1), assente nel (2)
 * e low_ticket nel (3).
 *
 * DECISIONE (2026-07-27, piano BNI): i 3 CLUSTER diventano le buyer personas
 * ufficiali. I micro-segmenti restano come *dettaglio* sotto la persona, il tier
 * resta come *attributo di valore*. Una sola gerarchia:
 *
 *   PERSONA (cluster)  →  micro-segmenti (dettaglio)  →  tier (valore)
 *
 * Questo file è l'UNICO posto dove si decide a quale persona appartiene qualcosa.
 * Serve sia ai Lead (chi compra) sia ai membri BNI (chi è cliente / chi è partner).
 */

export type BuyerPersonaKey = "CASA" | "MICROTURISMO" | "PERSONA" | "ALTRO";

export interface BuyerPersonaConfig {
  key: BuyerPersonaKey;
  label: string;
  icon: string;
  color: string;
  /** Descrizione operativa: a chi vendiamo e cosa gli sta a cuore. */
  description: string;
  /** Micro-segmenti (chiavi di `segments.ts`) che appartengono a questa persona. */
  segments: string[];
  /** Parole chiave per riconoscere la persona da una categoria/professione libera. */
  keywords: string[];
}

export const BUYER_PERSONAS: BuyerPersonaConfig[] = [
  {
    key: "CASA",
    label: "Casa",
    icon: "🏠",
    color: "bg-amber-100 text-amber-700 border-amber-200",
    description:
      "Chi lavora sulla casa: infissi, edilizia, impiantistica, arredo, finiture. Ticket alto, decisione dell'imprenditore, ciclo di vendita medio-lungo.",
    segments: ["infissi", "porte", "edilizia", "ferramenta", "arredo", "giardinaggio"],
    keywords: [
      "infiss", "serrament", "finestr", "porte", "porton", "pvc", "alluminio",
      "edil", "ristruttur", "costruzion", "impresa edile", "muratore", "appaltator", "costruttore",
      "impiant", "idraulic", "elettricist", "termoidraulic", "climatizzazion", "condizionament",
      "arred", "mobil", "cucine", "interior", "falegnam", "serrament",
      "pavimenti", "piastrell", "ceramich", "marmo", "cartongesso", "pittur", "verniciatur",
      "ferrament", "utensil", "giardin", "verde", "vivai", "piscin", "fotovoltaic", "domotic",
      // Professionisti del mondo casa: potenziali clienti (gli vendo un sito/portfolio).
      "architett", "geometr", "ingegner",
    ],
  },
  {
    key: "MICROTURISMO",
    label: "Microturismo",
    icon: "🏡",
    color: "bg-teal-100 text-teal-700 border-teal-200",
    description:
      "Chi vive di ospitalità e immobili: property manager, agenzie immobiliari, strutture ricettive boutique. Stagionalità forte, dipendono da prenotazioni e visibilità.",
    segments: ["immobiliare"],
    keywords: [
      "property manager", "property management", "case vacanz", "affitti brevi",
      "immobiliar", "agenzia immobiliare", "compravendit",
      "b&b", "bed and breakfast", "bed & breakfast", "agriturism", "affittacamere",
      "hotel", "albergo", "resort", "residence", "struttura ricettiv", "ospitalit",
      "turism", "booking", "camping", "glamping",
    ],
  },
  {
    key: "PERSONA",
    label: "Persona",
    icon: "👤",
    color: "bg-rose-100 text-rose-700 border-rose-200",
    description:
      "Chi cura la persona: estetica, salute e diagnostica, riabilitazione, odontoiatria. Acquisto ricorrente, forte peso di recensioni e reputazione locale.",
    segments: ["centri_estetici", "centri_medici", "odontoiatri", "laboratori_analisi", "fisioterapia"],
    keywords: [
      "estetic", "beauty", "centro benessere", "spa", "massagg", "epilazion", "nail",
      "medic", "clinic", "poliambulator", "studio medico", "diagnostic", "radiolog",
      "analisi clinic", "laboratorio analisi", "dentist", "odontoiatr", "ortodon",
      "fisioterap", "riabilitazion", "osteopat", "podolog", "nutrizion", "psicolog", "veterinar",
    ],
  },
  {
    key: "ALTRO",
    label: "Altro",
    icon: "📦",
    color: "bg-slate-100 text-slate-700 border-slate-200",
    description:
      "Fuori dalle tre personas principali. Non è un no assoluto, ma non è dove concentriamo l'energia commerciale.",
    segments: ["ristorazione", "abbigliamento", "tecnologia"],
    keywords: [],
  },
];

/** Lookup rapido per chiave. */
const BY_KEY = new Map<BuyerPersonaKey, BuyerPersonaConfig>(
  BUYER_PERSONAS.map((p) => [p.key, p])
);

/** Mappa micro-segmento → persona, derivata da `BUYER_PERSONAS` (nessuna duplicazione). */
const SEGMENT_TO_PERSONA = new Map<string, BuyerPersonaKey>();
for (const p of BUYER_PERSONAS) {
  for (const s of p.segments) SEGMENT_TO_PERSONA.set(s, p.key);
}

export function getPersona(key?: string | null): BuyerPersonaConfig | null {
  if (!key) return null;
  return BY_KEY.get(key.toUpperCase() as BuyerPersonaKey) ?? null;
}

export function getPersonaLabel(key?: string | null): string {
  return getPersona(key)?.label ?? "—";
}

/** Persona a partire dal micro-segmento già salvato sul lead (via più affidabile). */
export function personaFromSegment(segment?: string | null): BuyerPersonaKey | null {
  if (!segment) return null;
  return SEGMENT_TO_PERSONA.get(segment.trim().toLowerCase()) ?? null;
}

/**
 * Persona a partire da testo libero (categoria Google Maps, professione BNI, ecc.).
 * Vince la persona con più keyword trovate; a parità, l'ordine di `BUYER_PERSONAS`.
 * Ritorna `null` se nessuna keyword matcha (meglio "non so" che una persona sbagliata).
 */
export function detectPersona(text?: string | null): BuyerPersonaKey | null {
  const t = text?.trim().toLowerCase();
  if (!t) return null;

  let best: { key: BuyerPersonaKey; hits: number } | null = null;
  for (const p of BUYER_PERSONAS) {
    if (p.keywords.length === 0) continue;
    const hits = p.keywords.reduce((n, k) => (t.includes(k) ? n + 1 : n), 0);
    if (hits > 0 && (!best || hits > best.hits)) best = { key: p.key, hits };
  }
  return best?.key ?? null;
}

/**
 * Risoluzione completa: prima il segmento (dato strutturato), poi il testo libero.
 * È la funzione da usare ovunque serva "di che persona è questo?".
 */
export function resolvePersona(input: {
  segment?: string | null;
  category?: string | null;
  profession?: string | null;
}): BuyerPersonaKey | null {
  return (
    personaFromSegment(input.segment) ??
    detectPersona(input.category) ??
    detectPersona(input.profession)
  );
}

/** Le personas su cui concentriamo davvero l'energia commerciale. */
export const CORE_PERSONAS: BuyerPersonaKey[] = ["CASA", "MICROTURISMO", "PERSONA"];

export function isCorePersona(key?: string | null): boolean {
  return !!key && CORE_PERSONAS.includes(key.toUpperCase() as BuyerPersonaKey);
}

/** Parsing di una lista csv di personas (es. `personasServed` su un membro BNI). */
export function parsePersonaList(csv?: string | null): BuyerPersonaKey[] {
  if (!csv) return [];
  return csv
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s): s is BuyerPersonaKey => BY_KEY.has(s as BuyerPersonaKey));
}
