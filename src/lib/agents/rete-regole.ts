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
  /** Membro BNI della zona: non è detto che conosca chi decide (non si cita come "in comune"). */
  zona?: boolean;
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
  if (decisore) for (const z of a.pontiZona ?? []) if (nellaCerchia(z.membro, cerchia) && !gia(z.membro) && !occupato(z.membro)) out.push({ strada: "BNI", nome: z.membro, decisore, membroId: z.membroId, zona: true });
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

/**
 * v3.90 (Alessio: "devono essere persuasivi e in pratica gli dobbiamo mandare il caso studio, chiedendo
 * l'autorizzazione"): il messaggio a chi decide parte dal problema che un'azienda come la sua aveva (il gancio,
 * scritto dall'AI dal caso studio), offre il caso studio e chiede solo il permesso di mandarlo. Niente call da
 * fissare: un sì costa poco, e il caso studio fa il resto.
 */
export function offertaCaso(azienda: string, gancio: string | null, haCaso: boolean, tu: boolean): string {
  const ti = tu ? "ti" : "le";
  if (!haCaso) return `Lavoro con aziende come ${azienda} su strategia, sito e marketing. Posso mandar${ti} un esempio concreto di un lavoro fatto, così vede${tu ? "i" : ""} se può servire anche a voi?`;
  const storia = gancio ?? "Ho appena chiuso un lavoro con un'azienda del vostro settore.";
  return `${storia}\n\nHo raccolto tutto in un breve caso studio: com'era, cosa abbiamo fatto, cosa è cambiato. Credo che possa esser${ti} utile. ${tu ? "Te lo mando?" : "Posso mandarglielo?"}`;
}

export function testoContattoDiretto(decisore: string, azienda: string, gancio: string | null, haCaso = !!gancio): string {
  return `Ciao${decisore.trim() ? ` ${nomeProprio(decisore)}` : ""}, sono Alessio.\n\n${offertaCaso(azienda, gancio, haCaso, true)}\n\nAlessio`;
}

/**
 * v3.87 (Alessio: "dobbiamo contattare le aziende, non trovare interlocutori"): il messaggio va a chi decide, subito,
 * citando la persona che avete in comune (se c'è davvero) e il caso studio. Il ponte non è più un passaggio obbligato.
 */
export function testoDirettoConPonte(decisore: string, azienda: string, inComune: string | null, gancio: string | null, haCaso = !!gancio): string {
  return `Buongiorno${decisore.trim() ? ` ${nomeProprio(decisore)}` : ""}, sono Alessio Loi di Karalisweb (Cagliari).${inComune ? ` Abbiamo in comune ${inComune}.` : ""}\n\n${offertaCaso(azienda, gancio, haCaso, false)}\n\nGrazie,\nAlessio`;
}

/**
 * v3.103 (Alessio, 2026-11-05: "in da contattare manca il follow up"): chi decide non ha risposto al contatto. Un solo
 * promemoria, breve e da collega, sullo stesso canale.
 */
export function testoFollowupContatto(decisore: string | null): string {
  const nome = decisore && decisore.trim() && decisore !== "chi decide" ? ` ${nomeProprio(decisore)}` : "";
  return `Ciao${nome}, ti riscrivo per il messaggio di qualche giorno fa: se ti va ti mando il caso studio, ci metti due minuti a capire se può servire anche a voi. Mi basta un sì. Alessio`;
}

export function testoPromemoria(ponte: string, decisore: string): string {
  return `Ciao ${nomeProprio(ponte)}, ti riscrivo solo per sapere se sei riuscito a sentire ${decisore}. Nessuna fretta, e se non è il momento va benissimo. Alessio`;
}

// ─── Entrare in relazione: commenti sulle pagine (confermata da Alessio il 2026-10-25) ──────

/**
 * Si commenta la PAGINA dell'azienda (la leggono anche i concorrenti); il CRM propone Facebook, Instagram e
 * LinkedIn con quanto pubblicano, Alessio sceglie. Al 3° commento si contatta direttamente chi decide
 * (Alessio, 2026-10-28: prima 7, troppo tempo per scaldarle; poi 5. v3.84, 2026-11-01: 3, perché con 10 aziende da
 * scaldare e un commento al giorno ne arrivino circa 3 al giorno al contatto, verso l'obiettivo di 5).
 */
export const COMMENTI_PER_CONTATTO = 3;
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

/**
 * v3.117 (Alessio, 2026-11-06): la relazione si fa con la PERSONA, non con la pagina. Chi decide si cerca su LinkedIn e
 * Instagram, il CRM gli chiede il collegamento (LinkedIn) e lo segue (Instagram), commenta i suoi post e poi gli scrive
 * su WhatsApp o mail col caso studio. Facebook è fuori. Niente contatti in comune né presentazioni.
 */
export const STRADA_COLLEGARE = "COLLEGARE";
export const STRADA_SCALDARE = "SCALDARE";
/** Dove si commentano i post di chi decide: Instagram prima (i titolari ci stanno ogni giorno), poi LinkedIn. */
export const PIATTAFORME_PERSONA: Piattaforma[] = ["instagram", "linkedin"];

/** La piattaforma su cui commentare chi decide: quella già cominciata, altrimenti la prima che ha. */
export function piattaformaPersona(profili: { instagram: string | null; linkedin: string | null }, iniziata: Piattaforma | null, linkedinOk = true): Piattaforma | null {
  const ha = (p: Piattaforma) => !!profili[p as "instagram" | "linkedin"] && (p !== "linkedin" || linkedinOk);
  if (iniziata && PIATTAFORME_PERSONA.includes(iniziata) && ha(iniziata)) return iniziata;
  return PIATTAFORME_PERSONA.find(ha) ?? null;
}

/** Dopo i commenti ai suoi post (o subito, se non pubblica): il primo messaggio diretto a chi decide. */
export function testoContattoDopoCommenti(decisore: string | null, azienda: string, piattaforma: Piattaforma | null, gancio: string | null, haCaso = !!gancio, commentati = true): string {
  const dove = piattaforma ? ` su ${NOMI_PIATTAFORMA[piattaforma]}` : "";
  const intro = decisore
    ? commentati ? `sono Alessio Loi di Karalisweb: in queste settimane ho seguito i tuoi post${dove}.` : "sono Alessio Loi di Karalisweb (Cagliari)."
    : `sono Alessio Loi di Karalisweb: in queste settimane ho seguito i post di ${azienda}${dove}.`;
  if (decisore) return `Ciao ${nomeProprio(decisore)}, ${intro}\n\n${offertaCaso(azienda, gancio, haCaso, true)}\n\nAlessio`;
  // Senza chi decide si scrive all'azienda: il caso studio è per il titolare.
  const storia = haCaso ? `${gancio ?? "Ho appena chiuso un lavoro con un'azienda del vostro settore."}\n\nHo raccolto tutto in un breve caso studio: com'era, cosa abbiamo fatto, cosa è cambiato. Credo che possa interessare al titolare.` : "Lavoro con aziende come la vostra su strategia, sito e marketing, e ho un esempio concreto che credo possa interessare al titolare.";
  return `Buongiorno, ${intro}\n\n${storia} Posso mandarglielo? Ditemi voi a chi scriverlo.\n\nGrazie,\nAlessio`;
}

/** Senza chi decide: il messaggio privato alla pagina per arrivare a lui. */
export function testoMessaggioPagina(azienda: string, gancio: string | null, haCaso = !!gancio): string {
  const storia = haCaso ? `${gancio ?? "Ho appena chiuso un lavoro con un'azienda del vostro settore."} Ho raccolto tutto in un breve caso studio che credo possa interessare al titolare di ${azienda}.` : `Ho un esempio concreto di un lavoro fatto per un'azienda come la vostra che credo possa interessare al titolare di ${azienda}.`;
  // v3.115: lo stesso testo va bene su WhatsApp, email o pagina (prima diceva "seguo la pagina", strano su WhatsApp).
  return `Buongiorno, sono Alessio Loi di Karalisweb (Cagliari).\n\n${storia}\n\nPosso mandarglielo? Mi dite a chi scriverlo? Grazie,\nAlessio`;
}

/**
 * v3.115 (Alessio, 2026-11-06): i punti di contatto, in ordine di preferenza. Prima WhatsApp (anche quello
 * dell'azienda), poi la mail (anche quella del sito), poi LinkedIn della persona, poi le pagine: Instagram, Facebook,
 * e per ultima LinkedIn ("scrivere alla pagina LinkedIn o non scrivergli è pressoché la stessa cosa").
 */
export const ORDINE_CANALI = ["whatsapp", "email", "linkedin", "pagina_instagram", "pagina_facebook", "pagina_linkedin"] as const;
export type CanaleContatto = (typeof ORDINE_CANALI)[number];
export const ORDINE_PAGINE: Piattaforma[] = ["instagram", "facebook", "linkedin"];

/** La pagina a cui scrivere: la prima disponibile in ordine Instagram, Facebook, LinkedIn. */
export function paginaPreferita<T extends { piattaforma: Piattaforma }>(pagine: T[]): T | null {
  return [...pagine].sort((a, b) => ORDINE_PAGINE.indexOf(a.piattaforma) - ORDINE_PAGINE.indexOf(b.piattaforma))[0] ?? null;
}

/** I canali disponibili, nell'ordine di preferenza: il primo è quello da usare. */
export function canaliInOrdine(c: { whatsapp?: string | null; email?: string | null; linkedin?: string | null; piattaformaPagina?: Piattaforma | null; pagina?: string | null }): CanaleContatto[] {
  const ci: Record<CanaleContatto, boolean> = {
    whatsapp: !!c.whatsapp, email: !!c.email, linkedin: !!c.linkedin,
    pagina_instagram: !!c.pagina && c.piattaformaPagina === "instagram",
    pagina_facebook: !!c.pagina && c.piattaformaPagina === "facebook",
    pagina_linkedin: !!c.pagina && c.piattaformaPagina === "linkedin",
  };
  return ORDINE_CANALI.filter((k) => ci[k]);
}

// ─── Quando serve il riscaldamento (Alessio, 2026-11-08: "usare sempre la testa") ──────────────────────

/** Oltre questo tempo il messaggio parte comunque, riscaldata o no. */
export const ORE_MAX_RISCALDAMENTO = 48;
const GIORNI_PUBBLICA = 90;

/** Pubblica davvero? null = non si sa (chi decide trovato dal server: i suoi post li legge solo il Chrome). */
export function pubblicaDa(persona: Record<string, unknown>, oggi: Date): boolean | null {
  if (!("ultimoPostLinkedin" in persona) && !("ultimoPostInstagram" in persona)) return null;
  return [persona.ultimoPostLinkedin, persona.ultimoPostInstagram].some((d) => {
    const t = typeof d === "string" ? Date.parse(d) : NaN;
    return !Number.isNaN(t) && oggi.getTime() - t < GIORNI_PUBBLICA * 86400_000;
  });
}

/**
 * Il riscaldamento serve solo se chi decide pubblica, il messaggio arriva a lui e non ti conosce già. Il WhatsApp conta
 * come suo (il numero dell'ufficio è un fisso e WhatsApp non ce l'ha). Solo LinkedIn: il collegamento è obbligato.
 * Dopo 48 ore il messaggio parte comunque, con qualunque canale.
 */
export function stradaContatto(c: { whatsapp: boolean; email: boolean; emailPersonale: boolean; linkedin: boolean; instagram: boolean; pubblica: boolean | null; loConosce: boolean; oreInCorso: number }): "contatta" | "scalda" {
  const haCanale = c.whatsapp || c.email || c.linkedin;
  if (c.loConosce && haCanale) return "contatta";
  if (c.oreInCorso >= ORE_MAX_RISCALDAMENTO && haCanale) return "contatta";
  if (c.whatsapp || c.emailPersonale) return c.pubblica === false || (!c.linkedin && !c.instagram) ? "contatta" : "scalda";
  if (c.email) return "contatta"; // info@: lo legge la segreteria, i commenti non li ha visti
  return "scalda";
}
