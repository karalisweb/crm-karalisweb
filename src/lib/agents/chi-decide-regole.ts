/**
 * v3.122 (Alessio, 2026-11-08: "VELOCITÀ prima di tutto"): le regole pure della ricerca di chi decide dal server.
 * L'AI legge sito e risultati di Google, ma un nome passa solo se la sua citazione c'è davvero nelle fonti e la fonte
 * parla di quell'azienda: meglio nessuno che la persona sbagliata.
 */
export interface Fonte { url: string; titolo: string; testo: string; delSito: boolean }
export interface Candidato { nome: string; ruolo: string; citazione: string }
export interface PersonaTrovata { nome: string; ruolo: string; fonte: string; citazione: string; profilo: string | null; profiloInstagram: string | null }

export const norma = (s: string | null | undefined) => (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const FORME = /\b(s\.?\s?r\.?\s?l\.?s?|s\.?\s?n\.?\s?c\.?|s\.?\s?a\.?\s?s\.?|s\.?\s?p\.?\s?a\.?|unipersonale|societa|cooperativa)\b/gi;
export function nomePulito(nome: string): string {
  return nome.split(/\s[-–|]\s/)[0].replace(/\([^)]*\)/g, " ").replace(FORME, " ").replace(/[.,&]+\s*$/g, "").replace(/\s+/g, " ").trim();
}

const GENERICHE = new Set(["studio", "impresa", "azienda", "ditta", "servizi", "service", "consulenza", "del", "della", "lavoro", "dott", "dottor", "piscine", "edile", "sardegna", "group", "gruppo", "and", "partners", "legale", "dei", "per"]);
const parole = (azienda: string) => norma(nomePulito(azienda)).split(" ").filter((p) => p.length >= 3 && !GENERICHE.has(p));

/** Il testo parla di questa azienda? Tutte le parole distintive del nome (al massimo le prime due). */
export function parlaDi(testo: string, azienda: string): boolean {
  const t = ` ${norma(testo)} `;
  const distintive = parole(azienda).slice(0, 2);
  if (!distintive.length) return t.includes(` ${norma(nomePulito(azienda))} `);
  return distintive.every((p) => t.includes(` ${p} `));
}

const RUOLI = /titolar|amministrator|fondator|founder|\bceo\b|\bsoci[oa]\b|proprietari|owner|president|legale rappresentante|managing director|direttore generale/i;

function nomeValido(nome: string): boolean {
  const t = nome.trim().split(/\s+/);
  return t.length >= 2 && t.length <= 4 && t.every((p) => /^[\p{L}'.-]{2,}$/u.test(p));
}

/** Il nome della persona è nel nome dell'azienda ("Studio Antonello Floris"): è il titolare. */
export const nelNomeAzienda = (persona: string, azienda: string) => {
  const t = norma(persona).split(" ");
  const a = ` ${norma(azienda)} `;
  return t.length >= 2 && a.includes(` ${t[t.length - 1]} `) && a.includes(` ${t[0]} `);
};

function profiloDi<T extends Fonte>(persona: string, azienda: string, risultati: T[], tipo: RegExp): string | null {
  const t = norma(persona).split(" ");
  const nome = t[0];
  const cognome = t[t.length - 1];
  const r = risultati.find((f) => {
    if (!tipo.test(f.url)) return false;
    const titolo = ` ${norma(f.titolo)} `;
    return titolo.includes(` ${nome} `) && titolo.includes(` ${cognome} `) && (parlaDi(`${f.titolo} ${f.testo}`, azienda) || nelNomeAzienda(persona, azienda));
  });
  return r ? r.url.split("?")[0] : null;
}
const LINKEDIN_PERSONA = /linkedin\.com\/in\//i;
const INSTAGRAM_PROFILO = /instagram\.com\/(?!p\/|reel|explore|stories|tv\/)[A-Za-z0-9._]+\/?($|\?)/i;

/** Tiene solo le persone con una citazione vera, in una fonte su questa azienda, con un ruolo che decide. */
export function personeVerificate(candidati: Candidato[], fonti: Fonte[], azienda: string): PersonaTrovata[] {
  const out: PersonaTrovata[] = [];
  for (const c of candidati) {
    if (out.length >= 2 || !nomeValido(c.nome) || out.some((p) => norma(p.nome) === norma(c.nome))) continue;
    const cit = norma(c.citazione);
    const cognome = norma(c.nome).split(" ").pop()!;
    const dalNome = nelNomeAzienda(c.nome, azienda);
    if (!dalNome && (cit.length < 8 || !` ${cit} `.includes(` ${cognome} `))) continue;
    const fonte = dalNome ? fonti[0] : fonti.find((f) => norma(`${f.titolo} ${f.testo}`).includes(cit) && (f.delSito || parlaDi(`${f.titolo} ${f.testo}`, azienda)));
    if (!dalNome && !fonte) continue;
    if (!dalNome && !RUOLI.test(`${c.ruolo} ${c.citazione}`)) continue;
    out.push({
      nome: c.nome.trim(), ruolo: dalNome && !RUOLI.test(c.ruolo) ? "Titolare" : c.ruolo.trim(), fonte: fonte?.url ?? "nome dell'azienda", citazione: dalNome ? azienda : c.citazione,
      profilo: profiloDi(c.nome, azienda, fonti, LINKEDIN_PERSONA), profiloInstagram: profiloDi(c.nome, azienda, fonti, INSTAGRAM_PROFILO),
    });
  }
  return out;
}

export function aggiungiProfili(p: PersonaTrovata, azienda: string, risultati: Fonte[]): PersonaTrovata {
  return { ...p, profilo: p.profilo ?? profiloDi(p.nome, azienda, risultati, LINKEDIN_PERSONA), profiloInstagram: p.profiloInstagram ?? profiloDi(p.nome, azienda, risultati, INSTAGRAM_PROFILO) };
}

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const TELEFONO = /(?<![\d])(?:\+?39[\s.-]?)?(3\d{2}[\s.-]?\d{3}[\s.-]?\d{3,4}|0\d{1,3}[\s.-]?\d{3,4}[\s.-]?\d{2,4})(?![\d])/g;
const EMAIL_INUTILE = /pec\.|legalmail|arubapec|noreply|no-reply|example\.|sentry|wix\.com/i;

/** Telefono e mail dai risultati di Google che parlano di questa azienda: prima il cellulare (vale per WhatsApp). */
export function contattiDaRisultati(fonti: Fonte[], azienda: string): { telefono: string | null; email: string | null } {
  const buone = fonti.filter((f) => parlaDi(f.titolo, azienda) || parlaDi(f.testo, azienda));
  const emails: string[] = [];
  const telefoni: string[] = [];
  for (const f of buone) {
    emails.push(...(f.testo.match(EMAIL) ?? []).filter((e) => !EMAIL_INUTILE.test(e)));
    for (const m of f.testo.matchAll(TELEFONO)) {
      const n = m[1].replace(/\D/g, "");
      if (n.length >= 9 && n.length <= 11) telefoni.push(n);
    }
  }
  return { telefono: telefoni.find((t) => t.startsWith("3")) ?? telefoni[0] ?? null, email: emails[0]?.toLowerCase() ?? null };
}
