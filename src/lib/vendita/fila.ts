/**
 * La fila della vendita (v3.93) — regole pure, configurabili da Alessio in Impostazioni → Vendita.
 *
 * Una fila sola, in ordine: richiesta di info → call fissata → call fatta → preventivo → accettato,
 * più i passi che aggiunge lui. Ogni passo può ricordargli di muoversi dopo N giorni fermo:
 * "mi chiedono info e mi dimentico di fissare la call" non deve più succedere.
 *
 * I passi "fissi" corrispondono a uno stadio della trattativa (gli agenti di vendita lavorano sugli
 * stadi): si rinominano e si cambiano i giorni, ma non si spengono e restano nel loro ordine.
 * I passi aggiunti da Alessio non cambiano lo stadio: segnano solo dove sta la trattativa.
 * I rami (non risponde → recall → nurturing/exit) restano regole fisse.
 */
import type { Stadio } from "./regole";

export interface Passo {
  id: string;
  nome: string;
  attivo: boolean;
  /** Dopo quanti giorni fermo in questo passo compare il promemoria (null = mai). */
  giorni: number | null;
  /** Il testo del promemoria; {nome} diventa il nome della trattativa. */
  promemoria: string;
  /** Solo per i passi fissi: lo stadio della trattativa che rappresentano. */
  stadio?: Stadio;
}

export interface Origine {
  id: string;
  nome: string;
}

export const PASSI_DEFAULT: Passo[] = [
  { id: "richiesta", nome: "Richiesta di info", attivo: true, giorni: 1, promemoria: "Fissa la call con {nome}", stadio: "RICHIESTA_INFO" },
  // Per la call i giorni si contano dalla data della call, non da quando è stata fissata.
  { id: "call_fissata", nome: "Call fissata", attivo: true, giorni: 1, promemoria: "Segna com'è andata la call con {nome}", stadio: "CALL_FISSATA" },
  { id: "call_fatta", nome: "Call fatta", attivo: true, giorni: 2, promemoria: "Manda il preventivo a {nome}", stadio: "CALL_FATTA" },
  { id: "preventivo", nome: "Preventivo mandato", attivo: true, giorni: 3, promemoria: "Richiama {nome}: il preventivo è senza risposta", stadio: "LETTERA_INVIATA" },
  { id: "accettato", nome: "Accettato", attivo: true, giorni: null, promemoria: "", stadio: "INCARICO" },
];

export const ORIGINI_DEFAULT: Origine[] = [
  { id: "bni", nome: "BNI in sede" },
  { id: "121", nome: "121" },
  { id: "evento", nome: "Evento di persona" },
  { id: "linkedin", nome: "LinkedIn" },
  { id: "whatsapp", nome: "WhatsApp" },
  { id: "telefono", nome: "Telefono" },
  { id: "email", nome: "Email" },
  { id: "sito", nome: "Dal sito" },
  { id: "passaparola", nome: "Passaparola" },
  { id: "squadra", nome: "Squadra (ricerca)" },
  { id: "opportunita", nome: "Opportunità" },
  { id: "cliente", nome: "Cliente esistente" },
];

const ID_FISSI = PASSI_DEFAULT.map((p) => p.id);

/** Il passo fisso che rappresenta uno stadio (RECALL, FOLLOW_UP, NURTURING, EXIT non ne hanno: sono rami). */
export function passoDiStadio(stadio: Stadio): string | null {
  return PASSI_DEFAULT.find((p) => p.stadio === stadio)?.id ?? null;
}

/**
 * Rimette in ordine una configurazione arrivata dal pannello o dal DB: i passi fissi ci sono
 * sempre (con il loro stadio, accesi, nel loro ordine relativo), quelli aggiunti sono puliti.
 * Restituisce l'errore se la fila non va bene.
 */
export function normalizzaPassi(input: unknown): { passi: Passo[]; errore?: string } {
  const grezzi = Array.isArray(input) ? input : [];
  const visti = new Set<string>();
  const passi: Passo[] = [];
  for (const g of grezzi) {
    if (!g || typeof g !== "object") continue;
    const r = g as Record<string, unknown>;
    const id = typeof r.id === "string" ? r.id.trim().slice(0, 40) : "";
    if (!id || visti.has(id)) continue;
    visti.add(id);
    const fisso = PASSI_DEFAULT.find((p) => p.id === id);
    const nome = (typeof r.nome === "string" ? r.nome.trim().slice(0, 60) : "") || fisso?.nome || "";
    if (!nome) continue;
    const giorni = typeof r.giorni === "number" && Number.isFinite(r.giorni) && r.giorni >= 0 ? Math.min(Math.round(r.giorni), 365) : null;
    passi.push({
      id,
      nome,
      attivo: fisso ? true : r.attivo !== false,
      giorni,
      promemoria: typeof r.promemoria === "string" ? r.promemoria.trim().slice(0, 200) : fisso?.promemoria ?? "",
      ...(fisso ? { stadio: fisso.stadio } : {}),
    });
  }
  // Prima il controllo sull'ordine scelto, poi i fissi mancanti tornano al loro posto.
  const ordineFissi = passi.filter((p) => ID_FISSI.includes(p.id)).map((p) => p.id);
  for (let i = 1; i < ordineFissi.length; i++) {
    if (ID_FISSI.indexOf(ordineFissi[i]) < ID_FISSI.indexOf(ordineFissi[i - 1])) {
      const a = PASSI_DEFAULT.find((p) => p.id === ordineFissi[i - 1])!.nome;
      const b = PASSI_DEFAULT.find((p) => p.id === ordineFissi[i])!.nome;
      return { passi: PASSI_DEFAULT, errore: `"${b}" deve stare dopo "${a}"` };
    }
  }
  for (const f of PASSI_DEFAULT) {
    if (passi.some((p) => p.id === f.id)) continue;
    const prima = ID_FISSI.slice(0, ID_FISSI.indexOf(f.id)).reverse().find((id) => passi.some((p) => p.id === id));
    const i = prima ? passi.findIndex((p) => p.id === prima) + 1 : 0;
    passi.splice(i, 0, { ...f });
  }
  return { passi };
}

export function normalizzaOrigini(input: unknown): Origine[] {
  const grezzi = Array.isArray(input) ? input : [];
  const visti = new Set<string>();
  const out: Origine[] = [];
  for (const g of grezzi) {
    if (!g || typeof g !== "object") continue;
    const r = g as Record<string, unknown>;
    const nome = typeof r.nome === "string" ? r.nome.trim().slice(0, 40) : "";
    const id = (typeof r.id === "string" && r.id.trim() ? r.id.trim() : slug(nome)).slice(0, 40);
    if (!nome || !id || visti.has(id)) continue;
    visti.add(id);
    out.push({ id, nome });
  }
  return out.length ? out : ORIGINI_DEFAULT;
}

export function slug(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

/** Dove sta la trattativa nella fila: il passo salvato, oppure quello del suo stadio (trattative di prima della v3.93). */
export function passoAttuale(t: { passo: string | null; stadio: Stadio }, passi: Passo[]): Passo | null {
  const id = t.passo && passi.some((p) => p.id === t.passo) ? t.passo : passoDiStadio(t.stadio);
  return passi.find((p) => p.id === id) ?? null;
}

/** Il passo dopo quello attuale, saltando i passi spenti. */
export function passoSuccessivo(attuale: Passo | null, passi: Passo[]): Passo | null {
  const attivi = passi.filter((p) => p.attivo);
  if (!attuale) return attivi[0] ?? null;
  const i = passi.findIndex((p) => p.id === attuale.id);
  return passi.slice(i + 1).find((p) => p.attivo) ?? null;
}

const FERME: Stadio[] = ["EXIT", "NURTURING"];

export interface TrattativaPerFila {
  nome: string;
  stadio: Stadio;
  passo: string | null;
  passoDal: Date | null;
  callAt: Date | null;
  updatedAt: Date;
}

export interface Promemoria {
  testo: string;
  /** Da quanti giorni è fermo oltre il limite (0 = scade oggi). */
  giorniDiRitardo: number;
}

/** Il promemoria della trattativa, se è ferma nel suo passo da più dei giorni stabiliti. */
export function promemoria(t: TrattativaPerFila, passi: Passo[], oggi: Date): Promemoria | null {
  if (FERME.includes(t.stadio)) return null;
  const p = passoAttuale(t, passi);
  if (!p || p.giorni == null || !p.promemoria) return null;
  const dal = p.id === "call_fissata" ? t.callAt : t.passoDal ?? t.updatedAt;
  if (!dal) return null;
  const scadenza = dal.getTime() + p.giorni * 86400_000;
  if (oggi.getTime() < scadenza) return null;
  return { testo: p.promemoria.replace(/\{nome\}/g, t.nome), giorniDiRitardo: Math.floor((oggi.getTime() - scadenza) / 86400_000) };
}
