# Sales Support CRM

CRM per il supporto commerciale di un'agenzia di web marketing. Consente di cercare lead su Google Maps, analizzare i loro siti web automaticamente, e gestire il ciclo di vendita.

## Funzionalita

- **Scouting automatizzato**: Cerca attivita su Google Maps tramite Apify
- **Audit automatico**: Analizza siti web per trovare problemi (SEO, performance, tracking, compliance)
- **Opportunity Score**: Punteggio 0-100 basato sui problemi rilevati
- **Talking Points**: Frasi "gancio" generate automaticamente per la chiamata commerciale
- **Pipeline Kanban**: Gestione visuale del ciclo di vendita con drag & drop

## Requisiti

- Node.js 20+
- PostgreSQL 16+
- Account Apify (per ricerche Google Maps)
- Account Inngest (per audit in background)

## Setup Sviluppo

### 1. Installa dipendenze

```bash
npm install
```

### 2. Configura ambiente

Copia `.env` e configura le variabili:

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sales_app"

# NextAuth (genera secret con: openssl rand -base64 32)
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# Apify (ottieni da console.apify.com)
APIFY_TOKEN="your-token"

# Inngest (ottieni da app.inngest.com)
INNGEST_EVENT_KEY="your-key"
INNGEST_SIGNING_KEY="your-signing-key"
```

### 3. Setup Database

```bash
# Crea database
createdb sales_app

# Esegui migrazione
npm run db:push

# Popola dati iniziali
npm run db:seed
```

### 4. Avvia in sviluppo

```bash
npm run dev
```

### 5. Avvia Inngest Dev Server (in altro terminale)

```bash
npx inngest-cli@latest dev
```

Apri http://localhost:3000

**Credenziali default:**
- Email: admin@agenzia.it
- Password: admin123

## Docker Deploy

### Build e avvio

```bash
docker-compose up -d
```

### Migrazione database in produzione

```bash
docker-compose exec app npx prisma migrate deploy
```

## Struttura Progetto

```
sales-app/
├── prisma/
│   └── schema.prisma          # Schema database
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (auth)/            # Pagine auth (login)
│   │   ├── (dashboard)/       # Pagine protette
│   │   └── api/               # API routes
│   ├── components/            # Componenti React
│   ├── lib/
│   │   ├── audit/             # Moduli audit
│   │   ├── apify.ts           # Integrazione Apify
│   │   ├── auth.ts            # NextAuth config
│   │   └── db.ts              # Prisma client
│   ├── inngest/               # Background jobs
│   └── types/                 # TypeScript types
├── Dockerfile
└── docker-compose.yml
```

## Costi Operativi Stimati

| Servizio | Piano | Costo |
|----------|-------|-------|
| Apify | Free tier | $5/mese inclusi |
| Inngest | Free tier | 25k eventi/mese gratis |
| **Totale** | | **~$5/mese** |

## Comandi Utili

```bash
# Sviluppo
npm run dev

# Database
npm run db:push      # Applica schema
npm run db:seed      # Popola dati test
npm run db:studio    # GUI database

# Produzione
npm run build
npm start

# Docker
docker-compose up -d
docker-compose logs -f app
```
