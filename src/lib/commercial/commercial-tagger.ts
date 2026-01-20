/**
 * Commercial Tagger
 * Assegna UN SOLO tag commerciale a ogni prospect
 * Basato sui 5 segnali rilevati
 */

import type {
  CommercialSignals,
  CommercialTag,
  CommercialTagResult,
  AdsEvidenceLevel,
} from "@/types/commercial";
import { TAG_PRIORITY } from "@/types/commercial";

interface TaggingInput {
  signals: CommercialSignals;
}

/**
 * Verifica se l'azienda ha evidenza di ads attive
 */
function hasActiveAds(adsEvidence: AdsEvidenceLevel): boolean {
  return adsEvidence === "strong" || adsEvidence === "medium";
}

/**
 * Assegna il tag commerciale basato sui segnali
 *
 * Logica di priorita':
 * 1. ADS_ATTIVE_CONTROLLO_ASSENTE - Spendono ma non misurano (URGENTE)
 * 2. TRAFFICO_SENZA_DIREZIONE - Traffico ma CTA assente
 * 3. STRUTTURA_OK_NON_PRIORITIZZATA - Tutto OK ma non ottimizzato
 * 4. NON_TARGET - Non spendono in ads
 */
export function assignCommercialTag(input: TaggingInput): CommercialTagResult {
  const { signals } = input;
  const {
    adsEvidence,
    adsEvidenceReason,
    trackingPresent,
    ctaClear,
    offerFocused,
    consentModeV2,
  } = signals;

  // REGOLA 1: Se nessuna evidenza ads -> NON_TARGET
  if (adsEvidence === "none") {
    return {
      tag: "NON_TARGET",
      tagReason: `Nessuna evidenza di advertising attivo. ${adsEvidenceReason}`,
      signals,
      isCallable: false,
      priority: 4,
    };
  }

  // Da qui in poi: adsEvidence = strong | medium | weak

  // REGOLA 2: Ads attive ma tracking assente -> CONTROLLO_ASSENTE (PRIORITA 1)
  // Questo e' il caso peggiore: spendono soldi ma non sanno cosa funziona
  if (hasActiveAds(adsEvidence) && !trackingPresent) {
    return {
      tag: "ADS_ATTIVE_CONTROLLO_ASSENTE",
      tagReason: buildTagReason({
        mainIssue: "Stanno investendo in ads ma non hanno tracking per misurare i risultati",
        adsEvidence: adsEvidenceReason,
        details: [
          "Nessun Google Analytics o Tag Manager rilevato",
          "Stanno letteralmente bruciando soldi senza sapere cosa funziona",
        ],
      }),
      signals,
      isCallable: true,
      priority: 1,
    };
  }

  // REGOLA 3: Ads attive ma CTA non chiara -> TRAFFICO_SENZA_DIREZIONE (PRIORITA 2)
  // Portano traffico ma non lo convertono
  if (hasActiveAds(adsEvidence) && !ctaClear) {
    return {
      tag: "TRAFFICO_SENZA_DIREZIONE",
      tagReason: buildTagReason({
        mainIssue: "Portano traffico al sito ma mancano CTA chiare per convertire",
        adsEvidence: adsEvidenceReason,
        details: [
          "Mancano form di contatto, telefono cliccabile o WhatsApp",
          "Il traffico che pagano se ne va senza lasciare traccia",
        ],
      }),
      signals,
      isCallable: true,
      priority: 2,
    };
  }

  // REGOLA 4: Ads attive ma offerta non focalizzata -> STRUTTURA_OK_NON_PRIORITIZZATA (PRIORITA 3)
  // Hanno tutto ma il messaggio e' generico
  if (hasActiveAds(adsEvidence) && !offerFocused) {
    // Aggiungi warning se manca Consent Mode V2 (compliance issue)
    const complianceWarning =
      consentModeV2 === "no"
        ? "Inoltre, manca Consent Mode V2 (richiesto da Google da Marzo 2024)"
        : "";

    return {
      tag: "STRUTTURA_OK_NON_PRIORITIZZATA",
      tagReason: buildTagReason({
        mainIssue: "La struttura tecnica c'e' ma l'offerta non e' focalizzata",
        adsEvidence: adsEvidenceReason,
        details: [
          "Il sito non comunica chiaramente cosa offrono e a che prezzo",
          "Messaggio troppo generico per convertire efficacemente",
          ...(complianceWarning ? [complianceWarning] : []),
        ],
      }),
      signals,
      isCallable: true,
      priority: 3,
    };
  }

  // REGOLA 5: Ads WEAK senza altri problemi evidenti -> valuta caso per caso
  if (adsEvidence === "weak") {
    // Se tracking presente e CTA ok, probabilmente fanno poco adv
    if (trackingPresent && ctaClear) {
      return {
        tag: "NON_TARGET",
        tagReason: `Segnali ads deboli (${adsEvidenceReason}). Probabilmente non investono significativamente in advertising.`,
        signals,
        isCallable: false,
        priority: 4,
      };
    }

    // Se manca qualcosa, c'e' potenziale
    if (!trackingPresent) {
      return {
        tag: "ADS_ATTIVE_CONTROLLO_ASSENTE",
        tagReason: buildTagReason({
          mainIssue: "Segnali di ads (deboli) ma tracking completamente assente",
          adsEvidence: adsEvidenceReason,
          details: ["Da verificare se fanno realmente advertising"],
        }),
        signals,
        isCallable: true,
        priority: 1, // Priorita' alta perche' se fanno ads senza tracking e' grave
      };
    }

    return {
      tag: "TRAFFICO_SENZA_DIREZIONE",
      tagReason: buildTagReason({
        mainIssue: "Segnali di ads (deboli) con problemi di conversione",
        adsEvidence: adsEvidenceReason,
        details: ["CTA non chiare o offerta generica"],
      }),
      signals,
      isCallable: true,
      priority: 2,
    };
  }

  // FALLBACK: Se siamo arrivati qui, qualcosa non torna
  // Ads attive + tracking + CTA + offerta = tutto ok?
  // In teoria non dovremmo mai arrivare qui, ma gestiamo il caso
  return {
    tag: "STRUTTURA_OK_NON_PRIORITIZZATA",
    tagReason: buildTagReason({
      mainIssue: "Struttura apparentemente completa, verificare margini di ottimizzazione",
      adsEvidence: adsEvidenceReason,
      details: [
        `Tracking: ${trackingPresent ? "OK" : "MANCANTE"}`,
        `CTA: ${ctaClear ? "OK" : "DA MIGLIORARE"}`,
        `Offerta: ${offerFocused ? "FOCALIZZATA" : "GENERICA"}`,
        `Consent Mode V2: ${consentModeV2}`,
      ],
    }),
    signals,
    isCallable: true,
    priority: 3,
  };
}

/**
 * Helper per costruire la ragione del tag in modo strutturato
 */
function buildTagReason(input: {
  mainIssue: string;
  adsEvidence: string;
  details: string[];
}): string {
  const parts = [
    input.mainIssue,
    `Evidenza ads: ${input.adsEvidence}`,
    ...input.details,
  ];
  return parts.join(". ");
}

/**
 * Ordina i lead per priorita' commerciale
 * Usato per la dashboard "Chiamabili oggi"
 */
export function sortByCommercialPriority<T extends { commercialTag?: CommercialTag | null }>(
  leads: T[]
): T[] {
  return [...leads].sort((a, b) => {
    const priorityA = a.commercialTag ? TAG_PRIORITY[a.commercialTag] : 99;
    const priorityB = b.commercialTag ? TAG_PRIORITY[b.commercialTag] : 99;
    return priorityA - priorityB;
  });
}

/**
 * Filtra solo i lead chiamabili (tag != NON_TARGET)
 */
export function filterCallableLeads<T extends { commercialTag?: CommercialTag | null }>(
  leads: T[]
): T[] {
  return leads.filter((lead) => lead.commercialTag && lead.commercialTag !== "NON_TARGET");
}
