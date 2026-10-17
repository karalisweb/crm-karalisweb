/**
 * Casi studio: Alessio carica un PDF, l'AI lo legge e propone storia e chiavi di ricerca,
 * Alessio conferma. Un caso confermato fa nascere tre chiavi (settore, aziende simili, persone
 * simili) valide 6 mesi: dicono cosa cercare PRIMA, perché in quel momento rende di più.
 */
import { db } from "@/lib/db";
import { chiediJSON, REGOLE_COMUNI, type Schema } from "@/lib/agents/ai";
import { budgetDisponibile } from "@/lib/agents/costi";
import { MESI_VALIDITA_CASO, normalizzaLinkedin, terminiDi } from "./regole";

export const PDF_MAX_BYTES = 15 * 1024 * 1024;

interface RispostaCaso {
  titolo: string;
  com_era: string;
  cosa_abbiamo_fatto: string;
  cosa_e_cambiato: string;
  settore: string;
  azienda_nome: string;
  azienda_sito: string;
  persona_nome: string;
  persona_ruolo: string;
  persona_linkedin: string;
  termini: string[];
}

const SCHEMA: Schema = {
  type: "object",
  properties: {
    titolo: { type: "string", description: "Titolo breve del caso: azienda e risultato" },
    com_era: { type: "string", description: "Una o due frasi: com'era la situazione del cliente prima" },
    cosa_abbiamo_fatto: { type: "string", description: "Una o due frasi: cosa ha fatto Karalisweb" },
    cosa_e_cambiato: { type: "string", description: "Una o due frasi: il risultato, con i numeri se il PDF li dà" },
    settore: { type: "string", description: "Il mestiere del cliente in 2-4 parole, come lo si cercherebbe su Google Maps per trovare i suoi concorrenti (es. 'costruzione piscine', non solo 'piscine')" },
    azienda_nome: { type: "string" },
    azienda_sito: { type: "string", description: "Il sito del cliente se compare, altrimenti vuoto" },
    persona_nome: { type: "string", description: "Il titolare o referente del cliente, se compare" },
    persona_ruolo: { type: "string", description: "Il suo ruolo (es. 'titolare'), se compare" },
    persona_linkedin: { type: "string", description: "Il profilo LinkedIn se compare, altrimenti vuoto" },
    termini: {
      type: "array",
      items: { type: "string" },
      description: "3-5 ricerche Google, senza città, per trovare aziende SIMILI al cliente (stesso mestiere), es. 'costruzione piscine', 'piscine interrate'",
    },
  },
  required: ["titolo", "com_era", "cosa_abbiamo_fatto", "cosa_e_cambiato", "settore", "azienda_nome", "azienda_sito", "persona_nome", "persona_ruolo", "persona_linkedin", "termini"],
};

const pieno = (s: string | null | undefined) => (s && s.trim() ? s.trim() : null);

export function storiaDa(d: { com_era: string; cosa_abbiamo_fatto: string; cosa_e_cambiato: string }): string {
  return [`Com'era: ${d.com_era.trim()}`, `Cosa abbiamo fatto: ${d.cosa_abbiamo_fatto.trim()}`, `Cosa è cambiato: ${d.cosa_e_cambiato.trim()}`].join("\n");
}

/** Crea il caso dal PDF e lo fa leggere all'AI. Il caso resta DA_CONFERMARE. */
export async function caricaCasoStudio(nomeFile: string, pdf: Buffer, oggi = new Date()) {
  if (pdf.length > PDF_MAX_BYTES) throw new Error("Il PDF supera 15 MB");
  if (pdf.subarray(0, 5).toString("latin1") !== "%PDF-") throw new Error("Il file non è un PDF");
  const caso = await db.casoStudio.create({
    data: { titolo: nomeFile.replace(/\.pdf$/i, "").slice(0, 160), pdfNome: nomeFile.slice(0, 200), pdf: new Uint8Array(pdf) },
  });
  await leggiCasoStudio(caso.id, oggi);
  return db.casoStudio.findUnique({ where: { id: caso.id }, omit: { pdf: true } });
}

/** L'AI legge il PDF e propone storia e chiavi. Si può rifare. */
export async function leggiCasoStudio(id: string, oggi = new Date()): Promise<void> {
  const caso = await db.casoStudio.findUnique({ where: { id } });
  if (!caso?.pdf) throw new Error("Caso studio senza PDF");
  if (!(await budgetDisponibile(oggi)).ok) throw new Error("Tetto di spesa del mese raggiunto");
  const run = await db.agentRun.create({ data: { agent: "lettore_casi", status: "IN_CORSO", attempts: 1, startedAt: new Date(), input: { casoStudioId: id } } });
  try {
    const ai = await chiediJSON<RispostaCaso>({
      sistema: `${REGOLE_COMUNI}\n\nSei il Lettore dei casi studio di Karalisweb. Ricevi il PDF di un caso studio (un cliente seguito da Karalisweb). Ne ricavi la storia da 30 secondi che Alessio racconta nei 121 e nelle telefonate, e le chiavi per cercare aziende simili. Usa solo quello che c'è nel PDF.`,
      testo: "Leggi il caso studio allegato e compila i campi.",
      pdf: Buffer.from(caso.pdf).toString("base64"),
      schema: SCHEMA,
    });
    const d = ai.dati;
    await db.$transaction([
      db.casoStudio.update({
        where: { id },
        data: {
          titolo: pieno(d.titolo)?.slice(0, 160) ?? caso.titolo,
          storia: storiaDa(d),
          settore: pieno(d.settore)?.slice(0, 80) ?? null,
          aziendaNome: pieno(d.azienda_nome)?.slice(0, 160) ?? null,
          aziendaSito: pieno(d.azienda_sito)?.slice(0, 300) ?? null,
          personaNome: pieno(d.persona_nome)?.slice(0, 120) ?? null,
          personaRuolo: pieno(d.persona_ruolo)?.slice(0, 120) ?? null,
          personaLinkedin: normalizzaLinkedin(d.persona_linkedin),
          termini: terminiDi("", d.termini).slice(0, 6),
          costCents: { increment: ai.costCents },
        },
      }),
      db.agentRun.update({ where: { id: run.id }, data: { status: "FATTO", finishedAt: new Date(), costCents: ai.costCents } }),
    ]);
  } catch (err) {
    await db.agentRun.update({
      where: { id: run.id },
      data: { status: "FALLITO", finishedAt: new Date(), error: (err instanceof Error ? err.message : String(err)).slice(0, 500) },
    });
    throw err;
  }
}

export interface DatiCaso {
  titolo?: string;
  storia?: string | null;
  settore?: string | null;
  aziendaNome?: string | null;
  aziendaSito?: string | null;
  personaNome?: string | null;
  personaRuolo?: string | null;
  personaLinkedin?: string | null;
  termini?: string[];
}

/**
 * Alessio conferma (anche dopo aver corretto). Nascono, o si aggiornano, le tre chiavi:
 *   SETTORE — il settore ("piscine");
 *   AZIENDA — i termini per le aziende simili ("costruzione piscine"…);
 *   PERSONA — il titolare del caso, per cercare persone simili su LinkedIn.
 */
export async function confermaCasoStudio(id: string, dati: DatiCaso, oggi = new Date()) {
  const caso = await db.casoStudio.findUnique({ where: { id }, omit: { pdf: true } });
  if (!caso) throw new Error("Caso studio non trovato");
  const unito = {
    titolo: pieno(dati.titolo) ?? caso.titolo,
    storia: dati.storia !== undefined ? pieno(dati.storia) : caso.storia,
    settore: dati.settore !== undefined ? pieno(dati.settore) : caso.settore,
    aziendaNome: dati.aziendaNome !== undefined ? pieno(dati.aziendaNome) : caso.aziendaNome,
    aziendaSito: dati.aziendaSito !== undefined ? pieno(dati.aziendaSito) : caso.aziendaSito,
    personaNome: dati.personaNome !== undefined ? pieno(dati.personaNome) : caso.personaNome,
    personaRuolo: dati.personaRuolo !== undefined ? pieno(dati.personaRuolo) : caso.personaRuolo,
    personaLinkedin: dati.personaLinkedin !== undefined ? normalizzaLinkedin(dati.personaLinkedin) : caso.personaLinkedin,
    termini: dati.termini ? terminiDi("", dati.termini).slice(0, 8) : terminiDi("", caso.termini),
  };
  if (!unito.settore) throw new Error("Serve almeno il settore");
  const validoFino = caso.validoFino && caso.stato === "ATTIVO" ? caso.validoFino : new Date(oggi.getTime() + MESI_VALIDITA_CASO * 30 * 86400_000);

  await db.casoStudio.update({
    where: { id },
    data: { ...unito, stato: "ATTIVO", validoFino, confermatoAt: caso.confermatoAt ?? oggi },
  });

  const chiavi: { tipo: string; valore: string; termini: string[] }[] = [
    { tipo: "SETTORE", valore: unito.settore, termini: [] },
    ...(unito.termini.length ? [{ tipo: "AZIENDA", valore: unito.aziendaNome ?? unito.settore, termini: unito.termini }] : []),
    ...(unito.personaNome
      ? [{ tipo: "PERSONA", valore: unito.personaNome, termini: [unito.personaRuolo, unito.settore].filter((x): x is string => !!x) }]
      : []),
  ];
  for (const k of chiavi) {
    const gia = await db.chiaveRicerca.findFirst({ where: { casoStudioId: id, tipo: k.tipo } });
    if (gia) {
      await db.chiaveRicerca.update({ where: { id: gia.id }, data: { valore: k.valore, termini: k.termini, attiva: true, scadeAt: validoFino } });
    } else {
      await db.chiaveRicerca.create({ data: { casoStudioId: id, tipo: k.tipo, valore: k.valore, termini: k.termini, scadeAt: validoFino } });
    }
  }
  // Una chiave che non serve più (es. la persona tolta) si spegne.
  await db.chiaveRicerca.updateMany({ where: { casoStudioId: id, tipo: { notIn: chiavi.map((k) => k.tipo) } }, data: { attiva: false } });
  return db.casoStudio.findUnique({ where: { id }, omit: { pdf: true }, include: { chiavi: true } });
}

/** Spegne un caso (e le sue chiavi) senza cancellarlo. */
export async function sospendiCasoStudio(id: string) {
  await db.$transaction([
    db.casoStudio.update({ where: { id }, data: { stato: "SCADUTO" } }),
    db.chiaveRicerca.updateMany({ where: { casoStudioId: id }, data: { attiva: false } }),
  ]);
}

/** I casi oltre i 6 mesi si spengono da soli. */
export async function scadenzeCasi(oggi = new Date()): Promise<number> {
  const scaduti = await db.casoStudio.findMany({ where: { stato: "ATTIVO", validoFino: { lt: oggi } }, select: { id: true } });
  for (const c of scaduti) await sospendiCasoStudio(c.id);
  await db.chiaveRicerca.updateMany({ where: { attiva: true, scadeAt: { lt: oggi } }, data: { attiva: false } });
  return scaduti.length;
}
