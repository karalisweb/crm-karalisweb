# Changelog - KW Sales CRM

Tutte le modifiche rilevanti al progetto sono documentate in questo file.

Il formato segue [Semantic Versioning](https://semver.org/lang/it/).

---

## [2.1.0] - 2026-02-16

### Aggiunto
- `CHANGELOG.md` - Storico completo delle versioni
- `GUIDA_UTENTE.md` - Guida utente stampabile/esportabile

### Aggiornato
- `README.md` - Corretta porta (3003), aggiornato URL e contenuti
- Versione bumped a 2.1.0 in tutti i file

---

## [2.0.0] - 2026-02-08

### Aggiunto
- Design System Karalisweb completo (`DESIGN-SYSTEM.md`)
- Guida deploy dettagliata (`DEPLOY.md`)
- Script `deploy.sh` con 7 step automatizzati e bump versioning
- Pagina guida in-app per Daniela (`/guida`)
- Checklist verifica audit con badge Si/No e campo note
- Sidebar fissa con offset contenuto
- Semplificazione CRM: 3 pagine di selezione principali

### Modificato
- UI completamente allineata al Karalisweb Design System (match CashFlow)
- Branding aggiornato a "Sales CRM by Karalisweb v2.0"
- Layout con sidebar fissa e scrollbar nascosta
- Numeri coerenti tra pagine e conteggi

### Fix
- Build produzione: corretto tipo enum nel seed file
- `deploy.sh`: aggiunto step `prisma generate` (7 step totali)
- Layout offset per sidebar fissa

---

## [1.9.0] - 2026-01-27

### Aggiunto
- Pipeline MSD completa con nuovi stati e pagine dedicate
- Impostazioni CRM configurabili + selettore stato pipeline MSD
- Talking points MSD con tutti i segnali commerciali + anti-bot fix
- Endpoint `reset-data` per pulire database e ripartire
- Tipo `CommercialTag` per supportare `DA_APPROFONDIRE`

### Fix
- Routing post-audit basato su score threshold + audit bulk manuale
- Flag `isCallable` corretto
- Endpoint `callable-status`: usa `pipelineStage` invece di `commercialTag`
- Corretto conteggio lead nella pagina ricerca
- Usa `docker compose` (v2) invece di `docker-compose` (v1)
- Corretto nome file `docker-compose.yml` nello script deploy

---

## [1.8.0] - 2026-01-22

### Aggiunto
- Autenticazione a due fattori (2FA) con OTP
- Pagine password reset (forgot + reset)
- Controllo accessi basato su ruoli (RBAC)
- Variabili SMTP in docker-compose per invio email

---

## [1.7.0] - 2026-01-21

### Aggiunto
- Funzionalita sync audit con controlli UI
- Script CLI per audit batch (`scripts/`)
- Lead `NEW` (non prioritari) visibili nei filtri della pagina leads

### Modificato
- Pagina parcheggiati piu compatta

### Fix
- Audit piu robusto: mai FAILED, social links spostati a parcheggiati
- Script audit usa adapter `pg` come il resto dell'app

---

## [1.6.0] - 2026-01-20

### Aggiunto
- Sistema commerciale per 5 chiamate/giorno con prioritizzazione automatica

---

## [1.5.0] - 2026-01-19

### Aggiunto
- Infinite scroll e miglioramenti UI leads
- Pagina dettaglio ricerca con risultati
- Pagina "Parcheggiati" per lead in attesa
- Audit automatico all'import dei lead
- Riorganizzazione UX: nuova pagina Audit con navigazione prioritaria
- Unificazione Lead e Pipeline in vista "Da Chiamare"
- Filtri avanzati per sito web e stato audit

### Fix
- Errore `audit data undefined` risolto
- Auto-move lead a `TO_CALL` quando audit completa
- Rimossi `onClick` handler da Server Component
- Aggiornamento conteggi stage quando si sposta un lead
- Rimosso dropdown stage e nascosta colonna NEW nel Kanban
- Migliorati check SEO e mobile nell'audit

---

## [1.4.0] - 2026-01-16

### Aggiunto
- Integrazione PageSpeed Insights API per dati reali di performance
- UI con progresso audit in tempo reale (streaming)

### Fix
- Bottone audit nella pagina dettaglio lead
- Errore TypeScript: rimossa duplicate-key in oggetto

---

## [1.3.0] - 2026-01-15

### Aggiunto
- UI mobile-first con branding Karalisweb
- Tema dark forzato (Karalisweb brand identity)
- Categorie e localita ricerca configurabili

### Fix
- Errori Server Component: estratti client components
- Layout mobile: scrollbar nascoste, overflow, badge/label wrap
- Porta fissata a 3003 per evitare conflitti

---

## [1.2.0] - 2026-01-14

### Aggiunto
- Setup CRM iniziale completo: schema DB, auth, CRUD lead, API routes
- Integrazione Apify con mock mode
- Docker + docker-compose per deploy
- Configurazione NextAuth v5 con trustHost

### Fix
- Build: force dynamic rendering per pagine con query DB
- Porta configurata su 3003 (evita conflitti con altri servizi)
- Apify API endpoint per validazione token
- Prisma incluso nel runner per migrazioni

---

## [1.0.0] - 2026-01-13

### Aggiunto
- Progetto iniziale da Create Next App
- Struttura base Next.js 16 + TypeScript + Tailwind CSS 4
