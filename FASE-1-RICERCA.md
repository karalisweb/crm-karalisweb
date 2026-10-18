# Fase 1 — Ricerca: specifica di costruzione

Traduce in app la Fase 1 di `PROGETTO-AGENTI.md` (definita con Alessio il 2026-10-17). Se i due documenti
non coincidono, vale `PROGETTO-AGENTI.md`.

La fase di **analisi non è ancora definita**: fino ad allora le aziende trovate entrano nella raccolta che c'è già
(squadra notturna), senza cambiarla.

---

## 1. Cosa vede Alessio

Nel menu nasce la sezione **RICERCA** con quattro pagine:

| Pagina | A cosa serve |
|---|---|
| **121 BNI** (`/bni`) | Il contatore della settimana (10 121), i capitoli con il loro avanzamento, chi incontrare dopo |
| **Membri BNI** (`/bni/membri`) | La ricerca per bisogno ("commercialista a Cagliari") e la scheda di ogni membro |
| **Casi studio** (`/casi-studio`) | Carica un PDF, conferma le chiavi, vedi cosa hanno trovato |
| **Persone LinkedIn** (`/persone`) | Il contenitore LinkedIn: le persone trovate, con l'azienda collegata |

Il contenitore **Meta + Google** sono le aziende che già esistono (`/leads`), con il filtro "trovate dalle chiavi".
La vecchia pagina **Rete BNI** esce dal menu (resta raggiungibile, i dati non si toccano).

Tutto quello che parte a nome di Alessio passa dalla **Cassetta**, come oggi.

---

## 2. Dati

Migrazione additiva `20261017090000_fase_ricerca` (SQL idempotente, niente colonne nuove su `leads`).

### Tabelle nuove

**`casi_studio`** — un PDF caricato da Alessio.
`id, titolo, pdf_nome, pdf (bytea), testo, storia (la versione da 30 secondi: com'era / cosa abbiamo fatto / cosa è
cambiato), settore, azienda_nome, azienda_sito, persona_nome, persona_ruolo, persona_linkedin, termini (json: le
parole di ricerca per i "simili"), stato (DA_CONFERMARE | ATTIVO | SCADUTO), valido_fino (+6 mesi dalla conferma),
costo_cents, created_at, updated_at, confermato_at`.

**`chiavi_ricerca`** — da cosa parte una ricerca.
`id, tipo (SETTORE | AZIENDA | PERSONA | RETE_MEMBRO), valore, termini (json), caso_studio_id?, bni_membro_id?,
attiva, scade_at, zona_indice (dove è arrivata: prima la Sardegna, poi l'Italia), usi, trovati, ultimo_uso_at,
esaurita_at, created_at`.

**`persone`** — il contenitore LinkedIn (e le persone in genere).
`id, nome, ruolo, azienda_nome, linkedin_url (unico), localita, lead_id? (l'azienda collegata), bni_membro_id? (se è
un membro BNI: relazione, non vendita), contatto_in_comune, chiave_id?, fonte (linkedin | rete_membro | sito),
note, created_at, updated_at`.

**`ritrovamenti`** — chi ha trovato cosa, per contare e per filtrare.
`id, chiave_id, lead_id?, persona_id?, canale (google | maps | facebook | instagram | linkedin), created_at`.

**`bni_presentazioni`** — le persone da farsi presentare da un membro.
`id, membro_id (chi presenta), persona_id?, nome, ruolo, linkedin_url, perche, stato (DA_CHIEDERE | CHIESTA |
PRESENTATO | NO), created_at, updated_at`.

### Colonne nuove su tabelle esistenti

- **`bni_membri`**: `linkedin_url`, `cosa_fa`, `referenze_puo_dare`, `prossimo_passo`, `prossimo_passo_at`,
  `lead_id` (l'azienda collegata), `indicato_da` + `indicato_at` (segnalato dal presidente come attivo),
  `rete_letta_at`. "Referenze che cerca" usa la colonna che c'è già, `seeking`.
- **`one_to_ones`**: `formato` (PRESENZA | ONLINE), `trascrizione`, `riassunto`, `promesse`.
- **`bni_chapters`**: `sede`.

Gli stati del membro non sono una colonna: **da incontrare** (nessun 121 e nessuna data), **121 fissato**
(`next_121_at` nel futuro), **conosciuto** (`conosciuto_at` o almeno un 121).

I campi vecchi (punteggi cliente/partner, buyer persona, pipeline `bni_stage`) restano nel database ma non si usano
e non si mostrano più.

---

## 3. Flusso BNI

### 3.1 L'ordine dentro il capitolo — `src/lib/ricerca/bni-ordine.ts` (logica pura, testata)

Per ogni capitolo, tra i membri **non ancora conosciuti**:

1. chi ha **il ruolo di Alessio** (categoria simile: web, siti, marketing, comunicazione, social, SEO, digital,
   pubblicità, grafica, e-commerce);
2. il **presidente** e il **responsabile formazione / eventi**;
3. se nessuno ha il ruolo di Alessio: il **presidente** va per primo; dopo il suo 121, quelli che ha **indicato** come
   più attivi o interessanti;
4. **tutti gli altri**.

I ruoli di dirigenza si leggono dal portale BNI: il Cartografo rilegge la Sardegna **ogni 30 giorni** (il resto
d'Italia ogni 90), così i ruoli non invecchiano. Non compaiono nella scheda del capitolo.

### 3.2 La settimana dei 121 — `src/lib/ricerca/bni-settimana.ts`

Obiettivo **8 121 a settimana**. Ogni mattina (cron `squadra-bni`, 07:00):

- conta i 121 della settimana: fatti (`one_to_ones`) + fissati (`next_121_at` nella settimana);
- tiene **12 richieste aperte** (le persone a cui chiedere un 121, perché qualcuno non risponde o rimanda): se sono
  meno, aggiunge le prossime persone secondo l'ordine;
- lavora **2 capitoli alla volta**, per arrivare presto a un terzo di ciascuno e alla visita. Ordine dei capitoli:
  prima la Sardegna (prima quelli già iniziati, poi il capitolo di Alessio, poi gli altri), poi il resto d'Italia;
- per ogni persona l'AI scrive il **messaggio di richiesta** (con lo scopo giusto: rispetto e collaborazione per chi ha
  il suo ruolo; presentarsi e chiedere chi sono i più attivi per il presidente; conoscersi per tutti gli altri) e il
  **formato** (di persona se il capitolo è in presenza, Meet se è online, a scelta se è ibrido). Va in Cassetta come
  `MESSAGGIO_BNI`: Alessio lo approva e lo manda da WhatsApp con un tasto.

### 3.3 Prima del 121

Quando Alessio segna la data del 121 (`next_121_at`):

- parte il lavoro di browser **rete del membro** (LinkedIn, al massimo 1 al giorno per non pesare sul profilo):
  trova il profilo LinkedIn del membro e, tra i suoi collegamenti visibili e quelli in comune, sceglie **3-5 titolari
  o responsabili** di aziende interessanti (meglio se nei settori dei casi studio attivi). Diventano `persone` e
  `bni_presentazioni` DA_CHIEDERE;
- il giorno prima, in Cassetta (`PREPARAZIONE_121`): chi è e cosa fa, le persone da farsi presentare, la storia di un
  caso studio da raccontare, le due domande da fare (che referenze cerca, che referenze può dare).

### 3.4 Dopo il 121 — agente **Dopo-121**

Nella scheda del membro, "Registra il 121": data, formato, e il testo (la trascrizione di Meet incollata, oppure il
vocale dettato). L'AI compila: **cosa fa** (e cosa non fa, zone), **referenze che cerca**, **referenze che può dare**,
**promesse**, **persone da farsi presentare** nominate, **prossimo passo** con data e, se il membro è il presidente,
**i membri che ha indicato** (che salgono nell'ordine del capitolo). Il membro diventa "conosciuto".

Un 121 già fatto in passato si registra con lo stesso modulo, anche senza testo.

### 3.5 La visita al capitolo

Quando Alessio ha conosciuto **un terzo** dei membri di un capitolo non ancora visitato, in Cassetta arriva
`VISITA_CAPITOLO`: il messaggio al presidente per chiedere di partecipare a una riunione, con giorno, ora, sede o link.
Una volta per capitolo.

### 3.6 La ricerca per bisogno

In "Membri BNI" si scrive un bisogno; si cerca in nome, categoria, azienda, cosa fa, referenze che cerca, referenze
che può dare. Prima chi corrisponde a più parole, poi chi è conosciuto.

---

## 4. Flusso clienti

### 4.1 Casi studio

1. Alessio carica il PDF (massimo 15 MB).
2. L'AI lo legge e propone: titolo, storia da 30 secondi, settore, azienda (nome e sito), persona (nome, ruolo, LinkedIn
   se c'è), 3-5 **termini** di ricerca per le aziende simili (per IEM Piscine: "costruzione piscine", "piscine
   interrate", "manutenzione piscine"…). Stato DA_CONFERMARE.
3. Alessio corregge e **conferma**. Nascono le chiavi: SETTORE (il settore + i termini), AZIENDA, PERSONA, valide
   **6 mesi**.

### 4.2 Le chiavi e la zona

- Si usa per prima la chiave attiva usata meno di recente; le chiavi RETE_MEMBRO (nate dai 121) valgono come quelle
  dei casi studio. Senza chiavi attive, l'Esploratore torna alla rotazione categoria × città di prima.
- Ogni chiave scorre le zone: prima le città della Sardegna (Sud, poi Nord e Centro), poi le città principali del resto
  d'Italia. Una zona che non porta niente di nuovo si salta.

### 4.3 Dove si cerca

| Chiave | Canale | Come | Contenitore |
|---|---|---|---|
| SETTORE, AZIENDA | Google Maps | DataForSEO `serp/google/maps` ("termine città"): nome, sito, telefono, indirizzo, recensioni | Meta + Google |
| SETTORE, AZIENDA | Google | DataForSEO organico (come l'Esploratore di oggi) | Meta + Google |
| SETTORE, AZIENDA | Facebook, Instagram | lavoro di browser **cerca su Meta**: pagine e profili di aziende per termine e città | Meta + Google |
| RETE_MEMBRO | LinkedIn | lavoro di browser: tra i collegamenti del membro | LinkedIn |

> **Decisione del 2026-10-18:** le aziende **non si cercano su LinkedIn** (né per persone simili al titolare, né per pagine
> aziendali: per "costruzione piscine" in Sardegna le pagine erano solo 5, molte piccole imprese non ce l'hanno). Le
> aziende si trovano con Google Maps, Google e Meta. LinkedIn serve dopo, azienda per azienda, per trovare **chi decide**
> (pagina per nome o dominio; se non c'è, le persone che scrivono quell'azienda nel profilo, in Sardegna; max 2 persone,
> con i contatti in comune). Dettagli e prova prima del codice: `PROGETTO-AGENTI.md`, Fase 2, punto 6.

**Obiettivo: 5 aziende nuove al giorno.** Il turno (cron `esploratore`, feriali 06:30 e 14:30) prova le chiavi finché
arriva a 5 o fa 4 ricerche. Su LinkedIn al massimo **2 lavori al giorno** (oggi solo le reti dei membri BNI).

### 4.4 Doppioni e collegamenti

- Aziende: stesso `place_id` o stesso dominio → è la stessa; si aggiunge solo il ritrovamento.
- Persone: stesso profilo LinkedIn → è la stessa.
- Una persona trovata su LinkedIn con la sua azienda: se l'azienda c'è (nome uguale o dominio), si collega; se non
  c'è, si crea l'azienda (fonte `linkedin`) e si collega.
- Una persona che è un **membro BNI** (stesso profilo LinkedIn o stesso nome e azienda) si collega al membro: è
  relazione, non vendita, e non entra nella ricerca clienti.
- Franchising e catene: scartati come oggi.

---

## 5. Precedenze

- **I 121 vengono prima di tutto.** I lavori di browser BNI (Cartografo, rete del membro) passano davanti a quelli
  della ricerca clienti.
- Tetto di spesa: lo stesso di oggi (`AGENTI_BUDGET_EUR`, dentro i 100 €/mese).

## 6. Agenti nuovi o cambiati

| Agente | Famiglia | Cosa fa |
|---|---|---|
| Cartografo capitoli (B1) | browser | come oggi, più la sede; la Sardegna ogni 30 giorni |
| Pianificatore 121 (sostituisce lo Stratega B2) | server | l'ordine nel capitolo, i 2 capitoli in corso, le 12 richieste aperte |
| Preparatore 121 (B3) | sintesi | il messaggio di richiesta; il foglio del giorno prima |
| Rete del membro | browser | 3-5 persone da farsi presentare dalla rete LinkedIn del membro |
| Dopo-121 | sintesi | compila la scheda del membro dalla trascrizione o dal vocale |
| Copertura (B4) | server | conosciuti / totale per capitolo; la visita a un terzo |
| Lettore casi studio | sintesi | dal PDF: storia, chiavi, termini |
| Esploratore (1) | server | guidato dalle chiavi; Google Maps e Google |
| Cercatore Meta | browser | aziende su Facebook e Instagram |
| Cercatore LinkedIn | browser | persone simili, reti, amici in comune |
