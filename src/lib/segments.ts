/**
 * Micro-segmenti di mercato
 *
 * Ogni segmento ha:
 * - key: identificativo interno (salvato sul lead)
 * - label: nome leggibile mostrato in UI e usato nel placeholder {settore}
 * - icon: emoji
 * - color: classi tailwind per badge
 * - keywords: pattern per auto-match dalla category Google Maps
 */

export interface SegmentConfig {
  key: string;
  label: string;
  icon: string;
  color: string;
  keywords: string[]; // match case-insensitive sulla category GMaps
}

export const SEGMENTS: SegmentConfig[] = [
  {
    key: "infissi",
    label: "Infissi e Serramenti",
    icon: "🪟",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    keywords: ["finestra", "finestre", "infiss", "serramento", "serramenti", "pvc", "alluminio", "zanzariere", "tende avvolgibili", "persiane", "avvolgibili"],
  },
  {
    key: "porte",
    label: "Porte e Portoni",
    icon: "🚪",
    color: "bg-indigo-100 text-indigo-700 border-indigo-200",
    keywords: ["porte", "portoni", "porta"],
  },
  {
    key: "edilizia",
    label: "Edilizia e Ristrutturazioni",
    icon: "🏗️",
    color: "bg-amber-100 text-amber-700 border-amber-200",
    keywords: ["edil", "impresa edile", "ristruttura", "costruzion", "materiali da costruzione", "appaltator"],
  },
  {
    key: "ferramenta",
    label: "Ferramenta",
    icon: "🔧",
    color: "bg-gray-100 text-gray-700 border-gray-200",
    keywords: ["ferramenta", "fabbro", "serratur", "lavorazioni metalliche", "acciaio"],
  },
  {
    key: "arredo",
    label: "Arredamento e Design",
    icon: "🛋️",
    color: "bg-pink-100 text-pink-700 border-pink-200",
    keywords: ["arred", "designer d'interni", "interior", "showroom", "cucina", "casalinghi", "tessut", "tende"],
  },
  {
    key: "immobiliare",
    label: "Immobiliare",
    icon: "🏠",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    keywords: ["immobiliar", "agenzia immobiliar", "appartamento vacanz", "property"],
  },
  {
    key: "centri_estetici",
    label: "Centri Estetici",
    icon: "💆",
    color: "bg-purple-100 text-purple-700 border-purple-200",
    keywords: ["estetic", "beauty", "bellezza", "nail", "spa", "solarium"],
  },
  {
    key: "centri_medici",
    label: "Centri Medici Privati",
    icon: "🏥",
    color: "bg-red-100 text-red-700 border-red-200",
    keywords: ["medic", "clinic", "ambulatorio", "poliambulatorio", "sanitari"],
  },
  {
    key: "odontoiatri",
    label: "Centri Odontoiatrici",
    icon: "🦷",
    color: "bg-sky-100 text-sky-700 border-sky-200",
    keywords: ["dentist", "odontoiatr", "dental", "ortodon"],
  },
  {
    key: "laboratori_analisi",
    label: "Laboratori Analisi",
    icon: "🔬",
    color: "bg-teal-100 text-teal-700 border-teal-200",
    keywords: ["laboratorio", "analisi cliniche", "diagnostica", "radiologi"],
  },
  {
    key: "fisioterapia",
    label: "Centri Fisioterapici",
    icon: "🤸",
    color: "bg-lime-100 text-lime-700 border-lime-200",
    keywords: ["fisioterapi", "riabilita", "osteopat", "chinesiolog"],
  },
  {
    key: "ristorazione",
    label: "Ristorazione",
    icon: "🍽️",
    color: "bg-orange-100 text-orange-700 border-orange-200",
    keywords: ["ristorant", "pizzeri", "trattori", "osteria", "hamburger", "bar", "caffè", "pub", "food"],
  },
  {
    key: "abbigliamento",
    label: "Abbigliamento e Moda",
    icon: "👗",
    color: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200",
    keywords: ["abbigliamento", "abiti", "moda", "boutique", "sposa", "vintage", "elegante"],
  },
  {
    key: "tecnologia",
    label: "Tecnologia e Informatica",
    icon: "💻",
    color: "bg-cyan-100 text-cyan-700 border-cyan-200",
    keywords: ["computer", "informatica", "cellulari", "elettronica", "riparazione", "tecnolog"],
  },
  {
    key: "giardinaggio",
    label: "Giardinaggio e Verde",
    icon: "🌿",
    color: "bg-green-100 text-green-700 border-green-200",
    keywords: ["giardino", "giardinaggio", "vivaio", "piante", "verde", "fiorai"],
  },
];

/** Mappa rapida key → config */
export const SEGMENT_MAP = new Map(SEGMENTS.map((s) => [s.key, s]));

/**
 * Auto-determina il segmento dalla category Google Maps.
 * Ritorna la key del segmento o null se non trova match.
 */
export function detectSegment(category: string | null): string | null {
  if (!category) return null;
  const lower = category.toLowerCase();

  for (const seg of SEGMENTS) {
    for (const kw of seg.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        return seg.key;
      }
    }
  }
  return null;
}

/**
 * Ritorna il label leggibile per il placeholder {settore}.
 * Es: "infissi" → "infissi e serramenti"
 */
export function getSegmentLabel(segmentKey: string | null): string {
  if (!segmentKey) return "";
  return SEGMENT_MAP.get(segmentKey)?.label ?? segmentKey;
}
