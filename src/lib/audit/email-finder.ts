/**
 * Trova l'email di contatto dell'azienda dall'HTML del suo sito.
 *
 * Google Maps non restituisce l'email: la recuperiamo dal sito (link mailto:
 * e indirizzi visibili nel testo). Scarta caselle di sistema/terze parti e i
 * falsi positivi tipo immagini retina ("logo@2x.png"), e preferisce un'email
 * sullo stesso dominio del sito. Restituisce null se non trova nulla di affidabile.
 */

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const MAILTO_RE = /mailto:([^"'?\s>]+)/gi;

// Caselle che NON sono contatti utili per l'outreach.
const BAD_LOCAL = /^(noreply|no-reply|donotreply|do-not-reply|postmaster|abuse|mailer-daemon|bounce|wordpress|sentry|root|hostmaster)$/i;

// Domini di terze parti / estensioni-file (falsi positivi: srcset retina, asset).
const BAD_DOMAIN = /(sentry\.io|wix\.com|wixpress\.com|example\.(com|org|net)|godaddy|cloudflare|schema\.org|w3\.org|\.png|\.jpe?g|\.gif|\.svg|\.webp|\.bmp|\.css|\.js|\.json)$/i;

// Caselle preferite (più probabili come contatto commerciale/diretto).
const PREFERRED_LOCAL = /^(info|contatti?|amministrazione|commerciale|segreteria|ufficio|mail|posta|preventivi)@/i;

export function extractContactEmail(html: string, siteDomain?: string): string | null {
  const candidates = new Set<string>();

  let m: RegExpExecArray | null;
  while ((m = MAILTO_RE.exec(html)) !== null) {
    try {
      candidates.add(decodeURIComponent(m[1]).trim().toLowerCase());
    } catch {
      candidates.add(m[1].trim().toLowerCase());
    }
  }
  for (const e of html.match(EMAIL_RE) || []) {
    candidates.add(e.trim().toLowerCase());
  }

  const clean = [...candidates].filter((e) => {
    const [local, domain] = e.split("@");
    if (!local || !domain || !domain.includes(".")) return false;
    if (domain.length < 4) return false;
    if (BAD_LOCAL.test(local)) return false;
    if (BAD_DOMAIN.test(domain)) return false;
    return true;
  });

  if (clean.length === 0) return null;

  // Preferenza 1: stesso dominio del sito (è quasi certo l'indirizzo dell'azienda).
  const base = siteDomain ? siteDomain.replace(/^www\./, "").toLowerCase() : null;
  const sameDomain = base ? clean.filter((e) => e.split("@")[1].includes(base)) : [];
  const pool = sameDomain.length > 0 ? sameDomain : clean;

  // Preferenza 2: una casella "buona" (info@, contatti@, ...).
  return pool.find((e) => PREFERRED_LOCAL.test(e)) || pool[0];
}
