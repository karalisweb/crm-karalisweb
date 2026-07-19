import { Prisma, PipelineStage } from "@prisma/client";

/**
 * Filtri canonici dei lead — UNICA fonte di verità condivisa tra contatori (badge,
 * KPI dashboard) e liste, così le viste non divergono. Ogni funzione restituisce un
 * `where` Prisma documentato. Se cambi la definizione di "azionabile"/"coda", cambiala
 * QUI e vale ovunque.
 *
 * Convenzioni chiave usate in tutto il CRM:
 *  - "non ancora contattato" = `optInSentAt: null` (la prima mail opt-in non è partita).
 *  - "con email" = email presente e non vuota → lead effettivamente contattabile.
 *  - "settore attivo" = segment non tra i `pausedKeys` (settori messi in pausa).
 */

/** Email presente e non stringa vuota. */
export const HAS_EMAIL: Prisma.LeadWhereInput = {
  AND: [{ email: { not: null } }, { email: { not: "" } }],
};

/** Lead in uno stato "da contattare" (outreach) e non ancora toccati dalla prima mail. */
export function toContactWhere(stage: PipelineStage): Prisma.LeadWhereInput {
  return { pipelineStage: stage, optInSentAt: null };
}

/**
 * "Azionabili": tra i lead di `base`, quelli davvero lavorabili ora = con email e
 * settore non in pausa. Usato per la seconda cifra delle etichette ("di cui X con email").
 */
export function actionableWhere(
  base: Prisma.LeadWhereInput,
  pausedKeys: string[],
): Prisma.LeadWhereInput {
  const where: Prisma.LeadWhereInput = { ...base, ...HAS_EMAIL };
  if (pausedKeys.length > 0) where.segment = { notIn: pausedKeys };
  return where;
}

/**
 * Coda di APPROVAZIONE outreach — stessa logica della pagina /approvazione, lato server.
 * Solo HOT non ancora contattati/approvati, che non hanno risposto e non disiscritti,
 * sopra soglia score, con settore non in pausa.
 *
 * NB: l'esclusione dei FRANCHISING resta lato client (euristica su nome/sito, non
 * esprimibile in una query), quindi questo contatore può essere leggermente più alto
 * della lista mostrata nella pagina. Differenza in pratica minima: i franchising sono
 * già filtrati a monte all'import (NON_TARGET).
 */
export function approvalQueueWhere(
  pausedKeys: string[],
  threshold: number,
): Prisma.LeadWhereInput {
  const where: Prisma.LeadWhereInput = {
    pipelineStage: PipelineStage.HOT_LEAD,
    optInSentAt: null,
    unsubscribed: false,
    respondedAt: null,
    outreachApprovedAt: null,
    opportunityScore: { gte: threshold },
  };
  if (pausedKeys.length > 0) where.segment = { notIn: pausedKeys };
  return where;
}
