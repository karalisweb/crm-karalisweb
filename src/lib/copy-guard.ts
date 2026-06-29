/**
 * Copy Guard — filtro "Carta" del brand sul testo delle mail di outreach.
 *
 * Il dizionario nero contiene i termini gonfi/cliché che NON devono mai comparire
 * nel copy in uscita, anche se il prospect stesso li usa. Il copy parla di
 * DIREZIONE, non di "analisi/audit del sito".
 *
 * `checkCopy(testo)` ritorna le violazioni; è NON bloccante: chi chiama decide se
 * avvisare, loggare o rigenerare.
 */

export interface CopyViolation {
  term: string;
  match: string;
  index: number;
  reason: string;
}

export interface CopyCheckResult {
  ok: boolean;
  violations: CopyViolation[];
}

const BANNED: Array<{ label: string; pattern: RegExp; reason: string }> = [
  { label: "trasformazione digitale", pattern: /trasformazione\s+digitale/gi, reason: "Gergo gonfio: parla di una direzione concreta." },
  { label: "soluzione/a 360°", pattern: /\ba\s*360\s*°?|\b360\s*°|soluzion\w*\s+a\s*360/gi, reason: "Cliché: di' cosa fai davvero." },
  { label: "partner di fiducia", pattern: /partner\s+di\s+fiducia/gi, reason: "Autocelebrativo e vuoto." },
  { label: "ROI/risultati garantiti", pattern: /roi\s+garantit\w+|risultati?\s+garantit\w+/gi, reason: "Promessa non credibile." },
  { label: "innovativo/innovazione", pattern: /\binnovativ\w+\b|\binnovazione\b/gi, reason: "Riempitivo: mostra con un fatto." },
  { label: "rivoluzionario", pattern: /\brivoluzionari\w+\b/gi, reason: "Iperbole da venditore." },
  { label: "gratis/offerta", pattern: /\bgratis\b|\bofferta\b/gi, reason: "Linguaggio promozionale: evita." },
  { label: "analisi/audit come autodefinizione", pattern: /\bla\s+mia\s+analisi\b|\bun['’\s]?audit\b|\baudit\s+(gratuit\w+|del\s+sito)\b|\banalisi\s+(gratuit\w+|del\s+sito)\b/gi, reason: "Il copy parla di DIREZIONE, non di 'analisi/audit del sito'." },
  { label: "esservi/potervi utile", pattern: /\b(?:esserv|esservi|potervi|potermi)\s*\w*\s*util\w+|\bcome\s+potrei\s+esserv\w+/gi, reason: "Frame da venditore centrato su di te: la mail resta su DI LORO." },
  { label: "aiutarvi/aiutarti", pattern: /\b(?:potrei|posso|possiamo|vorrei)\s+aiutar\w+|\bcome\s+(?:posso|potrei)\s+aiutar\w+/gi, reason: "Tono da venditore: parla di cosa hai notato, non di 'aiuto'." },
  { label: "propormi/proporvi", pattern: /\bpropor(?:mi|vi|re)\b/gi, reason: "Sposta il focus sulla vendita: evita." },
  { label: "soluzioni", pattern: /\bsoluzion[ei]\b/gi, reason: "Gergo da venditore: di' la cosa concreta, non 'la soluzione'." },
];

export function checkCopy(text: string | null | undefined): CopyCheckResult {
  if (!text) return { ok: true, violations: [] };
  const violations: CopyViolation[] = [];
  for (const entry of BANNED) {
    entry.pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = entry.pattern.exec(text)) !== null) {
      violations.push({ term: entry.label, match: m[0], index: m.index, reason: entry.reason });
      if (m.index === entry.pattern.lastIndex) entry.pattern.lastIndex++;
    }
  }
  violations.sort((a, b) => a.index - b.index);
  return { ok: violations.length === 0, violations };
}

export const BANNED_TERMS = BANNED.map((b) => ({ term: b.label, reason: b.reason }));
