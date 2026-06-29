# KW Sales CRM - Documentazione Tecnica

Versione: **3.25.0** | Ultimo aggiornamento: 2026-06-29

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
