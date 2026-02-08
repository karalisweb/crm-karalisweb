/**
 * Genera la checklist di verifica audit per Daniela.
 * Ogni voce ha:
 * - label: cosa confermare
 * - hint: istruzioni pratiche per verificare
 * - checked: stato (inizialmente false)
 *
 * Le voci sono dinamiche: dipendono da cosa ha trovato l'audit.
 * Max 4 voci per tenere la verifica veloce (< 60 secondi).
 */

import type { AuditData, VerificationItem } from "@/types";
import type { CommercialSignals } from "@/types/commercial";

interface CheckCandidate {
  key: string;
  label: string;
  hint: string;
  priority: number; // più basso = più importante
}

export function generateVerificationChecklist(
  auditData: AuditData | null,
  commercialSignals: CommercialSignals | null
): VerificationItem[] {
  const candidates: CheckCandidate[] = [];

  if (!auditData) {
    // Se non c'è audit, solo check sito
    return [
      {
        key: "sito_controllato",
        label: "Sito controllato",
        hint: "Apri il sito del lead. Funziona? Il contenuto corrisponde alla categoria? Non è vuoto o in costruzione?",
        checked: false,
      },
    ];
  }

  const tracking = auditData.tracking;
  const trust = auditData.trust;

  // === ANALYTICS ===
  if (!tracking?.hasGA4 && !tracking?.hasGoogleAnalytics) {
    candidates.push({
      key: "no_analytics",
      label: "Confermo no Analytics",
      hint: "Apri il sito → tasto destro → 'Visualizza sorgente pagina' → Cerca (Ctrl+F) 'gtag' o 'analytics' o 'G-'. Se non trovi niente, è confermato. Se trovi 'GTM-', Analytics potrebbe essere dentro Tag Manager (vedi Guida).",
      priority: 1,
    });
  } else {
    candidates.push({
      key: "analytics_presente",
      label: "Confermo Analytics presente",
      hint: "Apri il sito con Tag Assistant attivo (estensione Chrome). Deve mostrare un tag Google Analytics o GA4 con icona verde. Se non lo hai, vedi la Guida per installarlo.",
      priority: 5,
    });
  }

  // === FACEBOOK PIXEL ===
  if (!tracking?.hasFacebookPixel) {
    candidates.push({
      key: "no_pixel_meta",
      label: "Confermo no Pixel Meta",
      hint: "Installa l'estensione 'Meta Pixel Helper' (vedi Guida). Apri il sito: se l'icona dell'estensione resta grigia, non c'è il pixel. Se diventa blu con un numero, c'è.",
      priority: 2,
    });
  } else {
    candidates.push({
      key: "pixel_meta_presente",
      label: "Confermo Pixel Meta presente",
      hint: "Apri il sito con Meta Pixel Helper attivo. L'icona deve diventare blu con un numero dentro.",
      priority: 6,
    });
  }

  // === GOOGLE ADS ===
  if (!tracking?.hasGoogleAdsTag) {
    candidates.push({
      key: "no_google_ads",
      label: "Confermo no Google Ads",
      hint: "Nel sorgente pagina (tasto destro → Visualizza sorgente) cerca 'AW-' o 'googleads'. Se non trovi niente, confermato. Se c'è GTM, il tag Ads potrebbe essere dentro (vedi Guida).",
      priority: 3,
    });
  }

  // === COOKIE BANNER ===
  if (!trust?.hasCookieBanner) {
    candidates.push({
      key: "no_cookie_banner",
      label: "Confermo no Cookie Banner",
      hint: "Apri il sito in una finestra anonima (Ctrl+Shift+N). Se alla prima visita NON appare nessun banner/popup sui cookie, è confermato.",
      priority: 4,
    });
  }

  // === FORM CONTATTO ===
  const websiteAudit = auditData.website;
  if (!websiteAudit?.hasContactForm) {
    candidates.push({
      key: "no_form_contatto",
      label: "Confermo no Form Contatto",
      hint: "Naviga il sito: controlla la home e la pagina 'Contatti' (se c'è). Se non c'è nessun modulo da compilare (nome, email, messaggio), è confermato.",
      priority: 7,
    });
  }

  // Ordina per priorità e prendi i primi 3
  candidates.sort((a, b) => a.priority - b.priority);
  const selected = candidates.slice(0, 3);

  // Converti in VerificationItem
  const items: VerificationItem[] = selected.map((c) => ({
    key: c.key,
    label: c.label,
    hint: c.hint,
    checked: false,
  }));

  // Aggiungi sempre "Sito controllato" come ultima voce
  items.push({
    key: "sito_controllato",
    label: "Sito controllato",
    hint: "Hai aperto il sito? Funziona e si carica? Il contenuto corrisponde alla categoria (es. se dice 'impresa edile', è davvero un'impresa edile)? Non è un sito vuoto, in costruzione, o una pagina di parcheggio?",
    checked: false,
  });

  return items;
}
