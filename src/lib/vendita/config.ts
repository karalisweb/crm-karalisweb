/** La configurazione della fila di vendita sul DB (una riga, "default"). Senza riga valgono i default. */
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { normalizzaOrigini, normalizzaPassi, ORIGINI_DEFAULT, PASSI_DEFAULT, promemoria, type Origine, type Passo } from "./fila";

export interface ConfigVendita {
  passi: Passo[];
  origini: Origine[];
}

export async function caricaConfigVendita(): Promise<ConfigVendita> {
  const r = await db.venditaConfig.findUnique({ where: { id: "default" } });
  if (!r) return { passi: PASSI_DEFAULT, origini: ORIGINI_DEFAULT };
  return { passi: normalizzaPassi(r.passi).passi, origini: normalizzaOrigini(r.origini) };
}

export class ErroreConfig extends Error {}

export async function salvaConfigVendita(input: { passi: unknown; origini: unknown }): Promise<ConfigVendita> {
  const { passi, errore } = normalizzaPassi(input.passi);
  if (errore) throw new ErroreConfig(errore);
  const origini = normalizzaOrigini(input.origini);
  const data = { passi: passi as unknown as Prisma.InputJsonValue, origini: origini as unknown as Prisma.InputJsonValue };
  await db.venditaConfig.upsert({ where: { id: "default" }, create: { id: "default", ...data }, update: data });
  return { passi, origini };
}

/** Il nome leggibile di un'origine (anche di quelle tolte dalla lista, per le trattative vecchie). */
export function nomeOrigine(id: string, origini: Origine[]): string {
  return origini.find((o) => o.id === id)?.nome ?? ORIGINI_DEFAULT.find((o) => o.id === id)?.nome ?? id;
}

export interface PromemoriaVendita {
  trattativaId: string;
  nome: string;
  testo: string;
  giorniDiRitardo: number;
}

/** Le trattative ferme nel loro passo oltre i giorni stabiliti: vanno in Oggi e nel report del mattino. */
export async function promemoriaVendita(oggi = new Date()): Promise<PromemoriaVendita[]> {
  const [{ passi }, trattative] = await Promise.all([
    caricaConfigVendita(),
    db.trattativa.findMany({
      where: { stadio: { notIn: ["EXIT", "NURTURING"] } },
      select: { id: true, nome: true, stadio: true, passo: true, passoDal: true, callAt: true, updatedAt: true },
      take: 500,
    }),
  ]);
  return trattative
    .map((t) => ({ t, p: promemoria(t, passi, oggi) }))
    .filter((x): x is { t: (typeof trattative)[number]; p: NonNullable<ReturnType<typeof promemoria>> } => !!x.p)
    .map(({ t, p }) => ({ trattativaId: t.id, nome: t.nome, testo: p.testo, giorniDiRitardo: p.giorniDiRitardo }))
    .sort((a, b) => b.giorniDiRitardo - a.giorniDiRitardo);
}
