/**
 * RECIPROCITA' — il motore del Givers Gain
 *
 * Nel BNI si riceve perche' si da'. Il problema pratico: in un 121 il membro dice
 * "io cerco sindaci di piccoli comuni" e io dovrei ricordarmi, fra centinaia di
 * contatti, chi conosco che corrisponde. A memoria non funziona.
 *
 * Questo modulo fa due cose:
 *   1. Trasforma il "chi cerca" detto a parole in TAG cercabili.
 *   2. Dato quei tag, cerca fra i miei contatti (lead + membri BNI) chi posso regalare.
 *
 * NOTA IMPORTANTE: il matcher vale quanto il pool di contatti taggati. Se i contatti
 * non hanno professione/categoria/zona, non esce nulla — non e' un bug del matcher.
 */

/** Parole troppo comuni per essere utili come chiave di ricerca. */
const STOPWORDS = new Set([
  "il", "lo", "la", "i", "gli", "le", "un", "uno", "una", "di", "a", "da", "in", "con",
  "su", "per", "tra", "fra", "e", "ed", "o", "che", "chi", "cui", "non", "come", "dove",
  "del", "dello", "della", "dei", "degli", "delle", "al", "allo", "alla", "ai", "agli",
  "alle", "dal", "dalla", "nel", "nella", "sul", "sulla", "cerca", "cercare", "cerco",
  "vorrei", "serve", "servono", "bisogno", "ideale", "cliente", "clienti", "target",
  "tutti", "tutte", "qualche", "molto", "molti", "piu", "anche", "sono", "essere",
  "hanno", "avere", "fare", "loro", "mio", "miei", "suo", "sua", "grandi", "piccoli",
  "piccole", "nuovi", "nuove", "zona", "area",
]);

/** Singolarizzazione grossolana italiana: basta per il matching, non e' linguistica. */
function singularize(word: string): string {
  if (word.length <= 4) return word;
  // comuni -> comun, sindaci -> sindac, aziende -> aziend, hotel -> hotel
  return word.replace(/(i|e|a|o)$/, "");
}

/**
 * Estrae i tag cercabili da un testo libero ("chi cerca" detto in 121).
 * Ritorna radici di parola, cosi' "sindaci" matcha "sindaco".
 */
export function extractSeekingTags(text?: string | null): string[] {
  const t = (text ?? "").toLowerCase();
  if (!t.trim()) return [];

  const words = t
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));

  const tags = new Set<string>();
  for (const w of words) tags.add(singularize(w));

  return [...tags].slice(0, 12); // oltre 12 tag il match diventa rumore
}

export function serializeTags(tags: string[]): string | null {
  return tags.length ? tags.join(",") : null;
}

export function parseTags(csv?: string | null): string[] {
  if (!csv) return [];
  return csv.split(",").map((s) => s.trim()).filter(Boolean);
}

/** Un contatto candidato da regalare, con il motivo del match. */
export interface ReciprocityMatch {
  kind: "lead" | "membro";
  id: string;
  name: string;
  subtitle: string | null;
  phone: string | null;
  /** Quanti tag hanno fatto centro. */
  score: number;
  /** Su quali campi ha matchato — serve a spiegare il suggerimento. */
  matchedOn: string[];
}

/**
 * Assegna un punteggio a un candidato rispetto ai tag cercati.
 * Il peso dipende da DOVE matcha: la professione conta piu' del nome.
 */
export function scoreCandidate(
  tags: string[],
  fields: { profession?: string | null; category?: string | null; name?: string | null; location?: string | null; notes?: string | null }
): { score: number; matchedOn: string[] } {
  const matchedOn: string[] = [];
  let score = 0;

  const weighted: Array<[string, string | null | undefined, number, string]> = [
    ["professione", fields.profession, 3, "professione"],
    ["categoria", fields.category, 3, "categoria"],
    ["nome", fields.name, 2, "nome"],
    ["zona", fields.location, 1, "zona"],
    ["note", fields.notes, 1, "note"],
  ];

  for (const [, value, weight, label] of weighted) {
    const v = (value ?? "").toLowerCase();
    if (!v) continue;
    const hits = tags.filter((t) => v.includes(t));
    if (hits.length > 0) {
      score += hits.length * weight;
      matchedOn.push(`${label}: ${hits.join(", ")}`);
    }
  }

  return { score, matchedOn };
}
