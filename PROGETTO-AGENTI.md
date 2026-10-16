# Progetto — La squadra di agenti commerciali

Bozza di lavoro del 2026-10-15. Analisi in sola lettura: nessun file di codice è stato toccato.
Da qui si decide; niente si costruisce prima del via di Alessio.

---

## 1. Da dove partiamo (numeri veri, letti dalla produzione il 2026-10-15)

| Cosa | Numero |
|---|---|
| Aziende nel CRM | **3.268**, tutte da Google Maps |
| Con sito | 2.479 |
| Audit completati | 2.262 (205 falliti) |
| Stadi principali | 1.152 warm · 791 senza sito · 783 da analizzare · 286 hot · 123 nurturing · 121 non target |
| Email fredde mandate negli ultimi 90 giorni | 150 |
| Diventati "caldi" dopo l'email | **1** |
| Video inviati | 0 |
| Clienti chiusi registrati nel CRM | 0 |
| Membri BNI | 150 in 5 capitoli sardi · 121 registrati: **0** |
| Opportunità extra-BNI | 0 |

Lettura onesta: l'app sa **trovare e analizzare** bene (migliaia di aziende, audit su quasi tutte).
Non porta in call: la parte che doveva trasformare l'analisi in un contatto vero non ha funzionato.
In più la ricerca notturna su Google Maps **non è più nel crontab del server**: oggi non parte.

## 2. Una scoperta che cambia la domanda "dove costruiamo"

Il 6 settembre è stato deciso, nel progetto **Podio** (`/opt/podio`, porta 3011), che:

- il CRM diventa **solo la fonte dei motori** del modulo Podio "1. Acquisizione" e poi si spegne;
- l'anagrafica delle aziende sta in un posto solo (il Nucleo di Podio);
- vale la regola **"l'AI propone, una persona approva"**: tutto ciò che esce passa dalla **cassetta approvazioni**;
- c'è **un solo orologio**: il crontab del server chiama indirizzi dell'app.

Podio ha già la cassetta e l'orologio funzionanti (propone compiti, esegue quelli approvati). Il modulo
Acquisizione invece è solo scritto (`docs/podio-modulo-1-acquisizione.md`): **nessuna riga di codice**.

Una squadra di agenti ha bisogno proprio di quelle tre cose: un'anagrafica unica, una coda dove gli
agenti depositano il lavoro e tu approvi, un orologio che li sveglia. → **Decisione 1** in fondo.

## 3. Come è fatta la squadra (architettura)

### 3.1 Tre famiglie di agenti

| Famiglia | Dove gira | Quando | Per cosa |
|---|---|---|---|
| **Agenti di server** | VPS, svegliati dal crontab | Di notte e a ondate, su decine/centinaia di aziende | Tutto ciò che si legge da internet senza login: sito, tecnologia, SEO, tracciamenti, blog, SERP, Ads Transparency |
| **Agenti di browser** | Claude sul tuo Mac (attività programmate + browser) | Poche aziende al giorno, con calma | Tutto ciò che vuole un browser vero o un tuo accesso: LinkedIn, BNI Connect, Meta Ad Library, ultimi post social |
| **Agenti di sintesi** | VPS, solo sulle aziende che passano il filtro | Dopo che i raccoglitori hanno finito | Coerenza, scheda leve, scaletta video, bozze di messaggi |

Perché due posti: il server costa poco e lavora tanto, ma su LinkedIn e Meta viene bloccato.
Claude sul Mac usa il tuo browser con i tuoi accessi, lento come una persona, e dove serve ti mostra il lavoro.

### 3.2 Il fascicolo dell'azienda (al posto delle 133 colonne)

Ogni agente non scrive "campi": consegna un **referto** nel fascicolo dell'azienda.

Referto = chi l'ha scritto · quando · che cosa ha trovato · **la prova** (frase, link, screenshot) ·
quanto è sicuro · fino a quando vale (un post social invecchia in settimane, la tecnologia del sito in mesi).

Così l'agente di coerenza (11) e quello delle leve (12) lavorano su prove citabili, non su sì/no.
E un dato scaduto si ri-raccoglie da solo.

### 3.3 Il regista (imbuto, dal più economico al più caro)

Gli agenti non partono tutti su tutte le aziende. Un regista li fa partire a cascata:

1. **Trova** (1) → scarta catene, doppioni, clienti già tuoi.
2. **Raccolta economica** (2.5, 3 on-page, 3.5, 5, tag del 4) — secondi per azienda, costo quasi zero.
3. **Filtro**: se l'azienda non ha margini su cui fare leva, si ferma qui.
4. **Raccolta cara** (2 con AI, 3 SERP, 4 Transparency, 6, 7, 8, 9).
5. **Sintesi** (11 → 13 → 12).
6. **Cassetta**: arriva a te solo la scheda pronta, con la bozza di contatto.

### 3.4 Le regole che non cambiano

- **Nessun messaggio parte da solo.** Gli agenti preparano, tu approvi e (su LinkedIn/WhatsApp) mandi tu.
- **Niente dati inventati.** Se un agente non trova, scrive "non trovato", mai "no".
- **Dati personali**: solo ruolo e nome pubblico del decision maker, niente raccolta massiva di dipendenti.

## 4. La squadra commerciale — agente per agente

Legenda riuso: ✅ si porta così · 🔧 si adatta · 🆕 da fare.

| # | Agente | Famiglia | Cosa ricicla | Cosa manca |
|---|---|---|---|---|
| 1 | **Esploratore** | server + browser | ✅ Google Maps via Apify, filtro franchising, doppioni su placeId | 🆕 Google Search (via DataForSEO/Apify) · 🆕 LinkedIn (browser) · 🔧 riaccendere la ricerca programmata |
| 2 | **Lettore del sito** (cosa dice, come lo dice) | server | ✅ estrattore testi + rilevatore cliché · ✅ prompt "Analista" (dolori con citazione esatta) | 🆕 analisi del tono separata dal contenuto · 🔧 leggere più pagine |
| 2.5 | **Tecnico** (stack ed età) | server | ✅ `tech-detector` (CMS, versioni, PHP) | 🆕 età del sito: © nel footer, archivio storico (Wayback), header · 🔧 togliere falsi positivi |
| 3 | **SEO** | server | ✅ `seo-checker` on-page (testato) | 🆕 posizioni su Google per le parole "normali" della categoria+città (DataForSEO) |
| 3.5 | **Blog** | server | 🔧 `blog-detector` (date fragili, 2 test rotti) | 🆕 feed RSS / sitemap articoli / API WordPress · 🆕 di cosa parla |
| 4 | **Google Ads** | server | ✅ tag AW- e gclid · 🔧 Transparency via DataForSEO (esiste solo in Python in `direzione-first`) | 🆕 portarlo e salvarlo (oggi il salvataggio è spento dalla v3.6) |
| 5 | **Tracciamenti** | server | ✅ `tracking-detector` (GA4, GTM, pixel, Clarity…) | 🆕 tag caricati dentro GTM (serve un browser senza schermo) |
| 6 | **Social** | browser | ✅ link ai profili dal sito | 🆕 ultimo post, di cosa parlano, coerenza col sito |
| 7 | **Meta Ad Library** | browser | 🔧 link alla libreria · attore Apify (inaffidabile, cerca per nome) | 🆕 ricerca per pagina Facebook, inserzioni attive/passate, coerenza |
| 8 | **LinkedIn azienda** | browser | — (oggi solo una lista manuale) | 🆕 tutto |
| 9 | **Decision maker** | browser | 🔧 email generiche dal sito, WhatsApp dal sito | 🆕 nome e ruolo del titolare/responsabile (LinkedIn, "chi siamo", visura) |
| 10 | **Aggancio** | sintesi → tu | ✅ generatore email con fatti verificati + filtro "Carta" · ✅ schermata approvazione | 🔧 scrivere alla persona, non all'azienda · 🆕 bozza LinkedIn/WhatsApp che mandi tu |
| 11 | **Coerenza** | sintesi | frammenti (ads ↔ landing) | 🆕 confronto sito ↔ social ↔ ads ↔ tracciamenti ↔ blog ("pixel installato ma zero inserzioni") |
| 12 | **Scheda leve** | sintesi | ✅ punteggio con dettaglio · ✅ punto dolore breve/lungo · 🔧 talking points MSD (dormienti, testati) | 🆕 una scheda unica, ogni leva con la sua prova |
| 13 | **Regista del video** | sintesi | ✅ catena Analista → Sceneggiatore → canovaccio · ✅ landing WP + YouTube + tracciamento visioni | 🆕 scaletta "cosa mostrare a schermo", in che ordine, con quale prova |

## 5. La squadra BNI

| # | Agente | Famiglia | Cosa fa | Riuso |
|---|---|---|---|---|
| B1 | **Cartografo capitoli** | browser (BNI Connect) | Per regione: capitoli, formato (presenza/online/ibrido), giorno e ora, membri, categorie, **presidente, vice, responsabile formazione** | 🔧 la skill `bni-121` sa già navigare BNI Connect · ✅ tabella capitoli con formato · 🆕 ruoli di dirigenza, regioni italiane |
| B2 | **Stratega di capitolo** | sintesi (regola fissa) | Sardegna → copertura totale. Fuori → c'è un "collega" con il tuo ruolo? → collaborazione. Ruolo scoperto + online/ibrido → visita. Ruolo scoperto + presenza → 121 con la dirigenza | 🆕 la regola · ⚠️ oggi due regole vanno al contrario: il ruolo "concorrente" è stato ritirato e i capitoli online sono esclusi dalle visite |
| B3 | **Preparatore 121** | sintesi → tu | Messaggio di richiesta, memo pre-121 con le referenze da regalare | ✅ coda 121, matcher di reciprocità, memo · 🔧 skill `bni-121` (oggi **esclude** i colleghi: va invertita per i capitoli fuori Sardegna) |
| B4 | **Contatore copertura Sardegna** | server | Quanti membri sardi conosci, per capitolo; chi manca; chi va ricoltivato | ✅ contatori 121 · 🆕 "conosciuto" ≠ "121 fatto" · 🆕 promemoria (oggi nessun automatismo BNI) |

Oggi i contatti trovati dalla skill `bni-121` finiscono in una pagina su claude.ai, non nel CRM: vanno riportati nel fascicolo unico.

## 6. La pipeline di vendita (bozza, da approfondire con calma)

| Tappa | Oggi | Agente che aiuta |
|---|---|---|
| **Call di vendita** | ✅ "call fissata" + aggancio a Google Calendar | V1 *Preparatore call*: la scheda leve (12) il giorno prima |
| **Follow-up o offerta / lettera strategica** | 🔧 "offerta inviata" esiste · ⚠️ la pagina Proposte è rotta (cerca uno stato che non esiste) · 🆕 la "lettera strategica" non esiste da nessuna parte | V2 *Dopo-call*: dalla registrazione della call (es. Fathom) bozza di follow-up o di lettera strategica — da capire quanto riusare dei prompt di `MetodoSD` |
| **Recall o incarico** | 🔧 un promemoria a 14 giorni, nessuno stato "recall" · ✅ "cliente" | V3 *Recall*: ti ricorda chi sentire e con quale argomento |
| **Exit o nurturing** | ✅ "perso" con motivo · 🔧 "nurturing" esiste ma è nato per il freddo | V4 *Nurturing*: contenuti periodici, sempre in cassetta |

Oggi esistono **tre pipeline separate** (lead, BNI, opportunità). La pipeline di vendita è una sola, con l'**origine** (cold, BNI, passaparola…) come etichetta: è anche la decisione già presa in Podio.

## 7. Mappa: tengo / adatto / elimino

### Tengo (diventano "strumenti" degli agenti)
- I 9 rilevatori dell'audit (`src/lib/audit/*`), testati e senza dipendenze.
- Scouting Google Maps via Apify, filtro franchising, regole anti-doppione.
- Prompt Analista / Sceneggiatore / email con fatti verificati, filtro "Carta".
- Video: landing WordPress, YouTube, tracciamento visioni.
- BNI: capitoli, membri, classificatore, coda 121, reciprocità, referenze date.
- Sicurezza: blocco indirizzi interni (SSRF), recupero sicuro delle pagine, limiti di frequenza.
- I dati: 3.268 aziende con audit, 150 membri BNI.

### Adatto
- Blog detector (date), tech detector (falsi positivi), Ads (portare Transparency da Python, riaccendere il salvataggio), Meta (da nome a pagina).
- Email: da "all'azienda" a "alla persona"; motore a sequenza → messaggi programmati in cassetta.
- BNI: reintrodurre "collega con il mio ruolo", aprire i capitoli online, ruoli di dirigenza, regioni italiane; invertire l'esclusione nella skill.
- Pipeline: da 23 stadi + 2 pipeline parallele → una sola, con origine.
- Motore AI: oggi solo Gemini e cablato; gli agenti vogliono un modello che usi strumenti (vedi decisione 2).
- Job: le code in memoria si perdono a ogni riavvio → lavori salvati in tabella, svegliati dall'orologio.

### Elimino
- La riga `Lead` a 133 colonne come contenitore di tutto (→ fascicolo + referti).
- Le 6 pagine che sono solo un rinvio, le 8 pagine non raggiungibili da nessun menu, la pagina Proposte rotta.
- Il nucleo OrchestraAI copiato dentro il CRM (già dichiarato doppione in Podio).
- Codice dormiente: `commercial/*`, valori di performance finti (fissi a 50), funzioni deprecate.
- La configurazione che scrive `.env.local` dall'interfaccia.
- Il cron di GitHub che chiama una rotta che non esiste più.

## 8. Ordine di costruzione (proposta, a passi)

1. ✅ **Fascicolo + referti + regista + cassetta** con gli agenti economici (2.5, 3 on-page, 3.5, 5) — **v3.44.0**.
   *Alla fine funziona*: di notte arrivano N aziende con i loro referti, la mattina le vedi in cassetta.
   Prova su 20 aziende reali: 13 analizzate, 10 in cassetta, 7 siti hanno rifiutato la lettura (403/503).
   L'agente 1 (Google Maps) resta quello delle Ricerche; la ricerca notturna è ancora spenta nel crontab.
2. ✅ **Agenti di sintesi 11 e 12**, 3. ✅ **agenti di browser** 6, 7, 8, 9 (attività programmata sul Mac),
   4. ✅ **agenti 10 + 13**, 5. ✅ **squadra BNI** (B1 → B4), più ✅ Esploratore su Google, Lettore (2),
   Posizioni (3) e Google Ads (4) — **v3.45.0**, 2026-10-16. Prova reale: approfondimento + sintesi ≈ 2
   centesimi per azienda con Gemini.
6. ✅ **Pipeline di vendita** — **v3.46.0**: Trattative (una pipeline per tutte le origini) + agenti V1 Preparatore call, V2 Dopo-call (lettera strategica dalla trascrizione di Google Meet, Metodo SD come primo incarico, prezzo come segnaposto), V3 Recall, V4 Nurturing (45 giorni).

Prima di tutto: prova su **20 aziende reali** per misurare costo e qualità di ogni agente, prima di farli girare su migliaia.

## 9. Decisioni che servono da Alessio

1. ✅ **Dove vive la squadra — DECISO 2026-10-15: dentro questo CRM**, migrazione in Podio più avanti.
   Conseguenza di progetto: le tabelle nuove (fascicolo, referti, lavori degli agenti, cassetta) nascono
   **separate da `Lead`** e con i concetti di Podio (anagrafica unica, cassetta, orologio esterno), così il
   passaggio a Podio sarà un trasloco e non una riscrittura.
2. ✅ **Il cervello degli agenti — scelta tecnica presa**: Claude per gli agenti (lavora meglio con gli strumenti);
   Gemini resta come riserva economica dietro un unico punto d'accesso all'AI.
3. ✅ **LinkedIn — DECISO**: l'agente legge con il browser di Alessio, lentamente, max ~20 aziende al giorno; il messaggio lo prepara l'agente e lo manda Alessio a mano. Rischio sul profilo accettato consapevolmente.
4. ✅ **Tetto di spesa — DECISO: 100 €/mese** (Apify + DataForSEO + AI). Prima si misura il costo per azienda sul pilota di 20.
5. ✅ **Pipeline di vendita e lettera strategica — DECISO 2026-10-16**: lettera post-call scritta dal Dopo-call dalla trascrizione di Google Meet, Metodo SD come primo incarico, prezzo come segnaposto; nurturing ogni 45 giorni.
