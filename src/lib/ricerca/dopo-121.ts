/**
 * Agente Dopo-121: registra un 121 e, dal testo (trascrizione di Google Meet o vocale dettato),
 * compila la scheda del membro — cosa fa, referenze che cerca e che può dare, promesse, persone
 * da farsi presentare, membri indicati dal presidente, prossimo passo.
 *
 * Un 121 già fatto in passato si registra con lo stesso modulo, anche senza testo.
 */
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { chiediJSON, REGOLE_COMUNI, type Schema } from "@/lib/agents/ai";
import { budgetDisponibile } from "@/lib/agents/costi";
import { accodaReteMembro, chiudiRichiesteSuperate } from "@/lib/agents/bni";
import { norm } from "@/lib/agents/bni-regole";

/** Sotto questa lunghezza il testo è solo una nota: si salva, ma non si chiede all'AI. */
export const TESTO_MINIMO_AI = 150;

export interface Nuovo121 {
  data: Date;
  formato: "PRESENZA" | "ONLINE";
  testo?: string | null;
  luogo?: string | null;
}

interface RispostaDopo121 {
  riassunto: string;
  cosa_fa: string;
  cosa_non_fa: string;
  zone: string;
  referenze_cerca: string;
  referenze_puo_dare: string;
  promesse: string[];
  persone_da_presentare: { nome: string; chi_e: string; perche: string }[];
  membri_indicati: string[];
  prossimo_passo: string;
  prossimo_passo_tra_giorni: number;
}

const SCHEMA: Schema = {
  type: "object",
  properties: {
    riassunto: { type: "string", description: "3-4 righe: di cosa avete parlato" },
    cosa_fa: { type: "string", description: "2-3 righe semplici: che lavoro fa il membro e per chi. Vuoto se non detto" },
    cosa_non_fa: { type: "string", description: "Cosa ha detto di NON fare. Vuoto se non detto" },
    zone: { type: "string", description: "In che zone lavora. Vuoto se non detto" },
    referenze_cerca: { type: "string", description: "Il suo cliente ideale, con l'esempio concreto che ha fatto. Vuoto se non detto" },
    referenze_puo_dare: { type: "string", description: "Chi conosce: i suoi clienti tipo, il suo giro, le categorie di aziende che vede. Vuoto se non detto" },
    promesse: { type: "array", items: { type: "string" }, description: "Cosa vi siete promessi (es. 'Alessio gli manda il contatto di X'), una per riga" },
    persone_da_presentare: {
      type: "array",
      description: "Persone che il membro si è offerto di presentare ad Alessio, o che Alessio gli ha chiesto di presentare",
      items: {
        type: "object",
        properties: {
          nome: { type: "string" },
          chi_e: { type: "string", description: "Ruolo o azienda, se detto" },
          perche: { type: "string" },
        },
        required: ["nome", "chi_e", "perche"],
      },
    },
    membri_indicati: {
      type: "array",
      items: { type: "string" },
      description: "Solo se il membro ha indicato altri membri del suo capitolo come i più attivi o interessanti da conoscere: i loro nomi",
    },
    prossimo_passo: { type: "string", description: "La prossima cosa concreta da fare con questo membro" },
    prossimo_passo_tra_giorni: { type: "integer", description: "Fra quanti giorni farla (1-60)" },
  },
  required: [
    "riassunto", "cosa_fa", "cosa_non_fa", "zone", "referenze_cerca", "referenze_puo_dare", "promesse",
    "persone_da_presentare", "membri_indicati", "prossimo_passo", "prossimo_passo_tra_giorni",
  ],
};

const pieno = (s: string | null | undefined) => (s && s.trim() ? s.trim() : null);

/** Il membro del capitolo che corrisponde a un nome detto al 121 (nome e cognome, o cognome unico). */
export function trovaPerNome<T extends { id: string; name: string }>(nome: string, membri: T[]): T | null {
  const parole = norm(nome).split(/[^a-z]+/).filter((p) => p.length >= 3);
  if (!parole.length) return null;
  const tutte = membri.filter((m) => parole.every((p) => norm(m.name).includes(p)));
  if (tutte.length === 1) return tutte[0];
  return null;
}

export interface EsitoDopo121 {
  oneToOneId: string;
  aiUsata: boolean;
  presentazioni: number;
  indicati: number;
  costCents: number;
  motivo?: string;
}

export async function registra121(membroId: string, n: Nuovo121, utente: string | null, oggi = new Date()): Promise<EsitoDopo121> {
  const membro = await db.bniMembro.findUnique({ where: { id: membroId } });
  if (!membro) throw new Error("Membro non trovato");
  const testo = pieno(n.testo);

  const uno = await db.oneToOne.create({
    data: {
      membroId,
      date: n.data,
      formato: n.formato,
      location: pieno(n.luogo) ?? (n.formato === "ONLINE" ? "Google Meet" : null),
      trascrizione: testo,
      notes: testo && testo.length < TESTO_MINIMO_AI ? testo : null,
      createdBy: utente,
    },
  });
  await db.bniMembro.update({
    where: { id: membroId },
    data: {
      conosciutoAt: membro.conosciutoAt ?? n.data,
      oneToOneCount: { increment: 1 },
      lastOneToOneAt: !membro.lastOneToOneAt || membro.lastOneToOneAt < n.data ? n.data : membro.lastOneToOneAt,
      // Il 121 in calendario è questo: si toglie.
      ...(membro.next121At && membro.next121At.getTime() <= n.data.getTime() + 86400_000 ? { next121At: null } : {}),
      bniStage: "FATTO_121",
    },
  });

  const esito: EsitoDopo121 = { oneToOneId: uno.id, aiUsata: false, presentazioni: 0, indicati: 0, costCents: 0 };

  await chiudiRichiesteSuperate(membroId, "Superata: il 121 è stato fatto", oggi);

  // Dopo il 121 si guarda la sua rete LinkedIn (se non l'abbiamo già fatto).
  if (!membro.reteLettaAt) await accodaReteMembro(membroId, oggi);

  if (!testo || testo.length < TESTO_MINIMO_AI) return { ...esito, motivo: testo ? "Testo breve: salvato come nota" : "Nessun testo: 121 registrato" };
  if (!(await budgetDisponibile(oggi)).ok) return { ...esito, motivo: "Tetto di spesa del mese raggiunto: testo salvato, scheda non compilata" };

  const run = await db.agentRun.create({ data: { bniMembroId: membroId, agent: "dopo_121", status: "IN_CORSO", attempts: 1, startedAt: new Date() } });
  try {
    const ai = await chiediJSON<RispostaDopo121>({
      sistema: `${REGOLE_COMUNI}\n\nSei l'agente Dopo-121 della squadra BNI di Alessio Loi. Ricevi la trascrizione (o il vocale dettato) di un 121 fra Alessio e un membro BNI. Compila la scheda del membro usando SOLO quello che è detto nel testo: se una cosa non è detta, lascia il campo vuoto. In BNI si costruiscono relazioni: interessano soprattutto chi è il cliente ideale del membro (le referenze che cerca) e chi conosce (le referenze che può dare ad Alessio).`,
      testo: [
        `MEMBRO: ${membro.name}${membro.company ? `, ${membro.company}` : ""}${membro.profession ? ` (${membro.profession})` : ""}${membro.leadershipRole ? `, ruolo nel capitolo: ${membro.leadershipRole}` : ""}`,
        `CAPITOLO: ${membro.chapter ?? "?"}`,
        `DATA: ${n.data.toISOString().slice(0, 10)} · ${n.formato === "ONLINE" ? "online" : "di persona"}`,
        "",
        "TESTO DEL 121:",
        testo.slice(0, 60_000),
      ].join("\n"),
      schema: SCHEMA,
    });
    const d = ai.dati;
    esito.aiUsata = true;
    esito.costCents = ai.costCents;

    const cosaFa = [pieno(d.cosa_fa), pieno(d.cosa_non_fa) && `Non fa: ${d.cosa_non_fa.trim()}`, pieno(d.zone) && `Zone: ${d.zone.trim()}`].filter(Boolean).join("\n");
    const giorni = Math.min(60, Math.max(1, Math.round(d.prossimo_passo_tra_giorni || 7)));

    // Membri indicati (dal presidente, di solito): salgono nell'ordine del capitolo.
    const delCapitolo = membro.chapter
      ? await db.bniMembro.findMany({ where: { chapter: { equals: membro.chapter, mode: "insensitive" }, id: { not: membroId } }, select: { id: true, name: true } })
      : [];
    const indicati = d.membri_indicati.map((x) => trovaPerNome(x, delCapitolo)).filter((x): x is { id: string; name: string } => !!x);

    // Persone da farsi presentare: si aggiungono, senza doppioni per nome.
    const esistenti = await db.bniPresentazione.findMany({ where: { membroId }, select: { nome: true } });
    const giaNomi = new Set(esistenti.map((e) => norm(e.nome)));
    const nuove = d.persone_da_presentare.filter((p) => pieno(p.nome) && !giaNomi.has(norm(p.nome))).slice(0, 10);

    await db.$transaction([
      db.oneToOne.update({ where: { id: uno.id }, data: { riassunto: pieno(d.riassunto), promesse: d.promesse.filter(pieno).join("\n") || null } }),
      db.bniMembro.update({
        where: { id: membroId },
        data: {
          ...(cosaFa ? { cosaFa } : {}),
          ...(pieno(d.referenze_cerca) ? { seeking: d.referenze_cerca.trim() } : {}),
          ...(pieno(d.referenze_puo_dare) ? { referenzePuoDare: d.referenze_puo_dare.trim() } : {}),
          ...(pieno(d.prossimo_passo) ? { prossimoPasso: d.prossimo_passo.trim(), prossimoPassoAt: new Date(n.data.getTime() + giorni * 86400_000) } : {}),
        },
      }),
      ...indicati.map((x) =>
        db.bniMembro.update({ where: { id: x.id }, data: { indicatoDa: membro.name, indicatoAt: oggi } })
      ),
      ...nuove.map((p) =>
        db.bniPresentazione.create({
          data: { membroId, nome: p.nome.trim().slice(0, 120), ruolo: pieno(p.chi_e)?.slice(0, 160) ?? null, perche: pieno(p.perche)?.slice(0, 300) ?? null, stato: "CHIESTA" },
        })
      ),
      db.agentReport.create({
        data: {
          bniMembroId: membroId,
          agent: "dopo_121",
          runId: run.id,
          summary: `121 con ${membro.name}: scheda aggiornata`,
          findings: { ...d, membriIndicatiTrovati: indicati.map((x) => x.name), motoreAI: `${ai.motore} ${ai.modello}` } as unknown as Prisma.InputJsonValue,
          confidence: "MEDIA",
          collectedAt: oggi,
          validUntil: new Date(oggi.getTime() + 365 * 86400_000),
        },
      }),
      db.agentRun.update({ where: { id: run.id }, data: { status: "FATTO", finishedAt: new Date(), costCents: ai.costCents } }),
    ]);
    esito.presentazioni = nuove.length;
    esito.indicati = indicati.length;
    return esito;
  } catch (err) {
    await db.agentRun.update({
      where: { id: run.id },
      data: { status: "FALLITO", finishedAt: new Date(), error: (err instanceof Error ? err.message : String(err)).slice(0, 500) },
    });
    return { ...esito, motivo: "L'AI non ha risposto: testo salvato, scheda non compilata" };
  }
}
