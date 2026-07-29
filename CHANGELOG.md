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

## [3.37.0] - 2026-07-28

### Changed
- **Ripensata la classificazione dei membri BNI (regole di Alessio).** Il modello a "concorrenti" era sbagliato. Nuove regole:
  1. **Marketing / comunicazione / pubblicità / web / social** → **PARTNER** (non concorrenti: con loro si collabora e si scambia lavoro). Il ruolo `CONCORRENTE` non viene più assegnato.
  2. **Business trasversali a ogni categoria** (commercialista, consulente del lavoro, finanza agevolata, formazione, sicurezza sul lavoro, avvocato, assicurazioni, credito, notaio, privacy) → **PARTNER con peso moderato** (45-65): utili ma incerti, perché possono girare i contatti ai colleghi del loro capitolo.
  3. **Casa / Persona / Turismo** (infissi, edilizia, impianti, arredo, immobiliare, architetto, geometra, hotel, estetica, medico…) → **CLIENTE** (gli vendo io).
  4. Tutto il resto → **NEUTRO**.
- Conseguenze pratiche: le agenzie immobiliari e gli architetti passano da partner a **clienti**; i punteggi dei partner trasversali scendono da 90-100 a un range moderato; il concetto di concorrente sparisce. Premere **Riclassifica** per riallineare i membri già in archivio (i ruoli decisi a mano restano).

## [3.36.0] - 2026-07-28

### Added
- **Import membri per incolla-da-pagina.** L'importatore ora riconosce la tabella dei membri copiata direttamente dalla pagina di un capitolo sul sito BNI (colonne Nome/Società/Professione/Telefono separate da tab). La professione BNI (`Categoria > Sotto > Foglia`) viene ridotta alla foglia; l'ordine società/professione è dedotto dalla colonna che contiene ">", quindi non serve riordinare nulla. Rende l'import **self-service** senza scraping: il browser dell'utente rende già il JavaScript, basta copiare e incollare.
  - _Perché non "importa da URL":_ le pagine BNI caricano i membri via JS chiamando un endpoint interno (`/bnicms/v3/...`) che pretende la sessione del browser — replicarlo lato server sarebbe fragile, e un browser headless sul server è sproporzionato per pochi capitoli.

### Changed
- **Concorrenti: riconosciute le agenzie pubblicitarie.** `COMPETITOR_KEYWORDS` ora include "agenzia pubblicitaria", "pubblicitaria", "personal branding" — nella tassonomia BNI molti "Pubblicità & Marketing" sono di fatto concorrenti di Karalisweb. Fotografo/tipografo restano partner (match sulla foglia, non sul prefisso di categoria). Emerso dal capitolo Posidonia, saturo di marketing.
- **Parser telefoni**: riconosce i numeri coi gruppi separati da spazi (es. "+39 392 711 2294").

## [3.35.0] - 2026-07-28

### Added
- **Pitch dedicato per capitolo** ("Come giocartela qui"). Nel dossier di ogni capitolo un blocco che trasforma la composizione in strategia operativa: tema d'apertura dettato dalla persona dominante (Casa / Microturismo / Persona), i 2-3 nomi su cui puntare con il perché, e l'avviso se ci sono concorrenti in aula. Logica in `src/lib/bni/chapter-pitch.ts`, esposta da `/api/bni/chapters`.
- **Pipeline di vendita BNI sul membro.** Pipeline parallela a quella dei lead freddi, con le tappe dettate dal processo reale: `Da avvicinare → 121 richiesto → Preparo referenze → 121 fatto → Offerta inviata → Recall programmato → Consolidato` (`src/lib/bni/bni-stages.ts`). Campi `bniStage` + `nextRecallAt` su `BniMembro`.
  - Nuova tab **Pipeline** in Rete BNI: i membri in colonne per stadio, cliccabili per aprire il Memo 121.
  - Lo stadio si avanza dal **Memo 121** (dove già si lavora sul membro), con data di recall quando si entra nella tappa Recall.
  - **I recall a scadenza risalgono in cima alla Coda 121** (boost di priorità) con la ragione esplicita, e compaiono come KPI "Recall da fare oggi". Nuovo KPI anche per le offerte BNI aperte.

## [3.34.1] - 2026-07-28

### Changed
- **Classificatore BNI: riconosce la finanza agevolata come partner di potere.** Nuova categoria "Finanza agevolata / Bandi e incentivi" (peso 85, tutte e tre le personas): chi fa finanza agevolata sa quali aziende stanno per investire (bandi, incentivi, fondo perduto, credito d'imposta) → intercetta il cliente nel momento in cui ha budget. Segnalato da Alessio su un membro reale (Financial Domina).
- **Consulenza aziendale ora riconosciuta** anche nella forma sostantivo ("consulenza aziendale"), non solo "consulente aziendale": prima questi partner finivano in NEUTRO. Peso alzato 60 → 70. Al primo import di Atlantide questi due tipi erano stati corretti a mano; da ora il riconoscimento è automatico anche per gli altri capitoli.

## [3.34.0] - 2026-07-28

### Added
- **Import massivo dei membri di un capitolo** (`POST /api/bni/membri/import`, dialog "Importa" in Rete BNI). Il collo di bottiglia del modulo BNI non era il matching ma l'anagrafica: in produzione c'era **1 solo membro** e 0 capitoli, quindi coda 121, capitoli e matcher restavano schermate vuote. Ora si incolla la lista e il CRM la interpreta.
  - **Parser tollerante** (`src/lib/bni/member-parser.ts`): riconosce tabulazioni (copia-incolla da Excel), `|`, `;`, trattini lunghi e corti, e il formato `Nome (Professione)`. Estrae da solo telefono ed email dalla riga, scarta intestazioni e titoli, deduplica per nome.
  - **Anteprima obbligatoria**: prima di scrivere sul database mostra cosa ha capito, con la classificazione sui due assi già applicata (partner / clienti / concorrenti) e i duplicati evidenziati. Le righe fuori formato vengono segnalate, non scartate in silenzio.
  - I duplicati vengono **saltati, non sovrascritti**: un import non può cancellare il "chi cerca" raccolto in un 121.
  - Il capitolo viene censito automaticamente come `ANALIZZATO`, così compare subito nella scheda Capitoli.

## [3.33.1] - 2026-07-28

### Fixed
- **Ripristinata la mail di nurturing social (T6).** Il deploy della 3.33.0 ha portato in produzione un rewrite più vecchio di `opt-in-mailer.ts` che non conteneva la mail LinkedIn/Substack introdotta in 3.32.0 → la feature era di fatto sparita. Reinserito il blocco T6 (una tantum, ~30gg dal follow-up, dedup via activity `[Opt-in-NURTURE]`, env `OPTIN_NURTURE_SOCIAL_DAYS`), adattato alla cadenza a follow-up singolo. Verificato: la pausa master resta a monte e continua a gatare anche questo tocco; quota T1 riservata invariata.

## [3.33.0] - 2026-07-27

> **Svolta strategica.** Il cold outreach non porta fatturato: i soldi arrivano dal
> passaparola BNI e dalla riattivazione degli ex-clienti. Questa release sposta il
> baricentro del CRM sul primo dei due motori. Piani: `STRATEGIA-REVENUE-FIRST.md`
> e `PIANO-BNI-ESTREMO.md`.

### Added
- **Buyer persona come fonte unica** (`src/lib/buyer-personas.ts`). Prima la definizione di target viveva in tre tassonomie che si contraddicevano (15 micro-segmenti, cluster Casa/Microturismo/Persona, high/low ticket): un ristorante era segmento attivo nella prima, assente nella seconda e low-ticket nella terza. Ora i 3 cluster **Casa · Microturismo · Persona** sono le personas ufficiali, i micro-segmenti stanno sotto come dettaglio e il tier resta attributo di valore. Campo `buyerPersona` su `Lead` e `BniMembro`.
- **Classificazione dei membri BNI sui due assi** (`src/lib/bni/member-classifier.ts`). Il CRM sapeva fare una domanda sola ("gli vendo?"), che nel BNI copre metà del valore. Ora ogni membro riceve due punteggi indipendenti: `clientScore` (è una mia buyer persona → gli vendo) e `partnerScore` (serve le mie personas → mi porta clienti). Riconosce anche i **concorrenti** (web agency, SMM, SEO) per non fare gaffe in capitolo. Ogni punteggio è accompagnato dalla spiegazione del perché.
- **Coda 121 prioritizzata** (`GET /api/bni/queue`). Ordina chi incontrare adesso combinando il valore del membro (il partner pesa il doppio) con il tempo dall'ultimo incontro: un partner forte che non senti da 8 mesi torna in cima. Nel proprio capitolo chi non ha mai fatto un 121 ha una spinta costante.
- **Memo 121 con matcher di reciprocità** (`src/components/bni/membro-121-panel.tsx`, `GET /api/bni/match`). Campo "chi cerca" su ogni membro; il CRM scorre lead e membri taggati e propone chi regalargli, spiegando su quale campo ha fatto match. Da usare al tavolo, mobile-first.
- **Referenze DATE** (`ReferralGiven`, `/api/bni/referral-given`). Il CRM tracciava solo quelle ricevute: senza misurare cosa si dà non si sa con chi si è in credito. Bilancio dato/ricevuto per membro e complessivo.
- **Dossier capitoli** (`BniChapter`, `GET /api/bni/chapters`). Per ogni capitolo: punteggio di attrattività (partner ×2 + clienti), composizione per persona (detta il pitch), top 5 da intercettare nel libero networking, conteggio concorrenti, modalità e stato visita. Regola: in Sardegna di persona, fuori solo se ibrido.
- **Riclassificazione retroattiva** (`POST /api/bni/classify`). Assegna i due assi ai membri già in archivio. I membri con ruolo deciso a mano (`roleLocked`) non vengono mai sovrascritti.

### Changed
- **Pagina Rete BNI riorganizzata** in quattro viste: Coda 121 (default), Capitoli, Membri, Ultimi 121. Le metriche in alto ora mostrano partner di potere, clienti potenziali, bilancio della reciprocità e "mai fatto un 121".
- **`/api/bni/membri`**: i nuovi membri vengono classificati automaticamente alla creazione, così nascono già prioritizzati.

## [3.32.0] - 2026-07-19

### Added
- **Mail di nurturing social (una tantum).** ~30 giorni dopo il follow-up, ai lead freddi usciti in NURTURING (non disiscritti, non hanno risposto) parte una mail che invita a seguire Alessio su LinkedIn e Substack ("strategie di marketing"). Trasforma i lead persi in pubblico. Dedup via activity `[Opt-in-NURTURE]` (una sola volta per lead), conta nel tetto giornaliero → deliverability invariata. Env `OPTIN_NURTURE_SOCIAL_DAYS` (default 30).

### Fixed
- **Contatore "Approvazione" allineato alla pagina.** Il badge sidebar scartava per errore i lead HOT senza settore (`segment` null): la semantica SQL di `notIn` esclude i NULL. Ora inclusi → il badge combacia col numero della pagina (era 39 vs 40).

## [3.31.0] - 2026-07-19

### Fixed
- **Dashboard "Missione di Oggi" ripristinata.** L'API `/api/dashboard/mission` non restituiva più le liste `videoDaFare` e `followUpPrioritari` (rimosse in un refactoring) → le due sezioni principali erano sempre vuote. Ora vengono ricalcolate (FARE_VIDEO pronti per il video; VIDEO_INVIATO senza risposta).
- **KPI dashboard corretti.** 3 dei 5 riquadri leggevano chiavi inesistenti (`daRegistrare`, `inviati`, `appuntamenti`) → mostravano vuoto. Ora usano le chiavi reali (`fareVideoReady`, `emailInviate`, `callFissate`).
- **Badge "Approvazione" nella sidebar.** Era sempre 0/nascosto (chiave `daApprovare` mai restituita dall'API). Ora l'API la calcola con la STESSA logica della pagina /approvazione (HOT non contattati/approvati, sopra soglia, settore attivo).

### Added
- **Etichette chiare sui contatori.** Sotto ogni numero di Da Analizzare/Hot/Warm/Cold ora compare cosa conta ("non contattati · X con email"), e ogni KPI dashboard ha una descrizione. Chiarisce perché viste diverse mostrano numeri diversi (sono tappe diverse dell'imbuto). Nuovo campo `withEmail` in `/api/leads`.
- **Menu mobile completo.** Nuovo drawer (`mobile-menu.tsx`) con TUTTE le sezioni della sidebar (prima da mobile erano raggiungibili solo 5 voci su ~25): si apre dal pulsante "Menu" della bottom-nav. Config di navigazione ora condivisa (`nav-items.ts`) tra sidebar desktop e menu mobile.

### Changed
- Filtri lead canonici centralizzati in `src/lib/lead-filters.ts` (coda approvazione + "azionabili"), unica fonte di verità per contatori e liste.

## [3.30.0] - 2026-07-19

### Fixed
- **outreach: le mail di primo contatto (T1) non partivano più.** Break-up e follow-up girano prima del T1 e condividono lo stesso tetto giornaliero: il drenaggio dei lead già toccati saturava il cap ogni giorno, lasciando **0 nuovi contatti dal 10 luglio** (venerdì 17: 50 mail inviate, tutte follow-up/break-up, 0 nuove). Diagnosi confermata su DB e log di produzione.

### Added
- **outreach: quota giornaliera riservata ai nuovi contatti.** Il tetto giornaliero (invariato, es. 50) viene ora ripartito: `newReserve` slot sono garantiti alle prime mail (T1), il resto (`maintDailyCap`) va a break-up + follow-up. La manutenzione è plafonata a livello giornaliero così non può più affamare l'acquisizione. La riserva non supera i nuovi lead realmente in coda: se non ci sono nuovi da contattare, la manutenzione riprende l'intero tetto (nessuno spreco di deliverability). Il volume totale/giorno resta invariato.
- Nuova env `OPTIN_NEW_RESERVE_FRAC` (default `0.5` = metà tetto ai nuovi; es. `0.6` = 60% ai nuovi). Log diagnostico `[opt-in] budget=… maintBudget=… newReserve=… pendingNew=…` a ogni run.

## [3.29.0] - 2026-07-18

- feat(outreach): riduce il gap trovati/contattati e collega la verifica ads manuale al testo mail HOT

## [3.28.4] - 2026-06-30

- feat(franchise): esclude anche i domini-piattaforma a sottodomini (krossbooking.com) — match sul website oltre che sul nome

## [3.28.3] - 2026-06-30

- fix(approvazione): contatore mostra il cap impostato (non quello ridotto dal warmup) + warmup esplicitato + nuovo chip 'in coda' (HOT approvati in attesa di invio)

## [3.28.2] - 2026-06-30

- chore(franchise): aggiunge Iperceramica alla lista franchising

## [3.28.1] - 2026-06-30

- feat(outreach): priorità invio — prima gli HOT approvati da Alessio (FIFO), poi i WARM in autonomia riempiono il budget rimasto

## [3.28.0] - 2026-06-30

- feat(outreach): drip per temperatura — HOT (score>=80) richiedono approvazione poi vanno in coda e il sistema li invia diluiti su 07-19 (pacing del cap); WARM (50-79) inviati in autonomia; master-pause + cap come manopola giornaliera; approvazione mette in coda invece di inviare subito

## [3.27.0] - 2026-06-29

- feat(outreach): pausa per settore — escludi settori (es. immobiliare) da coda di approvazione e invii automatici (mail 1/follow-up/break-up) senza scartare i lead; toggle a chip in Impostazioni→Outreach, nota nella coda

## [3.26.0] - 2026-06-29

- feat(outreach): contatore email inviate oggi (T1+follow-up+break-up vs cap, con warmup) nella pagina Approvazione; recover-emails con cooldown anti-ritenta (campo emailCheckedAt) così ogni notte avanza su lead nuovi

## [3.25.0] - 2026-06-29

- feat(target): esclusione automatica franchising/catene — lista marchi deterministica (franchise-brands.ts), blocco all'import in NON_TARGET (no audit), giro retroattivo /api/internal/flag-franchises (con dryRun), rete di sicurezza nella coda Approvazione

## [3.24.2] - 2026-06-29

- feat(approvazione): gestione email mancante — badge 'manca email', pulsante 'Cerca email' on-demand (home+/contatti+varianti) e inserimento manuale; 'Approva e invia' bloccato finché manca un'email valida

## [3.24.1] - 2026-06-29

- fix(approvazione): verifica ads per-piattaforma (confermare Google non marca più Meta) + link 'Verifica' sempre visibile su riga propria (non più nascosto dal badge su mobile)

## [3.24.0] - 2026-06-29

- outreach: mail 1 con fatti verificati dall'audit, niente tono da venditore; video promesso e garantito a chiunque compila il questionario; pulsante Rigenera in Approvazione

## [3.23.1] - 2026-06-29

- feat(approvazione): link diretti a Google Ads Transparency e Meta Ad Library nel Verdetto Ads; fix deploy.sh range diff su ROLLBACK_COMMIT..HEAD

## [3.23.0] - 2026-06-29

- feat(outreach): pipeline v2 — sequenza fredda verso questionario, schermata approvazione, webhook self-assessment a punteggio, filtro Carta, SMTP outreach dedicato

## [3.22.2] - 2026-06-27

- fix(badge): numeretto Follow-up allineato ai richiami email

## [3.22.1] - 2026-06-27

- fix(outreach): scheda Disiscritti in Email Inviate + Follow-up coi richiami email (4gg)

## [3.22.0] - 2026-06-27

### Removed
- **Secondo motore email `workflow-engine` (Step 1/2/3)**: in produzione aveva 0 esecuzioni di sempre pur essendo schedulato. Rimossi libreria, cron, route `/api/leads/[id]/workflow-*`, `/api/settings/workflow-steps`, seed, modelli `WorkflowStep`/`WorkflowExecution` e UI degli step. L'unico motore di outreach resta **opt-in-mailer** (intatto).
- **18 campi `Settings` morti** (mai letti a runtime): `workflowEnabled`, `bookingUrl`, `signatureFrancesca`, `caseStudiesBlock`, `scoreThreshold`, `ghostOfferDays`, `maxCallAttempts`, `followUpDaysLetter`, `emailSubjectFirst/Followup` e gli 8 template `tplFirst*/tplFollowup*`. Rimossi da schema, API e UI; colonne e tabelle droppate dal DB.
- Pagina orfana `/video-da-fare` e documentazione obsoleta `manuale-tecnico-v2-chain.md`.

### Changed
- Scheda Impostazioni **"Workflow" → "Invio Mail"**: ora configura solo l'invio automatico opt-in (nuovo endpoint `/api/settings/outreach-mail`).
- Corretta la copy fuorviante nel flusso video (niente più promesse di "msg 1/2/3 automatici"): il video si segna come inviato e l'invio del link è manuale.

### Added
- `docs/FLUSSO-OUTREACH.md`: descrizione dell'unico flusso outreach + tabella dei cron reali (fonte di verità).

## [3.21.0] - 2026-06-22

### Added
- **Rete BNI**: nuovo modulo per tracciare i 121 (incontri uno-a-uno) con i membri dei capitoli e le opportunità che ne derivano — interesse diretto del membro e referenze ricevute.
- Modelli `BniMembro` e `OneToOne`; nuovo stato pipeline `BNI_DA_LAVORARE` e campi `Lead` (`bniOriginType`, `referralNeed`, `referredByMembroId`, `oneToOneId`, `source="bni"`).
- Registrazione 121 (`POST /api/bni/one-to-one`): genera in automatico i lead in pipeline (referenze + eventuale interesse del membro), con creazione membro al volo e referenze multiple, in transazione.
- Pagina **Rete BNI** con metriche (121 del mese/totali, referenze ricevute, membri interessati, clienti da BNI, opportunità aperte, membri da ricoltivare), lista membri con valore generato e timeline degli ultimi 121.
- Voce "Rete BNI" in sidebar, command palette e header mobile; badge "opportunità BNI da lavorare". Lo stato `BNI_DA_LAVORARE` resta fuori dai cron di outreach a freddo.

## [3.20.3] - 2026-06-21

- chore(lead): pulizia codice morto messaging-hub dopo rimozione composer

## [3.20.2] - 2026-06-21

- feat(lead): rimosso blocco 'Componi Messaggio' dalla tab Messaggi (vecchio sistema; primo contatto ora automatico via opt-in)

## [3.20.1] - 2026-06-21

- feat(analisi): i lead già contattati via mail escono da Da Analizzare/Hot/Warm/Cold (viste + contatori)

## [3.20.0] - 2026-06-21

- feat(workflow): menu allineato al flusso (Email Inviate→Follow-up→Fare Video→Video Inviati→Video Visti→Telefonate), pagina Video Visti, azioni cambio stato nel registro, rimosso LinkedIn

## [3.19.1] - 2026-06-21

- feat(registro): mostra oggetto + testo completo realmente inviato per ogni mail opt-in

## [3.19.0] - 2026-06-21

- feat(registro): registro email outreach (inviate/follow-up/risposte/archiviati) + uscita automatica dopo X giorni dal follow-up senza risposta

## [3.18.2] - 2026-06-21

- fix(opt-in-mailer): invio in background (202) per non bloccare la richiesta su batch lunghi

## [3.18.1] - 2026-06-21

- feat(deliverability): List-Unsubscribe one-click (RFC 8058) + endpoint POST + fix URL landing redirect

## [3.18.0] - 2026-06-21

### 🤖 Added — Automazione Outreach Opt-in

- **Email AI personalizzata** (`opt-in-mailer.ts` + `gemini-outreach-email.ts`): invia una mail di primo contatto scritta da Gemini con un "gancio" concreto e VERO estratto dai dati reali dell'azienda (recensioni Google, rating, testo del sito). Niente testo generico.
- **Raccolta email automatica** (`email-finder.ts`): durante l'audit il sistema cerca l'indirizzo di contatto nella homepage e, come fallback, nella pagina `/contatti`; preferisce email sullo stesso dominio.
- **Follow-up automatico**: se il prospect non risponde entro N giorni (default 4), invia un promemoria gentile con oggetto `Re: <oggetto-originale>`.
- **Oggetti a rotazione**: lista configurabile in Impostazioni → Workflow (un oggetto per riga, `{azienda}` come placeholder); il sistema li ruota ad ogni invio per migliorare la deliverability.
- **Istruzioni AI modificabili**: il prompt che genera il testo è editabile da Impostazioni senza toccare il codice.
- **Partenza morbida del dominio (warmup)**: nei primi 14 giorni il tetto giornaliero si alza automaticamente (5 → 10 → 20 → cap configurato) per proteggere la reputazione del dominio.
- **Report giornaliero** (`daily-report.ts` + `/api/cron/daily-report`): ogni mattina alle 6:00 arriva via email un riepilogo — opt-in inviati, follow-up, risposte, visualizzazioni video, nuovi lead, lead caldi da sentire subito.
- **Scheduler online via GitHub Actions** (`.github/workflows/cron.yml`): nessun SSH necessario per eseguire i cron job; include dispatch manuali (`manual:all`, `manual:<nome>`) per forzare l'esecuzione dalla GitHub UI.

### 🔧 Changed

- `prisma` + `@prisma/client` allineati a `7.8.0` (fix mismatch file wasm che rompeva `prisma generate` in deploy).
- Remote GitHub passato a SSH con chiave dedicata (`id_ed25519_crm_karalisweb`) per push dei file `.github/workflows/` senza richiedere scope `workflow` nel PAT.

### 📚 Docs

- GUIDA_UTENTE.md: aggiunta sezione 19 "Automazione email opt-in e report mattutino".
- TECHNICAL-DOCS.md: nuovi cron routes, lib files, schema fields, sezione GitHub Actions scheduler.

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

## [3.29.0] - 2026-07-03

- feat(outreach): riduce il gap trovati/contattati e collega la verifica ads manuale al testo mail HOT

- opt-in-mailer: coda WARM ordinata dal lead piu' vecchio (prima non garantiva
  di smaltire l'arretrato cronologicamente, rischio lead mai contattati)
- gemini-outreach-email: la mail HOT approvata ora usa il verdetto ads
  verificato manualmente da Alessio in /approvazione (Google Ads Transparency
  / Meta Ad Library) al posto del solo tag rilevato sul sito, con tono piu'
  assertivo; i WARM restano su rilevamento automatico, senza verifica
  manuale, come richiesto
- approvazione: confermare Google/Meta Ads rigenera subito la bozza cosi'
  il testo riflette davvero la verifica appena fatta
- daily-report: aggiunta riga arretrato mai contattato (warm pronti + hot da
  approvare) per rendere visibile il gap invece di due numeri scollegati
