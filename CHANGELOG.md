# Changelog - KW Sales CRM

Tutte le modifiche rilevanti al progetto sono documentate in questo file.

Il formato segue [Keep a Changelog](https://keepachangelog.com/it/1.1.0/) e il
progetto adotta il [Semantic Versioning](https://semver.org/lang/it/).
Categorie: **Security** (sicurezza), **Added** (aggiunte), **Changed** (modifiche),
**Fixed** (correzioni), **Removed** (rimozioni).

> Nota storica: le voci 3.11–3.13 più in basso hanno date e numerazione ereditate
> da una vecchia generazione automatica (incluso un duplicato `3.12.0` e date in
> blocco). Sono conservate come archivio; dalla 3.17.0 in poi si usa il formato qui sopra.

---

## [3.18.0] - 2026-06-21

- feat: automazione completa outreach opt-in, scheduler online, email AI con gancio, report giornaliero, sicurezza 3.17

## [3.17.0] - 2026-06-16

Release di **stabilizzazione e sicurezza pre-lancio** (branch `fix/pre-lancio-sicurezza-ux`).
Consolida l'hardening di sicurezza, le correzioni mobile/UX, il deploy resiliente
e la documentazione.

### 🔐 Security
- **SSRF — difesa centralizzata**: nuovo helper `safeFetch` (`src/lib/safe-fetch.ts`)
  che valida l'URL con risoluzione DNS (`assertPublicUrl`) e segue i redirect in modo
  manuale **rivalidando ogni hop**, chiudendo il bypass "sito pubblico → 301 → IP interno".
  Applicato a tutti i 12 punti che scaricano URL esterni (audit, blog, sitemap/robots,
  landing ads, estrazione pagine, analisi Gemini, import manuale, batch).
- **2FA server-side non aggirabile**: OTP verificato dentro `authorize()`; codici a 6 cifre
  hashati a riposo, monouso, con scadenza e limite tentativi.
- **Anti-brute-force** sul login (rate limit per IP) e **anti-enumeration** degli utenti.
- **Autorizzazione in profondità**: nuovi `requireSession`/`requireAdmin` (`src/lib/api-auth.ts`)
  come seconda barriera oltre al middleware, con **rate limit per-utente** su ricerche,
  audit e analisi Gemini (anti cost-DoS).
- **Lockdown endpoint cron/internal**: fail-closed su `CRON_SECRET` con confronto a tempo costante.
- **Content-Security-Policy** aggiunta in `next.config.ts`; `images.remotePatterns` ristretto
  a un'allowlist (rimosso `hostname: "**"`, che era un open-proxy).
- **Anti-relay email** e **CORS** del tracking video-view corretti.
- **Dipendenze aggiornate**: Next.js `16.1.1 → 16.2.9` (advisory middleware / SSRF /
  request smuggling), `jspdf 4.2.1`, `undici 7.28.0`, `form-data 4.0.6`. `npm audit`
  runtime: **0 critical, 0 high** (9 moderate residue, build-time).
- **Bonifica segreti**: rimossa la password root VPS in chiaro dai documenti; aggiunto
  il runbook `SICUREZZA-ROTAZIONE-SEGRETI.md`.

### 🚀 Changed
- **Deploy a prova di errore**: rollback automatico, health-check post-deploy, gate sulle
  variabili d'ambiente obbligatorie, backup DB pre-migrazione, pipeline CI.

### 📱 Fixed (Mobile / UX)
- `viewport-fit=cover` per le safe-area del notch.
- Liste di tab scrollabili in orizzontale su schermi stretti.
- Dialog/modali con altezza massima e scroll interno (pulsanti sempre raggiungibili).
- Griglie KPI della dashboard responsive (niente più colonne compresse su mobile).
- Barra dei filtri di stato a scorrimento orizzontale su mobile.
- Tap-target adeguati al tocco nella navigazione mobile.

### 📚 Docs
- Manuale utente consolidato in un'unica fonte (guida in-app allineata a `GUIDA_UTENTE.md`).
- Referenza tecnica (`TECHNICAL-DOCS.md`) aggiornata con la nuova architettura di sicurezza.
- Documenti tecnici/guide obsolete marcate come tali.

## [3.16.0] - 2026-04-14

- Workflow follow-up email automatico (msg 1/2/3A/3B) + script di lettura Tella in batch + fix stop su `respondedAt`

## [3.15.0] - 2026-04-14

- Rimosse le approvazioni manuali + compattati i 5 atti + spostato il punto di dolore nello Step 2

## [3.14.0] - 2026-04-14

- Auto-generazione dello script video in background all'ingresso in `FARE_VIDEO`

## [3.13.0] - 2026-04-14

- feat: notifiche "video visto" configurabili (multi-destinatario per Francesca)

## [3.12.1] - 2026-04-14

- feat(scriptwriter): prompt a atti + canovaccio Tella (intro Cagliari, recensioni, spreco ads, soluzione MSD, chiusura 7 min)

## [3.12.0] - 2026-04-14

- feat(lead): briefing card con recensioni, ads, tracking, errore strategico e tier settore

## [3.13.2] - 2026-04-14

### Bottone "Risincronizza Landing" per landing legacy
Per i lead con landing creata prima della v3.13.1 (senza wpPostId salvato), il sync automatico non funziona. Ora c'e' un bottone per fixarli on-demand.

- Nuova funzione `findLandingPageBySlug(slug)` in `lib/wordpress.ts` (recupera l'ID WP dal slug)
- Nuovo endpoint `POST /api/leads/[id]/resync-landing`: backfill `videoWpPostId` se mancante + push dei dati attuali (video YouTube, punto di dolore, nome) sulla landing
- Nuovo bottone **"Risincronizza"** nella tab Video Outreach → Step 4 (Landing) accanto a "Copia URL"
- `router.refresh()` aggiunto anche dopo `createLanding` per coerenza

**Uso:** se la landing mostra il video sbagliato/vecchio, vai su Video Outreach → Step 4 → clicca "Risincronizza" — pubblichera il video YouTube attualmente impostato nel CRM.

## [3.13.1] - 2026-04-14

### Fix critico: sync video YouTube → landing page WordPress
Problema: modificando il video YouTube nella tab "Video Outreach" la landing page su WordPress continuava a mostrare il vecchio video, e la tab "Informazioni" non si aggiornava.

- Nuovo campo `videoWpPostId` nel modello Lead per tracciare il post WP
- Nuova funzione `updateLandingPage(wpPostId, fields)` in `lib/wordpress.ts` (POST a `/wp/v2/prospect/{id}` con campi ACF)
- `POST /api/leads/[id]/create-landing` ora salva il `wpPostId` restituito da WordPress
- `PATCH /api/leads/[id]` propaga automaticamente le modifiche di `videoYoutubeUrl` e `landingPuntoDolore` al post WordPress (se la landing esiste)
- Errori WordPress non bloccano la PATCH (logged, non throw)
- Step3Content ora chiama `router.refresh()` dopo save/remove → la tab "Informazioni" si aggiorna immediatamente

**Migrazione DB:** I lead con landing gia create prima di questa versione non hanno `videoWpPostId` salvato, quindi il sync automatico non funzionera per loro. Soluzione manuale: ricreare la landing dopo aver eliminato quella vecchia da WordPress.

File modificati:
- `prisma/schema.prisma`
- `src/lib/wordpress.ts`
- `src/app/api/leads/[id]/create-landing/route.ts`
- `src/app/api/leads/[id]/route.ts`
- `src/components/leads/video-outreach-stepper.tsx`

## [3.12.0] - 2026-04-14

### Notifiche video views configurabili (multi-destinatario)
- Le email di notifica "il prospect ha guardato il video" ora supportano piu destinatari
- Nuovo campo `notificationEmails` nel modello `Settings` (CSV di email)
- Nuova sezione "Notifiche Video Views" nelle Impostazioni → Email & Messaggi
- Default: la notifica va sia ad Alessio (`SMTP_USER`) che a Francesca (`consulenza@karalisweb.net`) — configurabile da admin
- File modificati: `prisma/schema.prisma`, `src/lib/email.ts`, `src/app/api/settings/email-messaging/route.ts`, `src/components/settings/email-messaging-config-tab.tsx`

## [3.11.0] - 2026-04-14

### Visibilita risposte WhatsApp per Francesca
- Nuova voce **"Ha Risposto"** nel sidebar (sezione VENDITA) con badge count
- Bottone **"Segna come Ha risposto"** nella pagina dettaglio lead (tab Messaggi) con 3 canali: WhatsApp, Email, Telefono
- Fix pagina `/risposto` che filtrava per uno stage inesistente (`RISPOSTO`), ora usa filtro `respondedAt IS NOT NULL`
- Nuova action `RESPONSE_RECEIVED` nel quick-log API che setta `respondedAt` e `respondedVia` + crea Activity
- Nuovo filtro `responded=true` nella API leads
- Badge count "risposto" aggiunto alla dashboard mission API

### Sync Google Calendar → CRM
- Nuovo lib `src/lib/google-calendar.ts`: client leggero (fetch HTTP, no SDK googleapis) per leggere eventi dal calendario primario
- Nuovo cron endpoint `POST /api/cron/sync-calendar`: ogni 15 min cerca appuntamenti prenotati via appointment scheduling, li matcha con lead nel DB (per email, nome, telefono) e aggiorna lo stage a `CALL_FISSATA`
- Protezione duplicati: skip eventi gia sincronizzati (check eventId nelle notes Activity)
- Richiede configurazione env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`

### File modificati
- `src/app/api/leads/[id]/quick-log/route.ts` — nuova action RESPONSE_RECEIVED
- `src/app/api/leads/route.ts` — filtro `responded=true`
- `src/app/api/dashboard/mission/route.ts` — badge count risposto
- `src/app/(dashboard)/risposto/page.tsx` — fix fetch
- `src/components/layout/sidebar.tsx` — voce "Ha Risposto"
- `src/components/leads/messaging-hub.tsx` — componente ResponseTracker
- `src/lib/google-calendar.ts` — NUOVO: client Google Calendar
- `src/app/api/cron/sync-calendar/route.ts` — NUOVO: cron sync

## [3.10.0] - 2026-04-13

- v3.9.4: nuovo prompt Tella 4 atti + fix messaggi landing + docs

## [3.9.4] - 2026-04-13

### Nuovo prompt Script Tella a 4 atti
- Riscritto completamente il prompt per la generazione dello script video Tella
- Struttura obbligatoria in 4 atti: Rottura del ghiaccio, Scena del crimine, I soldi, La soluzione
- Rimossi: metafore, "mi concede 60 secondi", "siete caduti in una trappola", toni da guru
- Apertura fissa: "Mi chiamo Alessio Loi, sono il fondatore di Karalisweb."
- Durata target: 80-90 secondi di parlato
- I dati del prompt ora vengono da campi CRM specifici: sindrome ego, brand score, cliche trovato, debolezza, pain points high, stato Google/Meta Ads
- Route `reading-script` riscritta per alimentare i nuovi placeholder
- File modificati: `src/lib/prompts.ts`, `src/app/api/leads/[id]/reading-script/route.ts`

### Fix aggiornamento messaggi dopo creazione landing page
- I messaggi nella tab Messaggi (Email e WhatsApp) ora si aggiornano automaticamente quando viene creata la landing page
- Prima del fix, il placeholder `[link analisi]` rimaneva anche dopo la creazione della landing
- Aggiunto `landingUrl` come dependency nell'useEffect del MessagingHub
- File modificato: `src/components/leads/messaging-hub.tsx`

## [3.9.3] - 2026-04-11
- Fix flusso pipeline + rimozione Calendly, task LinkedIn/Telefono auto post-workflow

## [3.9.2] - 2026-04-11
- MessagingHub ora usa template da Workflow invece che vecchi template hardcoded

## [3.9.1] - 2026-04-11
- Badge segmento visibile nella scheda lead e nella card lista

## [3.9.0] - 2026-04-11
- Workflow Engine + Micro-segmenti: automazione email/WA 3 step con copy Francesca, toggle auto/manual, segmentazione lead per settore

## [3.8.8] - 2026-03-27
- feat: script video 5 atti - intro, scena crimine, soldi, soluzione, chiusura+contatto

## [3.8.7] - 2026-03-27
- fix: fallback HTTP quando HTTPS va in timeout nell'audit

## [3.8.6] - 2026-03-27
- feat: gestione contatti editabile nella scheda lead

## [3.8.5] - 2026-03-26
- Fare Video: badge stato Script Tella nella lista

## [3.8.4] - 2026-03-26
- Step 2: badge stato separati per 4 Atti e Script Tella

## [3.8.3] - 2026-03-26
- Script Tella: testi reali sito + atti editabili + fix salvataggio

## [3.8.2] - 2026-03-25
- feat: sync ricerche sequenziale — subcluster priority, category order, location order

## [3.8.1] - 2026-03-25
- feat: location con regione dal DB, sync ricerche programmate auto, pulizia CITY_DATA

## [3.8.0] - 2026-03-25
- feat: unifica tab Ricerca con sotto-sezioni Categorie/Location/Programmate

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
