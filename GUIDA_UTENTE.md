# KW Sales CRM - Guida Utente

Versione: **3.18.0** | Ultimo aggiornamento: 2026-06-21

> Questa guida spiega, passo dopo passo, come usare il CRM per gestire i tuoi lead dalla ricerca fino alla chiusura. È scritta per chi vende, non per chi programma: niente termini tecnici senza spiegazione.
>
> La versione interattiva (e sempre aggiornata) la trovi dentro l'app, voce **Guida** in basso nella barra laterale. Questo documento ne è la copia testuale.

---

## Indice

1. [Mini-glossario (leggi questo per primo)](#1-mini-glossario-leggi-questo-per-primo)
2. [Accesso al CRM](#2-accesso-al-crm)
3. [Come è fatta l'app (menu e navigazione)](#3-come-è-fatta-lapp-menu-e-navigazione)
4. [La tua giornata tipo](#4-la-tua-giornata-tipo)
5. [La pipeline: dove si trova ogni lead](#5-la-pipeline-dove-si-trova-ogni-lead)
6. [Lo score e i lead Hot/Warm/Cold](#6-lo-score-e-i-lead-hotwarmcold)
7. [Avviare una nuova ricerca](#7-avviare-una-nuova-ricerca)
8. [La scheda del lead (le 4 schede)](#8-la-scheda-del-lead-le-4-schede)
9. [Il flusso Video Outreach (5 step)](#9-il-flusso-video-outreach-5-step)
10. [Inviare messaggi e registrare le risposte](#10-inviare-messaggi-e-registrare-le-risposte)
11. [Il follow-up automatico via email](#11-il-follow-up-automatico-via-email)
12. [Appuntamenti e calendario](#12-appuntamenti-e-calendario)
13. [Verifica delle Ads (manuale)](#13-verifica-delle-ads-manuale)
14. [L'analisi AI (Gemini)](#14-lanalisi-ai-gemini)
15. [Il tuo profilo e la sicurezza (2FA)](#15-il-tuo-profilo-e-la-sicurezza-2fa)
16. [Estensioni Chrome utili](#16-estensioni-chrome-utili)
17. [Ricerche programmate (automatiche)](#17-ricerche-programmate-automatiche)
18. [FAQ - Domande frequenti](#18-faq---domande-frequenti)

---

## 1. Mini-glossario (leggi questo per primo)

Poche parole tornano ovunque nell'app. Eccole spiegate in modo semplice:

| Termine | Cosa significa, in parole tue |
|---------|-------------------------------|
| **Lead** | Un'azienda potenziale cliente. Nasce da una ricerca su Google Maps e contiene nome, telefono, sito, recensioni, ecc. |
| **Score** (o **Opportunity Score**) | Un voto da 0 a 100 che dice **quanto vale la pena lavorare quel lead**. Più è alto, più quel lead ha problemi che possiamo risolvere = più argomenti per la chiamata. Lo calcola il sistema, ma va sempre verificato con un'occhiata al sito. |
| **Pipeline** | Il "percorso di vendita": l'insieme delle fasi che un lead attraversa, dall'arrivo fino a diventare cliente (o a essere scartato). |
| **Stage** (o stadio) | Il singolo gradino della pipeline. Esempi: "Da Analizzare", "Fare Video", "In Trattativa". Ogni lead sta sempre in **un solo** stage. |
| **Audit** | Un'analisi automatica del sito web del lead. Controlla SEO, tracciamenti, social, sicurezza, ecc. e segnala cosa manca o cosa è messo male. |
| **Follow-up** | I messaggi di richiamo che mandi quando il lead non risponde subito (secondo e terzo tentativo). Il sistema può inviarli da solo. |
| **Hot / Warm / Cold** | La "temperatura" del lead in base allo score: **Hot** = caldissimo (priorità massima), **Warm** = tiepido (buon potenziale), **Cold** = freddo (bassa priorità). |
| **Punto di dolore** | Il problema concreto del prospect che usi come gancio nella chiamata, nel video e nella landing (es. "il vostro sito non traccia chi vi contatta"). |
| **Landing page** | Una pagina web dedicata, creata dal CRM, dove il prospect guarda il video di analisi che hai preparato per lui. |

Termini tecnici che potresti incrociare (non ti servono per vendere, ma ecco cosa sono):

| Termine tecnico | Spiegazione veloce |
|-----------------|--------------------|
| **GA4 / Analytics** | Strumento di Google che conta i visitatori di un sito. Se manca, l'azienda "non sa quanti clienti passano dal sito". |
| **GTM (Google Tag Manager)** | Un "contenitore" dove si installano i vari tracciamenti. Se c'è solo GTM, i singoli strumenti potrebbero essere nascosti dentro. |
| **fbq / Meta Pixel** | Il codice di Facebook/Instagram che traccia chi visita il sito. Se manca, "non possono fare pubblicità mirata su chi li ha già visti". |
| **snippet JavaScript** | Un piccolo pezzo di codice inserito in una pagina web. Nel nostro caso serve a sapere quando il prospect apre e guarda il video. È già configurato: non devi toccarlo. |
| **UTM** | Un'etichetta aggiunta in fondo a un link (es. `?utm=client`) che ci permette di riconoscere che il prospect è arrivato dal nostro messaggio. Viene aggiunta in automatico. |

---

## 2. Accesso al CRM

1. Apri il browser e vai all'indirizzo del CRM (es. **https://crm.karalisdemo.it**).
2. Inserisci le credenziali che ti sono state fornite (email + password).
3. Se hai attivato la verifica in due passaggi (2FA), riceverai un **codice via email**: inseriscilo.
4. Entri nella Dashboard (la pagina iniziale, voce **Home**).

> **Password dimenticata?** Nella schermata di login c'è il link per riceverne una nuova via email.

---

## 3. Come è fatta l'app (menu e navigazione)

A sinistra c'è la **barra laterale** (sidebar), divisa in gruppi. Questo è il menu reale, nell'ordine in cui lo vedi:

| Gruppo | Voce | Cosa ci trovi |
|--------|------|---------------|
| | **Home** | La Dashboard: numeri riassuntivi, imbuto della pipeline, attività della settimana. |
| **ANALISI** | **Da Analizzare** | Lead appena arrivati, in attesa dell'analisi AI. |
| | **Hot Leads** | Lead caldi (score ≥ 80): la tua priorità. |
| | **Warm Leads** | Lead tiepidi (score 50-79): buon potenziale. |
| | **Cold Leads** | Lead freddi (score < 50): bassa priorità. |
| **VIDEO** | **Fare Video** | Lead per cui devi preparare e registrare il video personalizzato. Il badge mostra "pronti/totali". |
| | **Video Inviati** | Lead a cui hai già inviato il video; qui vedi chi lo ha aperto. |
| **FOLLOW-UP** | **Follow-up** | Lead in attesa dei messaggi di richiamo. |
| | **LinkedIn** | Lead da contattare su LinkedIn. |
| | **Telefonate** | Lead da chiamare. |
| **VENDITA** | **Ha Risposto** | Lead che ti hanno risposto (WhatsApp, email o telefono). |
| | **Call Fissate** | Lead con una call/appuntamento fissato. |
| | **In Trattativa** | Lead con cui sei in trattativa. |
| | **Clienti** | Lead diventati clienti. Complimenti! |
| **ALTRO** | **Archivio** | Lead messi da parte. |
| In basso | **Profilo** | I tuoi dati, cambio password e 2FA. |
| | **Guida** | La versione interattiva di questa guida. |
| | **Impostazioni** | Configurazione del CRM. **Visibile solo agli amministratori.** |
| | **Esci** | Per uscire dall'account. |

### Pagine che NON sono nel menu

Alcune pagine esistono ma non hanno una voce fissa nella barra. Le raggiungi con la **ricerca rapida** (vedi sotto):

- **Storico Ricerche** (tutte le ricerche fatte)
- **Senza Sito** (lead senza sito web)
- **Audit** (la coda degli audit dei siti)

### Ricerca rapida (il modo più veloce per spostarti)

- **Da computer:** premi **Cmd+K** (Mac) o **Ctrl+K** (Windows) in qualsiasi momento. Si apre una barra dove puoi cercare un lead per nome oppure saltare a qualsiasi pagina.
- **Da telefono:** non avendo tastiera, tocca l'icona della **lente (Cerca)** in alto: apre la stessa ricerca rapida.

### Navigazione da telefono

Su smartphone la barra laterale sparisce e in basso compare una barra con le voci principali: **Analizza**, **Video**, **Follow-up**, **Cerca**, **Profilo** (o **Menu** se sei amministratore). Tutto il resto si raggiunge dalla ricerca rapida (icona lente in alto).

---

## 4. La tua giornata tipo

L'idea è semplice: **ogni mattina il CRM ha già preparato il lavoro per te.** Durante la notte l'AI ha analizzato i nuovi lead e li ha classificati. Ecco la routine consigliata (obiettivo: **5 video al giorno**).

1. **Apri "Hot Leads".** Sono i lead con score ≥ 80 e analisi AI completa: i più promettenti.
2. **Verifica le Ads del lead.** Per ciascuno, controlla se fa pubblicità su Google e su Meta (Facebook/Instagram) usando i link che trovi nella scheda, poi segna **SÌ** o **NO** per ciascun canale. (Dettagli al capitolo 13.)
3. **Sposta il lead verso il video.** Una volta verificate entrambe le Ads, il lead può passare alla fase "Fare Video".
4. **Vai in "Fare Video" e apri il lead.** Si apre direttamente sulla scheda **Video Outreach**, con i 5 step da seguire in ordine (capitolo 9).
5. **Prepara lo script, registra il video e crea la landing page**, seguendo gli step.
6. **Invia il messaggio** con il link della landing. Da qui parte il follow-up: il sistema invierà da solo i richiami successivi se il prospect non risponde.

> **Suggerimento:** i numeri (badge) accanto alle voci della barra si aggiornano da soli a ogni azione. Non serve ricaricare la pagina.

---

## 5. La pipeline: dove si trova ogni lead

Ogni lead vive in **uno stage** alla volta. Gli stage sono raggruppati per fase. Questo è l'ordine logico del percorso:

**Fase ANALISI**
- **Da Analizzare** → appena importato, in attesa dell'AI.
- **Hot Lead / Warm Lead / Cold Lead** → classificato in base allo score.

**Fase VIDEO**
- **Fare Video** → pronto per preparare e registrare il video.
- **Video Inviato** → video inviato, si aspetta la reazione.

**Fase FOLLOW-UP** (richiami se non risponde)
- **Follow-up 1 → Follow-up 2 → Follow-up 3** (richiami progressivi).
- **LinkedIn** → contatto via LinkedIn.
- **Telefonata 1 → Telefonata 2 → Telefonata 3** (chiamate progressive).

**Fase VENDITA**
- **Call Fissata** → appuntamento confermato.
- **In Trattativa** → trattativa commerciale in corso.

**Fase CHIUSURA**
- **Cliente** → contratto chiuso, cliente acquisito.
- **Perso** → non interessato.

**Fase ARCHIVIO** (in genere assegnata in automatico)
- **Archiviato** → messo da parte, da ricontattare più avanti.
- **Non Target** → fuori target, nessun segnale commerciale.
- **Senza Sito** → niente sito web da analizzare.

> In tutto sono 21 stadi, ma non spaventarti: per la maggior parte del lavoro userai solo quelli delle prime quattro fasi. Gli stadi di archivio servono a "parcheggiare" i lead che non lavori ora.

**Come si sposta un lead di stage:** apri la scheda del lead; in alto, nel riquadro **Stage Pipeline**, c'è un menu a tendina. Scegli il nuovo stage e il lead si sposta (comparendo nella pagina corrispondente della barra laterale).

---

## 6. Lo score e i lead Hot/Warm/Cold

Lo **score** (0-100) misura quanto vale la pena lavorare un lead. La regola di lettura è una sola:

| Score | Temperatura | Cosa fare |
|-------|-------------|-----------|
| **≥ 80** | 🔥 **Hot** | Priorità massima: lavoralo per primo. |
| **50-79** | ☀️ **Warm** | Buon potenziale: lavoralo dopo gli Hot. |
| **< 50** | ❄️ **Cold** | Bassa priorità: consultalo raramente. |

**Come nasce lo score** (così sai cosa lo fa salire). Il sistema somma alcuni segnali:

- **Errore strategico sul sito** (il sito comunica male / in modo incoerente): è il fattore principale, **+50**. È il vero motivo per cui chiamiamo.
- **Ads attive verificate da te** (Google e/o Meta): **+20**. Se fa pubblicità, ha già un budget marketing.
- **Strumenti di tracciamento presenti** sul sito (Analytics, Pixel, ecc.): **+10**. Segnala un'azienda che investe nel digitale.
- **Recensioni solide** (50+ recensioni e voto > 4.0): **+10**. È un business sano.
- **Settore**: high-ticket **+20**, standard **+10**, low-ticket **+5**.

Il totale è limitato a 100. Le Ads (+20) contano **solo dopo che le hai verificate manualmente** (capitolo 13).

> **Lo score è una bussola, non un verdetto.** Dà la priorità, ma prima di chiamare dai sempre un'occhiata al sito per confermare i problemi.

---

## 7. Avviare una nuova ricerca

Trovi la ricerca alla voce **Nuova Ricerca** (dalla ricerca rapida, oppure è la voce "Cerca" nella barra in basso del telefono).

1. Inserisci la **categoria** (es. "Ristoranti", "Dentisti", "Imprese edili").
2. Inserisci la **località** (es. "Milano", "Roma centro").
3. Scegli il **numero massimo** di risultati (es. fino a 50).
4. Premi **Avvia Ricerca**.

Il sistema cerca su Google Maps e importa i lead trovati. Per quelli **con sito web** parte in automatico, in sottofondo: l'estrazione dei dati dal sito, la ricerca del numero WhatsApp e poi l'analisi AI. Li ritrovi in **Da Analizzare** e, una volta analizzati, in Hot/Warm/Cold.

> Le ricerche già fatte sono in **Storico Ricerche** (raggiungibile dalla ricerca rapida → "Ricerche").

---

## 8. La scheda del lead (le 4 schede)

Aprendo un lead trovi in alto un riepilogo (stage, voto Google, ultimo contatto) e quattro schede:

### Informazioni
I dati del lead e il **briefing** per la chiamata. Qui puoi modificare contatti (telefono, WhatsApp, email, sito) e, in fondo, c'è il campo **Note**: usalo per annotare tutto ciò che il sistema non può sapere (es. "sito in manutenzione", "numero diverso da quello su Google", "hanno un e-commerce ma nessun tracciamento"). Le note sono il tuo strumento più prezioso.

### Messaggi
Da qui **componi e invii i messaggi** (WhatsApp o email) e **registri le risposte** del prospect. Dettagli al capitolo 10.

### Video Outreach
Il cuore del lavoro: i **5 step** per preparare l'analisi, registrare il video e creare la landing page. Dettagli al capitolo 9.

### Attività
Lo **storico** di tutto ciò che è successo sul lead: messaggi inviati, video visti, cambi di stage, chiamate. Si aggiorna da solo. Non devi scrivere nulla a mano qui: le voci vengono create automaticamente quando agisci nelle altre schede (invii un messaggio, segni una risposta, ecc.).

---

## 9. Il flusso Video Outreach (5 step)

Questo è **l'unico modo corretto** per produrre e inviare il video personalizzato. Lo trovi nella scheda **Video Outreach** del lead. Gli step si sbloccano in ordine: finché non completi quello prima, il successivo resta chiuso (icona lucchetto). Puoi sempre tornare indietro a modificare uno step già fatto.

Strumenti usati in questo flusso: **Tella** (per registrare il video), **YouTube** (per ospitarlo, in modo non pubblico), **WordPress** (dove vive la landing page). Sono già configurati dall'amministratore.

### Step 1 — Analisi Sito
Clicca **"Analizza Sito"**. Il sistema legge il sito del prospect e individua i punti deboli concreti, con tanto di frasi prese dal sito stesso. Vedrai un pattern principale, un punteggio di posizionamento del brand e i "pain point". Poi:
- **Approva** se va bene (sblocca lo Step 2),
- **Modifica** per correggere il testo a mano,
- **Rigenera** (scrivendo una nota, es. "concentrati di più sul blog fermo") se vuoi un'altra versione.

### Step 2 — Script e Punto di Dolore
Clicca **"Genera Script"**: l'AI scrive il copione del video in 5 atti (introduzione, "la scena del crimine", "i soldi", la soluzione, chiusura) basandosi solo sull'analisi che hai approvato. Trovi anche il **punto di dolore** in due versioni: breve (per WhatsApp) e lungo (per la landing).

Sotto, c'è il riquadro **"Script per Tella"**: clicca **"Genera Script per Tella"** per ottenere il testo fluido e naturale da leggere davanti alla telecamera (come un gobbo/teleprompter). Quando è pronto, usa il pulsante arancione **"Copia Testo per Tella"**.

### Step 3 — Video YouTube
Qui carichi il video registrato. La procedura, in ordine:
1. **Registra il video su Tella**, leggendo lo "Script per Tella" copiato allo step 2.
2. **Carica il video su YouTube** impostandolo come **"non in elenco"** (unlisted): così è visibile solo a chi ha il link, non compare nelle ricerche pubbliche.
3. **Copia il link di YouTube e incollalo** nel campo, poi premi **Salva**.

> Se l'amministratore ha collegato l'account YouTube nelle Impostazioni, in alcuni casi il caricamento su YouTube può avvenire dal CRM. In ogni caso il punto chiave è lo stesso: **alla fine nel campo dello Step 3 deve esserci il link YouTube del video.**

### Step 4 — Landing Page
Clicca **"Crea Landing Page"**. Il CRM genera automaticamente una pagina web (su WordPress) che contiene il tuo video YouTube e il punto di dolore lungo. Quando è pronta, **copia l'URL** della landing: è quello che invierai al prospect. Se più tardi cambi il video o il testo, usa **"Risincronizza"** per aggiornare la pagina.

### Step 5 — Invia Messaggio
Da qui fai partire il contatto. Cliccando **"Avvia Follow-up Email"** parte la **sequenza automatica**: il messaggio 1 viene inviato subito, il messaggio 2 dopo 3 giorni e il messaggio 3 dopo 6 giorni, **ma solo se il prospect non risponde e non prenota la call**. In alternativa (o in aggiunta) puoi usare **"Apri WhatsApp"** per inviare il link a mano.

> Nota: il follow-up automatico via email richiede che il lead abbia un indirizzo email. Se non ce l'ha, usa WhatsApp.

**Come capisci a che punto sei:** nella pagina **Fare Video**, ogni lead mostra 5 pallini di avanzamento e un'etichetta "X/5". I lead più indietro compaiono in cima, così sai da dove ripartire.

---

## 10. Inviare messaggi e registrare le risposte

Tutto avviene nella scheda **Messaggi** del lead.

### Comporre e inviare un messaggio
1. Scegli il **canale**: **WhatsApp** o **Email**.
2. Scegli il **tipo di messaggio**: Step 1 (primo contatto), Step 2 (casi studio), Step 3 (chiusura ciclo) o un follow-up extra.
3. Il testo viene **precompilato** dal modello del workflow, già personalizzato con i dati del lead (nome, link della landing con etichetta `?utm=client`, ecc.). Puoi modificarlo liberamente.
4. Invia:
   - **WhatsApp:** il pulsante **"Apri WhatsApp"** apre la chat con il numero del prospect e il testo già pronto; tu dai l'ultimo invio a mano (WhatsApp non si automatizza).
   - **Email:** compila destinatario e oggetto (già precompilati) e premi **"Invia Email"**: parte direttamente dal CRM.
5. Ogni invio viene registrato da solo nello **storico** (in fondo alla scheda e nella scheda Attività).

> C'è anche il pulsante **Copia** se preferisci incollare il testo altrove.

### Registrare una risposta
Quando il prospect ti risponde, scendi al riquadro verde **"Segna come Ha risposto"** e clicca il canale da cui è arrivata la risposta: **WhatsApp**, **Email** o **Telefono**. Il lead si sposta in **Ha Risposto** e si ferma il follow-up automatico.

> Questo è importante: segnare la risposta evita che il sistema continui a mandare richiami a chi ti ha già scritto.

---

## 11. Il follow-up automatico via email

Il CRM può mandare da solo i messaggi di richiamo, così non devi ricordarti tu le scadenze. In pratica:

- È una sequenza di **3 step**: messaggio 1 (subito), messaggio 2 (dopo qualche giorno), messaggio 3 (qualche giorno dopo ancora).
- Il messaggio 3 ha **due versioni** che il sistema sceglie da solo: **3A** se il prospect ha guardato il video, **3B** se non lo ha guardato. Così il tono è sempre adatto.
- La sequenza **si ferma automaticamente** appena il prospect risponde o prenota la call.
- Ogni step può essere impostato in modalità **Automatica** (lo invia il sistema) o **Manuale** (lo invii tu), e ogni testo è personalizzabile.

**Dove si configura** (solo amministratori): **Impostazioni → Workflow Automazione**. Lì si attiva/disattiva il workflow, si scrivono i testi, le firme (Alessio / Francesca), il blocco "casi studio" e il link per prenotare la call. Da utente commerciale, normalmente non devi toccare nulla: ti basta avviare il follow-up dallo Step 5 del Video Outreach.

---

## 12. Appuntamenti e calendario

Quando fissi una call, porta il lead nello stage **Call Fissata** (dal menu Stage nella sua scheda). Nella pagina **Call Fissate** della barra laterale puoi vedere questi lead in due modi, con i pulsanti in alto a destra:

- **Calendario:** una vista settimanale con le call disposte nei giorni, per avere il colpo d'occhio sugli impegni.
- **Lista:** l'elenco classico dei lead con call fissata.

Da qui parti per la chiamata e, in base all'esito, sposti il lead in **In Trattativa**, **Cliente** o **Perso**.

> Il link per far prenotare la call ai prospect (es. Google Calendar) si imposta nel Workflow (capitolo 11) e finisce automaticamente nei messaggi di follow-up.

---

## 13. Verifica delle Ads (manuale)

Capire se un'azienda fa pubblicità è una valutazione che **solo tu** puoi fare con certezza: per questo è manuale. Serve sia per lo score (+20) sia per gli argomenti di vendita.

1. Nella scheda del lead trovi, per **Google Ads** e per **Meta Ads**, i pulsanti **SÌ / NO** (di partenza sono "da verificare").
2. Apri i link **Google Ads Transparency** e **Meta Ad Library** per controllare se l'azienda ha campagne attive.
3. Torna nel CRM e clicca **SÌ** o **NO** per ciascun canale. Lo score si ricalcola da solo.

> Per far avanzare il lead alla fase video devi aver verificato **entrambi** i canali. Non importa se le Ads sono attive o no: conta che tu abbia controllato e risposto SÌ o NO.

Se hai un dubbio, **non rispondere a caso**: lascia "da verificare" e scrivi una nota nella scheda Informazioni (es. "presente solo GTM, i tag potrebbero essere nascosti dentro").

---

## 14. L'analisi AI (Gemini)

L'analisi automatica è quella che, dietro le quinte, legge il sito del prospect e produce:
- la **classificazione** del lead (lo score e quindi Hot/Warm/Cold),
- i **problemi concreti** del sito (con frasi prese dal sito stesso),
- la base per lo **script del video** (i 5 atti dello Step 2 del Video Outreach).

**Quando avviene:** in automatico, di notte, sui nuovi lead con sito. La mattina trovi tutto pronto. Se ti serve analizzare un lead subito, puoi farlo a mano dallo **Step 1 del Video Outreach** ("Analizza Sito").

**Configurazione** (solo amministratori): la chiave di Gemini si imposta in **Impostazioni → API & Token**. Si può scegliere il modello (Flash è il consigliato: veloce ed economico).

---

## 15. Il tuo profilo e la sicurezza (2FA)

Alla voce **Profilo** (in basso nella barra) puoi gestire il tuo account.

### Cambiare la password
1. Inserisci la **password attuale**.
2. Scrivi la **nuova password** (almeno 8 caratteri) e ripetila.
3. Conferma. Se le due non coincidono o è troppo corta, l'app te lo segnala.

### Attivare la verifica in due passaggi (2FA)
La 2FA aggiunge un secondo controllo al login: oltre alla password, serve un **codice usa-e-getta inviato via email**.

1. Nella sezione 2FA del profilo, attiva l'interruttore.
2. Riceverai un **codice (OTP) via email**: inseriscilo nelle caselle per confermare l'attivazione.
3. Da quel momento, a ogni accesso ti verrà chiesto il codice ricevuto via email.

Per disattivarla, ripeti la procedura: ti verrà chiesto un codice di conferma.

> Consiglio: tieni la 2FA **attiva**. Protegge i dati dei tuoi lead anche se qualcuno scopre la tua password.

---

## 16. Estensioni Chrome utili

Queste estensioni del browser ti aiutano a verificare in pochi secondi cosa c'è su un sito (utile per la verifica Ads e per gli argomenti di vendita). Si installano una volta sola.

### Tag Assistant Legacy (by Google)
**A cosa serve:** vedere se un sito ha Google Analytics, Google Tag Manager, Google Ads.
1. Installala dal Chrome Web Store ("Tag Assistant Legacy by Google").
2. Apri il sito del lead, clicca l'icona dell'estensione, premi "Enable" e ricarica.
3. Leggi le icone: **verde** = tag attivo, **rosso** = tag con errore, **nessuna** = niente tag.

### Meta Pixel Helper (by Facebook)
**A cosa serve:** vedere se un sito ha il Pixel di Facebook/Meta.
1. Installala dal Chrome Web Store ("Meta Pixel Helper").
2. Apri il sito del lead e guarda l'icona: **grigia** = nessun pixel, **blu con un numero** = pixel presente.

**Senza estensioni**, in alternativa, puoi guardare il codice della pagina (tasto destro → "Visualizza sorgente pagina") e cercare con Ctrl+F:
- `gtag`, `analytics`, `G-` → Google Analytics;
- `fbq`, `facebook.net` → Meta Pixel;
- `AW-`, `googleads` → Google Ads;
- `GTM-` → Google Tag Manager (in questo caso i singoli tag potrebbero essere nascosti dentro: nel dubbio, segnala nelle note e non confermare).

---

## 17. Ricerche programmate (automatiche)

Per non dover avviare ogni ricerca a mano, il CRM può eseguirle da solo durante la notte.

- Si gestiscono in **Impostazioni → Programmate** (solo amministratori).
- Il sistema esegue alcune ricerche per notte, importa i lead da Google Maps e fa partire da solo l'analisi AI per quelli con sito.
- Si può **caricare una lista predefinita**, **aggiungere** ricerche a mano (categoria + città), **rimettere in coda** o **eliminare** le voci.

| Stato | Significato |
|-------|-------------|
| In coda | In attesa di esecuzione |
| In esecuzione | In corso ora |
| Completata | Eseguita con successo |
| Fallita | Errore: può essere rimessa in coda |

---

## 18. FAQ - Domande frequenti

**D: Dove carico il video del lead?**
R: Nello **Step 3 del Video Outreach**. Lo registri su **Tella**, lo carichi su **YouTube** come "non in elenco", e incolli il link nel campo. La landing page (Step 4) lo mostrerà al prospect.

**D: Qual è la differenza tra Warm e Cold?**
R: È lo score. **Warm = 50-79**, **Cold = sotto 50**. Hot è 80 o più.

**D: Quanto ci vuole per analizzare un lead?**
R: Pochi secondi (circa 10-30). Il sistema lo fa in sottofondo, di solito di notte.

**D: Posso usare il CRM dal telefono?**
R: Sì. La barra laterale diventa una barra in basso con le voci principali; per il resto usa la lente (ricerca rapida) in alto.

**D: Cosa succede se il sito del lead non si apre?**
R: Il lead va in "Senza Sito" oppure l'analisi fallisce con un messaggio specifico. Annota la cosa nelle note.

**D: Lo score è affidabile?**
R: È una guida sulla priorità. Più è alto, più problemi ha il sito = più argomenti per la chiamata. Verificalo sempre con un'occhiata al sito.

**D: Come faccio a sapere se il prospect ha guardato il video?**
R: Quando apre la landing e guarda il video, il CRM lo registra: nella scheda compaiono visualizzazioni, primo play e percentuale guardata, e ricevi una notifica. È il momento giusto per il follow-up.

**D: Il prospect mi ha risposto: cosa devo fare?**
R: Vai nella scheda **Messaggi** del lead e usa **"Segna come Ha risposto"** indicando il canale. Così fermi i richiami automatici e il lead passa in "Ha Risposto".

**D: Cosa significa il badge WhatsApp "dal sito" / "da Google Maps"?**
R: Il sistema cerca il numero WhatsApp prima nel sito del prospect (link wa.me) e, se non lo trova, usa il telefono di Google Maps (con prefisso +39). Il badge ti dice da dove arriva, così sai quanto fidarti.

---

*Documento aggiornato il 2026-06-21 | KW Sales CRM v3.18.0. La versione di riferimento è la Guida interattiva dentro l'app.*
