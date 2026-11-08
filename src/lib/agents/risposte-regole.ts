/** v3.124: le regole pure per riconoscere la risposta a una mail del Percorso. */
const GRATUITI = /^(gmail|googlemail|hotmail|outlook|live|libero|yahoo|tiscali|virgilio|alice|tim|icloud|me|fastwebnet|email|inwind|aruba|pec)\./i;

/** Da chi può arrivare la risposta: lo stesso indirizzo; col dominio aziendale anche un collega (info@ → mario@). */
export function filtroMittente(email: string): string {
  const e = email.trim().toLowerCase();
  const dominio = e.split("@")[1] ?? "";
  return dominio && !GRATUITI.test(dominio) ? `@${dominio}` : e;
}

export const stessoMittente = (da: string, filtro: string) => (filtro.startsWith("@") ? da.toLowerCase().endsWith(filtro) : da.toLowerCase() === filtro);

const AUTOMATICA = /fuori ufficio|out of office|risposta automatica|auto.?reply|automatic reply|assenza|undeliver|mancato recapito|delivery status|mail delivery|non recapitat|ferie/i;
const MITTENTE_MACCHINA = /mailer-daemon|postmaster|no-?reply|donotreply/i;

export function eAutomatica(oggetto: string, mittente: string, autoSubmitted?: string | null): boolean {
  return AUTOMATICA.test(oggetto) || MITTENTE_MACCHINA.test(mittente) || (!!autoSubmitted && !/^no\b/i.test(autoSubmitted));
}

/** Il testo scritto dal cliente, senza la mail citata sotto e senza firma lunga. */
export function testoRisposta(testo: string): string {
  const righe: string[] = [];
  for (const r of testo.replace(/\r/g, "").split("\n")) {
    if (/^\s*>/.test(r) || /^\s*(Il\s.+ha scritto:|On\s.+wrote:|-{2,}\s*(Messaggio|Original)|Da:\s|From:\s)/i.test(r)) break;
    righe.push(r);
  }
  return righe.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
