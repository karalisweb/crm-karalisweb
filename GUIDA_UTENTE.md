# KW Sales CRM - Guida Utente

Versione: **3.9.1** | Ultimo aggiornamento: 2026-04-11

> Questa guida spiega come utilizzare il CRM per gestire i lead e il processo commerciale.

---

## Indice

1. [Accesso al CRM](#1-accesso-al-crm)
2. [Panoramica dell'interfaccia](#2-panoramica-dellinterfaccia)
3. [Il flusso di lavoro](#3-il-flusso-di-lavoro)
4. [Estensioni Chrome da installare](#4-estensioni-chrome-da-installare)
5. [Come controllare caso per caso](#5-come-controllare-caso-per-caso)
6. [Cosa fare nei casi dubbi](#6-cosa-fare-nei-casi-dubbi)
7. [Le pagine principali](#7-le-pagine-principali)
8. [Analisi AI (Gemini)](#8-analisi-ai-gemini)
9. [Ricerche Programmate](#9-ricerche-programmate)
10. [FAQ - Domande frequenti](#10-faq---domande-frequenti)

---

## 1. Accesso al CRM

1. Apri il browser e vai su **https://crm.karalisdemo.it**
2. Inserisci le credenziali fornite (email + password)
3. Se hai il 2FA attivo, inserisci il codice OTP ricevuto via email
4. Verrai portato alla Dashboard principale

> **Nota:** Se dimentichi la password, usa il link "Password dimenticata" nella pagina di login per ricevere un'email di reset.

---

## 2. Panoramica dell'interfaccia

### Sidebar (menu laterale)

La sidebar a sinistra contiene tutte le sezioni del CRM:

| Sezione | Cosa trovi |
|---------|-----------|
| **Dashboard** | Riepilogo generale con statistiche e KPI |
| **Da Analizzare** | Lead appena importati, in attesa di analisi Gemini |
| **Hot Leads** | Lead con score alto (80+), massima priorita |
| **Warm Leads** | Lead con buon potenziale (50-79) |
| **Cold Leads** | Lead con basso potenziale (score <50) |
| **Fare Video** | Lead pronti per registrare il video personalizzato |
| **Video Inviati** | Lead a cui e stato inviato il video |
| **Follow-up** | Lead in attesa di follow-up (lettera, LinkedIn, ecc.) |
| **Telefonate** | Lead da chiamare o gia chiamati |
| **Call Fissate** | Lead con appuntamento fissato |
| **Trattative** | Lead in fase di trattativa/offerta |
| **Clienti** | Lead convertiti in clienti |
| **LinkedIn** | Lead da contattare su LinkedIn |
| **Nuova Ricerca** | Avvia una nuova ricerca su Google Maps |
| **Storico Ricerche** | Tutte le ricerche effettuate |
| **Senza Sito** | Lead senza sito web (o con URL social) |
| **Non Target** | Lead non in target, archiviati |
| **Persi** | Lead persi |
| **Archivio** | Archivio generale |
| **Guida** | Questa guida, versione interattiva |
| **Impostazioni** | Configurazione CRM (solo admin) |

### Navigazione mobile

Su smartphone, la sidebar si trasforma in una barra di navigazione in basso con le sezioni principali.

---

## 3. Il flusso di lavoro

Il flusso del CRM segue questi passaggi:

1. **Ricerca** → Si cercano lead su Google Maps per categoria e citta
2. **Analisi Gemini** → L'AI analizza il sito del lead e genera score, errori, e script video
3. **Score** → I lead vengono ordinati per opportunita (HOT 80+ / WARM 60-79)
4. **Video** → Si registra un video personalizzato per il lead
5. **Invio** → Si invia il video via WhatsApp/email
6. **Follow-up** → Lettera, LinkedIn, telefonate di follow-up
7. **Trattativa** → Call conoscitiva, offerta, chiusura

> **Nota:** Il vecchio concetto di "qualifica" e stato rimosso. Ora il flusso e: Analisi Gemini → Score → HOT/WARM.

---

## 4. Estensioni Chrome da installare

Queste estensioni aiutano a verificare velocemente cosa c'e su un sito. Si installano una volta e poi funzionano sempre.

### Tag Assistant Legacy (by Google)

**A cosa serve:** Verificare Google Analytics, Google Tag Manager, Google Ads

**Come installare:**
1. Vai su: https://chromewebstore.google.com/detail/tag-assistant-legacy-by-g/kejbdjndbnbjgmefkgdddjlbokphdefk
2. Clicca "Aggiungi a Chrome"

**Come si usa:**
1. Apri il sito del lead
2. Clicca sull'icona dell'estensione in alto a destra nel browser
3. Clicca "Enable" e ricarica la pagina
4. Guarda le icone colorate:
   - **Verde** = tag funzionante
   - **Rosso** = errore nel tag
   - **Niente** = non c'e nessun tag

### Meta Pixel Helper (by Facebook)

**A cosa serve:** Verificare Facebook Pixel, Meta Pixel

**Come installare:**
1. Vai su: https://chromewebstore.google.com/detail/meta-pixel-helper/fdgfkebogiimcoedlicjlajpkdmockpc
2. Clicca "Aggiungi a Chrome"

**Come si usa:**
1. Apri il sito del lead
2. Guarda l'icona dell'estensione in alto a destra:
   - **Grigia** = NON c'e il pixel (confermato)
   - **Blu con un numero** = il pixel C'E

---

## 5. Come controllare caso per caso

### Google Analytics (GA4)

**Metodo facile (con estensione):**
Apri il sito con Tag Assistant attivo. Se vedi un tag "Google Analytics" o "GA4" con icona verde, c'e Analytics.

**Metodo manuale:**
1. Tasto destro sulla pagina
2. Clicca "Visualizza sorgente pagina"
3. Cerca (Ctrl+F) queste parole: `gtag`, `analytics`, `G-`
4. Se non trovi niente, non c'e Analytics

> **Caso difficile:** Se nel sorgente trovi `GTM-` ma NON trovi `G-`, vuol dire che c'e Google Tag Manager ma Analytics potrebbe essere configurato DENTRO Tag Manager. In questo caso non puoi verificare facilmente - lascia la checkbox non spuntata e scrivi una nota.

### Facebook/Meta Pixel

**Metodo facile (con estensione):**
Apri il sito con Meta Pixel Helper installato. Icona grigia = no pixel, blu = si.

**Metodo manuale:**
1. Sorgente pagina (tasto destro → "Visualizza sorgente")
2. Cerca: `fbq` oppure `facebook.net`
3. Se non trovi niente, non c'e il pixel

### Google Ads

**Come verificare:**
1. Sorgente pagina
2. Cerca: `AW-` oppure `googleads`
3. Se non trovi niente, non hanno il tag Google Ads

> **Nota:** Come per Analytics, se c'e GTM il tag Ads potrebbe essere dentro. Se trovi solo GTM senza tag Ads visibile, lascia non spuntato.

### Cookie Banner (GDPR)

**Come verificare:**
1. Apri il sito in una **finestra anonima** (Ctrl+Shift+N su Chrome)
2. Alla prima visita dovrebbe apparire un banner/popup che chiede di accettare i cookie
3. Se non appare niente, non c'e il cookie banner

### Form di Contatto

**Come verificare:**
1. Naviga il sito: guarda la homepage
2. Cerca una pagina "Contatti" o "Contattaci"
3. Se non c'e nessun modulo da compilare (con campi tipo nome, email, messaggio), allora non c'e form di contatto

### Blog

**Come verificare:**
1. Cerca nel menu del sito una voce "Blog", "News" o "Articoli"
2. Se esiste, controlla la data dell'ultimo articolo pubblicato
3. Se il blog e fermo da mesi, e un punto debole del prospect

### Controllo generale del sito

Quando apri il sito, chiediti:
- Il sito si carica? Funziona?
- Il contenuto corrisponde alla categoria del lead? (es. se il CRM dice "impresa edile", il sito parla di edilizia?)
- Il sito sembra aggiornato o abbandonato?
- Ha contenuti reali o e un template vuoto / pagina di parcheggio?
- E un sito vero dell'azienda o un aggregatore / portale generico?

---

## 6. Cosa fare nei casi dubbi

**Se non sei sicura di un punto della checklist:**

1. **NON spuntare** la checkbox - meglio lasciare in sospeso che confermare dati sbagliati

2. **Scrivi nel campo "Note"** sotto la checklist. Spiega il dubbio, ad esempio:
   - "GTM presente, tag potrebbero essere dentro"
   - "Sito lentissimo, non riesco a verificare"
   - "Il sito mostra una pagina di manutenzione"

3. Se il sito ha **Google Tag Manager (GTM)** ma non vedi i tag direttamente, scrivi nelle note: "GTM presente, tag potrebbero essere dentro"

4. Se il sito **non si carica** o da errore, non spuntare niente e scrivilo nelle note

5. Se noti qualcosa di **interessante o utile** (es. "hanno un e-commerce ma nessun tracking", "il numero di telefono e diverso", "sito in manutenzione"), **scrivilo nelle note** - il commerciale lo apprezera

6. In caso di dubbio, **chiedi al responsabile** - e meglio chiedere che confermare qualcosa di sbagliato

> **Ricorda:** Lo scopo e dare al commerciale argomenti solidi per la chiamata. Se confermi "non hanno Analytics" e poi il cliente dice "veramente si, ce l'abbiamo", il commerciale fa una brutta figura. Meglio essere prudenti! Le note sono il tuo strumento migliore per segnalare cose che il sistema non puo vedere.

---

## 7. Le pagine principali

### Dashboard

La pagina iniziale mostra un riepilogo con:
- KPI aggregati: lead totali, da analizzare, hot, warm
- **Funnel pipeline**: Grafico visuale della pipeline con i numeri per ogni stadio
- **Attivita settimanale**: Riepilogo delle attivita recenti
- **Report commerciale**: Statistiche per il commerciale
- Azioni rapide per le operazioni piu frequenti

> Usa **Cmd+K** (o Ctrl+K) in qualsiasi pagina per cercare velocemente un lead o navigare alle sezioni del CRM.

### Da Analizzare

Lead appena importati che devono essere analizzati dall'AI Gemini. Il sistema analizza il sito e genera automaticamente:
- Score (punteggio 0-100)
- Errori marketing principali
- Script video personalizzato

### Hot Leads / Warm Leads / Cold Leads

Lead con analisi completata, ordinati per score:
- **Hot (80+)**: Lead con molte opportunita, massima priorita
- **Warm (50-79)**: Lead con buon potenziale
- **Cold (<50)**: Lead con basso potenziale, da consultare raramente

Ogni lead mostra:
- Nome, categoria, score
- Numero WhatsApp (se disponibile) con link diretto per aprire chat
- Informazioni Ads (Google Ads e Meta Ads attive)
- Link al dettaglio completo

### Fare Video

Lead pronti per la registrazione del video personalizzato. Lo script video e stato generato dall'AI Gemini e puo essere copiato per la registrazione.

### Video Inviati

Lead a cui e stato inviato il video. Il sistema traccia:
- Data invio video
- Se il video e stato visualizzato (badge VISTO)
- Data visualizzazione

### Nuova Ricerca

Per avviare una nuova ricerca di lead:
1. Seleziona una **categoria** (es. Ristoranti, Dentisti, Palestre...)
2. Seleziona una **localita** (es. Milano, Roma, Napoli...)
3. Imposta il **numero massimo** di risultati
4. Clicca "Avvia Ricerca"

Il sistema cerca su Google Maps e importa automaticamente i risultati. L'analisi AI parte in automatico per i lead con sito web.

### Storico Ricerche

Tutte le ricerche effettuate con:
- Data e parametri della ricerca
- Numero di lead trovati
- Stato della ricerca (completata, in corso, errore)

---

## 8. Analisi AI (Gemini)

### Come funziona

1. Apri la scheda di un lead con sito web
2. Vai al tab **"Analisi AI"**
3. Clicca **"Genera Analisi AI"**
4. L'AI analizza il sito e genera:
   - **Coerenza marketing**: Quanto e coerente la comunicazione del prospect
   - **3 errori principali**: I problemi piu gravi con impatto sul business
   - **Script video**: Testo pronto per registrare un video personalizzato (60-90 secondi)

### Script Video

Lo script generato include:
- Un complimento iniziale al prospect
- I problemi trovati sul sito
- Una CTA morbida per una call conoscitiva

### Configurazione

La API key di Gemini si configura in **Impostazioni → API & Token → Google Gemini AI**. Puoi scegliere il modello:
- **Gemini 2.5 Flash** (raccomandato) — veloce ed economico
- **Gemini 2.5 Pro** — piu potente per analisi complesse
- **Gemini 2.5 Flash Lite** — il piu veloce

---

## 9. Ricerche Programmate

### Come funziona

1. Vai in **Impostazioni → Programmate**
2. Vedrai la coda delle ricerche pianificate
3. Il sistema esegue **2 ricerche per notte** alle ore 02:00
4. Ogni ricerca importa fino a 50 lead da Google Maps
5. L'analisi AI parte automaticamente per i lead con sito web

### Gestire la coda

- **Carica Lista Predefinita**: Carica le ricerche predefinite
- **Aggiungi manualmente**: Inserisci categoria + citta e clicca "Aggiungi"
- **Re-queue**: Rimetti in coda una ricerca completata o fallita
- **Elimina**: Rimuovi una ricerca dalla coda

### Status delle ricerche

| Status | Significato |
|--------|-------------|
| In coda | In attesa di esecuzione |
| In esecuzione | In corso ora |
| Completata | Eseguita con successo |
| Fallita | Errore durante l'esecuzione (puo essere rimessa in coda) |

---

## 10. FAQ - Domande frequenti

**D: Quanto tempo ci vuole per analizzare un lead?**
R: L'analisi AI richiede circa 10-30 secondi per lead. Il sistema li processa automaticamente in background.

**D: Posso usare il CRM dal telefono?**
R: Si, l'interfaccia e responsive. La sidebar si trasforma in una barra di navigazione in basso.

**D: Cosa succede se il sito del lead non si apre?**
R: Il lead viene spostato in "Senza Sito" o l'analisi fallisce con un messaggio di errore specifico.

**D: Il punteggio del lead e affidabile?**
R: Il punteggio e calcolato dall'AI analizzando il sito. Piu alto il punteggio, piu problemi ha il sito = piu argomenti per la chiamata. Va sempre verificato con un controllo manuale.

**D: Come funziona il tracking video?**
R: Ogni lead ha un token unico. Quando il prospect apre il video, il sistema riceve una notifica e aggiorna il badge "VISTO" sulla scheda del lead.

**D: Cosa significa il badge WhatsApp "dal sito" / "da Google Maps"?**
R: Il sistema cerca il numero WhatsApp in due modi: prima nel sito web del prospect (wa.me, api.whatsapp.com), poi come fallback usa il telefono da Google Maps con normalizzazione italiana (+39).

---

*Documento aggiornato il 2026-04-11 | KW Sales CRM v3.9.1*
