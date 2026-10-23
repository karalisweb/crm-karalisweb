/**
 * Le sezioni della scheda azienda dove Alessio scrive le sue impressioni (senza db: le usa anche la pagina).
 * `servizio` = a cosa punta l'impressione quando diventa una leva per i 3 ganci; null = solo contesto.
 */
import type { Leva, Servizio } from "./tipi";

export const SEZIONI_IMPRESSIONI = {
  trovare: { titolo: "Si fa trovare?", servizio: "seo" },
  sito: { titolo: "Il sito", servizio: "sito" },
  clienti: { titolo: "Come la vedono i clienti", servizio: "seo" },
  concorrenti: { titolo: "I concorrenti", servizio: "seo" },
  social: { titolo: "Social e pubblicità", servizio: "social" },
  linkedin: { titolo: "LinkedIn e chi decide", servizio: null },
  telefono: { titolo: "Cosa dirgli al telefono", servizio: null },
} as const satisfies Record<string, { titolo: string; servizio: Servizio | null }>;

export type SezioneImpressione = keyof typeof SEZIONI_IMPRESSIONI;

export const RETI_SOCIAL = ["facebook", "instagram", "linkedin"] as const;
export type ReteSocial = (typeof RETI_SOCIAL)[number];

/** Quello che Alessio ha scritto su un'azienda: è il referto dell'agente "alessio". */
export interface NoteAlessio {
  impressioni: Partial<Record<SezioneImpressione, string>>;
  social: Partial<Record<ReteSocial, string>>;
}

/** Le note di Alessio fra i referti già letti (vuote se non ha scritto niente). */
export function noteDaReferti(referti: { agent: string; findings: Record<string, unknown> }[]): NoteAlessio {
  const f = referti.find((r) => r.agent === "alessio")?.findings as Partial<NoteAlessio> | undefined;
  return { impressioni: { ...(f?.impressioni ?? {}) }, social: { ...(f?.social ?? {}) } };
}

/** Le impressioni come leve: i 3 ganci le possono scegliere (quelle senza servizio restano contesto). */
export function leveDaNote(note: NoteAlessio): Leva[] {
  const out: Leva[] = [];
  for (const [k, testo] of Object.entries(note.impressioni)) {
    const s = SEZIONI_IMPRESSIONI[k as SezioneImpressione];
    if (s?.servizio && testo) out.push({ servizio: s.servizio, testo, prova: `L'ha visto Alessio (${s.titolo})` });
  }
  return out;
}
