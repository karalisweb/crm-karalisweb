/**
 * La rete al centro (v3.53.0) — le regole in funzioni pure (niente DB). Vedi PROGETTO-AGENTI.md
 * "La rete al centro". Casi studio + relazione: la rete di Alessio vince sempre, BNI è un potenziatore.
 *
 *   - Un ponte vale solo se è nella cerchia stretta (membri BNI con un 121 fatto + "lo conosco").
 *   - Le strade, in ordine: membro BNI della cerchia → altro contatto della cerchia → chi decide è nella
 *     cerchia (contatto diretto) → membro BNI della cerchia nella zona dell'azienda (v3.68) → contatto scaldato. Senza strade si chiede "lo conosci?" sui nomi visti.
 *   - Il seguito: promemoria dopo 5 giorni, ponte successivo dopo 10, pausa di 3 mesi dopo 3 tentativi.
 */
import { norm } from "./bni-regole";

// ─── Quante aziende in lavorazione ──────────────────────────────────────────

/** Ogni passo punta a 20 aziende (Alessio, 2026-10-28: prima 10, troppo poche da scaldare): 60 posti. */
export const AZIENDE_PER_PASSO = 20;
export const INIZIO_RETE = new Date("2026-10-20T00:00:00+02:00");
export function capienzaLavorazione(_oggi?: Date): number {
  return AZIENDE_PER_PASSO * 3;
}

/** Le fasi che occupano un posto fra le 15 (30): con l'incontro l'azienda esce ed entra la prossima. */
export const FASI_ATTIVE = ["MAPPATA", "PONTE_SCELTO", "CHIESTA"] as const;
export const FASI = [...FASI_ATTIVE, "INCONTRO", "PROPOSTA", "CLIENTE", "PAUSA"] as const;
export type Fase = (typeof FASI)[number];

export const ETICHETTE_FASE: Record<Fase, string> = {
  MAPPATA: "mappata",
  PONTE_SCELTO: "ponte scelto",
  CHIESTA: "presentazione chiesta",
  INCONTRO: "incontro",
  PROPOSTA: "proposta",
  CLIENTE: "cliente",
  PAUSA: "in pausa",
};

export const GIORNI_PROMEMORIA = 5;
export const GIORNI_CAMBIO_PONTE = 10;
export const MAX_TENTATIVI = 3;
export const GIORNI_PAUSA = 90;

// ─── La cerchia ─────────────────────────────────────────────────────────────

const parole = (s: string) => norm(s).split(/[^a-z]+/).filter((p) => p.length >= 2);

/** Due nomi sono la stessa persona se le parole del più corto (almeno nome e cognome) stanno nell'altro. */
export function stessaPersona(a: string, b: string): boolean {
  const pa = parole(a);
  const pb = parole(b);
  if (pa.length < 2 || pb.length < 2) return false;
  const [corto, lungo] = pa.length <= pb.length ? [pa, pb] : [pb, pa];
  return corto.every((p) => lungo.includes(p));
}

export function nellaCerchia(nome: string, cerchia: string[]): boolean {
  return cerchia.some((c) => stessaPersona(nome, c));
}

// ─── Le strade verso un'azienda ─────────────────────────────────────────────

export type Strada = "BNI" | "CERCHIA" | "DIRETTO" | "SCALDATO";

export interface Ponte {
  strada: Strada;
  /** Chi chiede la presentazione (BNI/CERCHIA) o chi si contatta direttamente (DIRETTO/SCALDATO). */
  nome: string;
  decisore: string;
  membroId?: string | null;
}

export interface DatiAzienda {
  decisori: { nome: string; grado: number | null; contattiInComune: string[] }[];
  /** Ponti BNI già trovati (incrocio, chi decide): membro e decisore. */
  pontiBni: { membroId: string; membro: string; decisore: string }[];
  /** Membri BNI della cerchia nella stessa zona dell'azienda (v3.68: la ricerca dal territorio). */
  pontiZona?: { membroId: string; membro: string }[];
  scaldata: boolean;
}

/**
 * Le strade possibili, nell'ordine in cui provarle, senza quelle già provate. Un membro BNI vale solo se
 * è nella cerchia (ci ha fatto un 121); un contatto in comune solo se Alessio l'ha segnato "lo conosco".
 */
export function strade(a: DatiAzienda, cerchia: string[], provati: string[] = [], occupati: string[] = []): Ponte[] {
  const out: Ponte[] = [];
  // Un favore alla volta: un ponte che sta già presentando un'altra azienda aspetta (non vale per i contatti diretti).
  const gia = (nome: string) => provati.some((p) => stessaPersona(p, nome)) || out.some((o) => stessaPersona(o.nome, nome));
  const occupato = (nome: string) => occupati.some((p) => stessaPersona(p, nome));
  for (const b of a.pontiBni) if (nellaCerchia(b.membro, cerchia) && !gia(b.membro) && !occupato(b.membro)) out.push({ strada: "BNI", nome: b.membro, decisore: b.decisore, membroId: b.membroId });
  for (const d of a.decisori) {
    for (const c of d.contattiInComune) if (nellaCerchia(c, cerchia) && !gia(c) && !occupato(c)) out.push({ strada: "CERCHIA", nome: c, decisore: d.nome });
  }
  for (const d of a.decisori) if (nellaCerchia(d.nome, cerchia) && !gia(d.nome)) out.push({ strada: "DIRETTO", nome: d.nome, decisore: d.nome });
  // La zona (v3.68): un membro BNI già incontrato che lavora dove sta l'azienda. Vale meno di LinkedIn, e solo
  // se si sa chi decide (si chiede per nome, non per categoria).
  const decisore = a.decisori[0]?.nome;
  if (decisore) for (const z of a.pontiZona ?? []) if (nellaCerchia(z.membro, cerchia) && !gia(z.membro) && !occupato(z.membro)) out.push({ strada: "BNI", nome: z.membro, decisore, membroId: z.membroId });
  if (a.scaldata) for (const d of a.decisori) if (!gia(d.nome) && !out.some((o) => o.nome === d.nome)) out.push({ strada: "SCALDATO", nome: d.nome, decisore: d.nome });
  return out;
}

/** I nomi su cui chiedere "lo conosci?": contatti in comune e decisori già collegati, non ancora in cerchia. */
export function nomiDaConfermare(a: DatiAzienda, cerchia: string[], scartati: string[] = []): string[] {
  const out: string[] = [];
  const add = (n: string) => {
    if (!n || nellaCerchia(n, cerchia) || scartati.some((s) => stessaPersona(s, n)) || out.some((o) => stessaPersona(o, n))) return;
    out.push(n);
  };
  for (const d of a.decisori) if (d.grado === 1) add(d.nome);
  for (const d of a.decisori) d.contattiInComune.forEach(add);
  for (const b of a.pontiBni) add(b.membro);
  return out.slice(0, 6);
}

/** Più alto = da lavorare prima. Serve a scegliere quale azienda entra quando si libera un posto. */
export function forzaAzienda(a: DatiAzienda, cerchia: string[]): number {
  const s = strade(a, cerchia);
  if (s.some((x) => x.strada === "BNI")) return 4;
  if (s.some((x) => x.strada === "CERCHIA")) return 3;
  if (s.some((x) => x.strada === "DIRETTO")) return 3;
  if (s.length) return 2;
  return nomiDaConfermare(a, cerchia).length ? 1 : 0;
}

// ─── Il seguito ─────────────────────────────────────────────────────────────

export type Azione = "NIENTE" | "PROMEMORIA" | "CAMBIA_PONTE" | "PAUSA" | "RIENTRA";

/** Cosa fare oggi su un'azienda in lavorazione. */
export function prossimaAzione(l: { fase: string; chiestaAt: Date | null; promemoriaAt: Date | null; tentativi: number; pausaFino: Date | null; presentatoAt?: Date | null }, oggi: Date): Azione {
  const giorni = (d: Date) => (oggi.getTime() - d.getTime()) / 86400_000;
  if (l.fase === "PAUSA") return l.pausaFino && l.pausaFino <= oggi ? "RIENTRA" : "NIENTE";
  // Presentato: la palla è ad Alessio (fissare l'incontro), niente promemoria al ponte.
  if (l.fase !== "CHIESTA" || !l.chiestaAt || l.presentatoAt) return "NIENTE";
  if (giorni(l.chiestaAt) >= GIORNI_CAMBIO_PONTE) return l.tentativi + 1 >= MAX_TENTATIVI ? "PAUSA" : "CAMBIA_PONTE";
  if (giorni(l.chiestaAt) >= GIORNI_PROMEMORIA && !l.promemoriaAt) return "PROMEMORIA";
  return "NIENTE";
}

// ─── L'agenda in avanti ─────────────────────────────────────────────────────

/** 121 BNI a settimana; altri 2 posti restano per gli incontri con i presentati. */
export const TETTO_121_BNI = 8;
export const POSTI_PRESENTATI = 2;

/**
 * La settimana in cui atterra chi accetta oggi: la prima, fra questa e le prossime due, che ha ancora posto.
 * null = le tre settimane sono piene: le richieste si fermano. (Con l'agenda piena per due settimane, chi
 * accetta oggi si incontra fra due.)
 */
export function settimanaConPosto(fissatiPerSettimana: number[], tetto = TETTO_121_BNI): number | null {
  for (let i = 0; i < Math.min(3, fissatiPerSettimana.length); i++) if (fissatiPerSettimana[i] < tetto) return i;
  return null;
}

// ─── I messaggi (testo di riserva, se l'AI non risponde) ────────────────────

const nomeProprio = (n: string) => n.trim().split(/\s+/)[0] ?? n;

/**
 * Come si nomina chi decide nel messaggio: "Mario Rossi di Azienda", oppure, se si conosce solo il ruolo
 * (profilo intestato all'azienda, es. "Accadueo Sardegna (socio)"), "il socio di Azienda".
 */
export function chiDecideTesto(decisore: string, azienda: string): string {
  const ruolo = decisore.match(/\(([^)]+)\)/)?.[1]?.trim();
  if (ruolo) return `il ${ruolo.toLowerCase()} di ${azienda}`;
  return `${decisore} di ${azienda}`;
}

export function testoRichiestaPonte(ponte: string, decisore: string, azienda: string, motivo: string | null): string {
  return `Ciao ${nomeProprio(ponte)}, una domanda veloce: conosci ${chiDecideTesto(decisore, azienda)}? ${motivo ? `${motivo} ` : ""}Se ti va di presentarci con un messaggio a tre, poi ci penso io. Grazie! Alessio`;
}

export function testoContattoDiretto(decisore: string, azienda: string, motivo: string | null): string {
  return `Ciao ${nomeProprio(decisore)}, ti scrivo perché ${motivo ?? `lavoro con aziende come ${azienda}`}. Ti va di sentirci 20 minuti? Ti racconto cosa abbiamo fatto. Alessio`;
}

export function testoPromemoria(ponte: string, decisore: string): string {
  return `Ciao ${nomeProprio(ponte)}, ti riscrivo solo per sapere se sei riuscito a sentire ${decisore}. Nessuna fretta, e se non è il momento va benissimo. Alessio`;
}

// ─── Entrare in relazione: commenti sulle pagine (confermata da Alessio il 2026-10-25) ──────

/**
 * Si commenta la PAGINA dell'azienda (la leggono anche i concorrenti); il CRM propone Facebook, Instagram e
 * LinkedIn con quanto pubblicano, Alessio sceglie. Al 5° commento si contatta direttamente chi decide
 * (Alessio, 2026-10-28: prima 7, troppo tempo per scaldarle).
 */
export const COMMENTI_PER_CONTATTO = 5;
export const PIATTAFORME = ["facebook", "instagram", "linkedin"] as const;
export type Piattaforma = (typeof PIATTAFORME)[number];
export const NOMI_PIATTAFORMA: Record<Piattaforma, string> = { facebook: "Facebook", instagram: "Instagram", linkedin: "LinkedIn" };

export interface PaginaSocial {
  piattaforma: Piattaforma;
  url: string;
  /** Post negli ultimi 3 mesi (stima: da fuori se ne vedono solo alcuni). */
  postUltimi3Mesi: number | null;
  ultimoPost: string | null;
}

/** La piattaforma di un link (null se non è uno dei tre). */
export function piattaformaDi(url: string | null | undefined): Piattaforma | null {
  if (!url) return null;
  if (/facebook\.com|fb\.com/i.test(url)) return "facebook";
  if (/instagram\.com/i.test(url)) return "instagram";
  if (/linkedin\.com/i.test(url)) return "linkedin";
  return null;
}

const giorniDa = (data: string | null, oggi: Date) => {
  const t = data ? new Date(data).getTime() : NaN;
  return Number.isNaN(t) ? null : Math.round((oggi.getTime() - t) / 86400_000);
};

/** "circa 2 a settimana · ultimo 3 giorni fa", "fermo da 4 mesi", "non si sa". */
export function frequenzaTesto(p: Pick<PaginaSocial, "postUltimi3Mesi" | "ultimoPost">, oggi: Date): string {
  const g = giorniDa(p.ultimoPost, oggi);
  if (g != null && g > 90) return `ferma da ${Math.round(g / 30)} mesi`;
  const ultimo = g == null ? null : g <= 0 ? "ultimo oggi" : g === 1 ? "ultimo ieri" : `ultimo ${g} giorni fa`;
  const n = p.postUltimi3Mesi;
  const ritmo = n == null ? null : n === 0 ? "nessun post in 3 mesi" : n >= 13 ? `circa ${Math.round(n / 13)} a settimana` : n >= 3 ? `circa ${Math.round(n / 3)} al mese` : `${n} in 3 mesi`;
  return [ritmo, ultimo].filter(Boolean).join(" · ") || "non si sa";
}

/**
 * I commenti fatti contano per piattaforma: il contatto parte al 5° sulla STESSA (Alessio, 2026-10-27), non
 * sommando Facebook, Instagram e LinkedIn. Torna la piattaforma con più commenti (a parità, la prima vista).
 */
export function piattaformaPiuCommentata(commenti: { piattaforma?: unknown; post?: unknown }[]): { piattaforma: Piattaforma; fatti: number } | null {
  const conto = new Map<Piattaforma, number>();
  for (const c of commenti) {
    const p = piattaformaDi(typeof c.post === "string" ? c.post : null) ?? ((PIATTAFORME as readonly unknown[]).includes(c.piattaforma) ? (c.piattaforma as Piattaforma) : null);
    if (p) conto.set(p, (conto.get(p) ?? 0) + 1);
  }
  let meglio: { piattaforma: Piattaforma; fatti: number } | null = null;
  for (const [piattaforma, fatti] of conto) if (!meglio || fatti > meglio.fatti) meglio = { piattaforma, fatti };
  return meglio;
}

/** Dove commentare se Alessio non ha scelto: la pagina viva che pubblica di più (a parità, la più recente). */
export function piattaformaConsigliata(pagine: PaginaSocial[], oggi: Date): Piattaforma | null {
  const vive = pagine.filter((p) => {
    const g = giorniDa(p.ultimoPost, oggi);
    return g == null || g <= 90;
  });
  const voto = (p: PaginaSocial) => (p.postUltimi3Mesi ?? 1) * 1000 - (giorniDa(p.ultimoPost, oggi) ?? 60);
  return [...(vive.length ? vive : pagine)].sort((a, b) => voto(b) - voto(a))[0]?.piattaforma ?? null;
}

/** Al 5° commento: il primo messaggio diretto a chi decide (o all'azienda, se non si sa chi è). */
export function testoContattoDopoCommenti(decisore: string | null, azienda: string, piattaforma: Piattaforma | null, motivo: string | null): string {
  const saluto = decisore ? `Ciao ${nomeProprio(decisore)}` : "Buongiorno";
  const dove = piattaforma ? ` su ${NOMI_PIATTAFORMA[piattaforma]}` : "";
  const domanda = decisore ? "Ti va di sentirci 20 minuti? Ti racconto cosa abbiamo fatto, senza impegno." : "Potrei sentire il titolare per 20 minuti? Gli racconto cosa abbiamo fatto, senza impegno.";
  return `${saluto}, sono Alessio Loi di Karalisweb: in queste settimane ho seguito e commentato i post di ${azienda}${dove}. ${motivo ?? "Lavoro con aziende come la vostra sul web e sul marketing."} ${domanda} Alessio`;
}

/** Senza chi decide: il messaggio privato alla pagina per arrivare a lui. */
export function testoMessaggioPagina(azienda: string, motivo: string | null): string {
  return `Buongiorno, sono Alessio Loi di Karalisweb (Cagliari). Seguo la pagina di ${azienda} e avrei un'idea da proporre al titolare${motivo ? `: ${motivo.charAt(0).toLowerCase()}${motivo.slice(1)}` : "."} Mi dite a chi posso scrivere, o il suo nome? Grazie, Alessio`;
}
