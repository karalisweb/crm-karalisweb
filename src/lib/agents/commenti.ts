/**
 * I commenti che Alessio ha fatto sulle pagine di un'azienda, da leggere prima del contatto (v3.65, Alessio
 * 2026-10-28: "quando le ho scaldate non so che dire"). Li usano i 3 ganci e il foglio "Cosa dirgli".
 */
import { db } from "@/lib/db";
import { KIND_COMMENTO } from "./rete";

export interface CommentoFatto {
  quando: Date;
  piattaforma: string | null;
  post: string | null;
  /** Un pezzo del post commentato. */
  estratto: string | null;
  /** Il commento di Alessio (vuoto se l'ha segnato a mano dalla scheda). */
  commento: string | null;
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

export async function commentiDaLeggere(leadId: string): Promise<CommentoFatto[]> {
  const fatti = await db.approvalItem.findMany({
    where: { leadId, kind: KIND_COMMENTO, status: "APPROVATO" },
    orderBy: { decidedAt: "asc" },
    select: { payload: true, decidedAt: true, createdAt: true },
  });
  return fatti.map((f) => {
    const p = (f.payload ?? {}) as Record<string, unknown>;
    return { quando: f.decidedAt ?? f.createdAt, piattaforma: str(p.piattaforma), post: str(p.post), estratto: str(p.estratto), commento: str(p.commento) };
  });
}
