/**
 * PITCH DEDICATO PER CAPITOLO — "come giocartela qui"
 *
 * Alessio: "riesce a dirmi in questo capitolo devi mettere l'accento qui anziché lì?".
 * Il CRM sapeva già dire la COMPOSIZIONE di un capitolo (quante Casa/Microturismo/Persona);
 * questo modulo la trasforma in un pitch operativo: su che tema aprire, chi puntare nel
 * libero networking, e l'avviso se la tua categoria è già occupata.
 *
 * È euristica e volutamente breve: un promemoria da leggere prima di entrare in sala,
 * non un documento.
 */

import type { BuyerPersonaKey } from "@/lib/buyer-personas";

export interface ChapterPitchInput {
  personaMix: Partial<Record<string, number>>;
  competitorsCount: number;
  partnersCount: number;
  clientsCount: number;
  topTargets: Array<{
    name: string;
    memberRole: string | null;
    profession?: string | null;
    buyerPersona?: string | null;
  }>;
}

export interface ChapterPitch {
  headline: string;
  /** Su che tema aprire e con che gancio. */
  openingAngle: string;
  /** I nomi su cui concentrarsi, con il perché. */
  targets: Array<{ name: string; why: string }>;
  /** Avviso se ci sono concorrenti in aula. */
  competitorWarning: string | null;
  /** La persona dominante del capitolo (per l'icona in UI). */
  focus: BuyerPersonaKey | null;
}

const PERSONA_ANGLE: Record<BuyerPersonaKey, { headline: string; angle: string }> = {
  CASA: {
    headline: "Capitolo a vocazione Casa",
    angle:
      "Apri sul mondo della casa: qui si vive di ristrutturazioni, infissi, impianti, arredo. Il tuo gancio è come questi lavori si vendono meglio online — sito che converte, recensioni Google, farsi trovare quando qualcuno cerca in zona.",
  },
  MICROTURISMO: {
    headline: "Capitolo a vocazione Microturismo",
    angle:
      "Apri sull'ospitalità: qui contano prenotazioni e stagionalità. Il tuo gancio è la visibilità e le prenotazioni dirette — meno dipendenza dalle OTA, più sito, social e recensioni.",
  },
  PERSONA: {
    headline: "Capitolo a vocazione Persona",
    angle:
      "Apri sulla cura della persona: qui reputazione e recensioni locali fanno la differenza. Il tuo gancio è presenza online e passaparola digitale — chi cerca un professionista guarda prima Google e Instagram.",
  },
  ALTRO: {
    headline: "Capitolo eterogeneo",
    angle:
      "Nessuna vocazione netta: tieni il pitch generale sul portare più clienti col digitale, e personalizza in base a chi incroci nel libero networking.",
  },
};

const CORE: BuyerPersonaKey[] = ["CASA", "MICROTURISMO", "PERSONA"];

/** Persona dominante: quella con più membri fra le tre principali. */
function dominantPersona(mix: Partial<Record<string, number>>): BuyerPersonaKey | null {
  let best: { key: BuyerPersonaKey; n: number } | null = null;
  for (const k of CORE) {
    const n = mix[k] ?? 0;
    if (n > 0 && (!best || n > best.n)) best = { key: k, n };
  }
  return best?.key ?? null;
}

export function generateChapterPitch(input: ChapterPitchInput): ChapterPitch {
  const focus = dominantPersona(input.personaMix);
  const { headline, angle } = PERSONA_ANGLE[focus ?? "ALTRO"];

  // I nomi su cui puntare: prima i partner (ti portano clienti), poi i clienti forti.
  const targets = input.topTargets
    .filter((t) => t.memberRole === "PARTNER" || t.memberRole === "CLIENTE")
    .slice(0, 3)
    .map((t) => {
      const prof = t.profession ? ` (${t.profession})` : "";
      const why =
        t.memberRole === "PARTNER"
          ? `partner${prof}: coltiva il 121, è chi ti porta clienti`
          : `cliente potenziale${prof}: analizza il suo sito prima del 121`;
      return { name: t.name, why };
    });

  const competitorWarning =
    input.competitorsCount > 0
      ? `Attenzione: ${input.competitorsCount} concorrente${input.competitorsCount > 1 ? "i" : ""} in aula (web/social/SEO). La tua categoria è occupata: gioca sulla relazione e su ciò che fai di diverso, non sul "vi rifaccio il sito".`
      : null;

  return { headline, openingAngle: angle, targets, competitorWarning, focus };
}
