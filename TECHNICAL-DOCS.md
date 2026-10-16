# KW Sales CRM - Documentazione Tecnica

Versione: **3.43.0** | Ultimo aggiornamento: 2026-08-11

---

## Indice

1. [Stack Tecnologico](#stack-tecnologico)
2. [Architettura](#architettura)
3. [Database Schema](#database-schema)
4. [API Routes](#api-routes)
5. [Pagine Dashboard](#pagine-dashboard)
6. [Moduli Audit](#moduli-audit)
7. [Analisi AI (Gemini)](#analisi-ai-gemini)
8. [Rete BNI (v3.21.0)](#rete-bni-v3210)
9. [Protezioni e Security](#protezioni-e-security)
   - [Sicurezza — v3.17.0](#sicurezza--v3170)
10. [Componenti UI](#componenti-ui)
11. [Tipi e Interfacce](#tipi-e-interfacce)
12. [Configurazione](#configurazione)
13. [Variabili d'Ambiente](#variabili-dambiente)
14. [Docker e Deploy](#docker-e-deploy)
15. [Troubleshooting](#troubleshooting)

---

## Stack Tecnologico

| Layer | Tecnologia | Versione |
|-------|-----------|----------|
| **Framework** | Next.js (App Router) | 16.2.9 |
| **Runtime** | React | 19.2.3 |
| **Linguaggio** | TypeScript | 5.x |
| **UI** | Shadcn/ui + Radix UI | latest |
| **Styling** | Tailwind CSS | 4.x |
| **Database** | PostgreSQL | 16 |
| **ORM** | Prisma | 7.2.0 |
| **Auth** | NextAuth.js (beta) | 5.0.0-beta.30 |
| **AI** | Google Gemini | 2.5 Flash/Pro |
| **Job Queue** | p-queue (in-process) | — |
| **Scraping** | Apify Client | 2.21.0 |
| **HTML Parsing** | Cheerio | 1.1.2 |
| **Email** | Nodemailer | 7.0.12 |
| **Drag & Drop** | @hello-pangea/dnd | 18.0.1 |
| **Forms** | React Hook Form + Zod | 7.71.0 / 4.3.5 |
| **Toasts** | Sonner | 2.0.7 |
| **Icons** | Lucide React | 0.562.0 |
| **Charts** | Recharts | 2.x |
| **Animations** | Framer Motion | 11.x |
| **Command Palette** | cmdk | 1.0.4 |
| **Date Utils** | date-fns | 4.x |
| **PDF Generation** | jsPDF | 4.2.1 |
| **Process Manager** | PM2 | (server) |

> **Requisito runtime:** Prisma 7 richiede **Node ≥ 20.19**. Sono conformi sia l'immagine Docker `node:20-slim` sia la CI (`node 20`).

---

## Architettura

### Struttura Cartelle

```
sales-app/
├── prisma/
│   ├── schema.prisma          # Schema completo database
│   ├── seed.ts                # Dati iniziali
│   └── prisma.config.ts       # Configurazione Prisma
├── src/
│   ├── app/
│   │   ├── (auth)/            # Pagine auth (login, forgot, reset)
│   │   ├── (dashboard)/       # Pagine app protette (21 viste)
│   │   │   ├── error.tsx      # Error boundary dashboard
│   │   │   ├── da-analizzare/ # Lead da analizzare
│   │   │   ├── hot-leads/     # Lead HOT (score 80+)
│   │   │   ├── warm-leads/    # Lead WARM (score 50-79)
│   │   │   ├── cold-leads/    # Lead COLD (score <50)
│   │   │   ├── fare-video/    # Lead pronti per video
│   │   │   ├── video-inviati/ # Video inviati + tracking
│   │   │   ├── follow-up/     # Follow-up (lettera, LinkedIn)
│   │   │   ├── telefonate/    # Telefonate
│   │   │   ├── call-fissate/  # Call fissate
│   │   │   ├── trattative/    # Trattative/offerte
│   │   │   ├── clienti/       # Clienti acquisiti
│   │   │   ├── linkedin/      # Contatti LinkedIn
│   │   │   ├── leads/         # Lista e dettaglio lead
│   │   │   ├── search/        # Nuova ricerca
│   │   │   ├── searches/      # Storico ricerche
│   │   │   ├── non-target/    # Non in target
│   │   │   ├── senza-sito/    # Senza sito web
│   │   │   ├── persi/         # Lead persi
│   │   │   ├── archivio/      # Archivio
│   │   │   ├── settings/      # Impostazioni
│   │   │   ├── profile/       # Profilo utente
│   │   │   └── guida/         # Guida utente
│   │   ├── api/               # API Routes (vedi sotto)
│   │   ├── error.tsx          # Error boundary globale
│   │   └── layout.tsx         # Root layout
│   ├── components/
│   │   ├── ui/                # Shadcn/ui components
│   │   ├── leads/             # Componenti lead
│   │   ├── layout/            # Sidebar, header, nav
│   │   └── settings/          # Componenti settings
│   ├── lib/
│   │   ├── db.ts              # Prisma client singleton
│   │   ├── apify.ts           # Integrazione Apify
│   │   ├── apify-mock.ts      # Mock data per sviluppo
│   │   ├── gemini-analysis.ts # Integrazione Gemini AI (timeout 30s)
│   │   ├── background-jobs.ts # Job queue con p-queue + recovery
│   │   ├── url-validator.ts   # Protezione SSRF (assertPublicUrl + DNS)
│   │   ├── safe-fetch.ts      # safeFetch(): fetch anti-SSRF con rivalidazione redirect
│   │   ├── api-auth.ts        # requireSession/requireAdmin/enforceUserRateLimit
│   │   ├── rate-limit.ts      # Rate limiter in-memory per-processo
│   │   ├── audit/             # Moduli audit (12 file)
│   │   │   ├── whatsapp-extractor.ts  # Estrazione WhatsApp
│   │   │   ├── strategic-extractor.ts # Analisi strategica (limite 5MB)
│   │   │   └── ...
│   │   └── utils.ts           # Utility condivise
│   └── types/                 # TypeScript interfaces
│       ├── index.ts
│       └── commercial.ts
├── scripts/
│   └── backup-db.sh           # Backup DB con rotazione 30 giorni
├── docker-compose.yml
├── Dockerfile
├── deploy.sh                  # Script deploy automatico (9 step)
├── DEPLOY.md                  # Guida deploy
├── TECHNICAL-DOCS.md          # Questa documentazione
└── CLAUDE.md                  # Istruzioni AI per sviluppo
```

### Pattern Architetturali

- **Server Components**: Next.js App Router con approccio server-first
- **API Routes**: Handler REST in `src/app/api/`
- **Middleware**: Protezione route con NextAuth JWT (`src/middleware.ts`)
- **Background Jobs**: p-queue per concorrenza controllata (max 2 job paralleli)
- **Database Access**: Prisma ORM con singleton pattern (`src/lib/db.ts`)
- **Type Safety**: Full TypeScript, validazione input con Zod
- **State Management**: React useState + server-side data fetching
- **SSRF Protection**: `safeFetch()` centralizzato — valida l'URL via DNS e rivalida ogni redirect prima di seguirlo (vedi [Sicurezza — v3.17.0](#sicurezza--v3170))
- **Auth in profondità**: middleware (1ª barriera, fail-closed) + helper `api-auth` dentro gli handler (2ª barriera)
- **Error Boundaries**: error.tsx globale e per dashboard

---

## Database Schema

### Modelli Principali

#### Lead (tabella centrale)

| Campo | Tipo | Note |
|-------|------|------|
| `id` | UUID | Primary key |
| **Dati Google Maps** | | |
| `name` | String | Nome attivita |
| `address` | String? | Indirizzo |
| `phone` | String? | Telefono |
| `website` | String? | Sito web |
| `category` | String? | Categoria |
| `googleRating` | Decimal? | Rating (es. 4.5) |
| `googleReviewsCount` | Int? | Numero recensioni |
| `googleMapsUrl` | String? | Link Google Maps |
| `placeId` | String? | Unique, per deduplicazione |
| **WhatsApp** | | |
| `whatsappNumber` | String? | Numero WhatsApp estratto |
| `whatsappSource` | String? | "website" / "google_maps" |
| **Audit** | | |
| `auditStatus` | AuditStatus | PENDING/RUNNING/COMPLETED/FAILED/NO_WEBSITE/TIMEOUT |
| `auditCompletedAt` | DateTime? | |
| `opportunityScore` | Int? | 0-100 |
| `auditData` | Json? | Risultati audit completi |
| `talkingPoints` | String[] | Punti commerciali |
| **Gemini AI** | | |
| `geminiAnalysis` | Json? | Analisi strategica AI |
| `videoScriptData` | Json? | Script video generato |
| **Pipeline CRM** | | |
| `pipelineStage` | PipelineStage | Stage corrente |
| **Video Outreach** | | |
| `videoSentAt` | DateTime? | Data invio video |
| `videoViewedAt` | DateTime? | Data visualizzazione |
| `trackingToken` | String? | Token unico per tracking |
| **Follow-up** | | |
| `letterSentAt` | DateTime? | Data invio lettera |
| `linkedinSentAt` | DateTime? | Data contatto LinkedIn |
| `respondedAt` | DateTime? | Data risposta |
| `respondedVia` | String? | Canale risposta |
| **Recontact** | | |
| `recontactAt` | DateTime? | Data programmata recontact |
| **Ads Intelligence** | | |
| `hasActiveGoogleAds` | Boolean? | |
| `hasActiveMetaAds` | Boolean? | |
| `googleAdsCopy` | String? | Testo annuncio Google |
| `metaAdsCopy` | String? | Testo annuncio Meta |
| `adsCheckedAt` | DateTime? | |
| **Outreach Opt-in (v3.18)** | | |
| `email` | String? | Email di contatto estratta dal sito |
| `outreachMailSent` | Json? | `{subject, body, hook, generatedAt}` — mail inviata |
| `optInSentAt` | DateTime? | Data prima mail opt-in |
| `optInFollowupAt` | DateTime? | Data follow-up opt-in |
| `unsubscribed` | Boolean | Ha chiesto di non essere ricontattato |

#### Activity

| Campo | Tipo | Note |
|-------|------|------|
| `id` | UUID | |
| `leadId` | UUID | FK a Lead |
| `type` | ActivityType | CALL, NOTE, EMAIL_SENT, MEETING, PROPOSAL_SENT, STAGE_CHANGE |
| `outcome` | CallOutcome? | Solo per CALL |
| `notes` | String? | |
| `createdAt` | DateTime | |

#### Search

| Campo | Tipo | Note |
|-------|------|------|
| `id` | UUID | |
| `query` | String | Es. "Ristoranti" |
| `location` | String | Es. "Milano centro" |
| `apifyRunId` | String? | ID run Apify |
| `status` | SearchStatus | PENDING/RUNNING/COMPLETED/FAILED |
| `leadsFound` | Int | |
| `leadsWithWebsite` | Int | |

#### User

| Campo | Tipo | Note |
|-------|------|------|
| `id` | UUID | |
| `email` | String | Unique |
| `password` | String | bcrypt hash |
| `name` | String? | |
| `role` | UserRole | ADMIN / USER |
| `twoFactorEnabled` | Boolean | |

#### Settings (singleton — `id = "default"`)

| Campo | Tipo | Note |
|-------|------|------|
| **CRM / Pipeline** | | |
| `emailDailyCap` | Int | Max mail opt-in inviate al giorno |
| `notificationEmails` | String? | Email(s) notifiche (CSV) |
| `signatureAlessio` | String? | Firma per le mail inviate |
| **Outreach Opt-in (v3.18)** | | |
| `emailDailyCap` | Int | Max mail opt-in/giorno (default 20) |
| `optInSubjects` | String? | Oggetti a rotazione, uno per riga (`{azienda}` = placeholder) |
| `emailGenPrompt` | String? | Istruzioni AI per generare il testo della mail |
| `sdLandingUrl` | String? | URL landing Metodo SD (incluso nella mail) |
| `alessioLinkedinUrl` | String? | URL LinkedIn Alessio (incluso nella mail) |

---

## API Routes

### Autenticazione

| Metodo | Route | Descrizione |
|--------|-------|-------------|
| POST | `/api/auth/[...nextauth]` | NextAuth handler |
| POST | `/api/auth/request-otp` | Richiedi codice OTP |
| POST | `/api/auth/verify-otp` | Verifica codice OTP |
| POST | `/api/auth/forgot-password` | Avvia reset password |
| POST | `/api/auth/reset-password` | Reset con token |
| POST | `/api/auth/check-2fa` | Controlla stato 2FA |

### Utenti

| Metodo | Route | Descrizione |
|--------|-------|-------------|
| GET/POST | `/api/users` | Lista / crea utenti |
| GET/PATCH/DELETE | `/api/users/[id]` | CRUD utente |
| GET/PATCH | `/api/profile` | Profilo corrente |
| POST | `/api/profile/change-password` | Cambio password |
| POST | `/api/profile/2fa` | Toggle 2FA |

### Lead

| Metodo | Route | Descrizione |
|--------|-------|-------------|
| GET/POST | `/api/leads` | Lista (pageSize max 200) / crea (Zod validation) |
| GET/PATCH/DELETE | `/api/leads/[id]` | CRUD lead (PATCH con transaction) |
| POST | `/api/leads/[id]/quick-log` | Log rapido chiamata |
| POST | `/api/leads/[id]/verify` | Verifica audit |
| POST | `/api/leads/[id]/gemini-analysis` | Avvia analisi Gemini |
| POST | `/api/leads/[id]/gemini-precision` | Analisi Gemini di precisione |
| POST | `/api/leads/[id]/ads-check` | Check Google Ads + Meta Ads |
| GET | `/api/leads/[id]/tracking-token` | Token tracking video |
| GET | `/api/leads/stats` | Statistiche lead |
| GET | `/api/leads/recalculate-stages` | Ricalcola pipeline |
| POST | `/api/leads/filter-social` | Filtra URL social |
| POST | `/api/leads/[id]/reading-script` | Genera script Tella (Gemini, prompt 4 atti) |
| POST | `/api/leads/[id]/generate-script` | Genera script video (legacy) |
| POST | `/api/leads/[id]/workflow-preview` | Preview messaggio con placeholder renderizzati |
| POST | `/api/leads/[id]/workflow-send` | Invio messaggio via workflow (email/WA) |
| POST | `/api/leads/[id]/send-email` | Invio email diretto |
| POST | `/api/leads/[id]/run-analyst` | Esegue Prompt 1 (Analista) |
| POST | `/api/leads/[id]/approve-analyst` | Approva output Prompt 1 |
| POST | `/api/leads/[id]/run-scriptwriter` | Esegue Prompt 2 (Sceneggiatore) |
| POST | `/api/leads/[id]/approve-script` | Approva script video |
| POST | `/api/leads/[id]/create-landing` | Crea landing page WordPress |
| POST | `/api/leads/[id]/upload-youtube` | Upload video su YouTube |

### Ricerche

| Metodo | Route | Descrizione |
|--------|-------|-------------|
| GET/POST | `/api/searches` | Gestione ricerche |
| GET/POST | `/api/scheduled-searches` | Ricerche programmate (Zod, max 50) |
| GET/PATCH/DELETE | `/api/scheduled-searches/[id]` | CRUD ricerca programmata |
| POST | `/api/scheduled-searches/seed` | Seed ricerche predefinite |

### Audit

| Metodo | Route | Descrizione |
|--------|-------|-------------|
| POST | `/api/audit` | Avvia audit sito |
| GET | `/api/audit/status` | Stato audit |

### Cron (protetti con CRON_SECRET)

| Metodo | Route | Descrizione |
|--------|-------|-------------|
| POST | `/api/cron/scheduled-searches` | Esegui ricerche programmate |
| POST | `/api/cron/batch-gemini-analysis` | Batch analisi Gemini |
| POST | `/api/cron/check-recontact` | Gestione recontact |
| POST | `/api/cron/recover-stuck-jobs` | Recovery job bloccati (30+ min) |
| POST | `/api/cron/opt-in-mailer` | Invia mail opt-in AI + follow-up (v3.18) |
| POST | `/api/cron/daily-report` | Report giornaliero via email (v3.18) |

### Interni (protetti con CRON_SECRET)

| Metodo | Route | Descrizione |
|--------|-------|-------------|
| POST | `/api/internal/batch-analysis` | Batch analysis |
| POST | `/api/internal/recalc-scores` | Ricalcola score |

### Pubblici

| Metodo | Route | Descrizione |
|--------|-------|-------------|
| POST | `/api/public/video-view` | Tracking video (rate limit IP: 1/10s) |
| GET | `/api/health` | Health check (DB ping) |

### Dashboard e Altro

| Metodo | Route | Descrizione |
|--------|-------|-------------|
| GET | `/api/dashboard/mission` | Missione giornaliera |
| POST | `/api/dashboard/regenerate` | Rigenera dashboard |
| GET | `/api/notifications/video-views` | Notifiche video views |
| POST | `/api/ads-canary` | Canary test ads |
| GET | `/api/callable-today` | Lead chiamabili oggi |

### Debug (solo sviluppo)

| Metodo | Route | Descrizione |
|--------|-------|-------------|
| POST/GET | `/api/debug/reset-data` | Reset dati (dev + ADMIN only, 404 in prod) |
| GET | `/api/debug/callable-status` | Debug stato callable |
| * | `/api/test` | Test API (solo dev) |

### Impostazioni

| Metodo | Route | Descrizione |
|--------|-------|-------------|
| GET/POST | `/api/settings/crm` | Configurazione CRM |
| GET/POST | `/api/settings/search-config` | Config ricerche |
| GET/POST | `/api/settings/api-config` | Config API |
| POST | `/api/settings/test-apify` | Test connessione Apify |
| POST | `/api/settings/test-gemini` | Test connessione Gemini |
| POST | `/api/settings/test-meta` | Test Meta Ads |

---

## Pagine Dashboard

| Path | Descrizione |
|------|-------------|
| `/` | Dashboard principale (KPI, pipeline, report) |
| `/da-analizzare` | Lead da analizzare con Gemini |
| `/hot-leads` | Lead HOT (score 80+) |
| `/warm-leads` | Lead WARM (score 50-79) |
| `/cold-leads` | Lead COLD (score <50) |
| `/fare-video` | Lead pronti per video |
| `/video-inviati` | Video inviati + tracking |
| `/follow-up` | Follow-up (lettera, LinkedIn) |
| `/telefonate` | Gestione telefonate |
| `/call-fissate` | Call/meeting fissati |
| `/trattative` | Trattative e offerte |
| `/clienti` | Clienti acquisiti |
| `/linkedin` | Contatti LinkedIn |
| `/leads` | Lista tutti i lead |
| `/leads/[id]` | Dettaglio lead |
| `/search` | Nuova ricerca Google Maps |
| `/searches` | Storico ricerche |
| `/senza-sito` | Lead senza sito web |
| `/non-target` | Non in target |
| `/persi` | Lead persi |
| `/archivio` | Archivio |
| `/settings` | Impostazioni CRM |
| `/profile` | Profilo utente |
| `/guida` | Guida utente interattiva |

---

## Moduli Audit

Tutti in `src/lib/audit/`:

| File | Funzione | Cosa Analizza |
|------|----------|---------------|
| `index.ts` | `runFullAudit()` | Orchestratore: coordina tutti i check |
| `seo-checker.ts` | `checkSEO()` | Meta title/desc, H1, canonical, OG, schema markup, alt img |
| `tracking-detector.ts` | `detectTracking()` | GA, GA4, GTM, FB Pixel, Google Ads, Hotjar, Clarity |
| `social-detector.ts` | `detectSocialLinks()` | Link a Facebook, Instagram, LinkedIn, YouTube, TikTok, X |
| `trust-checker.ts` | `checkTrust()` | Cookie banner, privacy, terms, testimonials, form, WhatsApp |
| `blog-detector.ts` | `checkBlog()` | Blog URL, ultimo post, frequenza, numero articoli |
| `email-detector.ts` | `detectEmailMarketing()` | Newsletter form, popup, lead magnet, provider email |
| `tech-detector.ts` | `detectTech()` | CMS, versione PHP, framework JS, stack obsoleto |
| `score-calculator.ts` | `calculateOpportunityScore()` | Calcola score 0-100 pesato su tutte le aree |
| `talking-points.ts` | `generateTalkingPoints()` | Genera frasi commerciali per area di servizio |
| `strategic-extractor.ts` | `extractStrategicData()` | Estrazione dati strategici (limite 5MB HTML) |
| `whatsapp-extractor.ts` | `extractWhatsAppNumber()` | Estrae numeri WhatsApp da wa.me e api.whatsapp.com |

### Flusso Analisi

```
1. Lead importato da Google Maps
2. Background job avvia analisi (p-queue, max 2 concorrenti)
3. Fetch HTML homepage via `safeFetch` (timeout, anti-SSRF con rivalidazione redirect)
4. Rifiuta HTML > 5MB
5. Esegue check in parallelo (~5-15s)
6. Gemini AI analizza strategicamente il sito (timeout 30s)
7. Calcola Opportunity Score (0-100)
8. Genera script video personalizzato
9. Estrae numero WhatsApp
10. Salva tutto in DB
```

---

## Analisi AI (Gemini)

File: `src/lib/gemini-analysis.ts`

### Caratteristiche

- **Timeout 30s**: `generateContent()` wrappato in `Promise.race` per evitare hang
- **Cost logging**: Ogni chiamata logga token usage (prompt, candidates, total)
- **Modelli supportati**: Gemini 2.5 Flash (default), Pro, Flash Lite
- **Output**: Analisi coerenza marketing, 3 errori principali, script video

### Configurazione

```env
GEMINI_API_KEY="your-key"
GEMINI_MODEL="gemini-2.5-flash"  # o gemini-2.5-pro, gemini-2.5-flash-lite
```

### Script Tella (v3.9.4)

File prompt: `src/lib/prompts.ts` (`DEFAULT_READING_SCRIPT_PROMPT`)
File route: `src/app/api/leads/[id]/reading-script/route.ts`
Componente UI: `src/components/leads/reading-script-card.tsx`

Lo script video Tella segue una struttura obbligatoria a 4 atti:

| Atto | Contenuto | Durata |
|------|-----------|--------|
| 1 - Rottura del ghiaccio | Presentazione + "sono sul vostro sito" | Max 2 frasi |
| 2 - La scena del crimine | Punto di forza + cliche + pattern competitor | 60-70 parole |
| 3 - I soldi | Collegamento al budget ads | 40-50 parole |
| 4 - La soluzione | Metodo Strategico Digitale + presentazione allegata | Max 3 frasi |

**Placeholder disponibili nel prompt:**

| Placeholder | Fonte dati |
|-------------|-----------|
| `{{NOME_AZIENDA}}` | `lead.name` |
| `{{SETTORE}}` | `lead.segment` o `lead.category` |
| `{{CITTA}}` | Estratta da `lead.address` |
| `{{SINDROME_EGO}}` | "si"/"no" da `analystOutput.primary_pattern` |
| `{{BRAND_SCORE}}` | `analystOutput.brand_positioning_score` |
| `{{CLICHE_TROVATO}}` | `analystOutput.cliche_found` |
| `{{DEBOLEZZA}}` | `analystOutput.communication_weakness` |
| `{{PAIN_POINT_1}}` | Primo pain point high severity |
| `{{PAIN_POINT_2}}` | Secondo pain point high severity |
| `{{GOOGLE_ADS}}` | Da `auditData.tracking.hasGoogleAdsTag` |
| `{{META_ADS}}` | Da `auditData.tracking.hasFacebookPixel` |

**Regole di generazione:**
- Niente markup, grassetti, titoli o trattini — testo continuo leggibile
- Durata target: 80-90 secondi
- Mai metafore, mai "mi concede 60 secondi", mai "siete caduti in una trappola"
- Apertura fissa: "Mi chiamo Alessio Loi, sono il fondatore di Karalisweb."
- Il prompt e personalizzabile da Impostazioni > AI (`readingScriptPrompt` nel DB)

### MessagingHub — Aggiornamento automatico messaggi

File: `src/components/leads/messaging-hub.tsx`

Il componente `MessagingHub` (tab Messaggi nella scheda lead) carica i messaggi renderizzati dalla API `workflow-preview`. I messaggi contengono il placeholder `{landingUrl}` che viene sostituito da `renderTemplate()` (`src/lib/workflow-templates.ts`):
- Se `videoLandingUrl` e null: mostra `[link analisi]`
- Se `videoLandingUrl` esiste: mostra URL + `?utm=client`

L'useEffect che carica la preview dipende da `workflowSteps` e `landingUrl`. Quando la landing page viene creata e il parent fa refresh, `landingUrl` cambia e i messaggi si rigenerano automaticamente (sia Email che WhatsApp).

---

## Automazione Outreach Opt-in (v3.18.0)

### Overview

Il sistema invia automaticamente una mail personalizzata (scritta da Gemini) ai prospect caldi (HOT/WARM) con email disponibile, chiedendo se vogliono ricevere un video audit. Non richiede azione manuale.

### File coinvolti

| File | Ruolo |
|------|-------|
| `src/lib/audit/email-finder.ts` | Estrae l'email di contatto dall'HTML del sito |
| `src/lib/gemini-outreach-email.ts` | Genera il testo AI della mail con gancio personalizzato |
| `src/lib/opt-in-mailer.ts` | Motore di invio: warmup, cap, anti-doppione, jitter, follow-up |
| `src/lib/daily-report.ts` | Calcola statistiche ieri e invia report mattutino |
| `src/app/api/cron/opt-in-mailer/route.ts` | Endpoint POST protetto da CRON_SECRET |
| `src/app/api/cron/daily-report/route.ts` | Endpoint POST protetto da CRON_SECRET |

### Flusso di esecuzione

```
[GitHub Actions ogni ora, lun-ven 7-17]
     ↓
POST /api/cron/opt-in-mailer
     ↓
runOptInMailer()
  1. Legge emailDailyCap da Settings
  2. Calcola warmupCap (5→10→20→full in 14 giorni)
  3. Conta mail già inviate oggi (Activity.type=EMAIL_OUTREACH)
  4. PASS 1: follow-up a chi non ha risposto dopo FOLLOWUP_DAYS (default 4)
  5. PASS 2: prime mail a HOT/WARM con email, optInSentAt NULL
  6. Per ogni prima mail: genera testo AI → pick oggetto → sendOutreachEmail()
  7. Salva outreachMailSent (subject+body+hook) + activity log
  8. Jitter 4-20 secondi tra un invio e l'altro
```

### Variabili d'ambiente opzionali

| Variabile | Default | Descrizione |
|-----------|---------|-------------|
| `OPTIN_PER_RUN_CAP` | `4` | Max mail per singola esecuzione cron |
| `OPTIN_FOLLOWUP_DAYS` | `4` | Giorni di attesa prima del follow-up |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Modello AI per generazione mail |

---

## Scheduler Online — GitHub Actions (v3.18.0)

Il file `.github/workflows/cron.yml` sostituisce la necessità di configurare crontab sul VPS o fare SSH per schedulare i job.

### Schedule configurato

| Schedule (UTC) | Job eseguiti |
|---------------|-------------|
| `0 1 * * *` (notte) | sourcing, recover-stuck-jobs, check-recontact |
| `5 2,6,10,14 * * *` | batch-gemini-analysis, video script batch |
| `0 9-18 * * 1-5` (ore feriali) | opt-in-mailer (unico motore email) |
| `*/30 6-17 * * *` | sync-calendar |
| `0 6 * * *` | daily-report (report mattutino) |

### Dispatch manuale

Dalla GitHub UI (Actions → Workflow CRM Cron → Run workflow):
- `manual:all` → esegue tutti i job
- `manual:opt-in-mailer` → solo opt-in
- `manual:daily-report` → solo report
- `manual:<nome>` → qualsiasi job per nome

### Segreti necessari (GitHub → Settings → Secrets)

| Segreto | Valore |
|---------|--------|
| `CRON_SECRET` | Stesso valore del `.env` sul VPS |
| `CRM_BASE_URL` (variabile) | `https://crm.karalisdemo.it` |

---

## Rete BNI (v3.21.0)

Modulo per tracciare i 121 (incontri uno-a-uno) con i membri dei capitoli BNI e le opportunità che ne derivano. È un canale **warm**, tenuto separato dallo scouting a freddo.

### Modello dati

- **`BniMembro`** (`bni_membri`): anagrafica del membro — `name`, `profession`, `company`, `chapter`, contatti, `status` (`ATTIVO|VISITATORE|EX_MEMBRO`). Campi denormalizzati `oneToOneCount` e `lastOneToOneAt`, aggiornati a ogni 121.
- **`OneToOne`** (`one_to_ones`): l'evento 121 — `membroId`, `date`, `location`, `notes`, `memberInterested`, `interestService`, `referralsCount`.
- **`Lead`** (campi aggiunti): `source = "bni"`, `bniOriginType` (`referral` | `member_interest`), `referralNeed`, `referredByMembroId` (→ `BniMembro`), `oneToOneId` (→ `OneToOne`).
- **`PipelineStage`**: nuovo stato **`BNI_DA_LAVORARE`**, bucket d'ingresso delle opportunità BNI. Non è referenziato da alcun cron "cold" (Gemini/video): le referenze calde restano fuori dall'outreach automatico.

### Flusso

`POST /api/bni/one-to-one` esegue in **transazione**: crea il record `OneToOne`; crea un `Lead` per l'interesse del membro (se presente) e un `Lead` per ogni referenza; aggiunge un'`Activity` di tipo `NOTE` per tracciabilità; incrementa i contatori del membro. I lead nascono in `BNI_DA_LAVORARE` con `auditStatus = NO_WEBSITE` (o `PENDING` se è presente un sito).

### API (tutte protette da `requireSession()`)

| Endpoint | Scopo |
|----------|-------|
| `GET/POST /api/bni/membri` | Lista membri (+ capitoli distinti) / creazione membro |
| `GET/POST /api/bni/one-to-one` | Ultimi 121 / registrazione 121 (genera i lead) |
| `GET /api/bni/stats` | Metriche: 121 mese/totali, referenze, interessati, clienti, opportunità aperte, membri da ricoltivare |

### UI

- Pagina hub `src/app/(dashboard)/rete-bni/page.tsx` (metriche + lista membri + timeline ultimi 121).
- Componenti `src/components/bni/add-membro-dialog.tsx` e `register-121-dialog.tsx` (mobile-first, creazione membro al volo, referenze dinamiche).
- Navigazione: voce "Rete BNI" in `sidebar.tsx`, `command-palette.tsx`, `mobile-header.tsx`; badge `bniDaLavorare` esposto da `/api/dashboard/mission`.

---

## BNI — due assi, reciprocità e capitoli (v3.33.0)

Estensione del modulo BNI decisa con il piano `PIANO-BNI-ESTREMO.md`. Riferimento
strategico: `STRATEGIA-REVENUE-FIRST.md`.

### Buyer persona — fonte unica

`src/lib/buyer-personas.ts` risolve un problema che esisteva da prima: la definizione
di target viveva in **tre tassonomie non riconciliate** (`segments.ts` con 15
micro-segmenti, i cluster `casa|microturismo|persona` della config ricerche, e
`HIGH/LOW_TICKET_KEYWORDS` in `scoring/lead-score.ts`). Un lead "ristorazione" era
segmento attivo nella prima, assente nella seconda e `low_ticket` nella terza.

Gerarchia adottata — **una sola**:

```
PERSONA (cluster)  →  micro-segmenti (dettaglio)  →  tier (valore)
CASA               →  infissi, porte, edilizia, ferramenta, arredo, giardinaggio
MICROTURISMO       →  immobiliare (property manager, agenzie, strutture ricettive)
PERSONA            →  centri estetici/medici, odontoiatri, laboratori, fisioterapia
ALTRO              →  ristorazione, abbigliamento, tecnologia
```

API principali: `resolvePersona({segment, category, profession})` (prima il dato
strutturato, poi il testo libero), `detectPersona(text)`, `personaFromSegment(seg)`,
`isCorePersona(key)`. Ritorna `null` quando non sa: meglio "non so" di una persona sbagliata.

Campo `Lead.buyerPersona` (`buyer_persona`, indicizzato) e `BniMembro.buyerPersona`.

### Classificatore a due assi

`src/lib/bni/member-classifier.ts` — `classifyMembro({profession, company, website, notes})`
restituisce `{buyerPersona, memberRole, clientScore, partnerScore, personasServed, reasons}`.

| Asse | Campo | Significato |
|------|-------|-------------|
| ① Cliente potenziale | `clientScore` 0-100 | Il membro **è** una buyer persona → gli vendo (audit del sito) |
| ② Partner di potere | `partnerScore` 0-100 | Il membro **serve** le mie personas → mi porta clienti |

`memberRole` ∈ `CLIENTE | PARTNER | CONCORRENTE | NEUTRO`. I due punteggi sono
**indipendenti**: un'agenzia immobiliare è insieme cliente e partner.

- `PARTNER_CATEGORIES` è una tabella con `weight` per categoria (commercialista 95,
  agenzia immobiliare 90, architetto 85, …) e `serves` (personas a cui dà accesso).
  Vince la categoria più forte, le altre aggiungono il 15%; bonus +10 se copre tutte
  e tre le personas. **Non è definitiva**: i pesi si affinano con l'esperienza.
- `COMPETITOR_KEYWORDS` intercetta web agency / SMM / SEO → `CONCORRENTE`, valutato
  per primo perché esclude gli altri ruoli.
- `reasons[]` è la spiegazione leggibile mostrata in UI: senza il "perché" il punteggio
  non è azionabile.
- `oneToOnePriority({clientScore, partnerScore, lastOneToOneAt, isMyChapter})` —
  `partnerScore×2 + clientScore + recency(max 120) + 60 se è il mio capitolo`.

### Reciprocità (Givers Gain)

`src/lib/bni/reciprocity.ts`:
- `extractSeekingTags(text)` — normalizza il "chi cerca" detto a parole in tag
  cercabili (stopword italiane, singolarizzazione grossolana, max 12 tag).
- `scoreCandidate(tags, fields)` — punteggio pesato per campo: professione/categoria ×3,
  nome ×2, zona/note ×1. Restituisce anche `matchedOn` per spiegare il suggerimento.

Modello **`ReferralGiven`** (`referrals_given`): `membroId`, `contactName`, `contactInfo`,
`leadId?`, `note`, `outcome` (`PROPOSTO|ACCETTATO|CHIUSO|NULLA`), `givenAt`. Se il
contatto regalato è un lead del CRM, viene creata un'`Activity` di tipo `NOTE` sulla
sua timeline.

Campi su `BniMembro`: `seeking` (testo libero), `seekingTags` (csv rigenerato a ogni
PATCH del campo `seeking`), `roleLocked` (override manuale: blocca la riclassificazione).

### Capitoli

Modello **`BniChapter`** (`bni_chapters`): `name` **unique** (deve combaciare con
`BniMembro.chapter`, che resta stringa libera — nessuna migrazione delle relazioni),
`city`, `region`, `mode` (`PRESENZA|ONLINE|IBRIDO`), `meetingDay/Time`, `visitStatus`
(`DA_ANALIZZARE|ANALIZZATO|VISITA_PIANIFICATA|VISITATO`), `isMine`.

`GET /api/bni/chapters` unisce i membri raggruppati per nome capitolo ai metadati e calcola:
- `attractiveness` = Σ partnerScore ×2 + Σ clientScore
- `topTargets` — i 5 con `oneToOnePriority` più alta (chi intercettare nel libero networking)
- `personaMix` — composizione per persona, detta il pitch da usare in quel capitolo
- `visitable` — falso solo se `mode === "ONLINE"` (regola: Sardegna di persona, fuori solo ibrido)

### API (tutte protette da `requireSession()`)

| Endpoint | Scopo |
|----------|-------|
| `GET/PATCH/DELETE /api/bni/membri/[id]` | Scheda completa (121, referenze ricevute e date, classificazione ricalcolata, bilancio reciprocità) · update con riclassificazione automatica salvo `roleLocked` |
| `GET /api/bni/match?membroId=&q=` | Matcher di reciprocità: chi regalare a quel membro |
| `GET/POST/PATCH /api/bni/referral-given` | Referenze date e loro esito |
| `GET /api/bni/queue?chapter=&limit=` | Coda 121 prioritizzata (esclude i `CONCORRENTE`) |
| `GET/POST /api/bni/chapters` | Dossier capitoli · upsert metadati per nome |
| `POST /api/bni/classify?all=1` | Riclassificazione retroattiva (salta i `roleLocked`) |

`GET /api/bni/stats` esteso con: `partnersCount`, `clientsCount`, `referralsGivenTotal`,
`referralsGivenThisMonth`, `never121`, `chaptersToVisit`, `reciprocityBalance`.

### UI (v3.33.0)

- `rete-bni/page.tsx` riorganizzata in 4 tab: **Coda 121** (default), **Capitoli**,
  **Membri**, **Ultimi 121**.
- `src/components/bni/membro-121-panel.tsx` — memo 121 mobile-first: campo "chi cerca",
  matcher, registrazione referenza data, bilancio dato/ricevuto.

### Import massivo membri (v3.34.0)

Il vero collo di bottiglia del modulo non era il matching ma l'**anagrafica**: in produzione
c'era **1 membro e 0 capitoli** contro 2807 lead con categoria. Il pool per il matcher era
quindi già ricco; mancavano i membri BNI. Da qui l'import mirato sui capitoli.

- `src/lib/bni/member-parser.ts` — `parseMembers(raw)` su testo libero. Rileva il separatore
  più frequente fra `\t`, `|`, `;`, `—`, `–`, `-` (deve comparire in ≥ metà delle righe),
  con fallback sul formato `Nome (Professione)`. Estrae **e rimuove** email/telefono dalla riga
  prima di assegnare i campi testuali (regex telefoni IT fissi/mobili). Scarta intestazioni e
  titoli (`NOISE_PATTERNS`), deduplica per nome. Ordine campi assunto: Nome · Professione · Azienda.
  Le righe che non rispettano il separatore globale vengono **segnalate con warning, non scartate**.
- `POST /api/bni/membri/import` — `{raw, chapter?, mode: "preview"|"commit", status?}`.
  `preview` non tocca il DB: interpreta, classifica sui due assi, marca i duplicati.
  `commit` usa `createMany({skipDuplicates: true})` e **salta** i duplicati invece di
  sovrascriverli (un import non deve poter cancellare il `seeking` raccolto in un 121).
  Tetto `MAX_MEMBERS = 300` per invocazione, segnalato via `summary.truncated`.
  Se il capitolo è nuovo viene fatto upsert in `BniChapter` con `visitStatus = "ANALIZZATO"`.
- UI: `src/components/bni/import-membri-dialog.tsx` — anteprima obbligatoria con conteggi
  per ruolo, duplicati in trasparenza e warning per riga.

Verifica del classificatore su casi reali (commercialista → PARTNER 100 su 3 personas;
web agency / social media manager → CONCORRENTE; infissi → CLIENTE persona CASA;
property manager e agenzia immobiliare → doppia natura cliente 70 + partner 80/90;
fioraio → NEUTRO).

### Pipeline di vendita BNI (v3.35.0)

Pipeline parallela a quella dei lead freddi, con le tappe del processo reale di Alessio.

- `src/lib/bni/bni-stages.ts` — 7 stadi ordinati: `DA_AVVICINARE → RICHIESTA_121 →
  PREP_REFERENZE → FATTO_121 → OFFERTA → RECALL → CONSOLIDATO`. Ogni stadio ha label,
  icona, colore e `hint` (la prossima azione). Le prime due tappe del funnel narrato
  (visita al capitolo, pitch dedicato) vivono su `BniChapter.visitStatus`, non sul membro.
- Schema: `BniMembro.bniStage` (default `DA_AVVICINARE`, indicizzato) + `nextRecallAt`
  (indicizzato) per la tappa RECALL.
- `PATCH /api/bni/membri/[id]` accetta `bniStage` e `nextRecallAt` (azzerato fuori da RECALL).
- **Coda 121 recall-aware** (`/api/bni/queue`): un membro in `RECALL` con `nextRecallAt`
  scaduto riceve `priority += 1000` e la ragione "recall a scadenza" → risale in cima.
- `/api/bni/stats` espone `offerteAperte` (stage OFFERTA) e `recallDovuti` (RECALL scaduti).
- UI: tab **Pipeline** (membri in colonne per stadio); controllo stadio + data recall nel
  `membro-121-panel.tsx`; badge stadio nella coda; KPI "Recall da fare oggi" / "Offerte aperte".

### Pitch dedicato per capitolo (v3.35.0)

- `src/lib/bni/chapter-pitch.ts` — `generateChapterPitch({personaMix, competitorsCount,
  topTargets, ...})` → `{headline, openingAngle, targets[], competitorWarning, focus}`.
  Persona dominante fra le tre core → tema d'apertura; primi 2-3 target (partner prima) con
  il perché; warning se `competitorsCount > 0`. Esposto da `/api/bni/chapters` come `pitch`,
  reso nel dossier UI come blocco "Come giocartela qui".

### Limiti noti

- Il matcher dipende dalla **qualità dei tag sui contatti**: senza categoria/professione/zona
  produce pochi risultati. Sul lato lead il pool è già ricco (2807 con categoria).
- Il pitch per capitolo è euristico (persona dominante + top target): un promemoria, non un
  documento. Migliora con la qualità della classificazione dei membri.
- L'**ingestione automatica dei membri dai siti region BNI** non è implementata: le pagine
  `findamember` di `bni-sardegnanord/centro/sud.it` caricano i dati via JavaScript, quindi
  serve automazione browser o l'endpoint JSON sottostante. Fallback attuale: inserimento manuale.
- `PARTNER_CATEGORIES` è euristica: va tarata sull'esperienza reale dei 121.

---

## Protezioni e Security

### SSRF Protection (v3.1.0 → centralizzata in v3.17.0)

File: `src/lib/url-validator.ts` + `src/lib/safe-fetch.ts`

Il validatore `src/lib/url-validator.ts` blocca host privati / non instradabili sia come letterale sia **dopo la risoluzione DNS** (anti DNS-rebinding di base), coprendo IPv4 (dotted, decimale, esadecimale, ottale) e IPv6:
- `127.0.0.0/8` (loopback), `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`
- `169.254.0.0/16` (link-local + `169.254.169.254` metadata cloud), `100.64.0.0/10` (CGNAT), `0.0.0.0/8`
- IPv6: `::1`, `::`, `fe80::/10` (link-local), `fc00::/7` (ULA), IPv4-mapped (`::ffff:127.0.0.1`)
- Hostname: `localhost`, `0.0.0.0`, `[::]`, `[::1]`, `metadata.google.internal`
- Protocolli diversi da `http:`/`https:` vengono rifiutati

Funzioni esportate:

| Funzione | Tipo | Uso |
|----------|------|-----|
| `validatePublicUrl(url)` | sincrona | Controllo sui soli letterali (protocollo, hostname, IP letterale). Firma storica. |
| `assertPublicUrl(url)` | async | Validazione COMPLETA: letterali **+** risoluzione DNS con verifica che TUTTI gli IP risolti siano pubblici. Da usare prima di ogni fetch non fidato. |
| `isPrivateAddress(host)` | sincrona | `true` se l'host (IP letterale in qualsiasi forma) è privato/non instradabile. |

Dettagli completi del nuovo wrapper `safeFetch()` nella sezione [Sicurezza — v3.17.0](#1-difesa-ssrf-centralizzata--safefetch).

### Auth Endpoint Interni

- `/api/internal/*` e `/api/cron/*` richiedono header `Authorization: Bearer CRON_SECRET`
- `/api/debug/reset-data` accessibile solo in `NODE_ENV=development` + ruolo `ADMIN`. In produzione ritorna 404.

### Security Headers

Configurati in `next.config.ts`, applicati a tutte le rotte (`source: "/(.*)"`):

| Header | Valore |
|--------|--------|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `X-XSS-Protection` | `1; mode=block` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` (HSTS, 2 anni) |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), interest-cohort=()` |
| `Content-Security-Policy` | baseline compatibile con Next (vedi sotto) |

Inoltre, `images.remotePatterns` è ora una **allowlist esplicita** (`i.ytimg.com`, `img.youtube.com`, `*.googleusercontent.com`, `*.gstatic.com`): rimosso `hostname: "**"` che rendeva l'Image Optimizer un open-proxy. Dettagli nella sezione [Sicurezza — v3.17.0](#3-security-headers--content-security-policy).

### Rate Limiting

- `/api/public/video-view`: 1 request/10s per IP (in-memory Map)
- Rate limit **per-utente** sulle azioni costose autenticate (search, audit, audit-batch, gemini) via `enforceUserRateLimit()` — vedi [Sicurezza — v3.17.0](#2-autorizzazione-in-profondità--rate-limit).

### Limiti Input

- pageSize GET `/api/leads`: cap 1-200
- HTML: rifiutato se > 5MB in `extractStrategicData()` e `fetchAndExtractPageText()`
- POST `/api/leads`: validazione Zod (name required, max lengths)
- POST `/api/scheduled-searches`: validazione Zod (max 50 items, query/location max 255)

### Recovery

- `POST /api/cron/recover-stuck-jobs`: resetta job RUNNING da 30+ min a PENDING

---

## Sicurezza — v3.17.0

Release di sicurezza pre-lancio. Centralizza la difesa SSRF, aggiunge una seconda barriera di autorizzazione + rate limit a livello di handler, irrigidisce gli header HTTP e aggiorna le dipendenze con advisory note.

### 1. Difesa SSRF centralizzata — `safeFetch`

File: `src/lib/safe-fetch.ts`

Nuovo wrapper unico per ogni richiesta verso un URL **non fidato** (sito di un lead). Sostituisce le chiamate dirette a `fetch()`. Garantisce due cose:

1. **Validazione DNS pre-richiesta** — prima di OGNI richiesta chiama `assertPublicUrl(url)` (da `src/lib/url-validator.ts`), che risolve il DNS e blocca host che risolvono a IP privati / loopback / link-local / metadata cloud.
2. **Redirect seguiti manualmente** — usa `redirect: "manual"` e segue i 3xx in un ciclo (max 5 hop di default, `SafeFetchOptions.maxRedirects`), **rivalidando ogni hop** con `assertPublicUrl` prima di seguirlo. Questo chiude il bypass classico *"sito pubblico → 301 → http://169.254.169.254/..."* o *→ IP interno*: un URL d'ingresso pulito non basta più ad aggirare il controllo.

```typescript
export async function safeFetch(
  url: string,
  init: RequestInit = {},
  options: SafeFetchOptions = {}   // { maxRedirects?: number }  (default 5)
): Promise<Response>
```

Comportamento: ad ogni iterazione valida `currentUrl`, esegue `fetch(currentUrl, { ...init, redirect: "manual" })`, e se la risposta è un 3xx con header `Location` risolve la destinazione (anche relativa) e ricomincia il ciclo; oltre il numero massimo di redirect lancia un errore. Tutti i chiamanti usano GET, quindi metodo e header restano invariati a ogni hop.

**Regola per gli sviluppatori:** ogni fetch verso un URL di un lead / sito esterno **DEVE** passare per `safeFetch`. Non usare mai `fetch()` diretto su URL che provengono, direttamente o indirettamente, dai dati di un lead.

**Call-site che usano `safeFetch` (v3.17.0):**

| File | Punto |
|------|-------|
| `src/app/api/audit/route.ts` | Fetch HTML homepage (POST singolo + PUT batch) |
| `src/lib/audit/index.ts` | Orchestratore audit |
| `src/lib/audit/blog-detector.ts` | Fetch pagina blog per date/conteggio post |
| `src/lib/audit/seo-checker.ts` | Fetch `sitemap.xml` e `robots.txt` |
| `src/lib/audit/strategic-extractor.ts` | Fetch pagine interne (import dinamico) |
| `src/lib/gemini-analyst.ts` | Scrape sito per Prompt 1 (Analista) |
| `src/lib/ads-intelligence.ts` | Fetch landing page degli annunci |
| `src/lib/background-jobs.ts` | Fetch HTML nei job in background |
| `src/app/api/internal/batch-analysis/route.ts` | Batch analysis manuale |
| `src/app/api/cron/batch-gemini-analysis/route.ts` | Batch Gemini schedulato |
| `src/app/api/leads/manual/route.ts` | Inserimento lead manuale (fetch sito) |
| `src/app/api/leads/[id]/gemini-analysis/route.ts` | Scraping per analisi Gemini |

### 2. Autorizzazione in profondità + rate limit

File: `src/lib/api-auth.ts`

Helper di autorizzazione usati **dentro** gli handler API come SECONDA barriera. Il middleware (`src/middleware.ts`) resta la **PRIMA** barriera (fail-closed: protegge già tutte le rotte `/api` richiedendo una sessione); questi helper garantiscono che una eventuale regressione del matcher del middleware non esponga da sola dati o azioni sensibili.

| Funzione | Ritorna | Scopo |
|----------|---------|-------|
| `requireSession()` | `Gate` (`{ ok, userId, role }` \| `{ ok:false, response }` con 401) | Richiede una sessione valida |
| `requireAdmin()` | `Gate` (401 senza sessione, 403 se non ADMIN) | Richiede sessione **+** ruolo `ADMIN` |
| `enforceUserRateLimit(scope, userId, max, windowMs)` | `NextResponse` 429 oppure `null` | Rate limit per-utente su azione costosa |

**Pattern d'uso** (vedi `src/app/api/searches/route.ts`, `src/app/api/audit/route.ts`, `src/app/api/leads/[id]/gemini-analysis/route.ts`):

```typescript
const gate = await requireSession();
if (!gate.ok) return gate.response;
const limited = enforceUserRateLimit("search", gate.userId, 15, 10 * 60_000);
if (limited) return limited;
// ... gate.userId, gate.role disponibili
```

La risposta 429 include l'header `Retry-After` (secondi residui della finestra).

**Limiti applicati (per-utente, finestra 10 minuti):**

| Scope | Limite | Rotta |
|-------|--------|-------|
| `search` | 15 / 10 min | `POST /api/searches` |
| `audit` | 40 / 10 min | `POST /api/audit` |
| `audit-batch` | 10 / 10 min | `PUT /api/audit` (batch) |
| `gemini` | 40 / 10 min | `POST /api/leads/[id]/gemini-analysis` |

**Store rate limit** (`src/lib/rate-limit.ts`): `rateLimit(key, max, windowMs)` è **in-memory e per-processo** (Map di bucket con auto-pulizia delle chiavi scadute oltre i 5000 elementi). Va bene come freno ad abusi/brute-force con una **singola istanza PM2** (setup attuale). Per un deploy **multi-istanza** servirebbe uno store condiviso (es. **Redis**) — vedi ROADMAP.

### 3. Security headers + Content-Security-Policy

File: `next.config.ts`

Aggiunta una **`Content-Security-Policy`** come ultima linea di difesa contro XSS/clickjacking. Baseline compatibile con Next (script/style inline ancora ammessi); immagini, font, iframe e media solo via HTTPS; `object-src`/`base-uri`/`form-action` blindati. L'irrigidimento a **nonce** per gli script inline è hardening futuro.

```
default-src 'self'
base-uri 'self'
object-src 'none'
frame-ancestors 'none'
form-action 'self'
script-src 'self' 'unsafe-inline' 'unsafe-eval'
style-src 'self' 'unsafe-inline'
img-src 'self' data: blob: https:
font-src 'self' data:
connect-src 'self' https:
frame-src 'self' https:
media-src 'self' https: blob:
```

Header presenti (tutti su `source: "/(.*)"`): `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`, `Strict-Transport-Security` (HSTS 2 anni, `includeSubDomains; preload`), `Permissions-Policy` (camera/microphone/geolocation/interest-cohort disattivati), `Content-Security-Policy`.

**Image Optimizer non più open-proxy:** `images.remotePatterns` è ora una allowlist esplicita di host (`i.ytimg.com`, `img.youtube.com`, `*.googleusercontent.com`, `*.gstatic.com`). Rimosso il precedente `{ protocol: "https", hostname: "**" }`, che permetteva all'optimizer di proxare immagini da qualsiasi host (vettore SSRF/DoS). Eventuali nuovi host immagine vanno aggiunti qui esplicitamente.

### 4. Dipendenze e advisory

| Pacchetto | Versione | Motivo |
|-----------|----------|--------|
| `next` | 16.1.1 → **16.2.9** | Chiude advisory middleware / SSRF / request smuggling |
| `jspdf` | → **4.2.1** | Patch sicurezza |
| `undici` | → **7.28.0** | Patch sicurezza (transitiva) |
| `form-data` | → **4.0.6** | Patch sicurezza (transitiva) |

**Stato `npm audit --omit=dev`:** 0 critical, 0 high, **9 moderate** residue. Tra queste, l'advisory di `next` traccia a `postcss` (XSS in fase di stringify CSS, **build-time**, non sfruttabile a runtime e non risolvibile senza declassare Next); le restanti moderate sono in dipendenze transitive (es. `nodemailer`, `@anthropic-ai/sdk`, `@hono/node-server` via `@prisma/dev`) e non risultano sfruttabili nel contesto d'uso dell'app. Nessuna vulnerabilità critical/high aperta.

**Requisito Node:** Prisma 7 richiede **Node ≥ 20.19**. Conformi sia il Docker `node:20-slim` sia la CI (`node 20`). `package.json` dichiara `engines.node >= 20.0.0`.

---

## Componenti UI

### Layout
| File | Componente |
|------|-----------|
| `layout/sidebar.tsx` | Sidebar collassabile con badge conteggi e polling |
| `layout/sidebar-context.tsx` | Context per stato collapsed sidebar (localStorage) |
| `layout/command-palette.tsx` | Cmd+K ricerca globale lead + navigazione |
| `layout/breadcrumb.tsx` | Breadcrumb navigazione contestuale |
| `layout/mobile-header.tsx` | Header mobile responsive |
| `layout/bottom-nav.tsx` | Navigazione bottom mobile |

### Lead
| File | Componente |
|------|-----------|
| `leads/audit-button.tsx` | Bottone avvia audit |
| `leads/audit-check.tsx` | Semaforo audit (verde/ambra/rosso) |
| `leads/audit-pdf-button.tsx` | Generazione PDF report audit con jsPDF |
| `leads/audit-radar.tsx` | Radar chart a 6 assi per panoramica audit |
| `leads/pipeline-stage-selector.tsx` | Selettore stadio pipeline |
| `leads/pipeline-page.tsx` | Vista pipeline riutilizzabile (con hideHeader) |
| `leads/score-ring.tsx` | Anello SVG circolare animato per score |
| `leads/talking-points-grouped.tsx` | Talking points raggruppati per servizio |

### Dashboard
| File | Componente |
|------|-----------|
| `dashboard/funnel-chart.tsx` | Funnel chart pipeline con Recharts |

### Shadcn/ui (`components/ui/`)
button, card, dialog, input, textarea, table, tabs, select, dropdown-menu, switch, badge, label, separator, input-otp, sonner, skeleton

---

## Tipi e Interfacce

### Tipi Audit (`src/types/index.ts`)

```typescript
interface AuditData {
  website?: WebsiteAudit;
  seo?: SEOAudit;
  tracking?: TrackingAudit;
  social?: SocialAudit;
  content?: ContentAudit;
  emailMarketing?: EmailMarketingAudit;
  trust?: TrustAudit;
  tech?: TechStackAudit;
}
```

---

## Configurazione

### next.config.ts

```typescript
{
  output: "standalone",
  poweredByHeader: false,
  // Allowlist esplicita (niente "**" → no open-proxy). Vedi Sicurezza v3.17.0.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
      { protocol: "https", hostname: "*.gstatic.com" },
    ],
  },
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-XSS-Protection", value: "1; mode=block" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
        { key: "Content-Security-Policy", value: "/* baseline — vedi Sicurezza v3.17.0 */" },
      ]
    }]
  }
}
```

### middleware.ts

- Protezione JWT su tutte le route — **PRIMA barriera** (fail-closed). La SECONDA barriera è negli handler via `src/lib/api-auth.ts` (`requireSession`/`requireAdmin`).
- Route pubbliche: `/login`, `/forgot-password`, `/reset-password`
- Route API pubblica: `/api/auth`, `/api/public/*`, `/api/health`

### Credenziali Test

| Servizio | Credenziali |
|----------|-------------|
| Login CRM | `admin@agenzia.it` / `admin123` |
| Database locale | `postgresql://alessio@localhost:5432/sales_app` |

---

## Variabili d'Ambiente

```env
# === OBBLIGATORIE ===

# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/sales_app"

# NextAuth
NEXTAUTH_SECRET="openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"     # o https://crm.karalisdemo.it

# === OPZIONALI ===

# Apify (senza token funziona in mock mode)
APIFY_TOKEN=""
APIFY_WEBHOOK_SECRET=""

# Gemini AI
GEMINI_API_KEY=""
GEMINI_MODEL="gemini-2.5-flash"

# Cron Secret (per endpoint interni e cron)
CRON_SECRET=""

# SMTP per email
SMTP_HOST="mail.karalisweb.net"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=""
SMTP_PASSWORD=""
SMTP_FROM="noreply@karalisweb.net"
```

---

## Docker e Deploy

### Docker Compose (3 servizi)

| Servizio | Immagine | Porta | Note |
|----------|---------|-------|------|
| `db` | postgres:16-alpine | interna | Volume: postgres_data |
| `migrate` | build locale | - | Profile: migrate (opzionale) |
| `app` | build locale | 3003:3000 | Dipende da db healthy |

### Dockerfile (Multi-stage)

1. **deps** - Installa npm dependencies
2. **builder** - Genera Prisma client + build Next.js standalone
3. **runner** - Immagine minima con OpenSSL per Prisma

### Deploy in Produzione

Il deploy usa PM2 (non Docker) sul VPS Contabo:

```bash
# Deploy automatico (auto-patch bump):
./deploy.sh "descrizione modifiche"

# Con bump versione esplicito:
./deploy.sh --bump minor "nuova feature"

# Senza bump:
./deploy.sh --no-bump "hotfix veloce"
```

Lo script esegue 9 step: versioning → verifica CHANGELOG → verifica Git → build locale → commit → push → pull VPS → npm install + Prisma → build server → restart PM2 + health check

Vedi `DEPLOY.md` per tutti i dettagli.

---

## Troubleshooting

### Problemi Comuni

| Problema | Soluzione |
|----------|----------|
| App non si avvia | `ssh root@185.192.97.108 'pm2 logs sales-crm --lines 50'` |
| Errore build | `ssh root@185.192.97.108 'cd /opt/sales-app && npm run build 2>&1 \| tail -30'` |
| DB non connesso | Verifica `DATABASE_URL` nel `.env` sul server |
| Prisma errore | `ssh root@185.192.97.108 'cd /opt/sales-app && npx prisma generate'` |
| Porta occupata | `ssh root@185.192.97.108 'lsof -i :3003'` |
| Nginx errore | `ssh root@185.192.97.108 'nginx -t && systemctl reload nginx'` |
| Job bloccati | `curl -X POST .../api/cron/recover-stuck-jobs -H "Authorization: Bearer CRON_SECRET"` |
| Health check | `curl http://localhost:3000/api/health` → `{"status":"ok"}` o 503 |

### Comandi Debug Utili

```bash
# Logs in tempo reale
ssh root@185.192.97.108 'pm2 logs sales-crm'

# Status processo
ssh root@185.192.97.108 'pm2 show sales-crm'

# Apri Prisma Studio (locale)
cd sales-app && npm run db:studio

# Reseed database
npm run db:seed

# Rigenera Prisma client
npx prisma generate

# Backup database
./scripts/backup-db.sh
```

---

*Documentazione aggiornata il 2026-06-16 | KW Sales CRM v3.17.0*

---

## Registro unico dei soggetti (v3.40.0)

Prima tappa della Fase 1 di `PIANO-ORCHESTRAAI-v1.md`. **Additiva**: nessun modello
preesistente è stato toccato.

### Modello dati

| Tabella | Ruolo |
|---|---|
| `subjects` | Soggetto economico canonico. Campi minimi: `display_name`, `google_place_id` (unique), `primary_domain`, `vat_number` (sempre `NULL`, vedi OPEN-02), `country_code`. |
| `subject_identities` | `(source, external_id)` unique. `source` ∈ `crm_lead`, `crm_opportunita`, `crm_bnimembro`, `gads_account`, `seoi_client`, `hub_project`. `payload` jsonb con la fotografia dei campi di origine. |
| `reconciliation_candidates` | Coda manuale. `(left_subject_id, right_subject_id)` unique, `reason`, `score`, `evidence`, `status` ∈ `PENDING`/`MERGED`/`REJECTED`. |

Migrazione: `prisma/migrations/20260811090000_add_subject_registry/`
— `migration.sql` + **`rollback.sql` scritto prima dell'esecuzione** (regola 0.8).
Puramente additiva: 3 `CREATE TABLE`, 2 `CREATE TYPE`, indici, chiavi esterne.
Zero `DROP`, zero `ALTER` distruttivi.

### Codice

```
scripts/subject-registry/
├─ lib/normalize.mjs     normalizzazione domini/nomi, similarità, frequenze
├─ dataset.dev.mjs       dataset finto con attese dichiarate
├─ seed-dev.mjs          popola l'ambiente di sviluppo (rifiuta URL non-localhost)
├─ import.mjs            lettura origini → deduplicazione → scrittura registro
└─ report.mjs            genera docs/inventory/sovrapposizioni.md
```

Pagina: `src/app/(dashboard)/registro-soggetti/page.tsx` (server component, sola lettura).

### Regole di deduplicazione

Uniscono, tramite insiemi disgiunti (union-find):

1. `normalizePlaceId` uguale → stesso soggetto.
2. `normalizeDomain` uguale **e** non in `HOSTING_SUFFIXES` → stesso soggetto.

`normalizeDomain` rimuove schema, credenziali, porta, percorso, query, frammento,
`www.` iniziale e punto finale; scarta IP, host senza punto e TLD di un carattere.

**Non uniscono mai** (finiscono in coda con un punteggio):

| `reason` | Punteggio | Quando |
|---|---:|---|
| `shared_email_domain` | 0,75 | dominio di posta aziendale = dominio di un altro soggetto (i provider pubblici sono in blocklist) |
| `domain_host_mismatch` | 0,65 | un dominio è sottodominio dell'altro |
| `same_normalized_name` | 0,60 | `normalizeName` identica |
| `similar_name` | ≤0,55 | Dice sui bigrammi ≥ 0,80 |
| `shared_distinctive_tokens` | 0,45 | ≥2 token condivisi con copertura ≥50 % del nome più corto; il criterio di rarità su token singolo si attiva solo con corpus ≥ `MIN_CORPUS_FOR_SINGLE_TOKEN` (200) |
| `shared_hosting_domain` | 0,30 | stesso dominio di hosting condiviso |

### Sola lettura sulle origini

- SQLite aperto con `new DatabaseSync(file, { readOnly: true })`.
- PostgreSQL: solo `SELECT`.
- `seed-dev.mjs` termina con errore se `DEV_*_URL` non punta a `localhost`/`127.0.0.1`.
- Il registro è ricostruibile per intero: `import.mjs` fa `TRUNCATE` **solo** delle
  tre tabelle del registro, mai delle anagrafiche.

### Limite noto

`google_ads_accounts` non espone né `place_id` né dominio (`docs/inventory/gads.md`,
S-05): gli account GADS non sono deduplicabili automaticamente e possono solo essere
proposti per somiglianza di ragione sociale.

### Variabili d'ambiente degli script

| Variabile | Uso |
|---|---|
| `SRC_CRM_URL` | copia del DB CRM (lettura) |
| `SRC_GADS_URL` | copia del DB GADS (lettura, opzionale) |
| `SRC_SEOI_DB` | copia del file SQLite SEOI (opzionale) |
| `SRC_HUB_DB` | copia del file SQLite HUB (opzionale) |
| `TARGET_URL` | database che ospita il registro |
| `REPORT_OUT`, `REPORT_STAMP`, `DATASET_LABEL` | generazione del rapporto |

---

## Tenancy e isolamento (v3.41.0)

Seconda tappa della Fase 1 di `PIANO-ORCHESTRAAI-v1.md`. **Additiva.**

### Modello

| Tabella | Note |
|---|---|
| `organizations` | `slug` unique. Invisibile in UI quando ne esiste una sola. |
| `companies` | FK → `organizations` (`onDelete: Restrict`), `slug` unique, `status`, `vat_number`. |
| `projects_core` | FK → `companies`, unique `(company_id, slug)`. Nome fisico scelto per non collidere con `hub.projects` (piano, sezione 3.3). Porta la conoscenza condivisa della sezione 3.4: `value_proposition`, `tone_of_voice`, `reference_contact`. |
| `licences` | Una per Company (`company_id` unique). `max_projects` 2, `max_users` 3: **colonne**, non costanti. |
| `memberships` | `(user_id, role, scope_type, scope_id)` unique. `scope_id` è null solo per `GLOBAL`. |
| `subjects.company_id` | Colonna aggiunta, **nullable**. FK `Restrict`. |

Enum: `TenantStatus`, `MembershipRole` (7 valori, sezione 2 del piano), `ScopeType`
(`GLOBAL`, `ORGANIZATION`, `COMPANY`, `PROJECT`, `RESOURCE`).

Migrazione `20260811120000_add_tenancy` + `rollback.sql` scritto prima
dell'esecuzione. Verificato: zero `DROP TABLE`, zero `DROP COLUMN`, zero
`SET NOT NULL`.

### Codice

```
src/lib/core/
├─ access-context.ts   resolveAccessContext(userId) → AccessContext
├─ tenant-guard.ts     tenantScoped(ctx) → client Prisma già filtrato
└─ __tests__/isolation.test.ts
scripts/tenancy/bootstrap.mjs   avvio idempotente
```

**`resolveAccessContext`** legge le Membership ed espande gli scope:
`ORGANIZATION` → tutte le sue Company. **Non** espande `PROJECT` → `COMPANY`:
sarebbe una scalata di privilegi, e il criterio di completamento della Fase 1
lo vieta esplicitamente.

**`tenantScoped`** usa `$extends` con `$allOperations`. Tre categorie:

| Categoria | Modelli | Filtro |
|---|---|---|
| `SCOPED_BY_COMPANY` | `subject`, `project`, `licence` | `companyId in (...)` |
| `SCOPED_BY_ID` | `company` | `id in (...)` |
| `SCOPED_BY_RELATION` | `subjectIdentity`, `reconciliationCandidate` | risale al soggetto |

`COMMERCIAL_ONLY` (`licence`) è invisibile quando `canSeeCommercialData` è falso.
`PLATFORM_ADMIN` salta ogni filtro. Ambito vuoto → `{ id: { in: [] } }`, mai
nessuna riga. Le scritture: con `where` si restringono, senza `where` devono
dichiarare una `companyId` in ambito, altrimenti sollevano.

I modelli non elencati passano non filtrati **per scelta**: `Lead`, `Activity`,
`Task` e gli altri non hanno ancora una colonna di tenant. Vanno aggiunti alla
mappa quando l'avranno.

### Test

`npm run test:isolation` — dieci casi. Gira solo se `DATABASE_URL` punta a
localhost: `describe.runIf(isLocal)`. Copre lettura, lettura diretta per id,
conteggio, creazione, `updateMany`, `deleteMany` oltre confine, più i casi
`PROJECT_MEMBER` e utente senza alcuna membership.

### Avvio

```bash
npm run tenancy:bootstrap
```

Idempotente. Crea Organizzazione, Azienda, Licenza e Progetto per Karalisweb,
assegna una Membership a ogni utente (`ADMIN` → `PLATFORM_ADMIN` con scope
`GLOBAL`, gli altri → `COMPANY_MEMBER`), e riempie `subjects.company_id` dove
è vuoto. Tutto in una transazione.

### Limite noto

Un `PROJECT_MEMBER` non vede alcun soggetto: i soggetti stanno a livello di
Azienda e non esiste ancora un legame Soggetto ↔ Progetto. È deliberato — la
scelta prudente è non vedere niente, non vedere tutto.

---

## Adapter di sola lettura (v3.43.0)

Criticità 2 del piano, **soluzione di riserva**: accesso in sola lettura ai
database degli altri moduli in attesa delle API. *Mai in scrittura.*

```
src/lib/adapters/
├─ types.ts    EsitoModulo<T>, prova(), forme dei dati
├─ sqlite.ts   apertura readOnly di un file SQLite
├─ gads.ts     PostgreSQL, aggancio per customer_name
├─ seoi.ts     SQLite, aggancio per dominio
└─ hub.ts      SQLite, aggancio per dominio del wp_url
```

**Configurazione** (assente ⇒ modulo mostrato come "non collegato"):

| Variabile | Contenuto |
|---|---|
| `ADAPTER_GADS_URL` | stringa di connessione, utenza in sola lettura |
| `ADAPTER_SEOI_DB` | percorso del file SQLite |
| `ADAPTER_HUB_DB` | percorso del file SQLite |

**Garanzie.** `leggiSqlite` apre con `{ readOnly: true }`. Su PostgreSQL solo
`SELECT`, pool limitato a 2 connessioni. `prova()` cattura l'errore e lo
restituisce come `EsitoModulo`: un modulo irraggiungibile non propaga
l'eccezione e non fa cadere la pagina.

`node:sqlite` è importato con specificatore calcolato e tipizzato a mano:
`@types/node` è alla 20 e non lo dichiara ancora. `next.config.ts` lo elenca in
`serverExternalPackages` perché non va impacchettato.

**Pagina** `src/app/(dashboard)/registro-soggetti/[id]/page.tsx`, server
component. Legge il soggetto dal **client filtrato**: un id fuori ambito
produce 404, non una fuga di dati.

**Limite noto.** L'aggancio a GADS è per `lower(customer_name)`. È debole e
dichiarato: quella tabella non ha `place_id` né dominio. Quando GADS avrà una
delle chiavi canoniche, l'adapter va cambiato.

---

## Squadra di agenti (v3.44.0)

Progetto e decisioni: `PROGETTO-AGENTI.md`. Il CRM viene riprogettato come squadra di agenti;
il passo 1 introduce il motore (lavori, referti, regista, cassetta) e i quattro agenti economici.

### Tabelle (nuove, separate da `leads`)

| Tabella | Modello | Ruolo |
|---|---|---|
| `agent_runs` | `AgentRun` | Un lavoro = un agente su un'azienda. Stato `IN_CODA/IN_CORSO/FATTO/FALLITO`, errore, costo in centesimi. Sostituisce le code in memoria: sopravvive ai riavvii. |
| `agent_reports` | `AgentReport` | Il referto: `summary`, `findings` (JSON dell'agente), `levers` `[{servizio, testo, prova}]`, `evidence` `[{cosa, fonte, citazione}]`, `confidence`, `valid_until`. |
| `approval_items` | `ApprovalItem` | La cassetta: `kind` (`FASCICOLO_BASE`), `payload`, stato `IN_ATTESA/APPROVATO/SCARTATO`, chi e quando ha deciso. |

Migrazione: `prisma/migrations/20261015090000_squadra_agenti/migration.sql`, **solo additiva e
idempotente**, da applicare a mano con `psql` (il DB di produzione ha `_prisma_migrations` vuota).

**Schema = produzione.** Dalla 3.44 lo schema contiene anche `module_entitlements` (enum
`PlatformModule`) e 11 colonne di `projects_core` che esistevano solo nel DB di produzione (lavoro
del branch `fase1`, mai arrivato in main). Senza, `db push --accept-data-loss` del deploy le
avrebbe cancellate. Verifica: `prisma migrate diff --from-config-datasource --to-schema` su una
copia di produzione deve essere vuoto.

### Codice (`src/lib/agents/`)

| File | Contenuto |
|---|---|
| `tipi.ts` | `Leva`, `Prova`, `Referto`, `AgenteEseguibile`, `SERVIZI` |
| `pagina.ts` | `scaricaPagina` (homepage SSRF-safe, header da browser, URL finale dopo i redirect), `scaricaTesto` |
| `agenti/tecnico.ts` | 2.5 — `detectTech` + anno del © (`annoCopyright`) + PHP da `X-Powered-By`. Validità 90 gg |
| `agenti/seo.ts` | 3 — `checkSEO` → leve. Validità 60 gg |
| `agenti/blog.ts` | 3.5 — API WordPress → feed RSS/Atom → `checkBlog`. Validità 30 gg |
| `agenti/tracciamenti.ts` | 5 — `detectTracking` → leve; con GTM la fiducia scende a MEDIA. Validità 60 gg |
| `registro.ts` | `SQUADRA` (tutti gli agenti previsti, con stato) e `AGENTI_ESEGUIBILI` |
| `regista.ts` | **Logica pura**: `agentiDaEseguire` (validità, pausa 20 h dopo un fallimento, stop dopo 3 di fila), `valutaFascicolo` (soglia 3 leve) |
| `turno.ts` | Accesso al DB: `sbloccaLavori` (IN_CORSO > 30 min → FALLITO), `scegliAziende` (prima le mai viste per `opportunity_score`, poi scaduti/da riprovare), `lavoraSuAzienda` (homepage scaricata una volta per tutti gli agenti), `proponiInCassetta` (una volta per azienda), `eseguiTurno` (4 aziende in parallelo) |

Aziende escluse: senza sito, `unsubscribed`, stadi `NON_TARGET`, `SENZA_SITO`, `CLIENTE`, `PERSO`, `ARCHIVIATO`.

Test: `src/lib/agents/__tests__/` (regista e i quattro agenti, su HTML/feed finti).

### API

| Rotta | Auth | Cosa fa |
|---|---|---|
| `POST /api/cron/squadra?limit=20` | `CRON_SECRET` | Un turno (max 100 aziende) |
| `POST /api/squadra/lancia` | ADMIN, 6 lanci/10 min | Turno a mano, max 10 aziende |
| `GET /api/squadra` | sessione | Registro + lavori 7 gg + conteggi + errori più frequenti |
| `GET /api/cassetta?stato=` | sessione | Voci della cassetta con l'azienda |
| `POST /api/cassetta/[id]` | sessione | `{decisione: APPROVATO|SCARTATO}`; una voce si decide una volta sola (409 se già decisa) |

Pagine: `/squadra`, `/cassetta`; componente `FascicoloCard` nella scheda lead. Badge `cassetta` in `/api/dashboard/mission`.

### Orologio

Crontab del VPS (unico scheduler):
`15 0-5 * * * curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3003/api/cron/squadra?limit=20"` → 6 turni a notte, ~120 aziende.

### Limiti noti

- Su 20 aziende reali, 7 siti hanno risposto 403/503 (protezioni anti-programma): si potranno leggere solo con gli agenti di browser.
- I tag dentro Google Tag Manager non si vedono dall'HTML statico: l'agente Tracciamenti lo dichiara.
- "Approfondisci" in cassetta per ora registra solo la decisione.


---

## Squadra di agenti completa (v3.45.0)

Tutti gli agenti di `PROGETTO-AGENTI.md` sono in `src/lib/agents/`. Registro e istruzioni dei
lavori di browser: `registro.ts`.

### L'imbuto (`turno.ts`)

1. **Base** (gratis) — `tecnico`, `seo`, `blog`, `tracciamenti` su tutte le aziende con sito
   (`BASE_AZIENDE`). Con ≥ 3 leve → `ApprovalItem` `FASCICOLO_BASE`.
2. **Approfondimento** — solo se `FASCICOLO_BASE` è `APPROVATO`: agenti di server a pagamento
   `lettore` (AI), `posizioni` (DataForSEO SERP), `google_ads` (DataForSEO Ads Transparency,
   `target` = dominio, annuncio "attivo" se `last_shown` negli ultimi 14 giorni) + lavori di browser
   accodati (`social`, `meta_ads`, `linkedin_azienda`, `decision_maker`), una volta sola, senza
   ripetizione automatica se falliscono.
3. **Sintesi** — quando tutti gli agenti dell'approfondimento hanno chiuso (referto valido o
   fallimento; i lavori di browser mai presi scadono dopo 3 giorni): catena `coerenza` →
   `regista_video` → `scheda_leve` → `aggancio` (si riparte dal primo anello mancante; al primo
   errore la catena si ferma). Poi `ApprovalItem` `SCHEDA_CONTATTO` (una per azienda).

Ogni turno: `sbloccaLavori` (server IN_CORSO > 30 min, browser IN_CORSO > 3 h, browser IN_CODA > 3
giorni → FALLITO), poi le approvate (`ceil(limit/4)`), poi la raccolta base.

### Moduli

| File | Ruolo |
|---|---|
| `ai.ts` | `chiediJSON` — Claude `claude-opus-5-5` (structured output, `fallbacks: "default"`, effort medium) se `ANTHROPIC_API_KEY`, altrimenti Gemini (`GEMINI_MODEL`, default `gemini-2.5-flash`). `REGOLE_COMUNI`: Metodo SD, niente fatti inventati, niente tono da venditore |
| `costi.ts` | Costo in centesimi di euro (decimali): DataForSEO dal campo `cost` della risposta; AI da token × `LISTINO_AI`. Cambio USD→EUR fisso `AGENTI_EUR_PER_USD` (default 0,92: **assunzione**). Tetto `AGENTI_BUDGET_EUR` (default 70) |
| `dataforseo.ts` | Client con costo; `dominio()` |
| `materiali.ts` | Referti in forma compatta per l'AI; `citazioneVera` (anti-allucinazione, accetta citazioni composte " / ") |
| `agenti/lettore.ts`, `posizioni.ts`, `google-ads.ts`, `sintesi.ts` | Agenti 2, 3, 4, 11, 13, 12, 10 |
| `esploratore.ts` | Agente 1 (Google Search): prossima coppia `SearchCategory` × `SearchLocation` non cercata da 60 giorni, SERP depth 30, filtro `NON_AZIENDE`, dedup per dominio, franchising → `NON_TARGET`; lead `source = "google_search"`, `address` = città |
| `browser.ts` | Coda browser: `prendiLavori` (presa atomica), `SchemaChiusura` (zod), `chiudiLavoro`; validità per agente |
| `bni-regole.ts` | **Puro**: `stessoRuolo`, `eSardo`, `formatoDa`, `dirigenzaDa`, `coperturaCapitolo`, `azioneCapitolo`, `REGIONI_ITALIA` |
| `bni.ts` | `importaMappaBni` (crea/completa capitoli e membri, non cancella), `eseguiTurnoBni`: B4 copertura (referto per capitolo, 1 giorno), B2 azione per capitolo (`AZIONE_BNI`, Sardegna ogni 7 giorni, altrove ogni 60), B1 accoda una regione (90 giorni), B3 messaggi per le azioni approvate (`MESSAGGIO_BNI`) |

### Database (migrazione `20261016090000_squadra_completa`, additiva, via psql)

- `agent_runs`, `agent_reports`, `approval_items`: `lead_id` facoltativo + `bni_chapter_id`,
  `bni_membro_id`; `agent_runs.input` (JSONB); `agent_runs.cost_cents` → `DOUBLE PRECISION`.
- `bni_chapters`: `regione_italiana`, `provincia`, `bni_connect_url`, `mapped_at`.
- `bni_membri`: `leadership_role`, `conosciuto_at` (PATCH `/api/bni/membri/[id]` accetta
  `conosciuto` e `leadershipRole`).

### API

| Rotta | Auth | Cosa fa |
|---|---|---|
| `POST /api/cron/squadra?limit=20` | `CRON_SECRET` | Turno commerciale (base + approfondimento + sintesi) |
| `POST /api/cron/squadra-bni` | `CRON_SECRET` | Turno BNI |
| `POST /api/cron/esploratore?ricerche=1` | `CRON_SECRET` | Ricerche Google (max 5) |
| `GET /api/agenti/browser/lavori?limit=5` | `AGENTI_BROWSER_KEY` (middleware) | Presa in carico lavori di browser |
| `POST /api/agenti/browser/referto` | `AGENTI_BROWSER_KEY` | Chiusura con referto validato (400 con dettaglio se non valido, 409 se non in corso) |
| `POST /api/squadra/lancia` | ADMIN | `{squadra: commerciale|bni|esploratore}` |

`ApprovalItem.kind`: `FASCICOLO_BASE`, `SCHEDA_CONTATTO`, `AZIONE_BNI`, `MESSAGGIO_BNI`
(approvato → membro da `DA_AVVICINARE` a `RICHIESTA_121`).

### Agenti di browser

Istruzioni operative in `agenti-browser/ISTRUZIONI.md`; attività programmata nell'app Claude del
Mac di Alessio. Credenziali sul Mac in `~/.karalisweb/agenti-browser.env` (fuori dal repo).

### Orologio (crontab VPS)

- `15 0-5 * * *` squadra (20 aziende a turno)
- `0 7 * * *` squadra-bni
- `30 6,14 * * 1-5` esploratore (1 ricerca)

### Limiti noti

- Gli agenti di browser lavorano solo con il Mac acceso e l'app Claude aperta.
- Il costo dell'AI è calcolato dai token con il listino in `costi.ts`; il cambio dollaro→euro è fisso.
- I nomi delle aziende trovate su Google sono ricavati dal titolo o dal dominio: possono essere imprecisi.
