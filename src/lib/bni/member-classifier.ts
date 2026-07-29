/**
 * CLASSIFICATORE MEMBRI BNI — modello v2 (regole di Alessio, 2026-07-28)
 *
 * Ogni membro di un capitolo è una di tre cose per Karalisweb:
 *
 *   CLIENTE  — è nel mondo CASA, PERSONA o TURISMO (le buyer personas). Gli vendo io.
 *              Es. infissi, edilizia, impianti, immobiliare, hotel, estetica, medico, architetto.
 *
 *   PARTNER  — è un business TRASVERSALE a qualsiasi categoria (lo serve chiunque),
 *              oppure lavora nel mio mondo (marketing/comunicazione, con cui collaboro).
 *              Es. commercialista, consulente del lavoro, finanza agevolata, formazione,
 *              sicurezza sul lavoro, avvocato, assicurazioni, credito, privacy, agenzia
 *              pubblicitaria, web, social, stampa, fotografo.
 *              PESO MODERATO: un trasversale può girare i contatti ai colleghi del suo
 *              stesso capitolo invece che a me, quindi non vale quanto un cliente diretto.
 *
 *   NEUTRO   — tutto il resto (agricoltura, no-profit, ristorazione, gioielli, IT non-web…).
 *
 * NB: il vecchio ruolo "CONCORRENTE" è stato ritirato. Chi fa marketing/comunicazione
 * NON è un concorrente da evitare: è un potenziale partner con cui scambiare lavoro.
 */

import { resolvePersona, type BuyerPersonaKey } from "@/lib/buyer-personas";

// CONCORRENTE resta nell'unione per compatibilità con dati storici, ma non viene più assegnato.
export type MemberRole = "CLIENTE" | "PARTNER" | "CONCORRENTE" | "NEUTRO";

export interface MemberClassification {
  buyerPersona: BuyerPersonaKey | null;
  memberRole: MemberRole;
  /** 0-100 — è nel mondo Casa/Persona/Turismo → glielo vendo. */
  clientScore: number;
  /** 0-100 — è un partner trasversale / del mio mondo. Peso moderato. */
  partnerScore: number;
  personasServed: BuyerPersonaKey[];
  /** Spiegazione leggibile: perché questo ruolo. Mostrata in UI. */
  reasons: string[];
}

/**
 * Categorie PARTNER = business trasversali a ogni categoria + il mondo del marketing.
 * `weight` è volutamente MODERATO (45-65): un partner nel BNI è utile ma incerto,
 * perché i suoi referral possono restare dentro il suo capitolo.
 */
interface PartnerCategory {
  label: string;
  keywords: string[];
  weight: number;
  why: string;
}

const PARTNER_CATEGORIES: PartnerCategory[] = [
  // ── Il mio mondo: marketing / comunicazione (collaborazione, non concorrenza) ──
  {
    label: "Marketing / Comunicazione / Pubblicità",
    keywords: [
      "marketing", "comunicazione", "pubblicit", "advertising", "agenzia pubblicitaria",
      "web agency", "web design", "siti web", "sito web", "sviluppo web", "social media",
      "seo", "personal branding", "ufficio stampa", "digital", "multimedial", "grafic",
      "growth", "e-commerce", "brand",
    ],
    weight: 65,
    why: "Lavora nel mio mondo (marketing/comunicazione): potenziale partner con cui scambiare lavoro e clienti.",
  },
  {
    label: "Fotografo / Video",
    keywords: ["fotograf", "videomaker", "riprese", "servizi fotografic", "drone", "video"],
    weight: 55,
    why: "Chi cura l'immagine di un'azienda incrocia chi sta rifacendo la propria comunicazione: buon partner.",
  },
  {
    label: "Stampa / Tipografia",
    keywords: ["tipograf", "stamperia", "stampa", "insegn"],
    weight: 50,
    why: "Serve chi fa comunicazione offline: partner naturale del mio mondo.",
  },
  // ── Servizi professionali trasversali (li usa qualsiasi azienda) ──
  {
    label: "Commercialista",
    keywords: ["commercialist", "ragionier", "revisore contabil", "studio contabil", "tributarist", "consulente fiscal"],
    weight: 62,
    why: "Trasversale: parla con PMI di ogni settore. Partner utile, ma può girare i contatti ai colleghi di capitolo.",
  },
  {
    label: "Finanza agevolata / Bandi e incentivi",
    keywords: ["finanza agevolat", "agevolazion", "bandi", "bando", "incentiv", "fondo perduto", "credito d'imposta", "finanza d'impresa"],
    weight: 62,
    why: "Sa quali aziende stanno per investire (bandi, incentivi): trasversale e prezioso, ma condiviso con la sua rete.",
  },
  {
    label: "Consulente del lavoro",
    keywords: ["consulente del lavoro", "paghe e contribut", "payroll"],
    weight: 58,
    why: "Trasversale: conosce le aziende che assumono, cioè quelle che crescono.",
  },
  {
    label: "Consulenza aziendale",
    keywords: ["consulenza aziendal", "consulente aziendal", "consulenza d'impresa", "consulenza direzional", "business coach", "temporary manager"],
    weight: 55,
    why: "Lavora sull'imprenditore, trasversale a ogni settore.",
  },
  {
    label: "Formazione / Coaching",
    keywords: ["formazione", "formator", "coach", "centro didattico", "e-learning", "docenz"],
    weight: 52,
    why: "Trasversale: forma imprenditori e aziende di ogni categoria.",
  },
  {
    label: "Sicurezza sul lavoro",
    keywords: ["sicurezza sul lavoro", "sicurezza lavoro", "rspp", "antinfortunistic", "medicina del lavoro", "81/08", "hse"],
    weight: 55,
    why: "Obbligo per ogni azienda con dipendenti: accesso trasversale al tessuto produttivo.",
  },
  {
    label: "Avvocato / Legale",
    keywords: ["avvocat", "studio legal", "diritto"],
    weight: 48,
    why: "Trasversale su imprese e professionisti.",
  },
  {
    label: "Assicurazioni",
    keywords: ["assicuraz", "assicurativ", "broker assicur"],
    weight: 48,
    why: "Portafoglio ampio e trasversale sul territorio.",
  },
  {
    label: "Notaio",
    keywords: ["notai"],
    weight: 45,
    why: "Passaggio obbligato di compravendite e atti societari.",
  },
  {
    label: "Credito / Finanziamenti",
    keywords: ["mediatore creditiz", "finanziament", "mutu", "credito", "prestit", "brokeraggio", "ristrutturazione del credito"],
    weight: 55,
    why: "Chi finanzia le aziende sa chi sta per spendere.",
  },
  {
    label: "Privacy / DPO",
    keywords: ["privacy", "dpo", "protezione dei dati", "gdpr"],
    weight: 45,
    why: "Adempimento trasversale a ogni azienda.",
  },
];

const norm = (s?: string | null) => (s ?? "").toLowerCase().trim();

/**
 * Classifica un membro secondo le 4 regole:
 *   1) marketing/comunicazione → PARTNER
 *   2) business trasversale → PARTNER (peso moderato)
 *   3) Casa / Persona / Turismo → CLIENTE
 *   4) resto → NEUTRO
 * Cliente e partner sono indipendenti; il ruolo prevalente decide l'etichetta.
 */
export function classifyMembro(
  input: {
    profession?: string | null;
    company?: string | null;
    website?: string | null;
    notes?: string | null;
  },
  // Nel MIO capitolo i partner trasversali valgono pieno: non c'è un collega a cui
  // possano girare i contatti al posto mio — quel collega sono io. Fuori dal mio
  // capitolo restano moderati (rischio che i referral vadano al loro web/marketing interno).
  opts?: { isMyChapter?: boolean }
): MemberClassification {
  const haystack = [input.profession, input.company, input.notes].map(norm).filter(Boolean).join(" · ");
  const reasons: string[] = [];

  // ── CLIENTE: è nel mondo Casa / Persona / Turismo? ─────────────────────────
  const buyerPersona = resolvePersona({
    category: input.profession,
    profession: input.company,
  });

  let clientScore = 0;
  if (buyerPersona && buyerPersona !== "ALTRO") {
    clientScore = 70;
    const label =
      buyerPersona === "CASA" ? "Casa" : buyerPersona === "MICROTURISMO" ? "Turismo" : "Persona";
    reasons.push(`È nel mondo ${label}: potenziale cliente, gli vendo io.`);
    if (norm(input.website)) {
      clientScore += 20;
      reasons.push("Ha un sito: posso analizzarlo e arrivare al contatto con problemi concreti.");
    }
  }

  // ── PARTNER: trasversale o del mio mondo? ──────────────────────────────────
  const matched = PARTNER_CATEGORIES.filter((c) => c.keywords.some((k) => haystack.includes(k)));
  let partnerScore = 0;
  if (matched.length > 0) {
    // Peso = la categoria più forte fra quelle trovate (niente stacking).
    partnerScore = Math.max(...matched.map((c) => c.weight));
    for (const c of matched) reasons.push(`${c.label}: ${c.why}`);
    // Nel MIO capitolo il "moderato" non si applica: il collega di riferimento sono io.
    if (opts?.isMyChapter) {
      partnerScore = Math.min(100, partnerScore + 30);
      reasons.push("È nel mio capitolo: qui i suoi referral arrivano a me, non a un collega. Vale pieno.");
    }
  }

  // I partner trasversali toccano tutte le personas per definizione.
  const personasServed: BuyerPersonaKey[] = partnerScore > 0 ? ["CASA", "MICROTURISMO", "PERSONA"] : [];

  // ── Ruolo prevalente ───────────────────────────────────────────────────────
  let memberRole: MemberRole;
  if (partnerScore === 0 && clientScore === 0) {
    memberRole = "NEUTRO";
    reasons.push("Fuori dalle mie personas e non trasversale: rapporto di cortesia.");
  } else if (clientScore >= partnerScore) {
    // A parità (o cliente più forte) vince il cliente: è chi mi porta fatturato diretto.
    memberRole = "CLIENTE";
  } else {
    memberRole = "PARTNER";
  }

  return {
    buyerPersona,
    memberRole,
    clientScore: Math.min(100, clientScore),
    partnerScore,
    personasServed,
    reasons,
  };
}

/**
 * Priorità operativa del 121: quanto conviene incontrarlo *adesso*.
 * Cliente e partner contano, poi pesa il tempo dall'ultimo incontro.
 */
export function oneToOnePriority(input: {
  clientScore: number;
  partnerScore: number;
  lastOneToOneAt?: Date | string | null;
  isMyChapter?: boolean;
}): number {
  const base = input.partnerScore + input.clientScore;

  const last = input.lastOneToOneAt ? new Date(input.lastOneToOneAt).getTime() : null;
  const daysSince = last ? Math.floor((Date.now() - last) / 86_400_000) : null;
  const recency = daysSince === null ? 120 : Math.min(120, Math.floor(daysSince / 1.5));

  const mine = input.isMyChapter ? 60 : 0;

  return base + recency + mine;
}

/** Etichette leggibili per la UI. */
export const ROLE_LABELS: Record<MemberRole, { label: string; icon: string; color: string }> = {
  PARTNER: { label: "Partner", icon: "🤝", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  CLIENTE: { label: "Cliente potenziale", icon: "🎯", color: "bg-blue-100 text-blue-700 border-blue-200" },
  CONCORRENTE: { label: "Concorrente", icon: "⚔️", color: "bg-red-100 text-red-700 border-red-200" },
  NEUTRO: { label: "Neutro", icon: "•", color: "bg-slate-100 text-slate-700 border-slate-200" },
};
