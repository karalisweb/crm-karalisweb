/**
 * Normalizzazione delle chiavi di deduplicazione.
 *
 * Piano OrchestraAI, sezione 3.2 — ordine di priorità:
 *   1. google_place_id
 *   2. dominio normalizzato
 *   3. partita IVA        (oggi non disponibile: nessuna anagrafica la raccoglie)
 *
 * "Nessuna deduplicazione automatica su ragione sociale: produce falsi positivi."
 * Qui la ragione sociale serve SOLO a generare candidati per la coda manuale.
 */

/**
 * Domini di posta pubblici. Due soggetti che condividono uno di questi NON
 * hanno alcun legame: usarli come indizio produrrebbe migliaia di falsi positivi.
 */
const PUBLIC_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'hotmail.com', 'hotmail.it', 'outlook.com',
  'outlook.it', 'live.com', 'live.it', 'msn.com', 'yahoo.com', 'yahoo.it',
  'libero.it', 'virgilio.it', 'alice.it', 'tin.it', 'tiscali.it', 'inwind.it',
  'iol.it', 'fastwebnet.it', 'aruba.it', 'pec.it', 'icloud.com', 'me.com',
  'mac.com', 'protonmail.com', 'proton.me', 'gmx.com', 'aol.com',
]);

/** Suffissi che non identificano un soggetto ma un servizio di hosting. */
const HOSTING_SUFFIXES = [
  'wixsite.com', 'wordpress.com', 'blogspot.com', 'weebly.com',
  'squarespace.com', 'shopify.com', 'myshopify.com', 'business.site',
  'altervista.org', 'jimdosite.com', 'webnode.it', 'netlify.app',
  'vercel.app', 'github.io', 'pages.dev',
];

/**
 * Riduce un URL o un host a un dominio confrontabile.
 * Ritorna null quando il valore non identifica un soggetto.
 *
 * Applica: minuscolo, rimozione di schema, credenziali, porta, percorso,
 * query, frammento, "www." iniziale e punto finale.
 */
export function normalizeDomain(raw) {
  if (raw == null) return null;
  let s = String(raw).trim().toLowerCase();
  if (!s) return null;

  // Toglie lo schema, anche malformato ("http:/x", "//x").
  s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//, '').replace(/^\/\//, '');
  // Credenziali nell'URL.
  s = s.replace(/^[^/@]*@/, '');
  // Percorso, query, frammento.
  s = s.split('/')[0].split('?')[0].split('#')[0];
  // Porta.
  s = s.split(':')[0];
  // Punto finale del FQDN assoluto.
  s = s.replace(/\.+$/, '');
  // "www." iniziale (una sola volta: "www.www." è patologico, non lo inseguo).
  s = s.replace(/^www\./, '');

  if (!s) return null;
  if (!s.includes('.')) return null;              // "localhost", host interni
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(s)) return null; // indirizzo IP
  if (/[^a-z0-9.-]/.test(s)) return null;         // caratteri non ammessi
  if (s.startsWith('.') || s.includes('..')) return null;

  const tld = s.split('.').pop();
  if (!tld || tld.length < 2) return null;

  return s;
}

/** true se il dominio appartiene a una piattaforma di hosting condivisa. */
export function isHostingDomain(domain) {
  if (!domain) return false;
  return HOSTING_SUFFIXES.some((suf) => domain === suf || domain.endsWith('.' + suf));
}

/** Dominio di un indirizzo email, null se pubblico o non valido. */
export function emailDomain(raw) {
  if (raw == null) return null;
  const s = String(raw).trim().toLowerCase();
  const at = s.lastIndexOf('@');
  if (at < 1 || at === s.length - 1) return null;
  const d = normalizeDomain(s.slice(at + 1));
  if (!d) return null;
  if (PUBLIC_EMAIL_DOMAINS.has(d)) return null;
  return d;
}

/**
 * Forma confrontabile di una ragione sociale. Serve SOLO a proporre candidati
 * alla coda manuale: non unisce mai nulla da sola.
 */
export function normalizeName(raw) {
  if (raw == null) return null;
  let s = String(raw).toLowerCase().trim();
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // accenti
  s = s.replace(/&/g, ' e ');
  s = s.replace(/[^a-z0-9]+/g, ' ').trim();
  // Forme societarie e rumore commerciale.
  const stop = new Set([
    'srl', 'srls', 'spa', 'sas', 'snc', 'ss', 'sc', 'scarl', 'sarl', 'ltd',
    'llc', 'inc', 'gmbh', 'bv', 'nv', 'co', 'company', 'societa', 'soc',
    'di', 'de', 'del', 'della', 'dei', 'degli', 'delle', 'da', 'e', 'ed',
    'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una', 'the',
  ]);
  // Scarta anche i token di un solo carattere: "S.r.l." diventa "s r l" e
  // sporcherebbe ogni confronto.
  const tokens = s.split(' ').filter((t) => t.length > 1 && !stop.has(t));
  if (!tokens.length) return null;
  return tokens.join(' ');
}

/** Google Place ID: identificatore opaco, si normalizza solo negli spazi. */
export function normalizePlaceId(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s || s.length < 5) return null;
  return s;
}

/** Similarità 0..1 fra due stringhe già normalizzate (Dice sui bigrammi). */
export function diceSimilarity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const bigrams = (s) => {
    const out = new Map();
    for (let i = 0; i < s.length - 1; i++) {
      const g = s.slice(i, i + 2);
      out.set(g, (out.get(g) || 0) + 1);
    }
    return out;
  };
  const A = bigrams(a);
  const B = bigrams(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const [g, n] of A) inter += Math.min(n, B.get(g) || 0);
  const total = [...A.values()].reduce((x, y) => x + y, 0) +
                [...B.values()].reduce((x, y) => x + y, 0);
  return (2 * inter) / total;
}

/**
 * Token distintivi condivisi fra due ragioni sociali normalizzate.
 *
 * Serve al caso che la similarità complessiva non coglie: "ristorante su
 * gologone" e "su gologone experience" condividono il nucleo identificante
 * ma differiscono troppo nel resto (somiglianza 0,57).
 *
 * Ritorna { tokens, coverage } se il segnale è abbastanza forte, altrimenti null.
 * Condizione: l'intersezione copre almeno metà del nome più corto e contiene
 * almeno un token raro (o due token qualsiasi su insiemi piccoli).
 */
export const MIN_CORPUS_FOR_SINGLE_TOKEN = 200;

export function sharedDistinctiveTokens(a, b, df = null, corpusSize = 0) {
  if (!a || !b || a === b) return null;
  const ta = new Set(a.split(' '));
  const tb = new Set(b.split(' '));
  const shared = [...ta].filter((t) => tb.has(t));
  if (!shared.length) return null;

  const shorter = Math.min(ta.size, tb.size);
  const coverage = shared.length / shorter;
  if (coverage < 0.5) return null;

  // Un token è distintivo se compare in pochi nomi dell'insieme. Senza la
  // mappa delle frequenze si ricade sulla regola prudente: servono due token.
  // "centrale", "hotel", "autofficina" sono frequenti e da soli non bastano:
  // "Bar Centrale" e "Ristorante Centrale" sono due aziende diverse.
  // La rarità è un indizio affidabile solo su un insieme abbastanza grande.
  // Su poche decine di nomi "cagliari" sembra raro pur essendo una città:
  // sotto la soglia si richiedono due token condivisi, che è prudente.
  //
  // Misurato su 3 204 anagrafiche reali (11 agosto 2026):
  //   almeno 1 token condiviso con frequenza <= 2 .....    198 coppie
  //   almeno 2 token condivisi, frequenza qualsiasi ....  7 805 coppie
  //   almeno 3 token condivisi, frequenza qualsiasi ....  1 802 coppie
  // Una coda da 7 805 voci non si rivede a mano: è rumore, non lavoro.
  // Quando la frequenza è utilizzabile la rarità è quindi OBBLIGATORIA,
  // non alternativa al numero di token condivisi.
  const dfUsable = df && corpusSize >= MIN_CORPUS_FOR_SINGLE_TOKEN;
  const isDistinctive = (t) => (df ? (df.get(t) || 0) <= 2 : false);
  const strong = dfUsable ? shared.some(isDistinctive) : shared.length >= 2;
  if (!strong) return null;

  return {
    tokens: shared,
    coverage: Number(coverage.toFixed(2)),
    distinctive: shared.filter(isDistinctive),
  };
}

/** Frequenza di ogni token: in quanti nomi normalizzati compare. */
export function tokenDocumentFrequency(names) {
  const df = new Map();
  for (const n of names) {
    if (!n) continue;
    for (const t of new Set(n.split(' '))) df.set(t, (df.get(t) || 0) + 1);
  }
  return df;
}
