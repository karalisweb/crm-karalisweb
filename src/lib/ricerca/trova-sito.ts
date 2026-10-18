/**
 * Trovare il sito di un'azienda prima di dire "non ce l'ha". Si prova per più strade:
 *   1. Google cercando il nome (e la città): i domini dei risultati e le email nei testi
 *      (info@officina3mt.it → officina3mt.it);
 *   2. il dominio indovinato dal nome ("Officina 3MT" → officina3mt.it, officina3mt.com);
 * e ogni candidato si verifica aprendo la homepage: ci deve essere il nome (o il telefono).
 *
 * Il risultato dice anche se cercando il nome su Google esce il sito: se non esce, è già un gancio.
 */
import { chiamaDataForSeo, dataForSeoConfigurato, dominio, LOCATION_ITALIA } from "@/lib/agents/dataforseo";
import { eNonAzienda } from "@/lib/agents/esploratore";
import { scaricaPagina } from "@/lib/agents/pagina";
import { norm } from "@/lib/agents/bni-regole";

interface ItemSerp {
  type?: string;
  rank_absolute?: number;
  domain?: string;
  url?: string;
  title?: string;
  description?: string;
}

export interface SitoTrovato {
  sito: string | null;
  /** Come è stato trovato: "google", "email", "dominio", oppure il motivo per cui non c'è. */
  come: string;
  /** Cercando il nome su Google: la posizione del sito (null = non nei primi 20) e chi esce prima. */
  ricercaNome: string;
  posizioneNome: number | null;
  primiNome: string[];
  costCents: number;
}

const FORME = /\b(s\.?r\.?l\.?s?|s\.?n\.?c\.?|s\.?a\.?s\.?|s\.?p\.?a\.?|soc(ietà)?|coop(erativa)?|di|e|&|ditta|impresa|group|italia)\b/g;
const EMAIL_GENERICHE = /^(gmail|libero|hotmail|outlook|yahoo|tiscali|alice|virgilio|icloud|live|pec|legalmail|tin|email|aruba)\./;

/** Le parole che identificano il nome ("Officina 3MT S.a.s." → ["officina", "3mt"]). */
export function paroleNome(nome: string): string[] {
  return norm(nome)
    .replace(FORME, " ")
    .split(/[^a-z0-9]+/)
    .filter((p) => p.length >= 2);
}

/** Domini plausibili dal nome: tutto attaccato, con e senza la prima parola, .it e .com. */
export function dominiDaNome(nome: string): string[] {
  const p = paroleNome(nome);
  if (!p.length) return [];
  const basi = new Set([p.join(""), p.join("-")]);
  if (p.length > 1) basi.add(p.slice(1).join(""));
  if (p.length > 2) basi.add(p.slice(0, 2).join(""));
  return [...basi].filter((b) => b.length >= 4).flatMap((b) => [`${b}.it`, `${b}.com`, `${b}.net`]);
}

/** I domini delle email scritte nei testi dei risultati (escluse le caselle gratuite). */
export function dominiDaEmail(testi: string[]): string[] {
  const out = new Set<string>();
  for (const t of testi) {
    for (const m of t.matchAll(/[\w.+-]+@([\w-]+(?:\.[\w-]+)+)/g)) {
      const d = m[1].toLowerCase();
      if (!EMAIL_GENERICHE.test(d) && !eNonAzienda(d)) out.add(d);
    }
  }
  return [...out];
}

const compatta = (s: string) => norm(s).replace(/[^a-z0-9]/g, "");

/**
 * Quanto è sicuro che questa homepage sia dell'azienda: telefono uguale 3, nome nel dominio 2,
 * nome nel titolo 2, nome solo nel testo 1 (può essere un "sito realizzato da…"). Serve almeno 2.
 */
export function punteggioHome(html: string, dom: string, nome: string, telefono?: string | null, citta?: string | null): number {
  const parole = paroleNome(nome);
  if (!parole.length) return 0;
  const tutte = (t: string) => parole.every((p) => t.includes(p));
  const titolo = compatta(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  const testo = compatta(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "));
  const cifre = (telefono ?? "").replace(/\D/g, "").replace(/^39/, "");
  let p = 0;
  if (cifre.length >= 8 && html.replace(/\D/g, "").includes(cifre.slice(-8))) p += 3;
  if (compatta(dom.split(".")[0]).includes(parole.filter((x) => x.length >= 3).join("") || parole.join(""))) p += 2;
  if (tutte(titolo)) p += 2;
  else if (tutte(testo)) p += 1;
  // La città conta solo come conferma (un omonimo altrove non la ha).
  if (p >= 2 && citta && testo.includes(compatta(citta))) p += 1;
  return p;
}

async function verifica(dom: string, nome: string, telefono?: string | null, citta?: string | null): Promise<{ sito: string; punti: number } | null> {
  try {
    const p = await scaricaPagina(`https://${dom}`);
    const finale = dominio(p.url);
    if (eNonAzienda(finale)) return null;
    return { sito: `https://${finale}`, punti: punteggioHome(p.html, finale, nome, telefono, citta) };
  } catch {
    return null;
  }
}

export async function trovaSito(a: { nome: string; citta?: string | null; telefono?: string | null; sitoNoto?: string | null }): Promise<SitoTrovato> {
  const ricercaNome = [a.nome.replace(/\s*[|–-].*$/, "").trim(), a.citta].filter(Boolean).join(" ");
  const esito: SitoTrovato = { sito: null, come: "non trovato", ricercaNome, posizioneNome: null, primiNome: [], costCents: 0 };

  let organici: ItemSerp[] = [];
  if (dataForSeoConfigurato()) {
    const r = await chiamaDataForSeo<{ items?: ItemSerp[] }>("/serp/google/organic/live/advanced", {
      keyword: ricercaNome, location_code: LOCATION_ITALIA, language_code: "it", depth: 20,
    });
    esito.costCents += r.costCents;
    organici = (r.result?.items ?? []).filter((i) => i.type === "organic" && i.domain);
  }

  // Candidati, nell'ordine: il sito già noto, i risultati di Google, le email, i domini indovinati.
  const candidati: { dom: string; come: string }[] = [];
  const aggiungi = (dom: string, come: string) => {
    const d = dominio(dom);
    if (d && !eNonAzienda(d) && !candidati.some((c) => c.dom === d)) candidati.push({ dom: d, come });
  };
  if (a.sitoNoto) aggiungi(a.sitoNoto, "noto");
  for (const i of organici.slice(0, 8)) aggiungi(i.domain!, "google");
  for (const d of dominiDaEmail(organici.map((i) => `${i.title ?? ""} ${i.description ?? ""}`))) aggiungi(d, "email");
  for (const d of dominiDaNome(a.nome)) aggiungi(d, "dominio");

  // Si tiene il candidato più sicuro (almeno 2 punti); con telefono e nome uguali ci si ferma subito.
  let migliore: { sito: string; punti: number; come: string } | null = null;
  for (const c of candidati.slice(0, 14)) {
    const v = await verifica(c.dom, a.nome, a.telefono, a.citta);
    if (v && v.punti >= 2 && (!migliore || v.punti > migliore.punti)) migliore = { ...v, come: c.come };
    if (migliore && migliore.punti >= 5) break;
  }
  if (migliore) {
    esito.sito = migliore.sito;
    esito.come = migliore.come;
  }

  if (organici.length) {
    const mio = esito.sito ? dominio(esito.sito) : null;
    const trovato = mio ? organici.find((i) => dominio(i.domain!) === mio) : undefined;
    esito.posizioneNome = trovato?.rank_absolute ?? null;
    esito.primiNome = organici
      .filter((i) => dominio(i.domain!) !== mio)
      .slice(0, 3)
      .map((i) => dominio(i.domain!));
  }
  return esito;
}
