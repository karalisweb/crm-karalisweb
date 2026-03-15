# KW Sales CRM

Versione: **3.1.0** | [Changelog](CHANGELOG.md) | [Guida Utente](GUIDA_UTENTE.md) | [Docs Tecniche](TECHNICAL-DOCS.md) | [Deploy](DEPLOY.md)

CRM per il supporto commerciale di un'agenzia di web marketing. Consente di cercare lead su Google Maps, analizzare i loro siti web con AI (Gemini), e gestire il ciclo di vendita.

## Funzionalita

- **Scouting automatizzato**: Cerca attivita su Google Maps tramite Apify
- **Analisi Strategica AI (Gemini)**: Analisi marketing completa con AI generativa + script video personalizzati
- **Opportunity Score**: Punteggio 0-100 basato sui problemi rilevati
- **Ads Intelligence**: Check Google Ads + Meta Ads attive via Apify
- **WhatsApp estrazione**: Numero WhatsApp estratto automaticamente dal sito o da Google Maps
- **Video Outreach**: Token unico per lead, tracking visualizzazioni, notifiche real-time
- **Pipeline CRM**: Gestione del ciclo di vendita con pipeline completa
- **Ricerche Programmate**: Ricerche notturne automatizzate (2/notte alle 02:00)
- **2FA e RBAC**: Autenticazione a due fattori e controllo accessi
- **Cmd+K Search**: Ricerca globale lead e navigazione rapida
- **Error Boundaries**: Gestione errori con UI di recovery
- **Security Headers**: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy

## Stack Tecnologico

| Layer | Tecnologia | Versione |
|-------|-----------|----------|
| Framework | Next.js (App Router) | 16.1.1 |
| Runtime | React | 19.2.3 |
| Linguaggio | TypeScript | 5.x |
| UI | Shadcn/ui + Tailwind CSS | 4.x |
| Database | PostgreSQL | 16 |
| ORM | Prisma | 7.2 |
| Auth | NextAuth.js (beta) | 5.0.0-beta.30 |
| AI | Google Gemini | 2.5 Flash/Pro |
| Scraping | Apify Client | 2.21.0 |
| Job Queue | p-queue (in-process) | — |
| Process Manager | PM2 (server) | — |

## Requisiti

- Node.js >= 20.0.0
- PostgreSQL 16+
- Account Apify (opzionale, funziona in mock mode)
- API Key Gemini (per analisi AI)

## Setup Sviluppo

### 1. Installa dipendenze

```bash
npm install
```

### 2. Configura ambiente

Copia `.env.example` in `.env` e configura le variabili:

```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/sales_app"

# NextAuth (genera secret con: openssl rand -base64 32)
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3003"

# Apify (opzionale - senza token funziona in mock mode)
APIFY_TOKEN=""
APIFY_WEBHOOK_SECRET=""

# Gemini AI (per analisi strategica)
GEMINI_API_KEY=""
GEMINI_MODEL="gemini-2.5-flash"

# Cron secret (per endpoint interni e cron job)
CRON_SECRET=""

# SMTP per email
SMTP_HOST=""
SMTP_PORT=587
SMTP_USER=""
SMTP_PASSWORD=""
SMTP_FROM=""
```

### 3. Setup Database

```bash
# Crea database
createdb sales_app

# Applica schema
npm run db:push

# Popola dati iniziali
npm run db:seed
```

### 4. Avvia in sviluppo

```bash
npm run dev
```

Apri http://localhost:3003

**Credenziali default:**
- Email: admin@agenzia.it
- Password: admin123

## Deploy

Il deploy usa PM2 sul VPS Contabo. Vedi [DEPLOY.md](DEPLOY.md) per la guida completa.

### Deploy rapido

```bash
# Deploy standard (auto-patch bump)
./deploy.sh "descrizione modifiche"

# Con bump versione esplicito
./deploy.sh --bump patch "fix bug"
./deploy.sh --bump minor "nuova feature"

# Senza bump versione
./deploy.sh --no-bump "hotfix veloce"
```

### Docker (alternativa)

```bash
docker compose up -d
```

## Struttura Progetto

```
sales-app/
├── prisma/
│   ├── schema.prisma          # Schema database
│   └── seed.ts                # Dati iniziali
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (auth)/            # Login, forgot/reset password
│   │   ├── (dashboard)/       # Pagine protette (18 viste)
│   │   │   ├── error.tsx      # Error boundary dashboard
│   │   │   └── ...
│   │   ├── api/               # API routes
│   │   └── error.tsx          # Error boundary globale
│   ├── components/            # Componenti React + Shadcn/ui
│   ├── lib/
│   │   ├── audit/             # Moduli audit + WhatsApp extractor
│   │   ├── background-jobs.ts # Job queue con p-queue
│   │   ├── gemini-analysis.ts # Integrazione Gemini AI
│   │   ├── url-validator.ts   # Protezione SSRF
│   │   ├── apify.ts           # Integrazione Apify
│   │   └── db.ts              # Prisma client
│   └── types/                 # TypeScript interfaces
├── scripts/
│   └── backup-db.sh           # Backup PostgreSQL con rotazione
├── CHANGELOG.md               # Storico versioni
├── GUIDA_UTENTE.md            # Guida utente
├── TECHNICAL-DOCS.md          # Documentazione tecnica completa
├── DEPLOY.md                  # Guida deploy
├── deploy.sh                  # Script deploy automatico (9 step)
├── Dockerfile
└── docker-compose.yml
```

## Endpoint Protetti

| Endpoint | Protezione |
|----------|-----------|
| `/api/internal/batch-analysis` | CRON_SECRET |
| `/api/internal/recalc-scores` | CRON_SECRET |
| `/api/cron/scheduled-searches` | CRON_SECRET |
| `/api/cron/check-recontact` | CRON_SECRET |
| `/api/cron/recover-stuck-jobs` | CRON_SECRET |
| `/api/cron/batch-gemini-analysis` | CRON_SECRET |
| `/api/health` | Pubblico (monitoring) |
| `/api/debug/reset-data` | Solo dev + ADMIN |

## Costi Operativi Stimati

| Servizio | Piano | Costo |
|----------|-------|-------|
| Apify | Free tier | $5/mese inclusi |
| Gemini AI | Pay per use | ~$1-5/mese |
| VPS Contabo | VPS S | ~5 EUR/mese |
| **Totale** | | **~10-15 EUR/mese** |

## Comandi Utili

```bash
# Sviluppo
npm run dev              # Avvia server dev (porta 3003)

# Database
npm run db:push          # Applica schema
npm run db:seed          # Popola dati test
npm run db:studio        # GUI database (Prisma Studio)

# Produzione
npm run build            # Build Next.js
npm start                # Avvia server (porta 3003)

# Deploy
./deploy.sh "messaggio"  # Deploy completo su VPS

# Backup
./scripts/backup-db.sh   # Backup DB con rotazione 30 giorni
```

## Documentazione

| Documento | Descrizione |
|-----------|------------|
| [CHANGELOG.md](CHANGELOG.md) | Storico di tutte le versioni e modifiche |
| [GUIDA_UTENTE.md](GUIDA_UTENTE.md) | Guida per l'utente finale |
| [TECHNICAL-DOCS.md](TECHNICAL-DOCS.md) | Architettura, API, schema DB, troubleshooting |
| [DEPLOY.md](DEPLOY.md) | Guida deploy su VPS Contabo |

---

*KW Sales CRM by [Karalisweb](https://karalisweb.com)*
