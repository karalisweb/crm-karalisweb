# Changelog - KW Sales CRM

Tutte le modifiche rilevanti al progetto sono documentate in questo file.

---

## [3.7.0] - 2026-03-24

### Catena 2 Prompt con Gate Manuali (Major Feature)

Il sistema di analisi AI e generazione script video e stato completamente ridisegnato. Il vecchio prompt singolo (che analizzava il sito E generava lo script, spesso inventando dati) e stato sostituito da una catena a 2 prompt con validazione manuale obbligatoria tra ogni passaggio.

#### Nuovo Flusso (5 Step con Gate)

```
Step 1: Analisi Sito (Prompt 1 "Analista") -> Approva/Modifica/Rigenera
Step 2: Script Video (Prompt 2 "Sceneggiatore") -> Approva/Modifica/Rigenera
Step 3: YouTube URL
Step 4: Landing Page
Step 5: Invio WhatsApp/Email
```

Ogni step **blocca** il successivo finche non completato. Nessuna scorciatoia.

#### Prompt 1 "Analista"
- Ri-scrapa il sito (HTML fresco, non dati cache)
- Analizza brand positioning, cliche, pain points con citazioni ESATTE
- Genera automaticamente **punto di dolore breve** (per WA) e **lungo** (per landing page)
- Output strutturato con severity per ogni pain point

#### Prompt 2 "Sceneggiatore"
- Riceve SOLO l'output approvato del Prompt 1 (non inventa nulla)
- Genera script video a 4 atti (Ghiaccio, Crimine, Soldi, Soluzione)
- Alimenta il problema con metafora, toglie le colpe, presenta la soluzione

#### Editor Prompt nelle Impostazioni
- **Impostazioni > AI**: 2 nuovi editor per Prompt 1 e Prompt 2
- **Pill cliccabili**: inseriscono placeholder (`{{home_text}}`, `{{analyst_output}}`, ecc.) alla posizione del cursore
- **Ripristina Default**: per tornare al prompt originale
- I prompt vecchi (Legacy v3.1) restano disponibili per backward compatibility

#### Stepper Video Outreach (Lead Detail)
- **Nuovo tab "Video Outreach"** nella pagina dettaglio lead
- Stepper verticale a 5 step con stati: bloccato (grigio + lucchetto), attivo (blu + ring), completato (verde + check)
- Ogni step espandibile con contenuto specifico e azioni
- Step 1-2: bottoni Approva / Modifica / Rigenera + Note
- Step 3: input YouTube URL
- Step 4: anteprima punto di dolore + creazione landing
- Step 5: selezione canale WA/Email + invio

#### Pagina Fare Video Rinnovata
- Ogni lead mostra **5 pallini di progresso** (step 1-5)
- Badge "X/5" con step corrente
- Ordinamento: lead con meno step completati in cima
- Click su card apre direttamente il tab Video Outreach

### Nuovi Campi Database (Lead)
- `analystOutput` (Json) — output Prompt 1
- `analystApprovedAt` / `analystApprovedBy` — approvazione Step 1
- `scriptApprovedAt` / `scriptApprovedBy` — approvazione Step 2
- `puntoDoloreBreve` (Text) — versione breve per WhatsApp
- `puntoDoloreLungo` (Text) — versione lunga per landing page

### Nuovi Campi Database (Settings)
- `analystPrompt` (Text) — prompt personalizzato Analista
- `scriptwriterPrompt` (Text) — prompt personalizzato Sceneggiatore

### Nuove API Routes
- `POST /api/leads/[id]/run-analyst` — esegue Prompt 1
- `POST /api/leads/[id]/approve-analyst` — approva/modifica output Prompt 1
- `POST /api/leads/[id]/run-scriptwriter` — esegue Prompt 2 (gate: Step 1 approvato)
- `POST /api/leads/[id]/approve-script` — approva/modifica script (gate: Step 1 approvato)

### Modifiche a Route Esistenti
- `POST /api/leads/[id]/create-landing` — gate check: richiede `scriptApprovedAt`, usa `puntoDoloreLungo`
- `GET/PUT /api/settings/crm` — supporta `analystPrompt` e `scriptwriterPrompt`

### Nuovi File
- `src/lib/prompts-v2.ts` — prompt default + placeholder definitions
- `src/lib/gemini-analyst.ts` — funzione Prompt 1
- `src/lib/gemini-scriptwriter.ts` — funzione Prompt 2
- `src/components/settings/prompt-editor.tsx` — editor con pill cliccabili
- `src/components/leads/video-outreach-stepper.tsx` — stepper a 5 step
- `src/components/leads/video-outreach-stepper-wrapper.tsx` — wrapper client-side

### Backward Compatibility
- Lead gia processati con il vecchio flusso continuano a funzionare
- Tab "Analisi Strategica" resta visibile per reference
- Il campo `geminiAnalysis` e riusato dal Prompt 2 (stesso formato)
- I prompt Legacy v3.1 sono ancora configurabili nelle impostazioni

---

## [3.6.0] - 2026-03-15

### Ads — Solo Verifica Manuale (Breaking Change)

- **RIMOSSO completamente**: check automatico Ads via Apify (`ads-intelligence.ts` → `saveAdsResultsToDB` disabilitato)
- **NUOVO campo DB**: `adsVerifiedManually` (Boolean) — unica fonte di verità per le ads
- **Regola**: Solo i click manuali SI/NO determinano se le ads esistono. Nessun suggerimento automatico, nessun fallback da JSON
- **Score +20 Ads**: assegnato SOLO se `adsVerifiedManually = true` E almeno un canale attivo
- **Tutti e 7 gli endpoint scoring** aggiornati per usare `adsVerifiedManually` invece di `adsCheckedAt`
- **"Passa a Video"** bloccato finché Google Ads E Meta Ads non sono verificati manualmente (SI o NO)
- **Reset globale**: eseguito `UPDATE leads SET ads_verified_manually = false` + recalc (37 score cambiati, 29 stage cambiati)

### Script Tella Tracking

- **NUOVO campo DB**: `scriptRegeneratedAt` (DateTime) — timestamp di quando lo script viene rigenerato in FARE_VIDEO
- **Badge verde** "Script Tella generato" visibile sia a card aperta che chiusa nella variante video
- **API**: `POST /api/leads/[id]/gemini-analysis` setta `scriptRegeneratedAt` quando il lead è in FARE_VIDEO

### Sidebar Badge X/Y per Fare Video

- **NUOVO**: il badge di Fare Video nella sidebar mostra **X/Y** (X = script Tella generati, Y = totale video da fare)
- **API**: `GET /api/dashboard/mission` ritorna anche `fareVideoReady` (count lead FARE_VIDEO con scriptRegeneratedAt)
- **Sidebar speciale**: per `fareVideo` il badge mostra `${fareVideoReady}/${fareVideo}` invece del semplice conteggio

### Aggiornamento Badge Sidebar in Tempo Reale

- **NUOVO**: i badge sidebar si aggiornano istantaneamente senza ricaricare la pagina
- **Architettura**: badges spostati da stato locale `Sidebar` al `SidebarContext` (provider globale)
- **`refreshBadges()`** esposto nel context e chiamato automaticamente su:
  - Rigenerazione script Tella
  - "Passa a Video"
  - "Video Inviato"
  - "Non Target"
- Polling ogni 60s come backup

### Card Layout Migliorato

- **Card chiusa** mostra 4 righe: dati (Segnali/Google/Meta/Sindrome/Pixel), score pills, tier selector, "Passa a Video" o badge script
- **"Passa a Video"** visibile anche a card chiusa quando il lead è completamente verificato
- **`ScoreBreakdownPills`** e **`TierSelector`** separati per layout flessibile

---

## [3.5.0] - 2026-03-15

### Pipeline Flow v3.5 — "Tu decidi se fare il video"

- **CAMBIATO**: Score ≥80 ora classifica come **HOT_LEAD** (prima andava direttamente a FARE_VIDEO)
- **NUOVO flusso**: HOT_LEAD → tu decidi manualmente "Passa a Video" → FARE_VIDEO → fai il video → Video Inviato
- **NUOVO**: bottone **"← Rimanda indietro"** nella card FARE_VIDEO — sostituisce i 2 bottoni (Warm/Cold)
- Il sistema legge lo score del lead e lo piazza automaticamente: ≥80 → HOT_LEAD, 50-79 → WARM_LEAD, <50 → COLD_LEAD
- **NUOVO**: action `MOVE_BACK` in `POST /api/leads/[id]/quick-log`
- Aggiornati **6 endpoint** di auto-classificazione: recalc-score, ads-override, tier-override, recalc-scores, batch-analysis, batch-gemini-analysis
- Aggiornati emoji log: 🔥 per HOT_LEAD (prima 🎬 per FARE_VIDEO)
- Tab Scoring aggiornata: soglia ≥80 = HOT LEAD, esempi aggiornati

---

## [3.4.0] - 2026-03-15

### Scoring v3.1 "Segnali Digitali"

- **RIMOSSO**: "Ads senza pixel/tracking" (+10) — non rilevante, le ads sono manuali
- **NUOVO**: **Tracking attivo** (+10) — lead con GA4/GTM/Meta Pixel nel DOM investe nel digitale
- **NUOVO**: **Recensioni forti** (+10) — lead con 50+ recensioni Google E rating > 4.0 = business solido
- **Pesi aggiornati**: Errore strategico +50 | Ads attive +20 | Tracking attivo +10 | Recensioni forti +10 | Tier +20/+10/+5
- Max teorico: 110 → cap 100

### Tier Override Manuale

- **NUOVO**: selettore **High-Ticket / Standard / Low-Ticket** nel breakdown score di ogni card
- Click su un tier diverso → `PATCH /api/leads/[id]/tier-override` → salva, ricalcola score, riclassifica
- Il tier override persiste e viene usato in tutti i ricalcoli futuri
- Campo `tierOverride` aggiunto al DB (nullable, sovrascrive il calcolo automatico da keyword)

### Recalc Score Per-Lead

- **NUOVO**: bottone 🔄 nel breakdown score per ricalcolare lo score del singolo lead
- `POST /api/leads/[id]/recalc-score` — prende tutti i dati dal DB e ricalcola
- Utile dopo modifiche manuali (tier, ads, etc.) o per verificare il punteggio

### Fix Card Collapse

- Ads toggle SI/NO e tier change **non collassano più la card**
- Il card mantiene lo stato `expanded` e aggiorna score/breakdown localmente
- Eliminata la chiamata `onAction()` → `fetchData()` che causava il re-mount del componente

### Script Tella Solo in Video

- Lo script teleprompter **non appare più** nelle card analisi/hot/warm/cold
- Appare **solo** nella variante `video` (FARE_VIDEO)
- In FARE_VIDEO, se manca lo script, il bottone si chiama "Genera Testo Tella"

---

## [3.3.0] - 2026-03-15

### Rework Ads — Verifica Manuale

- **Rimosso**: check automatico Ads via Apify (inaffidabile — Google Ads mai trovate, Meta Ads trova aziende sbagliate)
- **Nuovo**: sezione "Segnali Ads & Verifica Manuale" nella card lead:
  - Mostra **segnali ads** dal DOM (Meta Pixel, Google Ads Tag, GTM, etc.)
  - Toggle **SI/NO separato** per Google Ads e Meta Ads con ricalcolo score immediato
  - Link diretto a **Google Ads Transparency** e **Meta Ad Library** per verifica manuale
- **Score**: usa SOLO dati verificati manualmente. Se non verificato, ads = false (conservativo)
- **API**: `PATCH /api/leads/[id]/ads-override` ora accetta `{ googleAds?: boolean, metaAds?: boolean }` separatamente

### Move Back da FARE_VIDEO

- **Nuovo**: pulsanti "Warm", "Cold", "Non Target" nella card video per riportare indietro lead classificati erroneamente
- **API**: aggiunte azioni `MOVE_TO_WARM` e `MOVE_TO_COLD` in `quick-log`

### WhatsApp Manuale

- **Nuovo**: campo WhatsApp editabile nella card lead (tutte le varianti)
  - Input numero, salvataggio immediato, link wa.me per apertura chat
  - Source salvato come "manual" nel DB
- **API**: `PATCH /api/leads/[id]` ora accetta `whatsappNumber` e `whatsappSource`

---

## [3.2.1] - 2026-03-15

### Changed

- **Scoring v3.0 "Disallineamento Strategico"** — Ricalibrazione completa dei pesi:
  - Errore strategico: +20 → **+50** (driver principale)
  - Ads attive: +40 → **+20** (aggravante)
  - Ads senza tracking: +20 → **+10** (aggravante)
  - Settori invariati (high-ticket +20, standard +10, low-ticket +5)
- **Implicazione**: senza errore strategico il max score è 50 → sempre COLD. Per essere WARM/FARE_VIDEO serve almeno un disallineamento rilevato dall'AI
- **Tab Scoring aggiornata** con nuovi pesi, nuovi esempi e nota sull'implicazione chiave

---

## [3.2.0] - 2026-03-15

### Bug Fixes (CRITICAL)

- **FIX: ads_networks_found sempre vuoto** — `gemini-analysis.ts` hardcodava `ads_networks_found: []`, rendendo `hasTrackingPixel` SEMPRE false nel calcolo score. Ogni lead con ads attive riceveva erroneamente +20 "Ads senza pixel". Fix: tutti e 3 gli endpoint di analisi (`batch-gemini-analysis`, `leads/[id]/gemini-analysis`, `internal/batch-analysis`) ora iniettano i tracking tools REALI rilevati dallo `strategic-extractor` (GA4, GTM, Google Ads Tag, Meta Pixel, etc.)
- **FIX: recalc-scores corregge dati storici** — Il recalc ora controlla `auditData.tracking_tools` e inietta i dati mancanti in `geminiAnalysis.ads_networks_found` prima del ricalcolo, sanando i lead già analizzati con il bug

### Features

- **HOT → FARE_VIDEO automatico** — I lead con score ≥80 vanno direttamente in FARE_VIDEO (saltando HOT_LEAD), eliminando il passaggio manuale di revisione. Il workflow diventa: analisi → score ≥80 → script pronto → video da registrare
- **Layout unificato tutte le pagine** — Tutte le pagine listing (da-analizzare, hot-leads, warm-leads, cold-leads, fare-video) usano `UnifiedLeadCard` con layout compatto ed espandibile. Nessuna navigazione a pagine dettaglio, tutto visibile a colpo d'occhio
- **Score breakdown visibile** — Ogni card mostra il dettaglio di come è stato calcolato il punteggio (es. "Ads attive: +40", "Settore high-ticket: +20") con badge colorati
- **Script Tella in modale** — Nella pagina fare-video, lo script si apre in un Dialog modale invece di navigare via
- **Tab Scoring in Settings** — Nuova tab "Scoring" nelle impostazioni che documenta regole, pesi, soglie e classificazione settori

### Changed

- **Auto-classificazione v3.2**: score ≥80 → `FARE_VIDEO`, 50-79 → `WARM_LEAD`, <50 → `COLD_LEAD`
- **Recalc-scores v3.2**: ricalcola score + riclassifica pipeline + corregge tracking tools mancanti
- **Batch analysis logs**: emoji aggiornati (🎬 per FARE_VIDEO invece di 🔥 per HOT_LEAD)

### New Files

- `src/components/leads/unified-lead-card.tsx` — Componente card unificato con varianti (analisi/hot/warm/cold/video)
- `src/components/settings/scoring-config-tab.tsx` — Tab informativa configurazione scoring

---

## [3.1.1] - 2026-03-15

### Features

- **COLD_LEAD stage**: nuovo stage pipeline per lead con score <50 (basso potenziale). Separa i lead analizzati a basso punteggio dai lead ancora in attesa di analisi (DA_ANALIZZARE). Nuova pagina `/cold-leads` nella sidebar con icona snowflake.

### Changed

- Batch Gemini analysis: score <50 ora classifica come `COLD_LEAD` invece di `DA_ANALIZZARE`
- Recalculate stages: aggiunto supporto COLD_LEAD (score <50)
- Pipeline stage selector: aggiunto COLD_LEAD nel gruppo Analisi
- Dashboard mission API: aggiunto conteggio badge per Cold Leads

---

## [3.1.0] - 2026-03-15

### Security (CRITICAL)

- **SSRF protection**: tutti i fetch di URL esterni validano che l'IP non sia privato (127.x, 10.x, 172.16-31.x, 192.168.x, 169.254.x, localhost). Nuovo file `url-validator.ts`
- **Auth endpoint interni**: `/api/internal/batch-analysis` e `/api/internal/recalc-scores` ora richiedono `CRON_SECRET`
- **Debug endpoint protetto**: `/api/debug/reset-data` accessibile solo in `NODE_ENV=development` + ruolo `ADMIN`. In produzione ritorna 404
- **Gemini timeout 30s**: `generateContent()` wrappato in `Promise.race` per evitare hang infiniti
- **.env sanitizzato**: rimosse API key di servizi dismessi, creato `.env.example` con placeholder

### Infrastructure

- **Health check**: nuovo `GET /api/health` per monitoring e Docker healthcheck
- **Recovery job bloccati**: nuovo `POST /api/cron/recover-stuck-jobs` resetta job RUNNING da 30+ min
- **Security headers**: `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`
- **Node engines**: `package.json` richiede Node >= 20.0.0
- **Backup script**: `scripts/backup-db.sh` con rotazione (ultimi 30 backup)

### Bug Fixes

- **Recontact preserva storico**: il cron recontact non resetta piu videoSentAt, videoViewedAt, letterSentAt, linkedinSentAt, respondedAt. Lo storico interazioni rimane intatto
- **Recontact batch**: convertito da loop N+1 a `updateMany` + `createMany` in transaction
- **WhatsApp URL decoding**: `extractWhatsAppNumber()` decodifica URL-encoded HTML prima dei regex

### Improvements

- **Zod validation**: POST `/api/leads` e POST `/api/scheduled-searches` validano input con schema Zod
- **DB transactions**: PATCH `/api/leads/[id]` usa `$transaction` per activity + update atomici
- **pageSize cap**: GET `/api/leads` limita pageSize a 1-200
- **Rate limiting IP**: POST `/api/public/video-view` rate limit per IP (1 req/10s) oltre al rate limit per token
- **HTML size limit**: `extractStrategicData()` rifiuta HTML > 5MB
- **Gemini cost logging**: ogni chiamata logga token usage (prompt, candidates, total)
- **Error boundaries**: `error.tsx` globale e dashboard con bottone "Riprova"

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
