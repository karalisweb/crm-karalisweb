# Changelog - KW Sales CRM

Tutte le modifiche rilevanti al progetto sono documentate in questo file.

---

## [3.0.0] - 2026-03-15

### Pulizia e semplificazione

- **Rimosse 14 pagine orfane**: appuntamenti, audit, clienti-msd, da-chiamare, da-qualificare, da-verificare, dashboard, offerte, oggi, parcheggiati, proposte, qualificati, risposto, video-da-fare
- **Rimosso PageSpeed Insights**: servizio non usato, codice e UI eliminati
- **Rimosso DataForSEO**: servizio non usato, codice e UI eliminati
- **Rimossa cartella qualification/**: codice morto, mai usato esternamente
- **Rimosso concetto "qualifica"**: il termine non esiste piu. Il flusso e: Analisi Gemini → Score → HOT/WARM
- **Sidebar pulita**: 18 link, tutti funzionanti, nessuna pagina orfana

### Nuove funzionalita

- **WhatsApp estrazione attiva**: il sistema estrae il numero WhatsApp da wa.me/ e api.whatsapp.com. Fallback su telefono Google Maps con normalizzazione italiana (+39)
- **WhatsApp in UI**: numero mostrato nel dettaglio lead con badge "dal sito" / "da Google Maps" / "da verificare" e link diretto per aprire chat WhatsApp
- **Campi DB nuovi**: `whatsapp_number`, `whatsapp_source`

### Fix

- **Docker build**: aggiunto `rm -rf .next` nel Dockerfile per evitare cache stale
- **Link interni corretti**: /audit → /da-analizzare, /parcheggiati → /senza-sito
- **CHANGELOG pulito**: rimossi tutti i duplicati accumulati

### Stack attuale

- Next.js 16.1.1, TypeScript, Prisma 7.2, PostgreSQL
- Servizi: Apify (scraping), Gemini AI (analisi + script video)
- Deploy: Docker su VPS Contabo

---

## [2.7.0] - 2026-03-14

### Aggiunto - Ads Intelligence Engine (100% Apify)
- **Ads Intelligence Engine v4**: Motore unificato Google Ads + Meta Ads via Apify
- **Google Ads check**: Via `apify/google-search-scraper`
- **Meta Ads check**: Via `curious_coder/facebook-ads-library-scraper` con fallback
- **Landing Page scraper**: Cheerio estrae testo LP degli annunci
- **7 nuovi campi DB**: hasActiveGoogleAds, hasActiveMetaAds, googleAdsCopy, metaAdsCopy, landingPageUrl, landingPageText, adsCheckedAt
- **Gemini Prompt v3**: Atto 3 analizza incoerenza annuncio/landing page
- **UI Ads Intelligence**: Box verde, bottone Check Ads, risultati live, bottoni fallback manuali
- **Video tracking**: Token unico per lead, endpoint pubblico, notifiche real-time, badge VISTO

---

## [2.6.0] - 2026-03-14

- Refactoring: sostituito audit tecnico con Analisi Strategica + Teleprompter Mode. Eliminato codice morto (17 file).

---

## [2.5.1] - 2026-03-13

- UI: problemi critici in anteprima lead + bottoni Talking Points e Analisi AI + deep link tab

---

## [2.5.0] - 2026-03-13

- Rimozione Inngest: sostituito con cron API + p-queue per job in background

---

## [2.4.1] - 2026-03-11

- Dashboard ridisegnata: KPI aggregati, pipeline funnel, attivita settimanale, report commerciale

---

## [2.4.0] - 2026-03-11

- Auto-Gemini dopo audit + Sidebar redesign per workflow

---

## [2.3.0] - 2026-03-11

### Aggiunto - Qualifica Automatica & Gemini AI
- Punteggio 0-100 basato su sito + ads attive
- Gemini AI Analysis: analisi marketing con AI generativa
- Filtro URL social: lead con URL social come "website" spostati in SENZA_SITO
- Ricerche programmate notturne

---

## [2.2.0] - 2026-02-22

### Aggiunto - UI/UX Overhaul
- Cmd+K Command Palette, Sidebar collassabile, Dashboard animata
- Score Ring, Audit Radar Chart, Semafori audit
- Calendario appuntamenti, PDF Report Audit
- Breadcrumb navigation, Date utils

---

## [2.1.0] - 2026-02-16

- CHANGELOG.md e GUIDA_UTENTE.md aggiunti
- README.md aggiornato

---

## [2.0.0] - 2026-02-08

- Design System Karalisweb completo
- Script deploy.sh con 7 step automatizzati
- Pagina guida in-app

---

## [1.9.0] - 2026-01-27

- Pipeline MSD completa con nuovi stati e pagine dedicate
- Impostazioni CRM configurabili

---

## [1.8.0] - 2026-01-22

- 2FA con OTP, password reset, RBAC

---

## [1.7.0] - 2026-01-21

- Sync audit, script CLI per audit batch

---

## [1.6.0] - 2026-01-20

- Sistema commerciale 5 chiamate/giorno

---

## [1.5.0] - 2026-01-19

- Infinite scroll, pagina dettaglio ricerca, audit automatico

---

## [1.4.0] - 2026-01-16

- Integrazione PageSpeed Insights API (poi rimossa in v3.0)

---

## [1.3.0] - 2026-01-15

- UI mobile-first con branding Karalisweb, tema dark

---

## [1.2.0] - 2026-01-14

- Setup CRM iniziale, Apify mock mode, Docker, NextAuth v5

---

## [1.0.0] - 2026-01-13

- Progetto iniziale Next.js 16 + TypeScript + Tailwind CSS 4
