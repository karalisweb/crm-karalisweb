# KW Sales CRM - Documentazione Tecnica

Versione: **3.11.0** | Ultimo aggiornamento: 2026-04-14

---

## Indice

1. [Stack Tecnologico](#stack-tecnologico)
2. [Architettura](#architettura)
3. [Database Schema](#database-schema)
4. [API Routes](#api-routes)
5. [Pagine Dashboard](#pagine-dashboard)
6. [Moduli Audit](#moduli-audit)
7. [Analisi AI (Gemini)](#analisi-ai-gemini)
8. [Protezioni e Security](#protezioni-e-security)
9. [Componenti UI](#componenti-ui)
10. [Tipi e Interfacce](#tipi-e-interfacce)
11. [Configurazione](#configurazione)
12. [Variabili d'Ambiente](#variabili-dambiente)
13. [Docker e Deploy](#docker-e-deploy)
14. [Troubleshooting](#troubleshooting)

---

## Stack Tecnologico

| Layer | Tecnologia | Versione |
|-------|-----------|----------|
| **Framework** | Next.js (App Router) | 16.1.1 |
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
| **PDF Generation** | jsPDF | 3.x |
| **Process Manager** | PM2 | (server) |

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
│   │   ├── url-validator.ts   # Protezione SSRF
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
- **SSRF Protection**: Validazione URL prima di ogni fetch esterno
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
3. Fetch HTML homepage (timeout 10s, SSRF check)
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

## Protezioni e Security

### SSRF Protection (v3.1.0)

File: `src/lib/url-validator.ts`

Tutti i fetch di URL esterni passano per `validatePublicUrl()` che blocca:
- `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`
- `169.254.169.254` (metadata cloud)
- `localhost`, `::1`, `0.0.0.0`

### Auth Endpoint Interni

- `/api/internal/*` e `/api/cron/*` richiedono header `Authorization: Bearer CRON_SECRET`
- `/api/debug/reset-data` accessibile solo in `NODE_ENV=development` + ruolo `ADMIN`. In produzione ritorna 404.

### Security Headers

Configurati in `next.config.ts`:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

### Rate Limiting

- `/api/public/video-view`: 1 request/10s per IP (in-memory Map)

### Limiti Input

- pageSize GET `/api/leads`: cap 1-200
- HTML: rifiutato se > 5MB in `extractStrategicData()` e `fetchAndExtractPageText()`
- POST `/api/leads`: validazione Zod (name required, max lengths)
- POST `/api/scheduled-searches`: validazione Zod (max 50 items, query/location max 255)

### Recovery

- `POST /api/cron/recover-stuck-jobs`: resetta job RUNNING da 30+ min a PENDING

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
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" }
    ]
  },
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-XSS-Protection", value: "1; mode=block" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ]
    }]
  }
}
```

### middleware.ts

- Protezione JWT su tutte le route
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

*Documentazione aggiornata il 2026-03-15 | KW Sales CRM v3.1.0*
