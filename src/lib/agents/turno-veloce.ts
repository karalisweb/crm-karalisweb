/**
 * v3.122 (Alessio, 2026-11-08: "in 30-40 minuti... VELOCITÀ prima di tutto"): ogni 10 minuti, solo lavoro da server:
 * analisi delle nuove, chi decide, e subito avanti verso Da contattare. Il giro completo resta alle sue ore.
 */
import { db } from "@/lib/db";
import { daGiroVeloce, giroVeloce } from "./arricchimento";
import { cercaContattiMancanti, cercaInParallelo, daCercare } from "./chi-decide-server";
import { avanzaMappata } from "./rete";
import { ORE_MAX_RISCALDAMENTO } from "./rete-regole";

const ANALISI_PER_GIRO = 6;
const RICERCHE_PER_GIRO = 12;
const CONTATTI_PER_GIRO = 8;

export interface RiepilogoVeloce { analizzate: number; cercate: number; trovate: number; avanzate: number; contatti: number; ms: number }

export async function turnoVeloce(oggi = new Date()): Promise<RiepilogoVeloce> {
  const inizio = Date.now();
  const r: RiepilogoVeloce = { analizzate: 0, cercate: 0, trovate: 0, avanzate: 0, contatti: 0, ms: 0 };
  for (const l of await daGiroVeloce(ANALISI_PER_GIRO)) {
    await giroVeloce(l.id, oggi).catch((e) => console.error("[veloce] analisi fallita:", e));
    r.analizzate++;
  }
  const ricerca = await cercaInParallelo(await daCercare(RICERCHE_PER_GIRO, oggi), oggi);
  r.cercate = ricerca.fatte;
  r.trovate = ricerca.trovate;
  const conContatti = await cercaContattiMancanti(CONTATTI_PER_GIRO, oggi);
  r.contatti = conContatti.length;
  // Le nuove, e quelle arrivate alle 48 ore senza messaggio: parte comunque.
  const limite = new Date(oggi.getTime() - ORE_MAX_RISCALDAMENTO * 3600_000);
  const nuove = await db.lavorazione.findMany({
    where: { fase: "MAPPATA", OR: [{ strada: null }, { strada: { in: ["COLLEGARE", "SCALDARE"] }, createdAt: { lte: limite }, lead: { approvalItems: { none: { kind: "RETE_CONTATTO", status: { in: ["IN_ATTESA", "APPROVATO"] } } } } }] },
    orderBy: { updatedAt: "asc" },
    select: { id: true },
    take: 15,
  });
  for (const id of [...nuove.map((l) => l.id), ...conContatti]) {
    await avanzaMappata(id, undefined, oggi).catch((e) => console.error("[veloce] avanzamento fallito:", e));
    r.avanzate++;
  }
  r.ms = Date.now() - inizio;
  return r;
}
