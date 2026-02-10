# KW Sales CRM - Documentazione Tecnica

Versione: **2.0.0** | Ultimo aggiornamento: 2026-02-10

---

## Indice

1. [Stack Tecnologico](#stack-tecnologico)
2. [Architettura](#architettura)
3. [Database Schema](#database-schema)
4. [API Routes](#api-routes)
5. [Pagine Dashboard](#pagine-dashboard)
6. [Moduli Audit](#moduli-audit)
7. [Sistema Commerciale](#sistema-commerciale)
8. [Job Asincroni (Inngest)](#job-asincroni)
9. [Componenti UI](#componenti-ui)
10. [Tipi e Interfacce](#tipi-e-interfacce)
11. [Configurazione](#configurazione)
12. [Variabili d'Ambiente](#variabili-dambiente)
13. [Docker e Deploy](#docker-e-deploy)
14. [Troubleshooting](#troubleshooting)
15. [Changelog Recente](#changelog-recente)

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
| **Job Queue** | Inngest | 3.49.1 |
| **Scraping** | Apify Client | 2.21.0 |
| **HTML Parsing** | Cheerio | 1.1.2 |
| **Email** | Nodemailer | 7.0.12 |
| **Drag & Drop** | @hello-pangea/dnd | 18.0.1 |
| **Forms** | React Hook Form + Zod | 7.71.0 / 4.3.5 |
| **Toasts** | Sonner | 2.0.7 |
| **Icons** | Lucide React | 0.562.0 |
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
│   │   ├── (dashboard)/       # Pagine app protette
│   │   │   ├── page.tsx       # Dashboard principale
│   │   │   ├── leads/         # Lista e dettaglio lead
│   │   │   ├── da-chiamare/   # Vista "Da Chiamare"
│   │   │   ├── da-verificare/ # Vista "Da Verificare"
│   │   │   ├── appuntamenti/  # Appuntamenti
│   │   │   ├── offerte/       # Offerte inviate
│   │   │   ├── clienti-msd/   # Clienti acquisiti
│   │   │   ├── search/        # Nuova ricerca
│   │   │   ├── searches/      # Storico ricerche
│   │   │   ├── audit/         # Gestione audit
│   │   │   ├── settings/      # Impostazioni
│   │   │   ├── profile/       # Profilo utente
│   │   │   ├── guida/         # Guida utente
│   │   │   └── ...            # Altre viste pipeline
│   │   ├── api/               # API Routes (vedi sotto)
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
│   │   ├── audit/             # Moduli audit (12 file)
│   │   ├── commercial/        # Sistema tagging commerciale
│   │   └── utils.ts           # Utility condivise
│   ├── inngest/               # Job asincroni
│   │   ├── client.ts
│   │   └── functions/
│   └── types/                 # TypeScript interfaces
│       ├── index.ts
│       └── commercial.ts
├── docker-compose.yml
├── Dockerfile
├── deploy.sh                  # Script deploy automatico
├── DEPLOY.md                  # Guida deploy
├── TECHNICAL-DOCS.md          # Questa documentazione
└── CLAUDE.md                  # Istruzioni AI per sviluppo
```

### Pattern Architetturali

- **Server Components**: Next.js App Router con approccio server-first
- **API Routes**: Handler REST in `src/app/api/`
- **Middleware**: Protezione route con NextAuth JWT (`src/middleware.ts`)
- **Background Jobs**: Inngest per audit e ricerche pesanti
- **Database Access**: Prisma ORM con singleton pattern (`src/lib/db.ts`)
- **Type Safety**: Full TypeScript, validazione con Zod
- **State Management**: React useState + server-side data fetching

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
| **Audit** | | |
| `auditStatus` | AuditStatus | PENDING/RUNNING/COMPLETED/FAILED/NO_WEBSITE/TIMEOUT |
| `auditCompletedAt` | DateTime? | |
| `opportunityScore` | Int? | 0-100 |
| `auditData` | Json? | Risultati audit completi |
| `talkingPoints` | String[] | Punti commerciali |
| **Sistema Commerciale** | | |
| `commercialTag` | CommercialTag? | Tag automatico |
| `commercialSignals` | Json? | 5 segnali commerciali |
| `commercialPriority` | Int? | 1-4 (1 = massima) |
| `isCallable` | Boolean | Pronto per chiamata |
| **Pipeline CRM** | | |
| `pipelineStage` | PipelineStage | 12 stadi possibili |
| `callAttempts` | Int | Tentativi chiamata |
| `lastCallOutcome` | CallOutcome? | Ultimo esito |
| `mainObjection` | Objection? | Obiezione principale |
| `appointmentAt` | DateTime? | Data appuntamento |
| `offerSentAt` | DateTime? | Data invio offerta |
| **Verifica Audit** | | |
| `auditVerified` | Boolean | Verificato da Daniela |
| `auditVerifiedAt` | DateTime? | |
| `auditVerifiedBy` | String? | |
| `auditVerificationChecks` | Json? | Checklist + note |

#### Activity

| Campo | Tipo | Note |
|-------|------|------|
| `id` | UUID | |
| `leadId` | UUID | FK a Lead |
| `type` | ActivityType | CALL, NOTE, EMAIL_SENT, MEETING, PROPOSAL_SENT, STAGE_CHANGE |
| `outcome` | CallOutcome? | Solo per CALL |
| `notes` | String? | |
| `createdBy` | String? | |
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

### Enum Pipeline Stages

```
NEW → DA_VERIFICARE → DA_CHIAMARE → NON_RISPONDE → RICHIAMARE
→ CALL_FISSATA → NON_PRESENTATO → OFFERTA_INVIATA → VINTO / PERSO
(laterali: NON_TARGET, SENZA_SITO)
```

### Enum Commerciali

**CommercialTag**: `ADS_ATTIVE_CONTROLLO_ASSENTE` | `TRAFFICO_SENZA_DIREZIONE` | `STRUTTURA_OK_NON_PRIORITIZZATA` | `DA_APPROFONDIRE` | `NON_TARGET`

**Priorita**: 1 (massima) - 4 (minima)

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
| GET/POST | `/api/leads` | Lista / crea lead |
| GET/PATCH/DELETE | `/api/leads/[id]` | CRUD lead |
| POST | `/api/leads/[id]/quick-log` | Log rapido chiamata |
| POST | `/api/leads/[id]/verify` | Verifica audit (checklist + note) |
| GET | `/api/leads/stats` | Statistiche lead |
| GET | `/api/leads/recalculate-stages` | Ricalcola pipeline |
| GET | `/api/da-chiamare` | Lead da chiamare oggi |
| GET | `/api/callable-today` | Lead chiamabili oggi |

### Ricerche

| Metodo | Route | Descrizione |
|--------|-------|-------------|
| GET/POST | `/api/searches` | Gestione ricerche |
| GET | `/api/searches/[id]` | Dettaglio ricerca |

### Audit

| Metodo | Route | Descrizione |
|--------|-------|-------------|
| POST | `/api/audit` | Avvia audit sito |
| GET | `/api/audit/status` | Stato audit |
| GET | `/api/audit/stream` | Stream progresso |

### Impostazioni

| Metodo | Route | Descrizione |
|--------|-------|-------------|
| GET/POST | `/api/settings/crm` | Configurazione CRM |
| GET/POST | `/api/settings/search-config` | Config ricerche |
| GET/POST | `/api/settings/api-config` | Config API |
| POST | `/api/settings/test-apify` | Test connessione Apify |

### Inngest

| Metodo | Route | Descrizione |
|--------|-------|-------------|
| POST | `/api/inngest` | Webhook handler Inngest |

---

## Pagine Dashboard

| Path | Descrizione | File |
|------|-------------|------|
| `/` | Dashboard principale | `(dashboard)/page.tsx` |
| `/leads` | Lista lead | `(dashboard)/leads/page.tsx` |
| `/leads/[id]` | Dettaglio lead | `(dashboard)/leads/[id]/page.tsx` |
| `/da-chiamare` | Lead da chiamare | `(dashboard)/da-chiamare/page.tsx` |
| `/da-verificare` | Lead da verificare | `(dashboard)/da-verificare/page.tsx` |
| `/appuntamenti` | Appuntamenti | `(dashboard)/appuntamenti/page.tsx` |
| `/offerte` | Offerte inviate | `(dashboard)/offerte/page.tsx` |
| `/clienti-msd` | Clienti acquisiti | `(dashboard)/clienti-msd/page.tsx` |
| `/search` | Nuova ricerca | `(dashboard)/search/page.tsx` |
| `/searches` | Storico ricerche | `(dashboard)/searches/page.tsx` |
| `/searches/[id]` | Dettaglio ricerca | `(dashboard)/searches/[id]/page.tsx` |
| `/audit` | Gestione audit | `(dashboard)/audit/page.tsx` |
| `/oggi` | Riepilogo giornaliero | `(dashboard)/oggi/page.tsx` |
| `/non-target` | Non in target | `(dashboard)/non-target/page.tsx` |
| `/senza-sito` | Senza sito web | `(dashboard)/senza-sito/page.tsx` |
| `/persi` | Lead persi | `(dashboard)/persi/page.tsx` |
| `/parcheggiati` | Lead parcheggiati | `(dashboard)/parcheggiati/page.tsx` |
| `/archivio` | Archivio | `(dashboard)/archivio/page.tsx` |
| `/settings` | Impostazioni | `(dashboard)/settings/page.tsx` |
| `/profile` | Profilo utente | `(dashboard)/profile/page.tsx` |
| `/guida` | Guida per Daniela | `(dashboard)/guida/page.tsx` |

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
| `pagespeed.ts` | `getPageSpeedData()` | Performance, accessibility, Core Web Vitals (via Google API) |
| `score-calculator.ts` | `calculateOpportunityScore()` | Calcola score 0-100 pesato su tutte le aree |
| `talking-points.ts` | `generateTalkingPoints()` | Genera frasi commerciali per area di servizio |
| `verification-checklist.ts` | `generateVerificationChecklist()` | Checklist verifica con Sì/No e note |

### Flusso Audit

```
1. Utente clicca "Avvia Audit"
2. API /api/audit riceve richiesta
3. Inngest job "run-audit" viene accodato
4. Job scarica HTML homepage (timeout 10s)
5. Esegue tutti i check in parallelo (~5-15s)
6. Calcola Opportunity Score (0-100)
7. Genera Talking Points per servizio
8. Assegna Commercial Tag automatico
9. Salva tutto in auditData (JSON)
10. Aggiorna auditStatus = COMPLETED
```

---

## Sistema Commerciale

File in `src/lib/commercial/`:

| File | Funzione |
|------|----------|
| `commercial-tagger.ts` | Assegna tag commerciali ai lead |
| `ads-evidence-detector.ts` | Rileva evidenze di advertising |
| `commercial-signals-detector.ts` | Analizza 5 segnali chiave |
| `index.ts` | Aggregatore |

### I 5 Segnali Commerciali

1. **Ads Evidence** - Evidenze di advertising attivo (strong/medium/weak/none)
2. **Tracking Presence** - Presenza di tracking sul sito
3. **Consent Mode V2** - Conformita Consent Mode
4. **CTA Clarity** - Chiarezza delle call-to-action
5. **Offer Focus** - Focus dell'offerta commerciale

### I 5 Tag Commerciali

| Tag | Priorita | Significato |
|-----|----------|-------------|
| `ADS_ATTIVE_CONTROLLO_ASSENTE` | 1 | Fanno ads ma senza tracking → massima opportunita |
| `TRAFFICO_SENZA_DIREZIONE` | 2 | Hanno traffico ma nessuna strategia |
| `STRUTTURA_OK_NON_PRIORITIZZATA` | 3 | Sito ok ma margini di miglioramento |
| `DA_APPROFONDIRE` | 4 | Servono piu dati per valutare |
| `NON_TARGET` | - | Non in target, da archiviare |

---

## Job Asincroni

### Inngest Functions (`src/inngest/functions/`)

**run-audit.ts** - Esecuzione audit completo
- Concorrenza: max 5 audit simultanei
- Retry: 2 tentativi
- Timeout: 90 secondi per sito
- Steps: fetch HTML → SEO check → tracking → social → trust → blog → email → tech → pagespeed → score → talking points → save

---

## Componenti UI

### Layout
| File | Componente |
|------|-----------|
| `layout/sidebar.tsx` | Sidebar navigazione desktop |
| `layout/mobile-header.tsx` | Header mobile responsive |
| `layout/bottom-nav.tsx` | Navigazione bottom mobile |

### Lead
| File | Componente |
|------|-----------|
| `leads/lead-card.tsx` | Card lead nella lista |
| `leads/quick-call-logger.tsx` | Bottoni esito chiamata rapido |
| `leads/audit-button.tsx` | Bottone avvia audit |
| `leads/pipeline-stage-selector.tsx` | Selettore stadio pipeline |
| `leads/pipeline-page.tsx` | Vista pipeline kanban |

### Shadcn/ui (`components/ui/`)
button, card, dialog, input, textarea, table, tabs, select, dropdown-menu, checkbox, switch, badge, avatar, label, separator, scroll-area, sheet, input-otp, sonner, skeleton

---

## Tipi e Interfacce

### Tipi Audit (`src/types/index.ts`)

```typescript
interface AuditData {
  website?: WebsiteAudit;     // Performance, mobile, HTTPS, form
  seo?: SEOAudit;             // Meta, H1, sitemap, schema
  tracking?: TrackingAudit;   // GA, pixel, GTM, ads
  social?: SocialAudit;       // Link social
  content?: ContentAudit;     // Blog, ultimo post
  emailMarketing?: EmailMarketingAudit;
  trust?: TrustAudit;         // GDPR, privacy, trust
  tech?: TechStackAudit;      // CMS, framework
}

interface VerificationItem {
  key: string;
  label: string;
  hint: string;
  detectedValue: boolean | null;  // Sì/No badge
  checked: boolean;
  checkedAt?: string;
}

interface VerificationChecks {
  items: VerificationItem[];
  notes?: string;                  // Note di Daniela
}
```

### Tipi Commerciali (`src/types/commercial.ts`)

```typescript
interface CommercialSignals {
  adsEvidence: { level: AdsEvidenceLevel; details: string[] };
  trackingPresence: { hasTracking: boolean; details: string[] };
  consentModeV2: { hasConsentMode: boolean; details: string[] };
  ctaClarity: { isClean: boolean; details: string[] };
  offerFocus: { hasOffer: boolean; details: string[] };
}
```

---

## Configurazione

### next.config.ts

```typescript
{
  output: "standalone",         // Build per Docker/PM2
  poweredByHeader: false,       // Nascondi header Server
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" }
    ]
  }
}
```

### middleware.ts

- Protezione JWT su tutte le route
- Route pubbliche: `/login`, `/forgot-password`, `/reset-password`
- Route API pubblica: `/api/auth`, `/api/test` (solo dev)

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

# Inngest
INNGEST_EVENT_KEY=""
INNGEST_SIGNING_KEY=""

# PageSpeed Insights (25k req/giorno gratis)
PAGESPEED_API_KEY=""

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
# Deploy automatico:
./deploy.sh "descrizione modifiche"

# Con bump versione:
./deploy.sh --bump patch "fix bug"
./deploy.sh --bump minor "nuova feature"
```

Lo script esegue: commit → push → pull VPS → npm install → prisma generate → build → pm2 restart

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
| Audit fallisce | Controlla log audit in `pm2 logs`, spesso timeout rete |
| Lead duplicati | Deduplicazione su `placeId` - controllare se manca |

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

# Esegui migrazioni
npx prisma migrate deploy
```

---

## Changelog Recente

### 2026-02-10

**Verifica Audit - Miglioramenti UX**
- Checklist verifica ora mostra **badge Sì/No** per ogni voce (Analytics, Pixel, Google Ads, Cookie Banner, Form, Blog) invece di mostrare solo le voci negative
- Aggiunto **campo "Note verifica"** con salvataggio automatico (debounce 1s) per consentire a Daniela di scrivere osservazioni
- Le note vengono salvate nel DB in `auditVerificationChecks.notes` e incluse nell'activity log
- Aggiornata la **Guida Utente** (`/guida`) con istruzioni sui nuovi badge Sì/No e sul campo note

**File modificati:**
- `src/lib/audit/verification-checklist.ts` - Nuova logica con `detectedValue` per tutte le voci
- `src/types/index.ts` - Aggiunto `detectedValue` a `VerificationItem`, `notes` a `VerificationChecks`
- `src/app/(dashboard)/da-chiamare/page.tsx` - Badge Sì/No, textarea note, debounce save
- `src/app/api/leads/[id]/verify/route.ts` - Salvataggio note nella verifica
- `src/app/(dashboard)/guida/page.tsx` - Istruzioni aggiornate

---

*Documentazione generata automaticamente. Per aggiornare, modificare questo file e committare.*
