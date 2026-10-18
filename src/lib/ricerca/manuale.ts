/**
 * Quello che Alessio scrive a mano: un'azienda, un settore o una persona da cui partire.
 *
 *   azienda — si cerca su Google Maps (nome + città), si salva e parte subito il giro veloce;
 *   settore — nasce una chiave di ricerca: la ricerca la usa per prima, come la nicchia di un caso;
 *   persona — si salva la persona (con la sua azienda, se la sa): l'azienda fa il giro veloce.
 */
import { db } from "@/lib/db";
import { chiamaDataForSeo, dataForSeoConfigurato, LOCATION_ITALIA } from "@/lib/agents/dataforseo";
import { eseguiTurnoArricchimento, giroVeloce } from "@/lib/agents/arricchimento";
import { cercaSettoreAdesso, salvaAzienda, salvaPersona } from "./cercatore";
import { stessoNome, terminiDi } from "./regole";
import { paroleNome } from "./trova-sito";
import { norm } from "@/lib/agents/bni-regole";

export type TipoManuale = "azienda" | "settore" | "persona" | "linkedin";

export interface RichiestaManuale {
  tipo: TipoManuale;
  testo: string;
  citta?: string | null;
  azienda?: string | null;
  linkedin?: string | null;
}

export interface EsitoManuale {
  leadId: string | null;
  personaId: string | null;
  chiaveId: string | null;
  messaggio: string;
}

interface ItemMaps {
  type?: string;
  title?: string;
  url?: string;
  domain?: string;
  phone?: string;
  address?: string;
  category?: string;
  place_id?: string;
  rating?: { value?: number; votes_count?: number };
}

/** La chiave "a mano": non si usa per cercare, tiene insieme quello che Alessio ha aggiunto. */
async function chiaveManuale(valore: string): Promise<string> {
  const k = await db.chiaveRicerca.create({ data: { tipo: "MANUALE", valore: valore.slice(0, 200), attiva: false } });
  return k.id;
}

/** Un'azienda scritta a mano: prima su Google Maps, così arrivano telefono, indirizzo e recensioni. */
async function aggiungiAzienda(nome: string, citta: string | null, chiaveId: string): Promise<string | null> {
  let trovata: ItemMaps | undefined;
  if (dataForSeoConfigurato()) {
    const { result } = await chiamaDataForSeo<{ items?: ItemMaps[] }>("/serp/google/maps/live/advanced", {
      keyword: [nome, citta].filter(Boolean).join(" "), location_code: LOCATION_ITALIA, language_code: "it", depth: 5,
    });
    const items = (result?.items ?? []).filter((i) => i.type === "maps_search" && i.title);
    // Tutte le parole scritte da Alessio devono esserci ("AD Solutions" non è "Secured Solutions").
    const parole = paroleNome(nome);
    const compatto = (t: string) => norm(t).replace(/[^a-z0-9]/g, " ").split(/\s+/);
    trovata = items.find((i) => stessoNome(i.title!, nome)) ?? items.find((i) => parole.length > 0 && parole.every((p) => compatto(i.title!).includes(p)));
  }
  // Se è l'azienda di un membro BNI, il suo telefono aiuta a riconoscere il sito giusto; e se la
  // scheda Maps ha un altro telefono, è un'altra azienda con lo stesso nome.
  const membro = await db.bniMembro.findFirst({ where: { company: { equals: nome, mode: "insensitive" } }, select: { phone: true, profession: true } });
  const cifre = (t?: string | null) => (t ?? "").replace(/\D/g, "").slice(-9);
  if (trovata && membro?.phone && trovata.phone && cifre(membro.phone) !== cifre(trovata.phone)) trovata = undefined;
  const r = await salvaAzienda(
    trovata
      ? {
          nome: trovata.title!, sito: trovata.url ?? (trovata.domain ? `https://${trovata.domain}` : null), telefono: trovata.phone, indirizzo: trovata.address,
          categoria: trovata.category, placeId: trovata.place_id, rating: trovata.rating?.value ?? null, recensioni: trovata.rating?.votes_count ?? null,
          mapsUrl: trovata.place_id ? `https://www.google.com/maps/place/?q=place_id:${trovata.place_id}` : null,
        }
      : { nome, indirizzo: citta, telefono: membro?.phone ?? null, categoria: membro?.profession ?? null },
    chiaveId,
    "maps",
    "manuale"
  );
  return r.leadId;
}

/** Le analisi veloci sulle aziende appena trovate partono subito, senza far aspettare la pagina. */
export function avviaAnalisiVeloci() {
  void eseguiTurnoArricchimento().catch((e) => console.error("[manuale] analisi veloci fallite:", e));
}

/** Il giro veloce parte subito, senza far aspettare la pagina. */
function avviaGiroVeloce(leadId: string) {
  void giroVeloce(leadId).catch((e) => console.error("[manuale] giro veloce fallito:", e));
}

export async function aggiungiAMano(r: RichiestaManuale): Promise<EsitoManuale> {
  const testo = r.testo.trim();
  if (testo.length < 3) throw new Error("Scrivi almeno 3 lettere");
  const citta = r.citta?.trim() || null;

  if (r.tipo === "linkedin") {
    // Solo LinkedIn: le pagine aziendali per quei termini, nella zona scritta (altrimenti la Sardegna).
    const termini = terminiDi(testo, []);
    const k = await db.chiaveRicerca.create({ data: { tipo: "SETTORE", valore: testo.slice(0, 200), termini, attiva: false } });
    await db.agentRun.create({
      data: { agent: "cerca_linkedin", status: "IN_CODA", input: { modo: "aziende", chiaveId: k.id, tipo: "SETTORE", termini, zona: citta ?? "Sardegna", provinceEscluse: [], giaVisti: 0 } },
    });
    return { leadId: null, personaId: null, chiaveId: k.id, messaggio: `Ricerca "${testo}" su LinkedIn (${citta ?? "Sardegna"}) in coda: la fa l'agente sul Mac entro mezz'ora, le aziende arrivano qui in "Da decidere".` };
  }

  if (r.tipo === "settore") {
    const termini = terminiDi(testo, []);
    const k = await db.chiaveRicerca.create({ data: { tipo: "SETTORE", valore: testo.slice(0, 200), termini, attiva: true } });
    // Anche su LinkedIn: le pagine aziendali di quel settore (le cerca l'agente sul Mac).
    await db.agentRun.create({
      data: { agent: "cerca_linkedin", status: "IN_CODA", input: { modo: "aziende", chiaveId: k.id, tipo: "SETTORE", termini, zona: citta ?? "Sardegna", provinceEscluse: [], giaVisti: 0 } },
    });
    // Con la città la ricerca parte subito; il settore resta anche nelle ricerche dei giorni dopo.
    if (!citta) return { leadId: null, personaId: null, chiaveId: k.id, messaggio: `"${testo}" è nelle ricerche dei prossimi giorni, e su LinkedIn lo cerca l'agente sul Mac entro mezz'ora. Scrivi anche una città per cercare subito su Google.` };
    // Si risponde subito: la ricerca va avanti per conto suo e l'elenco si aggiorna da solo.
    void cercaSettoreAdesso(k.id, testo, citta)
      .then((e) => { if (e.nuove) avviaAnalisiVeloci(); })
      .catch((err) => console.error("[settore a mano] fallito:", err));
    return {
      leadId: null, personaId: null, chiaveId: k.id,
      messaggio: `Sto cercando "${testo}" a ${citta} su Google Maps e Google: le aziende nuove compaiono qui sotto in 1-2 minuti, con l'analisi veloce già partita. Su LinkedIn le cerca l'agente sul Mac entro mezz'ora.`,
    };
  }

  if (r.tipo === "azienda") {
    const chiaveId = await chiaveManuale(testo);
    const leadId = await aggiungiAzienda(testo, citta, chiaveId);
    if (!leadId) throw new Error("Non sono riuscito a salvare l'azienda");
    avviaGiroVeloce(leadId);
    return { leadId, personaId: null, chiaveId, messaggio: "Azienda aggiunta: l'analisi veloce è partita, tra qualche minuto trovi la scheda piena" };
  }

  // Persona: con la sua azienda, se Alessio la sa.
  const chiaveId = await chiaveManuale(testo);
  const azienda = r.azienda?.trim() || null;
  const leadId = azienda ? await aggiungiAzienda(azienda, citta, chiaveId) : null;
  const p = await salvaPersona(
    { nome: testo, azienda, profilo: r.linkedin ?? null, localita: citta, perche: "Aggiunta a mano da Alessio" },
    { chiaveId, fonte: "linkedin" }
  );
  if (p && leadId && !p.leadId) await db.persona.update({ where: { id: p.personaId }, data: { leadId } });
  if (leadId) avviaGiroVeloce(leadId);
  return {
    leadId,
    personaId: p?.personaId ?? null,
    chiaveId,
    messaggio: leadId ? "Persona e azienda aggiunte: l'analisi veloce dell'azienda è partita" : "Persona aggiunta: scrivi anche la sua azienda per analizzarla",
  };
}
