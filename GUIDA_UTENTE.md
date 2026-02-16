# KW Sales CRM - Guida Utente

Versione: **2.1.0** | Ultimo aggiornamento: 2026-02-16

> Questa guida spiega come utilizzare il CRM per verificare i lead prima di passarli al commerciale.

---

## Indice

1. [Accesso al CRM](#1-accesso-al-crm)
2. [Panoramica dell'interfaccia](#2-panoramica-dellinterfaccia)
3. [Come verificare un lead](#3-come-verificare-un-lead)
4. [Estensioni Chrome da installare](#4-estensioni-chrome-da-installare)
5. [Come controllare caso per caso](#5-come-controllare-caso-per-caso)
6. [Cosa fare nei casi dubbi](#6-cosa-fare-nei-casi-dubbi)
7. [Le pagine principali](#7-le-pagine-principali)
8. [FAQ - Domande frequenti](#8-faq---domande-frequenti)

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
| **Dashboard** | Riepilogo generale con statistiche |
| **Da Verificare** | Lead con audit completato, da controllare manualmente |
| **Da Chiamare** | Lead verificati e pronti per la chiamata commerciale |
| **Appuntamenti** | Lead con appuntamento fissato |
| **Offerte** | Lead a cui e stata inviata un'offerta |
| **Clienti** | Lead convertiti in clienti |
| **Nuova Ricerca** | Avvia una nuova ricerca su Google Maps |
| **Storico Ricerche** | Tutte le ricerche effettuate |
| **Audit** | Gestione e monitoraggio degli audit |
| **Guida** | Questa guida, versione interattiva |
| **Impostazioni** | Configurazione CRM (solo admin) |

### Navigazione mobile

Su smartphone, la sidebar si trasforma in una barra di navigazione in basso con le sezioni principali.

---

## 3. Come verificare un lead

Il sistema analizza automaticamente i siti web dei lead e trova problemi. Per ogni voce della checklist vedrai un badge colorato:

- **Si** (verde) = il sistema ha trovato questa cosa sul sito
- **No** (rosso) = il sistema NON ha trovato questa cosa sul sito

> **Importante:** Il sistema non e perfetto e a volte sbaglia. Il tuo compito e controllare che i dati siano veri prima di passare il lead al commerciale.

### Procedura passo-passo

**Step 1:** Apri la pagina **"Da Verificare"** dal menu a sinistra. Vedrai i lead ordinati per punteggio (il piu alto in cima).

**Step 2:** Clicca sul **link del sito web** (il rettangolo blu con il dominio, tipo "esempio.it"). Si apre il sito in una nuova scheda del browser.

**Step 3:** Controlla i **punti della checklist**. Ogni voce mostra Si o No (cosa ha rilevato il sistema) e le istruzioni su come verificare manualmente.

**Step 4:** Spunta le **checkbox** man mano che verifichi ogni punto. Quando sono tutte spuntate, il lead diventa "Verificato" e il commerciale sa che puo fidarsi dei dati.

**Step 5:** Usa il campo **"Note verifica"** per scrivere qualsiasi osservazione utile. Esempi:
- "Sito in rifacimento"
- "GTM presente ma non trovo i tag"
- "Numero di telefono diverso da quello su Google"
- "E-commerce senza tracking"

Le note si salvano automaticamente e il commerciale le leggera prima di chiamare.

> **Regola d'oro:** Se non sei sicura di un punto, NON spuntare la checkbox. Scrivi il dubbio nel campo note e vai avanti. Meglio lasciare un lead non verificato che confermarlo con dati sbagliati.

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

2. **Scrivi nel campo "Note verifica"** sotto la checklist. Spiega il dubbio, ad esempio:
   - "GTM presente, tag potrebbero essere dentro"
   - "Sito lentissimo, non riesco a verificare"
   - "Il sito mostra una pagina di manutenzione"

3. Se il sito ha **Google Tag Manager (GTM)** ma non vedi i tag direttamente, scrivi nelle note: "GTM presente, tag potrebbero essere dentro"

4. Se il sito **non si carica** o da errore, non spuntare niente e scrivilo nelle note

5. Se noti qualcosa di **interessante o utile** (es. "hanno un e-commerce ma nessun tracking", "il numero di telefono e diverso", "sito in manutenzione"), **scrivilo nelle note** - il commerciale lo apprezera

6. In caso di dubbio, **chiedi al responsabile** - e meglio chiedere che confermare qualcosa di sbagliato

> **Ricorda:** Lo scopo della verifica e dare al commerciale argomenti solidi per la chiamata. Se confermi "non hanno Analytics" e poi il cliente dice "veramente si, ce l'abbiamo", il commerciale fa una brutta figura. Meglio essere prudenti! Le note sono il tuo strumento migliore per segnalare cose che il sistema non puo vedere.

---

## 7. Le pagine principali

### Dashboard

La pagina iniziale mostra un riepilogo con:
- Numero totale di lead nel sistema
- Lead da verificare
- Lead da chiamare
- Statistiche per stage della pipeline

### Da Verificare

Qui trovi i lead con audit completato che devono essere verificati manualmente. Ogni lead mostra:
- Nome dell'azienda e categoria
- Punteggio opportunita (0-100)
- Link al sito web
- Checklist di verifica con badge Si/No

### Da Chiamare

Lead verificati e pronti per la chiamata. Mostra:
- Talking points (argomenti per la chiamata)
- Storico attivita (chiamate precedenti, note)
- Bottoni per registrare l'esito della chiamata

### Nuova Ricerca

Per avviare una nuova ricerca di lead:
1. Seleziona una **categoria** (es. Ristoranti, Dentisti, Palestre...)
2. Seleziona una **localita** (es. Milano, Roma, Napoli...)
3. Imposta il **numero massimo** di risultati
4. Clicca "Avvia Ricerca"

Il sistema cerca su Google Maps e importa automaticamente i risultati. L'audit dei siti web parte in automatico.

### Storico Ricerche

Tutte le ricerche effettuate con:
- Data e parametri della ricerca
- Numero di lead trovati
- Stato della ricerca (completata, in corso, errore)

---

## 8. FAQ - Domande frequenti

**D: Quanto tempo ci vuole per verificare un lead?**
R: In media 2-3 minuti per lead, una volta presa la mano con le estensioni Chrome.

**D: Posso verificare i lead dal telefono?**
R: Si, ma e molto piu comodo e veloce da computer perche servono le estensioni Chrome per i controlli tecnici.

**D: Cosa succede se il sito del lead non si apre?**
R: Non spuntare nessuna checkbox. Scrivi nelle note "Sito non raggiungibile" e passa al lead successivo.

**D: Quanti lead devo verificare al giorno?**
R: L'obiettivo e verificare abbastanza lead da permettere 5 chiamate al giorno. In genere servono circa 8-10 lead verificati per averne 5 buoni da chiamare.

**D: Il punteggio del lead e affidabile?**
R: Il punteggio e calcolato automaticamente e indica quante opportunita di miglioramento ha il prospect. Piu alto il punteggio, piu problemi ha il sito = piu argomenti per la chiamata. Ma va sempre confermato con la verifica manuale.

**D: Posso cambiare qualcosa dopo aver verificato un lead?**
R: Si, puoi sempre tornare sulla scheda del lead e modificare la verifica o aggiungere note.

---

*Documento generato il 2026-02-16 | KW Sales CRM v2.1.0*
