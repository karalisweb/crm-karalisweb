/**
 * Il seguito del 121 con il Metodo Strategico Digitale™ — le regole in funzioni pure (niente DB).
 * Fonte: `src/lib/agents/msd/scheda-msd.md` (dalla Carta Fondativa MSD v1.3, fuori dal repository). In caso di
 * dubbio vince la Carta.
 *
 *   - Una proposta parte solo se il membro è interessato PER SÉ ed è nel perimetro (PMI 500k-5M, 10-15 persone);
 *     fuori target decide Alessio. Chi vuole solo segnalare ha un altro seguito (le presentazioni).
 *   - Ogni testo passa da `controllaTesto`: se c'è un avviso, Alessio lo vede prima di mandarlo.
 *   - Un solo richiamo dopo una settimana, con un contenuto nuovo; poi "in attesa".
 */

export const PREZZO_MSD = "2.000€ + IVA";
export const GIORNI_RICHIAMO_MSD = 7;
/** Si legge in un minuto. */
export const CARATTERI_MAX_PROPOSTA = 1400;

export type Interesse = "per_se" | "segnalare" | "nessuno";
export type Target = "dentro" | "fuori" | "incerto";

/** Parole e formule che la Carta vieta (sezioni 5.2 e 6 e scheda §6). Si cercano come parole intere. */
export const PAROLE_VIETATE = [
  "audit", "diagnosi", "check-up", "check up", "trasformazione digitale", "ecosistema", "soluzione 360", "360°",
  "partner di fiducia", "roi garantito", "scientific", "brevett", "eccellenza", "unicità", "passione", "ottimizzazione",
  "costruito sui numeri reali", "prospect", "lead", "prenota", "richiedi preventivo", "acquista", "scopri di più",
  "web agency", "agenzia web", "agenzia di web marketing", "agenzia di digital marketing", "consulente di marketing",
  "mappa di estrazione", "prompt", "cura", "terapia", "conquista", "battaglia", "formula segreta", "trucco", "scorciatoia",
] as const;

const normalizza = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Le parole vietate presenti nel testo (come parole intere o inizio di parola: "brevett" prende "brevettato"). */
export function paroleVietate(testo: string): string[] {
  const t = ` ${normalizza(testo)} `;
  return PAROLE_VIETATE.filter((p) => {
    const q = normalizza(p).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const aperta = p === "brevett" || p === "scientific";
    return new RegExp(`(^|[^a-z])${q}${aperta ? "" : "(?![a-z])"}`).test(t);
  });
}

/**
 * Cosa non va in una proposta, in parole semplici (vuoto = si può mandare dopo la rilettura di Alessio):
 * parole vietate, prezzo mancante, chiamata all'azione senza "candidati", elenchi puntati, ®, promesse di numeri,
 * troppo lunga.
 */
export function controllaTesto(testo: string, tipo: "proposta" | "richiamo" = "proposta"): string[] {
  const avvisi: string[] = [];
  const vietate = paroleVietate(testo);
  if (vietate.length) avvisi.push(`Parole da non usare: ${vietate.join(", ")}`);
  if (/®/.test(testo)) avvisi.push("C'è il simbolo ®: si usa sempre ™");
  if (/^\s*([-*•]|\d+[.)])\s+/m.test(testo)) avvisi.push("Ci sono elenchi puntati: la proposta è in prosa");
  if (/\d+\s?%|fatturato|raddoppi|triplic/i.test(testo)) avvisi.push("Sembra promettere numeri (percentuali, fatturato): il percorso promette chiarezza, non risultati");
  if (tipo === "proposta") {
    if (!/2\.?000\s?€\s?\+\s?iva/i.test(testo)) avvisi.push(`Manca il prezzo in chiaro (${PREZZO_MSD})`);
    if (!/candid/i.test(testo)) avvisi.push('Manca la chiamata all\'azione con "candidati"');
    if (/Metodo Strategico Digitale(?!™)/.test(testo)) avvisi.push("Metodo Strategico Digitale va scritto con ™");
    if (testo.length > CARATTERI_MAX_PROPOSTA) avvisi.push("Troppo lunga: deve leggersi in un minuto");
  }
  return avvisi;
}

/** Il seguito giusto dopo il 121: proposta, avviso "fuori target" ad Alessio, oppure niente (solo relazione). */
export function seguitoDopo121(interesse: Interesse, target: Target): "proposta" | "fuori_target" | "niente" {
  if (interesse !== "per_se") return "niente";
  return target === "dentro" ? "proposta" : "fuori_target";
}

/** Il richiamo è dovuto: proposta mandata da almeno una settimana, nessun richiamo ancora. */
export function richiamoDovuto(mandataIl: Date | null, richiamoGiaFatto: boolean, oggi: Date): boolean {
  if (!mandataIl || richiamoGiaFatto) return false;
  return oggi.getTime() - mandataIl.getTime() >= GIORNI_RICHIAMO_MSD * 86400_000;
}
