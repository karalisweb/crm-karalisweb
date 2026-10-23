/**
 * I motivi degli scarti di Alessio: quando scarta o elimina un'azienda scrive perché, e la ricerca
 * ne tiene conto (il filtro dei "simili" li legge prima di tenere le aziende nuove).
 * Il motivo vive nella nota della voce FASCICOLO_BASE (niente colonne nuove su Lead).
 */
import { db } from "@/lib/db";
import { KIND_FASCICOLO_BASE } from "@/lib/agents/turno";

export const PREFISSO_MOTIVO = "Motivo di Alessio:";
/** Quanti motivi recenti legge il filtro: abbastanza per imparare, pochi per restare economico. */
const MOTIVI_LETTI = 40;

export function notaMotivo(motivo: string): string {
  return `${PREFISSO_MOTIVO} ${motivo.trim().slice(0, 500)}`;
}

export function motivoDaNota(nota: string | null | undefined): string | null {
  return nota?.startsWith(PREFISSO_MOTIVO) ? nota.slice(PREFISSO_MOTIVO.length).trim() || null : null;
}

/** Le righe per il filtro: "Nome (categoria, sito) — motivo", le più recenti prima. */
export async function lezioniDagliScarti(): Promise<string[]> {
  const voci = await db.approvalItem.findMany({
    where: { kind: KIND_FASCICOLO_BASE, note: { startsWith: PREFISSO_MOTIVO }, leadId: { not: null } },
    orderBy: { decidedAt: "desc" },
    take: MOTIVI_LETTI,
    select: { note: true, lead: { select: { name: true, category: true, website: true } } },
  });
  return voci
    .map((v) => {
      const motivo = motivoDaNota(v.note);
      if (!motivo || !v.lead) return null;
      const dettagli = [v.lead.category, v.lead.website?.replace(/^https?:\/\/(www\.)?/, "")].filter(Boolean).join(", ");
      return `${v.lead.name}${dettagli ? ` (${dettagli})` : ""} — ${motivo}`;
    })
    .filter((x): x is string => !!x);
}
