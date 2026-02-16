# KW Sales CRM

Versione: **2.1.0** | [Changelog](CHANGELOG.md) | [Guida Utente](GUIDA_UTENTE.md) | [Docs Tecniche](TECHNICAL-DOCS.md) | [Deploy](DEPLOY.md)

CRM per il supporto commerciale di un'agenzia di web marketing. Consente di cercare lead su Google Maps, analizzare i loro siti web automaticamente, e gestire il ciclo di vendita.

## Funzionalita

- **Scouting automatizzato**: Cerca attivita su Google Maps tramite Apify
- **Audit automatico**: Analizza siti web per trovare problemi (SEO, performance, tracking, compliance)
- **Opportunity Score**: Punteggio 0-100 basato sui problemi rilevati
- **Talking Points**: Frasi "gancio" generate automaticamente per la chiamata commerciale
- **Pipeline CRM**: Gestione del ciclo di vendita con 12 stadi
- **Verifica Audit**: Checklist con badge Si/No per validazione manuale
- **Sistema Commerciale**: Tag automatici e prioritizzazione lead
- **2FA e RBAC**: Autenticazione a due fattori e controllo accessi

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
| Job Queue | Inngest | 3.49.1 |
| Scraping | Apify Client | 2.21.0 |

## Requisiti

- Node.js 20+
- PostgreSQL 16+
- Account Apify (opzionale, funziona in mock mode)
- Account Inngest (per audit in background)

## Setup Sviluppo

### 1. Installa dipendenze

```bash
npm install
```

### 2. Configura ambiente

Copia `.env.production.example` in `.env` e configura le variabili:

```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/sales_app"

# NextAuth (genera secret con: openssl rand -base64 32)
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3003"

# Apify (opzionale - senza token funziona in mock mode)
APIFY_TOKEN=""

# Inngest
INNGEST_EVENT_KEY=""
INNGEST_SIGNING_KEY=""

# PageSpeed (opzionale, 25k req/giorno gratis)
PAGESPEED_API_KEY=""
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
# Deploy standard
./deploy.sh "descrizione modifiche"

# Con bump versione
./deploy.sh --bump patch "fix bug"
./deploy.sh --bump minor "nuova feature"
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
│   │   ├── (dashboard)/       # Pagine protette (15+ viste)
│   │   └── api/               # API routes (40+ endpoint)
│   ├── components/            # Componenti React + Shadcn/ui
│   ├── lib/
│   │   ├── audit/             # 12 moduli audit
│   │   ├── commercial/        # Sistema tagging commerciale
│   │   ├── apify.ts           # Integrazione Apify
│   │   └── db.ts              # Prisma client
│   ├── inngest/               # Background jobs
│   └── types/                 # TypeScript interfaces
├── CHANGELOG.md               # Storico versioni
├── GUIDA_UTENTE.md            # Guida utente stampabile
├── TECHNICAL-DOCS.md          # Documentazione tecnica completa
├── DEPLOY.md                  # Guida deploy
├── DESIGN-SYSTEM.md           # Design system UI
├── deploy.sh                  # Script deploy automatico
├── Dockerfile
└── docker-compose.yml
```

## Costi Operativi Stimati

| Servizio | Piano | Costo |
|----------|-------|-------|
| Apify | Free tier | $5/mese inclusi |
| Inngest | Free tier | 25k eventi/mese gratis |
| PageSpeed API | Free | 25k req/giorno gratis |
| VPS Contabo | VPS S | ~5 EUR/mese |
| **Totale** | | **~10 EUR/mese** |

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
```

## Documentazione

| Documento | Descrizione |
|-----------|------------|
| [CHANGELOG.md](CHANGELOG.md) | Storico di tutte le versioni e modifiche |
| [GUIDA_UTENTE.md](GUIDA_UTENTE.md) | Guida per l'utente finale (verificatore) |
| [TECHNICAL-DOCS.md](TECHNICAL-DOCS.md) | Architettura, API, schema DB, troubleshooting |
| [DEPLOY.md](DEPLOY.md) | Guida deploy su VPS Contabo |
| [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) | Design system e standard UI |

---

*KW Sales CRM by [Karalisweb](https://karalisweb.com)*
