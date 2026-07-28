/**
 * PARSER MEMBRI BNI — "incolla la lista, ci penso io"
 *
 * Il collo di bottiglia del modulo BNI non è il matching: è che l'anagrafica è vuota.
 * Digitare 30 membri a mano per ogni capitolo da visitare non succederà mai.
 *
 * Questo parser accetta testo incollato in forma libera (da un elenco soci, un foglio
 * Excel, una mail, il sito del capitolo) e prova a capire nome / professione / azienda.
 * È volutamente TOLLERANTE: meglio importare qualcosa da correggere che pretendere
 * un formato preciso. Per questo l'import ha sempre un'anteprima prima di salvare.
 */

export interface ParsedMember {
  name: string;
  profession: string | null;
  company: string | null;
  phone: string | null;
  email: string | null;
  /** Riga originale, per far capire ad Alessio da dove viene ogni riga in anteprima. */
  raw: string;
  /** Cosa il parser non è riuscito a interpretare con sicurezza. */
  warning: string | null;
}

/** Separatori di colonna, in ordine di affidabilità. */
const COLUMN_SEPARATORS = ["\t", "|", ";", " — ", " – ", " - "];

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.]+/;
// Numeri italiani: fissi e mobili, con o senza prefisso, spazi/punti/trattini.
const PHONE_RE = /(?:\+39[\s.-]?)?(?:3\d{2}|0\d{1,3})[\s.-]?\d{5,8}/;

/** Righe che sono intestazioni o rumore, non membri. */
const NOISE_PATTERNS = [
  /^nome\b/i, /^cognome\b/i, /^membro\b/i, /^socio\b/i,
  /^professione\b/i, /^categoria\b/i, /^azienda\b/i,
  /^capitolo\b/i, /^telefono\b/i, /^e-?mail\b/i,
  // Titoli tipici in cima a un elenco incollato
  /^elenco\b/i, /^lista\b/i, /^soci\b/i, /^membri\b/i, /^chapter\b/i,
  /^-+$/, /^=+$/, /^\d+$/,
];

function isNoise(line: string): boolean {
  const t = line.trim();
  if (t.length < 3) return true;
  return NOISE_PATTERNS.some((p) => p.test(t));
}

/** Sceglie il separatore presente nel maggior numero di righe. */
function detectSeparator(lines: string[]): string | null {
  let best: { sep: string; count: number } | null = null;
  for (const sep of COLUMN_SEPARATORS) {
    const count = lines.filter((l) => l.includes(sep)).length;
    // Deve comparire in almeno metà delle righe per essere considerato la struttura.
    if (count >= Math.max(1, Math.ceil(lines.length / 2)) && (!best || count > best.count)) {
      best = { sep, count };
    }
  }
  return best?.sep ?? null;
}

const clean = (s?: string | null): string | null => {
  const t = (s ?? "").trim().replace(/\s+/g, " ");
  return t ? t : null;
};

/**
 * Estrae e RIMUOVE email e telefono da una riga, così non inquinano
 * i campi testuali (nome/professione/azienda).
 */
function extractContacts(line: string): { rest: string; email: string | null; phone: string | null } {
  let rest = line;
  const email = rest.match(EMAIL_RE)?.[0] ?? null;
  if (email) rest = rest.replace(email, " ");
  const phone = rest.match(PHONE_RE)?.[0] ?? null;
  if (phone) rest = rest.replace(phone, " ");
  return { rest, email, phone: phone ? phone.replace(/[\s.-]/g, "") : null };
}

/**
 * Interpreta una singola riga.
 * Ordine campi assunto: Nome · Professione · Azienda (l'ordine più comune negli
 * elenchi soci BNI). Con 2 campi si assume Nome · Professione.
 */
function parseLine(line: string, sep: string | null): ParsedMember | null {
  const original = line.trim();
  if (!original || isNoise(original)) return null;

  const { rest, email, phone } = extractContacts(original);

  let parts: string[];
  if (sep) {
    parts = rest.split(sep).map((p) => p.trim()).filter(Boolean);
  } else {
    // Nessun separatore: provo il formato "Nome Cognome (Professione)"
    const paren = rest.match(/^(.+?)\s*[（(]([^)）]+)[)）]\s*(.*)$/);
    parts = paren
      ? [paren[1], paren[2], paren[3]].map((p) => p.trim()).filter(Boolean)
      : [rest.trim()];
  }

  if (parts.length === 0) return null;

  const name = clean(parts[0]);
  if (!name) return null;

  let warning: string | null = null;
  if (parts.length === 1) {
    warning = "Solo il nome: professione e azienda da completare a mano.";
  }
  // Se il resto della lista ha una struttura a colonne e questa riga no, molto
  // spesso è un titolo o una nota, non una persona. Non la scarto in silenzio:
  // la segnalo, così si vede in anteprima e si decide.
  if (sep && !line.includes(sep)) {
    warning = "Riga fuori formato rispetto alle altre: controlla che sia davvero un membro.";
  }
  // Un "nome" lunghissimo di solito è una riga che il parser non ha saputo dividere.
  if (name.length > 60) {
    warning = "Riga non interpretata bene: controlla il nome.";
  }

  return {
    name,
    profession: clean(parts[1]),
    company: clean(parts[2]),
    phone,
    email,
    raw: original,
    warning,
  };
}

/**
 * Interpreta un blocco di testo incollato.
 * Deduplica per nome (case-insensitive) all'interno dello stesso blocco.
 */
export function parseMembers(raw: string): ParsedMember[] {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !isNoise(l));

  if (lines.length === 0) return [];

  const sep = detectSeparator(lines);
  const out: ParsedMember[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const parsed = parseLine(line, sep);
    if (!parsed) continue;
    const key = parsed.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(parsed);
  }

  return out;
}
