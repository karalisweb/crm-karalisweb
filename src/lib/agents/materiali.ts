/**
 * Prepara i materiali che gli agenti di sintesi danno all'AI: i referti degli altri agenti,
 * in forma compatta e con le prove, così l'AI ragiona su fatti e non su impressioni.
 */
import { SQUADRA } from "./registro";
import type { AziendaContesto, RefertoLetto } from "./tipi";

const MAX_FINDINGS = 2500;

function nomeAgente(chiave: string): string {
  const a = SQUADRA.find((s) => s.chiave === chiave);
  return a ? `${a.numero} ${a.nome}` : chiave;
}

export function schedaAzienda(a: AziendaContesto): string {
  return [
    `AZIENDA: ${a.name}`,
    `Sito: ${a.website}`,
    a.category ? `Categoria: ${a.category}` : null,
    a.citta ? `Città: ${a.citta}` : null,
    a.address ? `Indirizzo: ${a.address}` : null,
    a.googleRating != null ? `Google: ${a.googleRating} stelle, ${a.googleReviewsCount ?? 0} recensioni` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function materialiDaReferti(referti: RefertoLetto[], escludi: string[] = []): string {
  return referti
    .filter((r) => !escludi.includes(r.agent))
    .map((r) => {
      const findings = JSON.stringify(r.findings);
      return [
        `### Referto dell'agente ${nomeAgente(r.agent)} (fiducia ${r.confidence.toLowerCase()}, ${r.collectedAt.toISOString().slice(0, 10)})`,
        `Sintesi: ${r.summary}`,
        r.levers.length ? `Leve:\n${r.levers.map((l) => `- [${l.servizio}] ${l.testo} — prova: ${l.prova}`).join("\n")}` : "Leve: nessuna",
        r.evidence.length
          ? `Prove:\n${r.evidence.slice(0, 12).map((p) => `- ${p.cosa}${p.citazione ? ` — "${p.citazione}"` : ""} (${p.fonte})`).join("\n")}`
          : null,
        `Dati: ${findings.length > MAX_FINDINGS ? findings.slice(0, MAX_FINDINGS) + "…" : findings}`,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
}

/** Normalizza un testo per verificare che una citazione dell'AI sia davvero nel sito. */
export function normalizza(t: string): string {
  return t.toLowerCase().replace(/[“”"«»'’`]/g, "").replace(/\s+/g, " ").trim();
}

/**
 * La citazione è presente (alla lettera, a meno di spazi e virgolette) nel testo?
 * L'AI a volte unisce più voci con " / " o "…" (es. le voci di un menu): vale se ogni
 * pezzo è davvero nel testo.
 */
export function citazioneVera(citazione: string, testo: string): boolean {
  const t = normalizza(testo);
  const pezzi = citazione.split(/\s\/\s|\.\.\.|…/).map(normalizza).filter((p) => p.length >= 3);
  const totale = pezzi.join(" ").length;
  return totale >= 8 && pezzi.every((p) => t.includes(p));
}
