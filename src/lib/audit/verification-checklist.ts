/**
 * Genera la checklist di verifica audit per Daniela.
 * Ogni voce mostra lo stato rilevato dall'audit (Sì/No) e chiede conferma.
 * Include un campo note per osservazioni manuali.
 *
 * Le voci coprono le aree principali dell'audit.
 * Max 6 voci per tenere la verifica gestibile.
 */

import type { AuditData, VerificationItem } from "@/types";
import type { CommercialSignals } from "@/types/commercial";

interface CheckCandidate {
  key: string;
  label: string;
  detectedValue: boolean; // Cosa ha trovato l'audit (true = presente)
  hint: string;
  priority: number; // più basso = più importante
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
        hint: "Apri il sito del lead. Funziona? Il contenuto corrisponde alla categoria? Non è vuoto o in costruzione?",
        checked: false,
      },
    ];
  }

  const tracking = auditData.tracking;
  const trust = auditData.trust;
  const seo = auditData.seo;
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
      ? "Apri il sito con Tag Assistant attivo. Deve mostrare un tag Google Analytics o GA4."
      : "Sorgente pagina → Cerca 'gtag' o 'analytics' o 'G-'. Se non trovi niente, conferma No.",
    priority: 1,
  });

  // === FACEBOOK PIXEL ===
  const hasPixel = !!tracking?.hasFacebookPixel;
  candidates.push({
    key: "pixel_meta",
    label: "Pixel Meta / Facebook",
    detectedValue: hasPixel,
    hint: hasPixel
      ? "Apri il sito con Meta Pixel Helper attivo. L'icona deve diventare blu con un numero."
      : "Installa Meta Pixel Helper. Se l'icona resta grigia, conferma No.",
    priority: 2,
  });

  // === GOOGLE ADS ===
  const hasGAds = !!tracking?.hasGoogleAdsTag;
  candidates.push({
    key: "google_ads",
    label: "Google Ads Tag",
    detectedValue: hasGAds,
    hint: hasGAds
      ? "Nel sorgente pagina cerca 'AW-' o 'googleads'. Deve essere presente."
      : "Nel sorgente pagina cerca 'AW-' o 'googleads'. Se non trovi niente, conferma No.",
    priority: 3,
  });

  // === COOKIE BANNER ===
  const hasCookie = !!trust?.hasCookieBanner;
  candidates.push({
    key: "cookie_banner",
    label: "Cookie Banner GDPR",
    detectedValue: hasCookie,
    hint: hasCookie
      ? "Apri il sito in finestra anonima. Deve apparire un banner/popup sui cookie."
      : "Apri il sito in finestra anonima (Ctrl+Shift+N). Se NON appare nessun banner cookie, conferma No.",
    priority: 4,
  });

  // === FORM CONTATTO ===
  const hasForm = !!websiteAudit?.hasContactForm;
  candidates.push({
    key: "form_contatto",
    label: "Form di contatto",
    detectedValue: hasForm,
    hint: hasForm
      ? "Controlla home e pagina Contatti. Deve esserci un modulo compilabile."
      : "Naviga home e pagina Contatti. Se non c'è nessun modulo (nome, email, messaggio), conferma No.",
    priority: 5,
  });

  // === BLOG ===
  const hasBlog = !!content?.hasBlog;
  candidates.push({
    key: "blog",
    label: "Blog / News",
    detectedValue: hasBlog,
    hint: hasBlog
      ? "Cerca nel menu una sezione Blog, News o Articoli. Deve esistere con contenuti."
      : "Cerca nel menu Blog, News, Articoli. Se non esiste, conferma No.",
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
    hint: c.hint,
    checked: false,
  }));

  // Aggiungi sempre "Sito controllato" come ultima voce
  items.push({
    key: "sito_controllato",
    label: "Sito controllato",
    detectedValue: null,
    hint: "Hai aperto il sito? Funziona e si carica? Il contenuto corrisponde alla categoria? Non è un sito vuoto, in costruzione, o una pagina di parcheggio?",
    checked: false,
  });

  return items;
}
