/**
 * Commercial Tagger
 * Assegna UN SOLO tag commerciale a ogni prospect
 * Basato sui 5 segnali rilevati
 *
 * LOGICA AGGIORNATA:
 * - GTM/tracking presente = potenziale cliente (non scartare)
 * - DA_APPROFONDIRE per casi ambigui
 * - NON_TARGET solo se veramente nessun segnale
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
 * Verifica se c'e' potenziale (weak evidence o tracking presente)
 */
function hasPotential(adsEvidence: AdsEvidenceLevel, trackingPresent: boolean): boolean {
  return adsEvidence === "weak" || trackingPresent;
}

/**
 * Assegna il tag commerciale basato sui segnali
 *
 * Logica di priorita':
 * 1. ADS_ATTIVE_CONTROLLO_ASSENTE - Spendono ma non misurano (URGENTE)
 * 2. TRAFFICO_SENZA_DIREZIONE - Traffico ma CTA assente
 * 3. STRUTTURA_OK_NON_PRIORITIZZATA - Tutto OK ma non ottimizzato
 * 3. DA_APPROFONDIRE - Ha infrastruttura (GTM/tracking) ma non chiaro se fa ads
 * 4. NON_TARGET - Nessun segnale di investimento digitale
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

  // === PRIORITÀ 1: Ads attive ma tracking assente ===
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

  // === PRIORITÀ 2: Ads attive ma CTA non chiara ===
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

  // === PRIORITÀ 3A: Ads attive ma offerta non focalizzata ===
  if (hasActiveAds(adsEvidence) && !offerFocused) {
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

  // === PRIORITÀ 3B: Ads WEAK - hanno segnali ma deboli ===
  if (adsEvidence === "weak") {
    // Weak + tracking ok + CTA ok = DA APPROFONDIRE (non scartare!)
    // Potrebbero aver fatto ads in passato o usare GTM per altri scopi
    if (trackingPresent && ctaClear) {
      return {
        tag: "DA_APPROFONDIRE",
        tagReason: buildTagReason({
          mainIssue: "Infrastruttura presente, verificare se fanno o hanno fatto advertising",
          adsEvidence: adsEvidenceReason,
          details: [
            "Hanno GTM/tracking configurato - segno di maturita' digitale",
            "Potrebbero aver fatto campagne in passato",
            "Da verificare in chiamata: investono in advertising?",
          ],
        }),
        signals,
        isCallable: true, // SI, chiamabile!
        priority: 3,
      };
    }

    // Weak + no tracking = potenziale problema grave
    if (!trackingPresent) {
      return {
        tag: "ADS_ATTIVE_CONTROLLO_ASSENTE",
        tagReason: buildTagReason({
          mainIssue: "Segnali di ads ma tracking completamente assente",
          adsEvidence: adsEvidenceReason,
          details: ["Se fanno ads senza tracking, stanno sprecando budget"],
        }),
        signals,
        isCallable: true,
        priority: 1,
      };
    }

    // Weak + tracking ok + no CTA
    return {
      tag: "TRAFFICO_SENZA_DIREZIONE",
      tagReason: buildTagReason({
        mainIssue: "Segnali di ads con problemi di conversione",
        adsEvidence: adsEvidenceReason,
        details: ["CTA non chiare, il traffico non converte"],
      }),
      signals,
      isCallable: true,
      priority: 2,
    };
  }

  // === PRIORITÀ 3C: Nessuna evidenza ads MA tracking presente ===
  // Questo e' il FIX CRITICO: non scartare chi ha GTM/GA
  if (adsEvidence === "none" && trackingPresent) {
    return {
      tag: "DA_APPROFONDIRE",
      tagReason: buildTagReason({
        mainIssue: "Hanno tracking/GTM ma nessuna evidenza di ads attive",
        adsEvidence: adsEvidenceReason,
        details: [
          "L'infrastruttura c'e' - potrebbero aver fatto ads in passato",
          "Oppure usano GTM solo per analytics",
          "Da verificare in chiamata: investono in advertising?",
        ],
      }),
      signals,
      isCallable: true, // SI, chiamabile!
      priority: 3,
    };
  }

  // === PRIORITÀ 4: Nessuna evidenza e nessun tracking ===
  // Solo qui e' veramente NON_TARGET
  if (adsEvidence === "none" && !trackingPresent) {
    // Ma se hanno CTA chiare e offerta focalizzata, potrebbero essere interessanti
    if (ctaClear && offerFocused) {
      return {
        tag: "DA_APPROFONDIRE",
        tagReason: buildTagReason({
          mainIssue: "Sito strutturato ma nessun investimento in digital marketing rilevato",
          adsEvidence: adsEvidenceReason,
          details: [
            "Nessun tracking o ads rilevato",
            "Ma il sito ha CTA chiare e offerta definita",
            "Potrebbero essere pronti a iniziare",
          ],
        }),
        signals,
        isCallable: true, // Potenziale cliente che non ha ancora iniziato
        priority: 3,
      };
    }

    // Veramente niente
    return {
      tag: "NON_TARGET",
      tagReason: buildTagReason({
        mainIssue: "Nessuna evidenza di investimento in marketing digitale",
        adsEvidence: adsEvidenceReason,
        details: [
          "Nessun tracking installato",
          "Nessuna evidenza di advertising",
          "Probabilmente non investono in digital",
        ],
      }),
      signals,
      isCallable: false,
      priority: 4,
    };
  }

  // === FALLBACK: Ads attive + tracking + CTA + offerta = tutto ok ===
  return {
    tag: "STRUTTURA_OK_NON_PRIORITIZZATA",
    tagReason: buildTagReason({
      mainIssue: "Struttura completa, verificare margini di ottimizzazione",
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
