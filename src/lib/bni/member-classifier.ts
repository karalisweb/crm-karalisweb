/**
 * CLASSIFICATORE MEMBRI BNI — i due assi
 *
 * Il CRM nasce per il cold outreach e sa fare una cosa sola: "questo lead ha un sito
 * debole, quindi glielo vendo". Nel BNI questa domanda copre solo META' del valore.
 *
 *   ASSE 1 — CLIENTE POTENZIALE
 *   Il membro *E'* una delle mie buyer personas (e' un infissi, un property manager,
 *   un centro estetico). Azione: audit del suo sito -> gancio di vendita. Valore: 1 cliente.
 *
 *   ASSE 2 — PARTNER DI POTERE
 *   Il membro *SERVE* le mie buyer personas (commercialista, architetto, geometra,
 *   agenzia immobiliare, fornitore edile). Lui parla ogni giorno con i miei clienti
 *   ideali. Azione: 121 prioritario. Valore: 10 clienti nel tempo.
 *
 * Nel BNI l'asse 2 vale piu' dell'asse 1. Un membro puo' stare su entrambi (un'agenzia
 * immobiliare e' insieme cliente e partner) e per questo i due punteggi sono INDIPENDENTI.
 *
 * Terzo caso da non ignorare: il CONCORRENTE (web agency, social media manager, SEO).
 * Segnalarlo evita figuracce e fa capire subito che in quel capitolo la mia categoria
 * e' gia' occupata.
 */

import { resolvePersona, type BuyerPersonaKey } from "@/lib/buyer-personas";

export type MemberRole = "CLIENTE" | "PARTNER" | "CONCORRENTE" | "NEUTRO";

export interface MemberClassification {
  buyerPersona: BuyerPersonaKey | null;
  memberRole: MemberRole;
  /** 0-100 — quanto e' un cliente potenziale diretto (asse 1). */
  clientScore: number;
  /** 0-100 — quanto e' un partner che mi porta clienti (asse 2). */
  partnerScore: number;
  /** Personas a cui il membro da' accesso (asse 2). */
  personasServed: BuyerPersonaKey[];
  /** Spiegazione leggibile: perche' questo punteggio. Va mostrata in UI. */
  reasons: string[];
}

/**
 * Categorie "partner di potere": professioni che parlano ogni giorno con le mie
 * buyer personas. `weight` = quanto e' forte l'accesso (0-100 sulla singola categoria).
 *
 * Non e' hardcoded per sempre: e' una tabella che si affina con l'esperienza.
 * Se una categoria si rivela piu' o meno utile, si cambia il peso qui.
 */
interface PartnerCategory {
  label: string;
  keywords: string[];
  serves: BuyerPersonaKey[];
  weight: number;
  /** Perche' e' un partner — mostrato in UI per giustificare la priorita' del 121. */
  why: string;
}

const PARTNER_CATEGORIES: PartnerCategory[] = [
  {
    label: "Commercialista",
    keywords: ["commercialist", "consulente fiscal", "tributarist", "revisore contabil", "studio contabil"],
    serves: ["CASA", "MICROTURISMO", "PERSONA"],
    weight: 95,
    why: "Parla ogni mese con decine di PMI di ogni settore: e' l'accesso piu' trasversale che esista in un capitolo.",
  },
  {
    label: "Architetto / Studio di architettura",
    keywords: ["architett", "studio di architettura", "progettazion"],
    serves: ["CASA", "MICROTURISMO"],
    weight: 85,
    why: "Sta a monte di ogni ristrutturazione: intercetta il cliente casa prima di chiunque altro.",
  },
  {
    label: "Geometra",
    keywords: ["geometr"],
    serves: ["CASA"],
    weight: 75,
    why: "Pratiche edilizie e cantieri: conosce imprese e committenti del mondo casa.",
  },
  {
    label: "Ingegnere",
    keywords: ["ingegner"],
    serves: ["CASA"],
    weight: 65,
    why: "Strutture e impianti: rete diretta su edilizia e impiantistica.",
  },
  {
    label: "Agenzia immobiliare",
    keywords: ["immobiliar", "agente immobiliar", "mediatore immobiliar"],
    serves: ["CASA", "MICROTURISMO"],
    weight: 90,
    why: "Ogni compravendita genera ristrutturazioni e nuovi gestori di immobili: doppio accesso.",
  },
  {
    label: "Notaio",
    keywords: ["notai"],
    serves: ["CASA", "MICROTURISMO"],
    weight: 70,
    why: "Passaggio obbligato di ogni compravendita immobiliare.",
  },
  {
    label: "Mediatore creditizio / Finanziamenti",
    keywords: ["mediatore creditiz", "finanziament", "mutu", "credit", "bancar", "brokeraggio"],
    serves: ["CASA", "MICROTURISMO"],
    weight: 75,
    why: "Chi finanzia una casa o una struttura sa chi sta per investire (e quindi per spendere).",
  },
  {
    label: "Assicurazioni",
    keywords: ["assicuraz", "assicurativ", "broker assicur"],
    serves: ["CASA", "MICROTURISMO", "PERSONA"],
    weight: 65,
    why: "Portafoglio ampio e trasversale di aziende e professionisti del territorio.",
  },
  {
    label: "Avvocato",
    keywords: ["avvocat", "studio legal"],
    serves: ["CASA", "MICROTURISMO", "PERSONA"],
    weight: 60,
    why: "Rete trasversale su imprese e professionisti.",
  },
  {
    label: "Consulente del lavoro",
    keywords: ["consulente del lavoro", "paghe e contribut", "payroll"],
    serves: ["CASA", "MICROTURISMO", "PERSONA"],
    weight: 70,
    why: "Conosce le aziende che assumono, cioe' quelle che stanno crescendo.",
  },
  {
    label: "Consulente aziendale / Formatore",
    keywords: ["consulente aziendal", "business coach", "formator", "formazione aziendal", "temporary manager"],
    serves: ["CASA", "MICROTURISMO", "PERSONA"],
    weight: 60,
    why: "Lavora sull'imprenditore: se si fida, apre porte in profondita'.",
  },
  {
    label: "Tipografia / Stampa",
    keywords: ["tipograf", "stamperia", "stampa digital", "grafica e stampa", "insegn"],
    serves: ["CASA", "MICROTURISMO", "PERSONA"],
    weight: 55,
    why: "Serve chiunque faccia comunicazione offline: intercetta chi sta gia' investendo in marketing.",
  },
  {
    label: "Fotografo / Video",
    keywords: ["fotograf", "videomaker", "riprese", "servizi fotografic", "drone"],
    serves: ["MICROTURISMO", "CASA", "PERSONA"],
    weight: 60,
    why: "Chi commissiona foto sta rifacendo la propria immagine: momento perfetto per il sito.",
  },
  {
    label: "Interior designer / Home staging",
    keywords: ["interior design", "home staging", "arredator", "space planner"],
    serves: ["CASA", "MICROTURISMO"],
    weight: 70,
    why: "Vicinissimo al cliente casa e alle case vacanza da valorizzare.",
  },
  {
    label: "Fornitore edile / Materiali",
    keywords: ["materiali edil", "fornitura edil", "rivendita edil", "termoidraulica ingross", "ingrosso"],
    serves: ["CASA"],
    weight: 65,
    why: "Vede passare tutte le imprese edili della zona.",
  },
  {
    label: "Property manager",
    keywords: ["property manager", "property management", "gestione affitti", "affitti brevi"],
    serves: ["MICROTURISMO"],
    weight: 80,
    why: "E' il cuore del microturismo: gestisce piu' strutture insieme.",
  },
  {
    label: "Wedding planner / Eventi",
    keywords: ["wedding", "event planner", "organizzazione eventi", "cerimoni"],
    serves: ["MICROTURISMO", "PERSONA"],
    weight: 55,
    why: "Rete di strutture ricettive e fornitori del territorio.",
  },
];

/**
 * Categorie concorrenti: fanno il mio stesso mestiere.
 * Non sono partner ne' clienti — ma vanno riconosciute per non fare gaffe in capitolo.
 */
const COMPETITOR_KEYWORDS = [
  "web agency", "web design", "siti web", "sito web", "webmaster", "sviluppo web",
  "digital marketing", "social media manager", "social media marketing", "seo",
  "comunicazione digital", "agenzia di comunicazione", "agenzia marketing",
  "advertising", "growth hacking", "e-commerce manager",
];

const norm = (s?: string | null) => (s ?? "").toLowerCase().trim();

/**
 * Classifica un membro BNI sui due assi.
 * Input: quello che sappiamo del membro (professione, azienda, sito).
 */
export function classifyMembro(input: {
  profession?: string | null;
  company?: string | null;
  website?: string | null;
  notes?: string | null;
}): MemberClassification {
  const haystack = [input.profession, input.company, input.notes].map(norm).filter(Boolean).join(" · ");
  const reasons: string[] = [];

  // ── CONCORRENTE: si valuta per primo, esclude gli altri ruoli ────────────────
  const competitorHit = COMPETITOR_KEYWORDS.find((k) => haystack.includes(k));
  if (competitorHit) {
    return {
      buyerPersona: null,
      memberRole: "CONCORRENTE",
      clientScore: 0,
      partnerScore: 0,
      personasServed: [],
      reasons: [`Fa il mio stesso mestiere ("${competitorHit}") — in questo capitolo la mia categoria e' occupata.`],
    };
  }

  // ── ASSE 1: e' una mia buyer persona? ───────────────────────────────────────
  const buyerPersona = resolvePersona({
    category: input.profession,
    profession: input.company,
  });

  let clientScore = 0;
  if (buyerPersona && buyerPersona !== "ALTRO") {
    clientScore = 70;
    reasons.push(`E' una mia buyer persona (${buyerPersona}): posso vendergli direttamente.`);
    // Con un sito posso fare l'audit e arrivare al 121 con ganci concreti.
    if (norm(input.website)) {
      clientScore += 20;
      reasons.push("Ha un sito: posso analizzarlo e arrivare al 121 con problemi concreti da mostrare.");
    } else {
      reasons.push("Nessun sito noto: da chiedere in 121 (o potrebbe proprio non averlo — opportunita').");
    }
  } else if (buyerPersona === "ALTRO") {
    clientScore = 25;
    reasons.push("Settore fuori dalle tre personas principali: cliente possibile ma non prioritario.");
  }

  // ── ASSE 2: mi porta clienti? ───────────────────────────────────────────────
  const matched = PARTNER_CATEGORIES.filter((c) => c.keywords.some((k) => haystack.includes(k)));

  let partnerScore = 0;
  const personasServed = new Set<BuyerPersonaKey>();

  if (matched.length > 0) {
    // Vince la categoria piu' forte; le altre aggiungono un bonus ridotto
    // (un "architetto e geometra" e' piu' utile di un solo architetto, ma non il doppio).
    const sorted = [...matched].sort((a, b) => b.weight - a.weight);
    partnerScore = sorted[0].weight;
    for (const extra of sorted.slice(1)) partnerScore += Math.round(extra.weight * 0.15);

    for (const c of matched) {
      for (const p of c.serves) personasServed.add(p);
      reasons.push(`${c.label}: ${c.why}`);
    }

    // Bonus se copre piu' di una persona: e' un partner "largo".
    if (personasServed.size >= 3) {
      partnerScore += 10;
      reasons.push("Accesso trasversale a tutte e tre le personas: partner da coltivare con priorita' alta.");
    }
    partnerScore = Math.min(100, partnerScore);
  }

  // ── Ruolo prevalente ────────────────────────────────────────────────────────
  let memberRole: MemberRole = "NEUTRO";
  if (partnerScore === 0 && clientScore === 0) {
    memberRole = "NEUTRO";
    reasons.push("Non e' un cliente tipico ne' un partner con accesso alle mie personas: rapporto di cortesia.");
  } else if (partnerScore >= clientScore) {
    memberRole = "PARTNER";
  } else {
    memberRole = "CLIENTE";
  }

  return {
    buyerPersona,
    memberRole,
    clientScore: Math.min(100, clientScore),
    partnerScore,
    personasServed: [...personasServed],
    reasons,
  };
}

/**
 * Priorita' operativa del 121: quanto conviene incontrarlo *adesso*.
 * Combina il valore del membro con il tempo passato dall'ultimo incontro —
 * un partner fortissimo che non senti da 8 mesi deve tornare in cima.
 */
export function oneToOnePriority(input: {
  clientScore: number;
  partnerScore: number;
  lastOneToOneAt?: Date | string | null;
  isMyChapter?: boolean;
}): number {
  // L'asse partner pesa il doppio: e' la leva che porta piu' fatturato.
  const base = input.partnerScore * 2 + input.clientScore;

  const last = input.lastOneToOneAt ? new Date(input.lastOneToOneAt).getTime() : null;
  const daysSince = last ? Math.floor((Date.now() - last) / 86_400_000) : null;

  // Mai fatto un 121 = massima urgenza; poi cresce col tempo, con tetto a 6 mesi.
  const recency = daysSince === null ? 120 : Math.min(120, Math.floor(daysSince / 1.5));

  // Nel mio capitolo devo fare un 121 con OGNI membro: spinta costante.
  const mine = input.isMyChapter ? 60 : 0;

  return base + recency + mine;
}

/** Etichette leggibili per la UI. */
export const ROLE_LABELS: Record<MemberRole, { label: string; icon: string; color: string }> = {
  PARTNER: { label: "Partner di potere", icon: "🔑", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  CLIENTE: { label: "Cliente potenziale", icon: "🎯", color: "bg-blue-100 text-blue-700 border-blue-200" },
  CONCORRENTE: { label: "Concorrente", icon: "⚔️", color: "bg-red-100 text-red-700 border-red-200" },
  NEUTRO: { label: "Neutro", icon: "🤝", color: "bg-slate-100 text-slate-700 border-slate-200" },
};
