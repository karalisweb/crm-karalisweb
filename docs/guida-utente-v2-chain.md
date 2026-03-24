# Guida Utente — Catena 2 Prompt (v3.7.0)

## Cos'e cambiato

Prima il sistema generava analisi e script video con un unico prompt AI, che spesso inventava informazioni non presenti sul sito. Ora il processo e diviso in **5 step sequenziali** dove tu validi ogni passaggio prima di andare avanti.

---

## Il Flusso in 5 Step

### Step 1: Analisi Sito

**Cosa fa:** Scrapa il sito del lead e analizza la comunicazione per trovare punti di dolore concreti.

**Come usarlo:**
1. Vai nel dettaglio di un lead > tab **"Video Outreach"**
2. Clicca **"Analizza Sito"**
3. Attendi ~15-30 secondi (scraping + analisi AI)
4. Rivedi l'output:
   - **Pattern principale** (es. "Lista della Spesa")
   - **Score brand positioning** (1-10)
   - **Pain points** con citazioni esatte dal sito
   - **Punto di dolore breve** (per WhatsApp)
   - **Punto di dolore lungo** (per landing page)
5. Azioni disponibili:
   - **Approva**: l'output va bene, passa a Step 2
   - **Modifica**: modifica direttamente l'output (es. cambia il punto di dolore) e poi approva
   - **Rigenera**: se l'output non e buono, scrivi note (es. "concentrati di piu sul blog morto") e rigenera

### Step 2: Script & Punto di Dolore

**Cosa fa:** Genera lo script video a 4 atti basandosi SOLO sull'analisi che hai approvato in Step 1.

**I 4 atti:**
1. **Ghiaccio e Metafora**: rompe il ghiaccio, stabilisce autorita
2. **La Scena del Crimine**: mostra il problema concreto con citazione
3. **I Soldi**: collega il problema ai costi/ads
4. **La Soluzione**: toglie le colpe, presenta l'MSD

**Come usarlo:**
1. Dopo aver approvato Step 1, clicca **"Genera Script"**
2. Rivedi i 4 atti e i punti di dolore (breve + lungo)
3. Approva / Modifica / Rigenera come in Step 1

### Step 3: Video YouTube

**Cosa fa:** Salva il link del video registrato su Tella e caricato su YouTube.

**Come usarlo:**
1. Registra il video su Tella leggendo lo script
2. Caricalo su YouTube in modalita **non in elenco**
3. Incolla il link YouTube nel campo e premi Invio

### Step 4: Landing Page

**Cosa fa:** Crea la landing page su WordPress con il punto di dolore lungo e il video YouTube.

**Come usarlo:**
1. Verifica l'anteprima del punto di dolore che apparira sulla landing
2. Clicca **"Crea Landing Page"**
3. Copia l'URL della landing generata

### Step 5: Invia Messaggio

**Cosa fa:** Invia il messaggio con il link alla landing via WhatsApp o Email.

**Come usarlo:**
1. Seleziona il canale (WhatsApp se disponibile, altrimenti Email)
2. Rivedi l'anteprima del messaggio auto-generato
3. Clicca **"Apri WhatsApp"** o **"Invia Email"**

---

## Pagina "Fare Video"

La pagina Fare Video ora mostra per ogni lead:
- **5 pallini** di progresso (verdi = completati, blu = attivo, grigi = da fare)
- **Badge "X/5"** con lo step corrente
- I lead con meno step completati appaiono in cima

Cliccando su un lead si apre direttamente il tab Video Outreach.

---

## Personalizzare i Prompt AI

Vai in **Impostazioni > AI** per trovare i due nuovi editor:

### Prompt 1 "Analista" (bordo blu)
Controlla come l'AI analizza il sito. Puoi modificare:
- Le regole di analisi
- I pattern da cercare
- Il tono del punto di dolore

### Prompt 2 "Sceneggiatore" (bordo viola)
Controlla come l'AI scrive lo script video. Puoi modificare:
- La struttura dei 4 atti
- Il tono e lo stile
- Le istruzioni per la metafora e la soluzione

### Pill Cliccabili
Sotto ogni editor ci sono delle **pill colorate** con i placeholder disponibili (es. `{{company_name}}`, `{{home_text}}`). Clicca su una pill per inserirla nella posizione del cursore nel prompt.

### Ripristina Default
Se un prompt diventa troppo modificato, clicca **"Ripristina Default"** per tornare alla versione originale.

---

## FAQ

**D: Posso saltare uno step?**
No. Ogni step blocca il successivo. Questo garantisce che il messaggio finale sia basato su dati verificati.

**D: Posso tornare indietro a modificare uno step gia approvato?**
Si. Puoi cliccare "Modifica" o "Rigenera" su qualsiasi step completato. Attenzione: rigenerare lo Step 1 resetta anche lo Step 2.

**D: I lead gia processati con il vecchio sistema funzionano ancora?**
Si. Il tab "Analisi Strategica" mostra ancora la vecchia analisi. Per usare il nuovo flusso, vai nel tab "Video Outreach" e parti da Step 1.

**D: Dove trovo il punto di dolore per WhatsApp?**
Viene generato automaticamente in Step 1 (versione breve) e puoi editarlo in Step 1 o Step 2 prima di approvare.
