# 🤝 PIANO — "BNI all'estremo"

> Sotto-piano operativo di `STRATEGIA-REVENUE-FIRST.md` (Motore 2).
> Deciso con Alessio il 2026-07-27.
>
> **Obiettivo:** trasformare il lavoro BNI da manuale/mnemonico a sistematico:
> analizzare i capitoli **prima** di visitarli, arrivare con un pitch ad hoc, sapere
> chi intercettare nel libero networking, e nei 121 avere sempre un referral **da dare**.

---

## 0. Le 3 decisioni prese

| # | Domanda | Risposta |
|---|---------|----------|
| 1 | Cliente ideale | Campo **buyer persona** sul lead/membro. Fonte unica = i 3 cluster già esistenti (vedi §1). |
| 2 | Scope capitoli | **Solo Sardegna** (region Nord, Centro, Sud). Fuori Sardegna: più avanti, e solo capitoli **ibridi**. |
| 3 | Pool contatti per reciprocità | Lead/clienti già nel CRM **+ import file** ("ti butto dentro un file e tu lo normalizzi"). |

---

## 1. Prerequisito — Buyer Persona come fonte unica ⚠️

**Problema rilevato:** nel codice esistono **3 tassonomie di target che si contraddicono**:
- `src/lib/segments.ts` → 15 micro-segmenti (infissi, ristorazione, centri_estetici…)
- `src/components/settings/search-config-tab.tsx` → 3 cluster **Casa · Microturismo · Persona** (con subcluster)
- `src/lib/scoring/lead-score.ts` → `high_ticket` / `low_ticket` / `standard`

Esempio di conflitto: *ristorazione* è segmento attivo nel primo, assente nel secondo, `low_ticket` nel terzo.
Aggiungere un campo "persona" senza risolverlo creerebbe la **quarta** tassonomia in conflitto.

### Decisione
**I 3 cluster diventano le buyer personas ufficiali** (sono la tassonomia più recente, più strategica,
e hanno già il nome giusto). Le altre due si riconciliano *sotto* di esse:

```
PERSONA (cluster)      →  micro-segmenti (dettaglio)              →  tier (valore)
─────────────────────────────────────────────────────────────────────────────────
🏠 CASA                →  infissi, edilizia, impiantistica,       →  prev. high_ticket
                          arredo, pavimenti, clima, giardinaggio
🏡 MICROTURISMO        →  property manager, agenzie immobiliari,  →  high/standard
                          strutture ricettive boutique
👤 PERSONA             →  estetica, salute e diagnostica,         →  misto
                          riabilitazione, odontoiatria
```

**Da fare:**
- Campo `buyerPersona` (enum: `CASA` | `MICROTURISMO` | `PERSONA` | `ALTRO`) su `Lead` e su `BniMembro`.
- Derivazione automatica da `segment`/`category` dove già noto; override manuale sempre possibile.
- Un **unico file sorgente** della tassonomia (oggi `SUBCLUSTER_LABELS` è duplicato in 2 file con label diverse).

> Nota: manca a monte la **Carta Fondativa MSD** (non versionata nel repo) — il documento di
> posizionamento. Non blocca questo piano, ma andrebbe recuperata.

---

## 2. I due assi di classificazione di un membro BNI 🔑

È il cuore del piano. "Utile per me" ha **due significati opposti**, che portano ad azioni diverse:

| Asse | Cos'è | Azione | Valore |
|------|-------|--------|--------|
| **① Cliente potenziale** | Il membro **È** una delle mie buyer personas (è un infissi, un property manager, un centro estetico) | Audit del suo sito → gancio di vendita | 1 cliente |
| **② Partner di potere** | Il membro **SERVE** le mie buyer personas (commercialista, architetto, geometra, agenzia immobiliare, fornitore edile, tipografia…) | 121 prioritario → mi porta clienti in continuo | 10 clienti |

**Nel BNI l'asse ② vale più dell'① .** Il CRM oggi vede solo l'①  (audit = vendo).
Ogni membro riceve quindi due punteggi indipendenti: `clientScore` e `partnerScore`.

### Come si calcola l'asse ②
Mappa "categoria BNI del membro → buyer personas a cui dà accesso".
Esempio: *Architetto* → accesso a CASA (ristrutturazioni) + MICROTURISMO (case vacanza).
*Commercialista* → accesso trasversale a tutte (parla ogni giorno con decine di PMI).
La mappa è una tabella editabile, non hardcoded: la si affina con l'esperienza.

---

## 3. MOTORE A — Chapter Intelligence (preparazione pre-visita)

**Flusso desiderato da Alessio:**
> "prima di visitarli devo analizzare tutti i membri e fare il pitch ad hoc per quel capitolo
> e intercettare nel libero networking le persone che mi interessano"

### A1 — Ingestione capitoli e membri (Sardegna)
Fonti pubbliche (dati aziendali pubblici → coerente col vincolo etico del progetto):
- `bni-sardegnanord.it` · `bni-sardegnacentro.it` · `bni-sardegnasud.it` → `/it/findamember` e lista capitoli.

⚠️ **Vincolo tecnico verificato:** le pagine caricano i membri via **JavaScript**, quindi un fetch
semplice non basta. Serve automazione browser (o individuare l'endpoint JSON dietro la ricerca).
È lavoro di ingestion reale, non "leggo una pagina". **Fallback sempre disponibile:** import manuale
da file (vedi §5) — lo stesso importer serve entrambi gli scopi.

Dati da estrarre per membro: nome, azienda, **categoria/professione**, capitolo, sito web (se esposto).
Dati per capitolo: nome, città, giorno/orario, **modalità (presenza / online / ibrido)**.

### A2 — Classificazione automatica
Per ogni membro estratto: calcolo `buyerPersona`, `clientScore` (asse ①) e `partnerScore` (asse ②).
Per i membri con sito web → **audit automatico** (riuso totale di `runFullAudit`) → talking point pronti.

### A3 — Scheda "Dossier Capitolo" (l'output che serve ad Alessio)
Una pagina per capitolo che risponde a: *vale la pena visitarlo? e se sì, con chi parlo?*

- **Punteggio di attrattività** del capitolo = quanti membri-cliente + quanti partner di potere.
- **Top 5 da intercettare nel libero networking**, ordinati per valore, con **una riga di aggancio ciascuno**
  (dall'audit se hanno sito, dalla categoria se no).
- **Pitch ad hoc per quel capitolo**: la composizione del capitolo detta il messaggio
  (capitolo pieno di edilizia → pitch CASA; capitolo turistico → pitch MICROTURISMO).
- **Modalità**: filtro Sardegna = fisico · fuori Sardegna = solo se **ibrido**.

### A4 — Coda visite
Lista capitoli sardi ordinata per attrattività, con stato: `da analizzare` → `analizzato` →
`visita pianificata` → `visitato`. Più le date/orari per incastrarli in agenda.

---

## 4. MOTORE B — Memo 121 & Reciprocità (Givers Gain)

**Flusso desiderato da Alessio:**
> "Quando vado in 121 devo avere un blocco memo dove mi faccio dare delle reference e io scorro
> i miei contatti per segnalare all'altra persona… sono con Giampaolo che gli servono sindaci di
> piccoli comuni e allora gli mando il contatto del sindaco del piccolo comune"

### B1 — "Chi cerca" (il campo che fa funzionare tutto)
Su ogni `BniMembro`: **chi è il suo cliente ideale** (testo + tag), es. Giampaolo → *"sindaci di piccoli comuni"*.
Si compila durante il 121 (è letteralmente la domanda che si fa in un 121).

### B2 — Matcher di reciprocità
Dato "chi cerca" del membro → il CRM **scorre i contatti taggati** e propone i match da regalare.
⚠️ **Funziona solo se i contatti sono taggati** con *professione + zona + ruolo*. Senza tag, nessun match.
Per questo l'import file (§5) è prerequisito del valore di questo motore.

### B3 — Modalità 121 (mobile-first)
Schermata da usare **al tavolo**, con:
- I match pronti da dare (asse "io do")
- Il campo per registrare cosa chiedo io (asse "io ricevo")
- Note rapide + esito + prossimo passo
Deve funzionare col pollice, offline-tollerante, senza scrivere molto.

### B4 — Bilancio della reciprocità
Per ogni membro: **referral dati vs ricevuti**, e il ROI (€ generati). Ordina i partner per valore reale
→ sai con chi coltivare i 121 e a chi stai dando senza ricevere.

### B5 — Coda 121
- **Capitolo Atlantide (il mio): un 121 con OGNI membro** — checklist di copertura, chi manca.
- Membri di altri capitoli con `partnerScore` alto → 121 da fissare.
- Membri senza 121 da >X settimane (riusa `BniMembro.lastOneToOneAt`, già indicizzato).

---

## 5. IMPORT CONTATTI ("ti butto dentro un file e tu lo normalizzi")

Importer generico che accetta CSV/Excel/vCard con colonne arbitrarie e:
1. Rileva e mappa le colonne (nome, azienda, professione, telefono, email, zona…)
2. **Normalizza** (telefoni, maiuscole, duplicati)
3. **Dedup** contro i lead/membri esistenti
4. **Auto-tagga** professione + zona + buyer persona → così i contatti diventano "regalabili" nel matcher B2

Serve sia al Motore B (pool referral) sia come fallback all'ingestione BNI (§A1).

---

## 6. Sequenza di implementazione

| # | Blocco | Perché in quest'ordine | Effort |
|---|--------|------------------------|--------|
| 1 | **Buyer persona come fonte unica** (§1) | Prerequisito di tutto: senza, ogni classificazione è ambigua | ⚡ |
| 2 | **Due assi + scoring membri** (§2) | Il cuore concettuale; abilita sia A che B | 🔧 |
| 3 | **Import contatti** (§5) | Sblocca il valore del matcher e fa da fallback all'ingestione | 🔧 |
| 4 | **Motore B — 121 & reciprocità** (§4) | Serve subito: i 121 di Atlantide sono già in corso | 🔧 |
| 5 | **Ingestione BNI Sardegna** (§A1) | Il pezzo tecnicamente più incerto (JS rendering) → non bloccare gli altri | 🏗️ |
| 6 | **Dossier Capitolo + coda visite** (§A3-A4) | Dipende da 5 | 🔧 |

**Pilota consigliato:** provare l'intera catena su **UN solo capitolo** (Atlantide o il primo capitolo sardo
in visita): estrarre membri → classificare sui due assi → generare dossier + pitch.
Se funziona su uno, funziona su tutti.

---

## 7. Metriche di successo

- N° 121 fatti / settimana · copertura Atlantide (% membri con 121 fatto)
- N° capitoli analizzati e visitati · contatti agganciati per visita
- **Referral dati vs ricevuti** (il vero indicatore Givers Gain)
- € generati per partner → chi merita più tempo

---

## 📌 Stato

- **Creato:** 2026-07-27 · App v3.32.0 · Companion di `STRATEGIA-REVENUE-FIRST.md`
- **Verificato:** i siti BNI region sardi espongono membri/capitoli pubblicamente, ma **via JavaScript**
  (serve automazione browser o endpoint JSON; fallback = import file).
- **Non ancora deciso:** mappa categoria-BNI → buyer persona servite (asse ②) — si costruisce
  insieme ad Alessio, si affina con l'esperienza.
