# Changelog - KW Sales CRM

Tutte le modifiche rilevanti al progetto sono documentate in questo file.

Il formato segue [Semantic Versioning](https://semver.org/lang/it/).

---

## [2.5.0] - 2026-03-13nn- Rimozione Inngest: sostituito con cron API + p-queue per job in backgroundn

## [2.4.1] - 2026-03-11nn- Dashboard ridisegnata: KPI aggregati, pipeline funnel, attività settimanale, report commercialen

## [2.4.0] - 2026-03-11nn- Auto-Gemini dopo audit + Sidebar redesign per workflow Danielan

## [2.3.0] - 2026-03-11

### Aggiunto - Qualifica Automatica & Gemini AI
- **Qualifica automatica prospect**: Punteggio 0-100 basato su sito + ads attive (DataForSEO + Meta Ad Library)
- **Google Ads check**: Verifica ads attive tramite DataForSEO SERP API
- **Meta Ads check via Apify**: Verifica inserzioni Facebook/Instagram tramite Apify actor (no token Meta necessario)
- **Gemini AI Analysis**: Analisi marketing con AI generativa — coerenza, 3 errori principali, prompt HeyGen
- **Selettore modello Gemini**: Dropdown nelle impostazioni per scegliere il modello (2.5 Flash, Lite, Pro, 2.0 Flash)
- **Angolo Loom**: Pre-compilazione automatica angolo per video personalizzato
- **Pannello credenziali API**: Impostazioni per tutte le API key (Apify, Inngest, DataForSEO, PageSpeed, Gemini)
- **Test connessione**: Bottoni test per ogni servizio (DataForSEO, Meta, PageSpeed, Gemini)

### Aggiunto - Filtro Siti Falsi
- **Filtro URL social**: Lead con URL Facebook/Instagram/Maps come "website" vengono automaticamente spostati in SENZA_SITO
- **Campo socialUrl**: URL social preservato nel campo dedicato, sito reale nel campo website
- **Endpoint filter-social**: Filtraggio retroattivo lead esistenti con URL social
- **Modulo url-utils**: Funzioni condivise `isSocialLink()`, `isRealWebsite()`, `getSocialPlatform()`

### Aggiunto - Ricerche Automatiche
- **Ricerche programmate notturne**: Coda di ricerche Google Maps eseguite automaticamente (2 per notte alle 02:00)
- **Modello ScheduledSearch**: Tabella dedicata con status QUEUED/RUNNING/COMPLETED/FAILED
- **Inngest cron**: Funzione `runScheduledSearches` con polling Apify e import automatico
- **Tab "Programmate" in Settings**: UI per gestire la coda, aggiungere ricerche, re-queue, seed lista predefinita
- **39 ricerche precaricate**: Lista completa delle combinazioni categoria/citta prioritarie

### Aggiunto - Citta & Categorie
- **Gold List citta**: Pordenone, Latina + citta prioritarie confermate
- **59 categorie**: Lista completa con icone per ogni settore
- **Rimozione citta sature**: Bergamo, Padova, Verona, Modena, Reggio Emilia, Rimini, Pisa, Vicenza

### Modificato
- Pagina ricerca mostra tutte le citta (rimosso limite `.slice(0, 6)`)
- Deploy.sh supporta `--ci` per automazione non-interattiva
- Deploy.sh include `prisma db push` automatico quando schema cambia
- API config salva anche in `process.env` per effetto immediato senza restart
- Settings API: rimosso campo `metaAccessToken` (non piu necessario)
- Meta Ad Library: usa Apify actor `facebook-ads-scraper` invece di Graph API

---

## [2.5.0] - 2026-03-13nn- Rimozione Inngest: sostituito con cron API + p-queue per job in backgroundn

## [2.4.1] - 2026-03-11nn- Dashboard ridisegnata: KPI aggregati, pipeline funnel, attività settimanale, report commercialen

## [2.4.0] - 2026-03-11nn- Auto-Gemini dopo audit + Sidebar redesign per workflow Danielan

## [2.2.0] - 2026-02-22

### Aggiunto - UI/UX Overhaul
- **Cmd+K Command Palette**: Ricerca globale lead + navigazione rapida con `cmdk`
- **Sidebar collassabile**: Toggle 260px / 64px con badge conteggi in tempo reale (polling 60s)
- **Dashboard animata**: Contatori animati con `framer-motion`, funnel chart pipeline con `recharts`, sezione "Oggi devi..." con follow-up urgenti
- **Score Ring**: Anello SVG circolare animato per opportunity score nella pagina dettaglio lead
- **Audit Radar Chart**: Grafico radar a 6 assi (Performance, SEO, Tracking, Social, Trust, Content)
- **Semafori audit**: Sostituiti i badge Si/No con icone colorate (verde/ambra/rosso) per ogni check
- **Talking Points raggruppati**: Punti vendita organizzati per servizio con accordion e icone colorate
- **Calendario appuntamenti**: Vista settimanale navigabile con griglia 7 colonne + toggle lista
- **Filtri score Kanban**: Filtro rapido Hot (80+) / Buono (60+) / Tutti
- **Vista compatta Kanban**: Toggle per card ridotte (solo nome + score + telefono)
- **Bordi colorati per score**: `border-l-4` rosso/ambra/giallo/blu su tutte le card lead
- **PDF Report Audit**: Generazione PDF con `jsPDF` (score, barre area, checklist, talking points)
- **Breadcrumb navigation**: Componente riutilizzabile per navigazione contestuale
- **Empty State**: Componente riutilizzabile per stati vuoti con icona e CTA
- **Date utils**: Utility `timeAgo()`, `smartDate()`, `formatDate()` con `date-fns` e locale italiano

### Modificato
- Header colonne Kanban con bordo inferiore colorato
- Transizioni pagina con `framer-motion` (fade + slide)
- Stili cmdk in `globals.css` per dark theme
- Timestamp relativi ("2 ore fa") al posto di date statiche in dashboard e lead detail

### Rimosso - Pulizia codice morto
- `lead-card.tsx` - componente non utilizzato
- `quick-call-logger.tsx` - componente non utilizzato
- `avatar.tsx`, `checkbox.tsx`, `form.tsx`, `scroll-area.tsx`, `sheet.tsx` - UI components non importati
- `empty-state.tsx` (UI) - non importato da nessuna pagina
- `verification-checklist.ts` - funzione mai chiamata

### Dipendenze aggiunte
- `recharts` - Grafici (funnel, radar)
- `cmdk@1.0.4` - Command palette
- `framer-motion` - Animazioni
- `date-fns` - Formattazione date
- `jspdf` - Generazione PDF
- `html2canvas` - Screenshot per PDF

---

## [2.5.0] - 2026-03-13nn- Rimozione Inngest: sostituito con cron API + p-queue per job in backgroundn

## [2.4.1] - 2026-03-11nn- Dashboard ridisegnata: KPI aggregati, pipeline funnel, attività settimanale, report commercialen

## [2.4.0] - 2026-03-11nn- Auto-Gemini dopo audit + Sidebar redesign per workflow Danielan

## [2.1.0] - 2026-02-16

### Aggiunto
- `CHANGELOG.md` - Storico completo delle versioni
- `GUIDA_UTENTE.md` - Guida utente stampabile/esportabile

### Aggiornato
- `README.md` - Corretta porta (3003), aggiornato URL e contenuti
- Versione bumped a 2.1.0 in tutti i file

---

## [2.5.0] - 2026-03-13nn- Rimozione Inngest: sostituito con cron API + p-queue per job in backgroundn

## [2.4.1] - 2026-03-11nn- Dashboard ridisegnata: KPI aggregati, pipeline funnel, attività settimanale, report commercialen

## [2.4.0] - 2026-03-11nn- Auto-Gemini dopo audit + Sidebar redesign per workflow Danielan

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

## [2.5.0] - 2026-03-13nn- Rimozione Inngest: sostituito con cron API + p-queue per job in backgroundn

## [2.4.1] - 2026-03-11nn- Dashboard ridisegnata: KPI aggregati, pipeline funnel, attività settimanale, report commercialen

## [2.4.0] - 2026-03-11nn- Auto-Gemini dopo audit + Sidebar redesign per workflow Danielan

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

## [2.5.0] - 2026-03-13nn- Rimozione Inngest: sostituito con cron API + p-queue per job in backgroundn

## [2.4.1] - 2026-03-11nn- Dashboard ridisegnata: KPI aggregati, pipeline funnel, attività settimanale, report commercialen

## [2.4.0] - 2026-03-11nn- Auto-Gemini dopo audit + Sidebar redesign per workflow Danielan

## [1.8.0] - 2026-01-22

### Aggiunto
- Autenticazione a due fattori (2FA) con OTP
- Pagine password reset (forgot + reset)
- Controllo accessi basato su ruoli (RBAC)
- Variabili SMTP in docker-compose per invio email

---

## [2.5.0] - 2026-03-13nn- Rimozione Inngest: sostituito con cron API + p-queue per job in backgroundn

## [2.4.1] - 2026-03-11nn- Dashboard ridisegnata: KPI aggregati, pipeline funnel, attività settimanale, report commercialen

## [2.4.0] - 2026-03-11nn- Auto-Gemini dopo audit + Sidebar redesign per workflow Danielan

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

## [2.5.0] - 2026-03-13nn- Rimozione Inngest: sostituito con cron API + p-queue per job in backgroundn

## [2.4.1] - 2026-03-11nn- Dashboard ridisegnata: KPI aggregati, pipeline funnel, attività settimanale, report commercialen

## [2.4.0] - 2026-03-11nn- Auto-Gemini dopo audit + Sidebar redesign per workflow Danielan

## [1.6.0] - 2026-01-20

### Aggiunto
- Sistema commerciale per 5 chiamate/giorno con prioritizzazione automatica

---

## [2.5.0] - 2026-03-13nn- Rimozione Inngest: sostituito con cron API + p-queue per job in backgroundn

## [2.4.1] - 2026-03-11nn- Dashboard ridisegnata: KPI aggregati, pipeline funnel, attività settimanale, report commercialen

## [2.4.0] - 2026-03-11nn- Auto-Gemini dopo audit + Sidebar redesign per workflow Danielan

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

## [2.5.0] - 2026-03-13nn- Rimozione Inngest: sostituito con cron API + p-queue per job in backgroundn

## [2.4.1] - 2026-03-11nn- Dashboard ridisegnata: KPI aggregati, pipeline funnel, attività settimanale, report commercialen

## [2.4.0] - 2026-03-11nn- Auto-Gemini dopo audit + Sidebar redesign per workflow Danielan

## [1.4.0] - 2026-01-16

### Aggiunto
- Integrazione PageSpeed Insights API per dati reali di performance
- UI con progresso audit in tempo reale (streaming)

### Fix
- Bottone audit nella pagina dettaglio lead
- Errore TypeScript: rimossa duplicate-key in oggetto

---

## [2.5.0] - 2026-03-13nn- Rimozione Inngest: sostituito con cron API + p-queue per job in backgroundn

## [2.4.1] - 2026-03-11nn- Dashboard ridisegnata: KPI aggregati, pipeline funnel, attività settimanale, report commercialen

## [2.4.0] - 2026-03-11nn- Auto-Gemini dopo audit + Sidebar redesign per workflow Danielan

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

## [2.5.0] - 2026-03-13nn- Rimozione Inngest: sostituito con cron API + p-queue per job in backgroundn

## [2.4.1] - 2026-03-11nn- Dashboard ridisegnata: KPI aggregati, pipeline funnel, attività settimanale, report commercialen

## [2.4.0] - 2026-03-11nn- Auto-Gemini dopo audit + Sidebar redesign per workflow Danielan

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

## [2.5.0] - 2026-03-13nn- Rimozione Inngest: sostituito con cron API + p-queue per job in backgroundn

## [2.4.1] - 2026-03-11nn- Dashboard ridisegnata: KPI aggregati, pipeline funnel, attività settimanale, report commercialen

## [2.4.0] - 2026-03-11nn- Auto-Gemini dopo audit + Sidebar redesign per workflow Danielan

## [1.0.0] - 2026-01-13

### Aggiunto
- Progetto iniziale da Create Next App
- Struttura base Next.js 16 + TypeScript + Tailwind CSS 4
