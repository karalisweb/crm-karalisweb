/**
 * Genera la checklist di verifica audit per Daniela.
 *
 * Ogni voce mostra:
 * - detectedValue: cosa ha rilevato il sistema (Sì/No)
 * - userValue: cosa ha verificato Daniela (Sì/No) — inizialmente null
 * - checked: true quando Daniela ha dato la sua risposta
 *
 * Daniela può CONFERMARE o CORREGGERE il risultato del sistema.
 * Es: sistema dice "No Analytics" → Daniela verifica e trova Analytics → clicca "Sì"
 *
 * Include campo note per osservazioni manuali.
 */

import type { AuditData, VerificationItem } from "@/types";
import type { CommercialSignals } from "@/types/commercial";

interface CheckCandidate {
  key: string;
  label: string;
  detectedValue: boolean;
  hint: string;
  priority: number;
}

export function generateVerificationChecklist(
  auditData: AuditData | null,
  _commercialSignals: CommercialSignals | null
): VerificationItem[] {
  if (!auditData) {
    return [
      {
        key: "sito_controllato",
        label: "Sito controllato",
        detectedValue: null,
        userValue: null,
        hint: "Apri il sito del lead. Funziona? Il contenuto corrisponde alla categoria? Non è vuoto o in costruzione?",
        checked: false,
      },
    ];
  }

  const tracking = auditData.tracking;
  const trust = auditData.trust;
  const content = auditData.content;
  const websiteAudit = auditData.website;

  const candidates: CheckCandidate[] = [];

  // === ANALYTICS ===
  const hasAnalytics = !!(tracking?.hasGA4 || tracking?.hasGoogleAnalytics);
  candidates.push({
    key: "analytics",
    label: "Google Analytics",
    detectedValue: hasAnalytics,
    hint: hasAnalytics
      ? "Tag Assistant deve mostrare un tag GA/GA4 con icona verde."
      : "Sorgente pagina → Cerca 'gtag', 'analytics' o 'G-'.",
    priority: 1,
  });

  // === FACEBOOK PIXEL ===
  const hasPixel = !!tracking?.hasFacebookPixel;
  candidates.push({
    key: "pixel_meta",
    label: "Pixel Meta / Facebook",
    detectedValue: hasPixel,
    hint: hasPixel
      ? "Meta Pixel Helper deve diventare blu con un numero."
      : "Meta Pixel Helper: se resta grigia, non c'è.",
    priority: 2,
  });

  // === GOOGLE ADS ===
  const hasGAds = !!tracking?.hasGoogleAdsTag;
  candidates.push({
    key: "google_ads",
    label: "Google Ads Tag",
    detectedValue: hasGAds,
    hint: hasGAds
      ? "Nel sorgente cerca 'AW-' o 'googleads'."
      : "Nel sorgente cerca 'AW-' o 'googleads'.",
    priority: 3,
  });

  // === COOKIE BANNER ===
  const hasCookie = !!trust?.hasCookieBanner;
  candidates.push({
    key: "cookie_banner",
    label: "Cookie Banner GDPR",
    detectedValue: hasCookie,
    hint: "Apri il sito in finestra anonima (Ctrl+Shift+N). Appare un banner cookie?",
    priority: 4,
  });

  // === FORM CONTATTO ===
  const hasForm = !!websiteAudit?.hasContactForm;
  candidates.push({
    key: "form_contatto",
    label: "Form di contatto",
    detectedValue: hasForm,
    hint: "Controlla home e pagina Contatti. C'è un modulo compilabile?",
    priority: 5,
  });

  // === BLOG ===
  const hasBlog = !!content?.hasBlog;
  candidates.push({
    key: "blog",
    label: "Blog / News",
    detectedValue: hasBlog,
    hint: "Cerca nel menu Blog, News o Articoli. Esiste con contenuti?",
    priority: 6,
  });

  // Ordina per priorità e prendi i primi 5
  candidates.sort((a, b) => a.priority - b.priority);
  const selected = candidates.slice(0, 5);

  // Converti in VerificationItem
  const items: VerificationItem[] = selected.map((c) => ({
    key: c.key,
    label: c.label,
    detectedValue: c.detectedValue,
    userValue: null,
    hint: c.hint,
    checked: false,
  }));

  // Aggiungi sempre "Sito controllato" come ultima voce
  items.push({
    key: "sito_controllato",
    label: "Sito controllato",
    detectedValue: null,
    userValue: null,
    hint: "Il sito funziona? Il contenuto corrisponde alla categoria? Non è vuoto o in costruzione?",
    checked: false,
  });

  return items;
}
