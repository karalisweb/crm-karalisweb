/**
 * v3.122 (Alessio, 2026-11-08: "in 30-40 minuti... VELOCITÀ prima di tutto"): ogni 10 minuti, solo lavoro da server:
 * analisi delle nuove, chi decide, e subito avanti verso Da contattare. Il giro completo resta alle sue ore.
 */
import { db } from "@/lib/db";
import { daGiroVeloce, giroVeloce } from "./arricchimento";
import { cercaContattiMancanti, cercaInParallelo, daCercare } from "./chi-decide-server";
import { avanzaMappata } from "./rete";
import { leggiRisposte } from "./risposte-mail";

const ANALISI_PER_GIRO = 6;
const RICERCHE_PER_GIRO = 12;
const CONTATTI_PER_GIRO = 8;

export interface RiepilogoVeloce { analizzate: number; cercate: number; trovate: number; avanzate: number; contatti: number; risposte: number; ms: number }

export async function turnoVeloce(oggi = new Date()): Promise<RiepilogoVeloce> {
  const inizio = Date.now();
  const r: RiepilogoVeloce = { analizzate: 0, cercate: 0, trovate: 0, avanzate: 0, contatti: 0, risposte: 0, ms: 0 };
  for (const l of await daGiroVeloce(ANALISI_PER_GIRO)) {
    await giroVeloce(l.id, oggi).catch((e) => console.error("[veloce] analisi fallita:", e));
    r.analizzate++;
  }
  const ricerca = await cercaInParallelo(await daCercare(RICERCHE_PER_GIRO, oggi), oggi);
  r.cercate = ricerca.fatte;
  r.trovate = ricerca.trovate;
  const conContatti = await cercaContattiMancanti(CONTATTI_PER_GIRO, oggi);
  r.contatti = conContatti.length;
  // Le nuove. v3.127 (Alessio, 2026-11-11): via la scorciatoia delle 48 ore, a chi non ti conosce non si scrive a freddo.
  const nuove = await db.lavorazione.findMany({
    where: { fase: "MAPPATA", strada: null },
    orderBy: { updatedAt: "asc" },
    select: { id: true },
    take: 15,
  });
  for (const id of [...nuove.map((l) => l.id), ...conContatti]) {
    await avanzaMappata(id, undefined, oggi).catch((e) => console.error("[veloce] avanzamento fallito:", e));
    r.avanzate++;
  }
  r.risposte = await leggiRisposte(oggi).catch((e) => { console.error("[veloce] lettura risposte fallita:", e); return 0; });
  r.ms = Date.now() - inizio;
  return r;
}
