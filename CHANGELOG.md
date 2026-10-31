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

## [3.72.0] - 2026-10-31

### Changed
- **Gli avvisi dicono le cose chiare.** Titolo: "Aziende dei tuoi settori trovate in BNI e su LinkedIn". Ogni scheda dice **quale settore**, per nome: "piscine, come il caso IEM Piscine", oppure "casa (edilizia, impianti, infissi…)".
- **Il pulsante del sì dice cosa fa, e lo fa davvero:**
  - membro BNI → **"Chiedi il 121 a [nome]"**: il CRM scrive la richiesta di 121, la trovi in Oggi fra le richieste BNI da mandare;
  - azienda vista su LinkedIn o fra le eliminate → **"Sì, contattala"**: entra fra "Le aziende di oggi", dove il CRM ti dice a chi scrivere o se prima scaldarla.
  - **"No, non mi interessa"**: sparisce e non torna.
- Gli avvisi già arrivati si riscrivono con le parole nuove; in Oggi prima i membri BNI, poi LinkedIn, poi le eliminate.

### Fixed
- Se il sì non riesce (per esempio il messaggio del 121 non si scrive), l'avviso resta lì da decidere invece di sparire.

## [3.71.0] - 2026-10-31

### Changed
- **Gli avvisi "nei tuoi settori" stanno in un posto solo: Oggi.** Prima erano in cima a Oggi (5) e in Cassetta (tutti): due posti, confusione. Ora sono tutti in Oggi, ognuno con i pulsanti **"Me ne occupo"** e **"Non mi interessa"**: tocchi e sparisce. In Cassetta non ci sono più.

## [3.70.0] - 2026-10-31

### Added
- **I tuoi settori caldi, in un elenco solo.** Oltre ai casi studio, il CRM conosce i settori che per te contano anche senza un caso: **casa** (edilizia, arredi, infissi, impianti, giardini, piscine, movimento terra, piattaforme aeree, elettromeccanica e affini), **turismo** (piccole strutture, eventi, catering), **bellezza e benessere** (centri estetici, osteopati, fisioterapisti…). Valgono per gli avvisi, per le aziende da farti presentare e per le persone da incontrare.

### Changed
- **Con chi parlare prima, sempre nello stesso ordine:** colleghi di mestiere, poi acceleratori (commercialisti, avvocati, finanza agevolata…), poi chi lavora nei settori dei casi studio, poi nei settori caldi. Vale per i membri del capitolo da farti presentare, per chi ti presenta un'azienda e per le richieste di 121 dentro ogni capitolo (dopo colleghi e dirigenza).
- **Avvisi "nei tuoi settori":** prima le persone BNI (ci si relaziona), poi LinkedIn, poi le eliminate; i casi studio prima dei settori caldi, la Sardegna prima. Gli acceleratori non finiscono fra gli avvisi di settore: si incontrano comunque, prima degli altri.

### Fixed
- Un settore si riconosce solo a inizio parola: "mobili" non trova più "immobiliare".

---

## [3.69.0] - 2026-10-31

### Added
- **Nei tuoi settori: te lo devo dire.** Se un'azienda dei tuoi casi studio (o dei tuoi settori) compare fra i **membri BNI**, fra i **contatti LinkedIn** o fra le **aziende eliminate**, il CRM te lo scrive in **Cassetta** e in cima a **Oggi**: un avviso per azienda, con tutti i posti dove l'ha vista e cosa fare. Nasce da Piscine Arcobaleno: il titolare, Claudio Conti, è membro BNI del capitolo Maestrale (lo stesso di Laura Uleri), l'azienda era fra i contatti LinkedIn ed era finita fra le eliminate. Il CRM l'aveva vista tre volte e non te l'ha mai detto. Con "Me ne occupo" un'azienda eliminata torna in gioco. Il controllo gira nei turni BNI delle 7 e delle 14.

### Changed
- Nei **membri del capitolo da farti presentare** vengono prima quelli che lavorano nel settore di un caso studio, poi commercialisti, avvocati e simili.

---

## [3.68.0] - 2026-10-31

### Added
- **Le presentazioni da chiedere, per nome.** Nasce dal 121 con Laura Uleri (Maestrale): ti ha segnalato Piscine Arcobaleno di sua iniziativa, ma il CRM doveva dirtelo prima. Ora per ogni persona trovi **due liste separate**: i **membri del suo capitolo** che non hai ancora sentito (diventano nuovi 121, prima commercialisti, avvocati e simili, che conoscono tante aziende) e le **aziende da farti presentare**. L'ordine delle aziende è questo: prima quelle viste fra i suoi collegamenti LinkedIn, poi i suoi rapporti stretti, poi quelle della sua zona nei settori dei tuoi casi studio, prima quelle della sua stessa città. Per ognuna c'è la frase pronta con il nome di chi decide ("Conosci Piermario Testoni di Piscine 2000? Me lo presenti?") e, in cima, **le 3 da chiedere questa volta**.
- **Chi te la presenta, dal territorio.** Nella scheda di un'azienda compaiono anche i membri BNI della sua zona (prima quelli che hai già incontrato). Se un membro che hai già incontrato è nella zona dell'azienda e si sa chi decide, il CRM lo usa come ponte e prepara il messaggio "me lo presenti?" in Cassetta. Lo fa dopo LinkedIn e la tua cerchia, e sempre un favore alla volta.
- **Il vocale dopo il 121 salva anche chi conosce.** I clienti, i fornitori e gli amici imprenditori di cui ti parla diventano aziende da chiedergli la volta dopo. Le aziende che ti segnala entrano **subito** nel CRM (o si collegano a quella che c'è già) e si segna se sono nel settore di un caso studio.
- In **Oggi**, accanto a ogni incontro BNI di oggi e domani: quante presentazioni chiedere, con il link al foglio del 121.

---

## [3.67.0] - 2026-10-29

### Changed
- **Oggi mostra tutte le aziende, non più 2 / 3 / 5.** Da contattare, da scaldare e da validare: si vedono tutte quelle dove tocca a te, prima le più vicine al contatto (lì ci sono i soldi), a parità le più vecchie. Accanto a ogni gruppo: quante da fare e quante fatte oggi.

---

## [3.66.2] - 2026-10-29

### Fixed
- **I commenti alle pagine non si fermano più per LinkedIn.** Quando LinkedIn era fermo (limite di letture o pausa di 48 ore dopo un avviso), bastava una sola azienda da commentare su LinkedIn per bloccare il lavoro di tutte, anche quelle su Facebook e Instagram: dal 28 ottobre non arrivava nessun commento. Ora, con LinkedIn fermo, le aziende si commentano su Facebook o Instagram; quelle che hanno solo LinkedIn (o hanno già iniziato lì) aspettano che LinkedIn riparta.

---

## [3.66.1] - 2026-10-28

### Added
- **Telefono di un membro BNI modificabile.** Nella scheda del membro (BNI → membro → "Chi è") accanto al numero c'è la matita: la tocchi, scrivi il numero nuovo e Salva. Se il numero manca compare "Nessun telefono" con la stessa matita per aggiungerlo.

---

## [3.66.0] - 2026-10-28

### Changed
- **Senza strade si scarta da sola.** Alessio: "se non ho chi decide, chi me la presenta né pagine social si scarta e via". Un'azienda approfondita che, finiti i controlli di chi decide e dei social, non ha nessuna di queste tre strade esce dal Percorso da sola. Non conta nelle tue "da validare" di oggi.

---

## [3.65.0] - 2026-10-28

### Changed
- **Aziende in ordine di stato.** Alessio: "voglio che siano ordinate per stato". In ogni passo del Percorso le aziende sono raggruppate (da decidere, chi decide da trovare, in analisi, controllo del collegamento…), prima quelle dove tocca a te.
- **Più aziende da scaldare.** Ogni passo tiene 20 aziende invece di 10 (60 in lavorazione).
- **Si scalda prima.** Il contatto parte al 5° commento invece che al 7°; chi aveva già 5 o 6 commenti riceve il messaggio di contatto al prossimo giro.

### Added
- **Il foglio "Cosa dirgli"** al passo Contatto: la frase per aprire, i 3 ganci con le prove, la scheda tecnica (il sito, se si fa trovare su Google, cosa comunica, pubblicità), le tue note e i commenti che hai fatto. I ganci ora leggono i commenti e si rifanno quando è ora del contatto, così la frase per aprire parte da lì.

---

## [3.64.0] - 2026-10-28

### Changed
- **Poche aziende al giorno, in Oggi.** Alessio: "lo strumento mi deve semplificare la vita, poche cose giornaliere". Al posto del "passo di oggi" (5 aziende mischiate) ci sono tre righe: **2 da contattare** (scrivi a chi decide o a chi te la presenta), **3 da scaldare** (commento sulla pagina, solo se nessuno te la presenta), **5 da validare** (sì o no). Ogni riga dice "N di M fatte"; quello che fai oggi scala dal conto e domani ne arrivano altre.

---

## [3.63.0] - 2026-10-28

### Changed
- **Una pagina sola per le aziende.** Alessio: "hai aggiunto una sezione anziché migliorare quello che c'era". Il Percorso prende il posto di **Aziende trovate** e **In lavorazione**, che escono dal menu (i vecchi indirizzi portano al Percorso; la scheda dell'azienda resta). Nel passo 1 ci sono "Cerca adesso" e "Parti da qui", nel passo 2 la tua cerchia stretta; su ogni azienda in lavorazione c'è "Pausa 3 mesi".
- **Il passo di oggi va in Oggi**, sotto "Da fare adesso", con quanti passi hai fatto oggi. Sostituisce la riga "Decidi su N aziende trovate". Il Percorso mostra solo i 4 passi.

### Removed
- I filtri per segnale e le liste "messe da parte" (senza collegamento, scartate, eliminate) della vecchia pagina Aziende trovate.

---

## [3.62.1] - 2026-10-28

### Changed
- **Niente richieste di 121 ad Atlantide e I Visionari** (scelta di Alessio). Il Pianificatore non li sceglie più, la scheda del capitolo non mostra "prossimi da chiedere" e le richieste automatiche già in Cassetta per quei due capitoli si scartano al turno successivo. Gli inviti fatti da Alessio di sua iniziativa restano possibili. Lista in `CAPITOLI_SENZA_121` (`src/lib/agents/bni-regole.ts`).

## [3.62.0] - 2026-10-27

### Added
- **Il Percorso** (menu → Percorso, la prima voce; anche nella barra in basso del telefono). Alessio: "ogni giorno ci deve essere un passo avanti". Una pagina sola con 4 passi: **Trovate → Chi me la presenta → In riscaldamento → Contatto**. Ogni azienda sta in un passo e mostra una cosa sola da fare, con il suo pulsante (Approfondisci/Scarta, Lo conosco/No, Mandato con il testo da copiare, Commentato con il link al post, Me l'ha presentata, Incontro fissato). Se conosci tu la proprietà si salta al Contatto.
- **Il passo di oggi**, in cima: fino a 5 aziende dove tocca a te, prima quelle più vicine al contatto, e quanti passi hai fatto oggi.

### Changed
- **I 7 commenti si contano sulla stessa piattaforma** (Facebook, Instagram o LinkedIn), non più sommati. I commenti proposti restano sulla piattaforma dove hai cominciato.
- Aziende trovate e In lavorazione passano nel menu sotto "Altro".

## [3.61.0] - 2026-10-27

### Changed
- **La mail del mattino (06:00) parla del Motore 121, non più del drip a freddo** (spento dal 20/10). In cima la Cassetta: quante cose aspettano te e di che tipo. Poi: 121 fatti ieri, presentazioni chieste e ottenute ieri, quelle chieste da più di 7 giorni senza risposta (da richiamare), segnalazioni da dare ai membri, aziende nuove con chi decide collegato a te, trattative aperte (e quante con la call fissata). Il link porta dritto alla Cassetta.

### Removed
- Dalla mail del mattino: opt-in e follow-up inviati, risposte, video visti, nuovi lead, arretrato warm/hot, avvisi su pausa master e settori in pausa.

## [3.60.0] - 2026-10-26

### Added
- **Il seguito del 121 con il Metodo Strategico Digitale™** (Alessio: "nessuno ha mai ricevuto una proposta reale"). Quando registri un 121 con il vocale o la trascrizione, l'agente Dopo-121 capisce anche che interesse c'è (per sé, per segnalarti qualcuno, nessuno), se l'azienda è nel perimetro MSD (PMI 500 mila-5 milioni, 10-15 persone) e cosa ha chiesto con le sue parole.
  - Interessato per sé e nel perimetro → **la proposta MSD scritta va in Cassetta**: parte da quello che ha detto, prezzo in chiaro (2.000€ + IVA), una sola chiamata all'azione "candidati per parlarne". La rileggi sempre e la mandi tu (WhatsApp, mail o copia).
  - Interessato ma fuori perimetro o non si sa → **avviso in Cassetta**: "Fai la proposta lo stesso" o "Solo relazione".
  - Proposta mandata → il membro passa a "Offerta inviata"; **dopo una settimana senza risposta, un solo richiamo** con un contenuto nuovo dal 121; poi resta in attesa.
- **Ogni testo è controllato** contro le regole della Carta MSD: parole vietate (audit, prenota, brevettato…), ® invece di ™, elenchi puntati, promesse di numeri, prezzo e "candidati" mancanti. Se qualcosa non va, l'AI riscrive una volta; se resta, lo vedi segnalato sopra il testo.
- La scheda MSD per il CRM (`src/lib/agents/msd/scheda-msd.md`, derivata dalla Carta Fondativa MSD v1.3) è nel progetto; la Carta resta fuori dal repository.

## [3.59.0] - 2026-10-25

### Added
- **Entrare in relazione** (nuova sezione 7 della scheda azienda, decisa con Alessio il 2026-10-25): per Facebook, Instagram e LinkedIn la pagina dell'azienda con ogni quanto pubblica e l'ultimo post; scegli dove commentare ("Commenta qui", altrimenti propone la pagina viva che pubblica di più). Chi decide con nome, ruolo e i suoi profili LinkedIn, Facebook e Instagram, più gli amici in comune su Facebook.
- **Conto dei commenti fino a 7**: ogni commento segnato "Commentato" (dalla Cassetta o dalla scheda, anche "Ho commentato" per quelli fatti da te) conta; **al 7° il contatto diretto va in Cassetta** con il messaggio pronto e i pulsanti WhatsApp, Mail, Chiama e i profili di chi decide.
- **Chi decide non si trova → l'azienda non si scarta**: entra lo stesso in lavorazione se ha una pagina social, e in Cassetta arriva il messaggio privato da scrivere alla pagina per arrivare al titolare.

### Changed
- **I commenti si fanno sulla pagina dell'azienda** (la leggono anche i concorrenti), su Facebook, Instagram o LinkedIn, non più sul profilo LinkedIn personale di chi decide. L'agente sul Mac legge l'ultimo post della pagina scelta e propone il commento.
- **Chi decide** (agente sul Mac) cerca anche i profili personali su Facebook e Instagram e gli amici in comune su Facebook; se su LinkedIn non c'è, guarda anche la pagina Facebook dell'azienda. Gli amici in comune contano per trovare chi ti presenta (membri BNI compresi).
- **LinkedIn azienda** annota anche quanti post negli ultimi 3 mesi.

## [3.58.0] - 2026-10-23

### Added
- **Le tue impressioni nella scheda azienda**: in fondo a ogni sezione (Si fa trovare?, Il sito, Come la vedono i clienti, I concorrenti, Social e pubblicità, LinkedIn e chi decide, Cosa dirgli al telefono) c'è "Aggiungi le tue impressioni". Quello che scrivi lo leggono per primo i 3 ganci: vale più degli agenti e li corregge (es. "il sito non è il loro"). Salvando, i ganci si rifanno.
- **I social che trovi tu**: nella sezione Social incolli il link di Facebook, Instagram o LinkedIn. Valgono sopra quelli degli agenti; ripartono subito Facebook e le inserzioni Meta (poi i ganci) e, sul tuo Mac, Instagram e LinkedIn se li hai cambiati.

### Fixed
- **Scheda azienda sul telefono**: alcuni blocchi con link lunghi uscivano a destra dallo schermo.

## [3.57.3] - 2026-10-23

### Changed
- **Aziende trovate in fila**: le liste seguono il lavoro (In verifica → Da decidere → Approfondite → Da contattare) e ogni azienda sta in un blocco solo, anche fra quelle messe da parte. Chi è "da contattare" non compare più anche in "Approfondite"; chi è "senza collegamento" non compare più anche in "In verifica".

## [3.57.2] - 2026-10-23

### Fixed
- **Il giro dei commenti ("scalda") non partiva mai**: le 15 letture LinkedIn al giorno per il lavoro non BNI le consumavano prima "Chi decide" e la ricerca, e "scalda" (che viene per ultimo nel turno) non trovava posto: dal 21 ottobre zero lavori accodati. Ora nei giorni feriali 5 letture sono tenute da parte per scaldare chi decide finché il lavoro del giorno non è partito.

### Changed
- **Piscine 2000 (Testoni)** tolto dalla cerchia: è solo un collegamento LinkedIn, non un contatto vero. L'azienda torna fra quelle da scaldare (correzione sui dati, su indicazione di Alessio).

## [3.57.1] - 2026-10-23

### Changed
- **Tutti i contatti in comune con chi decide**: l'agente "Chi decide" apre la lista completa dei collegamenti in comune su LinkedIn e li salva tutti (fino a 50, i membri BNI per primi), non più solo i primi 5 visibili. Più nomi = più possibilità di trovare qualcuno della tua cerchia che te lo presenta.
- **Scheda azienda**: nella sezione "LinkedIn e chi decide" i contatti in comune si vedono come elenco di nomi, con il totale di LinkedIn ("19 contatti in comune con te"). Se l'app conosce meno nomi del totale (analisi fatte prima di oggi), lo dice: basta premere "Rifai" su "Chi decide".

## [3.57.0] - 2026-10-23

### Added
- **La sequenza di Alessio per l'approfondimento** (scritta in `PROGETTO-AGENTI.md`): Google Maps, il sito (se c'è, è attivo?), si vede?, senza sito subito i social, i 3 social e se sono coerenti, LinkedIn e il titolare, inserzioni Meta se c'è la pagina, Google Ads se c'è il sito. Nella scheda la sezione 5 ora segue quest'ordine ("Social e pubblicità").
- **La scheda Google** (nuovo agente `scheda_google`, sezione 3): rivendicata o no, quante foto, descrizione, data dell'ultimo aggiornamento pubblicato e i testi degli ultimi. Leve: scheda non rivendicata, nessun aggiornamento o fermo da più di 6 mesi, meno di 10 foto, senza descrizione.
- **Instagram e coerenza** (nuovo agente sul Mac `instagram`): ultimo post, quanti negli ultimi 3 mesi, di cosa parlano, e se Instagram e Facebook raccontano la stessa azienda. Serve il tuo Chrome con Instagram aperto.
- **Il sito è attivo?**: "Il sito visto" legge anche l'anno nel piè di pagina (© 2019) e l'ultima data scritta nella pagina. Leve: © vecchio di 2 anni o più, nessun contenuto datato nell'ultimo anno.

### Changed
- **I social si cercano anche per nome**: se il sito non c'è o non ha i link, "Facebook e Instagram" cerca su Google le pagine Facebook, Instagram e LinkedIn dell'azienda (tiene solo quelle con il nome nel titolo). È la strada di chi non ha il sito. Leve nuove: pagina Facebook che dal sito non si raggiunge, nessun Instagram, nessuna presenza online. La pagina LinkedIn trovata passa all'agente LinkedIn.
- **Inserzioni Meta** riusano la pagina trovata dall'agente Social; se la pagina non si legge senza accesso il risultato è "da guardare a mano" invece di "non riuscita".

## [3.56.0] - 2026-10-23

### Changed
- **Approfondisci lancia tutti gli agenti**: tutte le ricerche dell'analisi veloce e di quella completa, anche quelle impostate "a mano" (LinkedIn dell'azienda, Chi decide), dentro il budget LinkedIn del giorno. Prima partivano solo quelle automatiche.
- **Anche senza sito**: prima un'azienda approfondita senza sito restava ferma ("Analisi completa avviata" ma 0 ricerche). Ora partono recensioni, concorrenti, Facebook e Instagram, inserzioni e LinkedIn; restano ferme solo le ricerche che leggono il sito, e la scheda lo dice ("Serve il sito: aggiungilo e parte da sola").

## [3.55.0] - 2026-10-23

### Added
- **Da contattare**: nuova lista in **Aziende trovate** (prima delle altre) e un'etichetta sull'azienda. Ci entrano da sole le aziende approfondite in cui chi decide è collegato a te (o con un ponte BNI). Nella scheda azienda il bottone **Da contattare** ne aggiunge altre a mano, **Togli** ne toglie una, **Torna automatico** rimette la scelta alla regola. La scelta è una voce `DA_CONTATTARE` (niente colonne nuove).

### Fixed
- La nota delle aziende messe da parte dal controllo diceva "chi decide non trovato" anche quando chi decide c'era ma non era collegato: ora dice "non è collegato a te, o non si è trovato".

## [3.54.0] - 2026-10-23

### Added
- **Il perché dello scarto**: in una scheda azienda, **Scarta** ed **Elimina** aprono un riquadro "Scrivi perché" (es. "è un libero professionista", "è una catena", "non è in Sardegna"). Il motivo resta nella scheda e la ricerca lo impara: il filtro dei "simili" legge gli ultimi 40 motivi e scarta le aziende con lo stesso problema. Con **Ripensaci** il motivo si cancella e non insegna più.

### Fixed
- **"Libero professionista", "Studio di architettura e progettazione" fra le aziende**: dalle reti LinkedIn dei membri BNI il mestiere della persona finiva salvato come nome dell'azienda. Ora un nome fatto solo di parole generiche non crea l'azienda (la persona resta salvata); "Studio Legale Dedoni" sì.
- **Siti finti**: i domini parcheggiati (`parking.nidoma.com` e simili) e gli elenchi di imprese (`telefono.click`, `welinkbuilders`, `overplace`…) non valgono più come sito di un'azienda; Piscine Laghetto è riconosciuta come catena.
- **Il filtro dei "simili"** scarta anche catene, negozi online nazionali e aziende che non lavorano nella zona cercata (per i risultati di Google, che non danno l'indirizzo).
- **Aziende ferme "In verifica"**: quando Chrome chiedeva il permesso di aprire LinkedIn e nessuno rispondeva, il controllo di "chi decide" falliva e dopo due volte l'azienda era considerata "senza collegamento" ma restava in verifica per sempre. Ora i fallimenti tecnici (permesso, Chrome, sessione) non contano e il controllo si rifà al turno dopo; un'azienda davvero senza chi decide va in "Messe da parte → senza collegamento". Le aziende già in attesa del controllo non occupano più i posti del giro veloce, così anche le più vecchie vanno avanti.

## [3.53.1] - 2026-10-23

### Fixed
- **"Il sito visto" falliva in produzione** con `Cannot find module …/playwright-core/browsers.json`: Next copiava nello standalone solo parte di playwright-core (il file `browsers.json` è letto da disco, il tracing non lo vede). Ora `outputFileTracingIncludes` copia playwright-core intero; il fotografo riparte.

## [3.53.0] - 2026-10-20

### Added
- **La rete al centro** (confermata da Alessio il 2026-10-20): "quello che convince sono i casi studio e la relazione". La tua rete vince sempre, BNI è un potenziatore. Nuova pagina **In lavorazione** (`/lavorazione`, nel menu).
- **Aziende in lavorazione**: 15 il primo mese, 30 dal secondo. Entrano da sole fra quelle che approfondisci, prima quelle con il ponte più forte; quando una arriva all'incontro (o va in pausa) entra la prossima. Fasi: mappata → ponte scelto → presentazione chiesta → incontro → proposta → cliente, oppure in pausa.
- **La cerchia stretta**: i membri BNI con cui hai fatto un 121 ne fanno parte da soli; gli altri li aggiungi con un tocco su "Lo conosco" accanto ai contatti in comune (o a mano). Un ponte vale solo se è nella cerchia.
- **Le strade verso un'azienda**, in ordine: un membro BNI della cerchia, un altro contatto della cerchia, chi decide è già nella cerchia, chi decide ha risposto ai tuoi commenti ("contatto scaldato"). Senza strade non si contatta: l'azienda aspetta.
- **I messaggi in Cassetta** (li mandi tu, su WhatsApp o LinkedIn): "me lo presenti?" al ponte, il messaggio diretto a chi decide, con il motivo preso dal caso studio senza nominare il cliente. Per i ponti BNI, accanto c'è cosa portargli prima di chiedere.
- **Il seguito da solo**: promemoria gentile al ponte dopo 5 giorni, il ponte successivo dopo 10 (senza dirlo al primo), pausa di 3 mesi dopo 3 tentativi. "Non ora" in Cassetta passa subito al ponte successivo. Un favore alla volta: un ponte che sta già presentando un'azienda non viene usato per un'altra.
- **Scaldare chi decide**: ogni giorno feriale l'agente sul Mac legge gli ultimi post di chi decide e mette in Cassetta 1-2 commenti da incollare; se chi decide ha già messo un like o commentato, l'azienda diventa "scaldata".
- **Cruscotto**: due numeri in più, "Aziende in lavorazione" e "Ponti chiesti" (con le presentazioni ottenute dalla rete).

### Changed
- **Agenda**: 8 121 BNI a settimana più **2 posti per gli incontri con i presentati** (prima il tetto era 12). Il tetto si guarda **in avanti**: con l'agenda piena per due settimane le richieste continuano e i 121 si fissano fra due settimane; si fermano solo se le tre settimane davanti sono piene.

## [3.52.0] - 2026-10-20

### Added
- **Motore 121** (il flusso BNI-first deciso con Alessio il 2026-10-20; schema in `docs/motore-121.html`). Il 121 è il centro: i membri sono partner, al primo 121 non si vende, si vende solo ai contatti che i membri presentano. Niente contatto a freddo.
- **20 richieste di 121 a settimana**, preparate alle 14 dei giorni feriali (da mandare su WhatsApp fra le 15 e le 18), con un **tetto di 12 incontri** a settimana: oltre il tetto le richieste nuove si fermano.
- **Il permesso del collega di mestiere** nella scheda del capitolo ("Ha detto sì / no"): con un no i 121 in quel capitolo si fermano. Il messaggio al collega informa e propone di fare i partner; se non risponde in 7 giorni si passa alla dirigenza e la richiesta al presidente lo ricorda.
- **Collegamenti LinkedIn**: 12 inviti al giorno nei feriali, 100 a settimana, con i contatori; poi l'invito alle **newsletter** LinkedIn e Substack (pulsante "Invitato").
- **Studio del membro prima del 121**: l'azienda del membro passa dall'analisi (agenti di server, anche la ricerca del sito); nasce come azienda "fuori target", mai contattata a freddo.
- **L'incrocio**: leggendo la rete LinkedIn del membro l'agente cerca chi decide nelle aziende del serbatoio e ne pesa i **punti di contatto** (stessa azienda, città, gruppo, scuola, commenti, membro BNI); nasce la presentazione da chiedere.
- **Contatti da segnalare**: il giorno prima del 121 l'agente sceglie 1-3 aziende del CRM utili al mestiere del membro (non "referenze" finché il bisogno non è verificato).
- **Pagina del 121** (`/bni/121/[id]`), sempre aggiornata: chi è, la sua azienda vista da fuori, cosa dargli, cosa chiedergli con i punti di contatto, la storia da raccontare, le domande.
- **Dopo il 121**: promemoria in Cassetta se il vocale non è registrato; dal vocale le presentazioni confermate ("lo conosco bene") vanno in Cassetta con il messaggio "me lo presenti?" già scritto; i contatti segnalati si segnano da soli.
- **Il seguito** (pagina Incontri BNI e scheda del membro): presentazione chiesta → presentato (l'azienda entra nel CRM come opportunità BNI e parte l'analisi completa) → incontro → proposta → cliente.
- **Cruscotto** (`/cruscotto`, nel menu): gli 11 numeri della settimana con obiettivo, allarme e cosa fare; il venerdì alle 17 per mail.

### Changed
- **Aziende trovate**: dopo il giro veloce si controlla se chi decide è collegato ad Alessio (contatto diretto o almeno un contatto in comune). In "Da decidere" e nella mail delle 7 arrivano solo le aziende collegate; le altre vanno in "senza collegamento" e si ricontrollano da sole dopo i nuovi 121 (al più una volta al mese). Nuova lista "In verifica".
- **LinkedIn**: un budget comune di 25 letture al giorno fra tutti gli agenti di browser (i lavori BNI hanno la precedenza); dopo un CAPTCHA o una verifica di sicurezza tutto si ferma 48 ore.
- La ricerca su Google Maps si ferma quando 40 aziende aspettano il controllo (il serbatoio resta piccolo).
- Agente "Chi decide": legge il grado del collegamento e quanti contatti in comune; un dipendente collegato non basta.

### Fixed
- Le aziende trovate dalla ricerca e quelle legate a BNI non possono più entrare nel drip email a freddo (opt-in), nemmeno se la pausa generale viene tolta.

## [3.51.0] - 2026-10-18

### Changed
- **Aziende trovate**: in alto solo **Da decidere** e **Approfondite**; scartate ed eliminate "messe da parte" in un link; tolta "Tutte". Su ogni azienda le etichette che contano (chi decide noto / da trovare, fa pubblicità, sito vecchio, sito che non comunica, non si fa trovare) e gli stessi segnali come filtri.

## [3.50.1] - 2026-10-18

### Changed
- **Le aziende non si cercano più su LinkedIn**: tolta "Aziende su LinkedIn" dalla casella Parti da qui e spenta la ricerca automatica di pagine aziendali (per "costruzione piscine" in Sardegna erano solo 5). Le aziende si trovano con Google Maps, Google e Meta; LinkedIn serve dopo, per trovare chi decide (da rifare dopo la prova con Alessio).

## [3.50.0] - 2026-10-18

### Changed
- **LinkedIn: prima l'azienda.** Il Cercatore LinkedIn cerca le pagine aziendali del settore dei casi studio (nicchia, poi settore, prima la Sardegna) e ne prende nome, sito, città e dipendenti; la pagina resta nella scheda e Chi decide parte da lì. Non si cercano più persone "simili al titolare".
- Ricerca lanciata a mano (Cerca adesso, Un settore + città) che parte subito, oltre la quota del giorno, e avvia l'analisi veloce.
- Scheda azienda larga, a fisarmonica, con "Cambia sito" ed **Elimina / Ripristina**; elenco con la scheda "Eliminate".
- Tolta dal menu "Persone trovate": le persone si vedono nella scheda dell'azienda e del membro BNI.

### Fixed
- Siti che chiudono la connessione agli header "da browser": si riprova con una richiesta semplice.
- Il sito della scheda Google non viene sostituito da un indirizzo indovinato.

## [3.49.0] - 2026-10-18

### Added
- **Pagina Agenti** nel menu: ogni agente dell'analisi con dove lavora (server o Mac), quando parte, cosa ha fatto nelle ultime 24 ore e l'ultimo errore; per ognuno scegli **automatico** o **a mano**.
- **Scheda azienda in crescendo** (si fa trovare? → il sito → come la vedono i clienti → concorrenti → pubblicità e social → LinkedIn e chi decide → cosa dirgli al telefono), con su ogni blocco il pulsante **Lancia / Rifai / Riprova** e lo stato.
- Facebook e inserzioni Meta lette **dal server** (browser invisibile, senza account): il Mac serve solo per LinkedIn.
- Agente sul Mac ogni mezz'ora dalle 8 alle 20, con un solo comando permesso (`~/.karalisweb/crm-agenti.sh`).
- Chi decide con la via corta: azienda su LinkedIn → dipendenti → CEO/titolare → contatti in comune; un membro BNI in comune diventa chi lo presenta.

## [3.48.0] - 2026-10-18

### Added
- **Fase 2 Arricchimento**: giro veloce automatico su ogni azienda trovata (trova sito, posizioni, sito visto con le foto, dal cliente al contatto, lettore, recensioni) e giro completo solo con "Approfondisci" (concorrenti su Maps, Google Ads, tracciamenti, agenti di browser), con **i 3 ganci** da dire al telefono.
- **Mail delle 7** con le aziende da decidere; in Oggi e in Aziende trovate ("Da decidere", "Da approfondire", "Scartate").
- **Casella "Parti da qui"**: scrivi un'azienda, un settore o una persona.
- Casi studio: **nicchia** prima del settore, provincia del cliente esclusa per la nicchia, ricerche larghe del settore.

### Changed
- Il Lettore del sito legge più pagine e dice a quali domande del cliente il sito risponde; niente consigli generici.
- Google Ads: con Tag Manager non dice più che mancano le conversioni (da fuori non si vede); passato e tag senza annunci detti come fatti.
- Meta Ad Library: se la pagina non è sicuramente la loro, nessuna leva.

## [3.47.1] - 2026-10-17

### Changed
- **Home = "Oggi"**: solo quello che serve adesso — cosa fare (richieste di incontro da mandare, fogli per gli incontri, casi da confermare), gli incontri e le call di oggi e domani, e tre numeri che partono dalla nuova procedura: incontri BNI della settimana (su 10), aziende nuove di oggi (su 5), membri BNI sardi conosciuti. Avviso se gli agenti sul Mac sono fermi.
- **Menu con i nomi del processo**: "Oggi", "Da approvare" (era Cassetta), sezione "1 · Ricerca" con Incontri BNI, Rubrica BNI, Casi studio, Aziende trovate (nuova pagina), Persone trovate; "Agenti al lavoro" (era Squadra) in fondo. Il menu Analisi esce dal menu (le pagine restano). Barra del telefono: Oggi, Approva, Incontri, Rubrica.
- Pulsanti "Cerca adesso" e "Prepara le richieste adesso".
- La ricerca tiene solo aziende nella zona cercata.
- L'analisi notturna della vecchia squadra è in pausa finché non si definisce la fase di analisi.

### Fixed
- In produzione le pagine uscivano senza grafica: `deploy.sh` ora copia i file statici nello standalone e verifica il CSS dopo il deploy.

## [3.47.0] - 2026-10-17

### Added
- **Fase 1 — Ricerca**, definita con Alessio (vedi `PROGETTO-AGENTI.md`). Nuova sezione di menu **RICERCA**.
- **121 BNI** (`/bni`): obiettivo **10 121 a settimana**. Il Pianificatore tiene 15 richieste aperte, 2 capitoli alla volta, con l'ordine di Alessio in ogni capitolo: **prima chi fa il suo mestiere** (per rispetto), poi **presidente e responsabile formazione/eventi**, poi **tutti gli altri**; senza un collega si parte dal **presidente** e chi lui indica sale in cima. Contatore della settimana, 121 in calendario, richieste aperte con "Fissato", capitoli con quanti membri conosci.
- **Scheda del capitolo**: nome, zona, formato, giorno, ora, sede, avanzamento, l'ordine dei membri, "Già conosciuto" per i 121 del passato. **Visita al capitolo** proposta quando ne conosci un terzo.
- **Scheda del membro** in 7 parti: chi è, cosa fa, **referenze che cerca**, **referenze che può dare**, persone da farsi presentare, la vostra storia, prossimo passo. **Ricerca per bisogno** ("commercialista a Cagliari") in **Membri BNI**.
- **Dopo-121**: incolli la trascrizione di Meet (online) o detti un vocale (di persona) e la scheda si compila da sola.
- **Prima del 121**: l'agente legge la **rete LinkedIn** del membro e prepara 3-5 persone da farsi presentare; il giorno prima, in Cassetta, il foglio del 121.
- **Casi studio** (`/casi-studio`): carichi il PDF, l'AI scrive la storia da 30 secondi e le chiavi (settore, aziende simili, persone simili), tu confermi; valgono 6 mesi.
- **Ricerca clienti guidata dalle chiavi**: 5 aziende nuove al giorno da Google Maps e Google (server), Facebook e Instagram (browser); persone simili e reti BNI su LinkedIn (browser, max 2 lavori al giorno). Prima la Sardegna, poi l'Italia. Un filtro AI tiene solo chi fa lo stesso mestiere del cliente del caso.
- **Persone LinkedIn** (`/persone`): il contenitore LinkedIn, persona sempre collegata alla sua azienda; i membri BNI trovati restano relazione.
- Agenti nuovi: Pianificatore 121, Rete del membro, Dopo-121, Lettore casi studio, Cercatore Meta, Cercatore LinkedIn.

### Changed
- La Squadra BNI non propone più "un'azione per capitolo" (collaborazione/visita/121 con la dirigenza): le vecchie voci `AZIONE_BNI` in attesa si chiudono da sole.
- Il Cartografo rilegge la Sardegna ogni 30 giorni (i ruoli cambiano) e porta anche la sede.
- I lavori di browser BNI passano davanti a tutti gli altri.
- L'Esploratore usa le chiavi dei casi studio; senza chiavi torna a categorie × città.
- Menu: "Rete BNI" esce dal menu (la pagina resta), "Opportunità" passa in VENDITA.

### Note
- Prove sulla copia di produzione: dopo-121 da trascrizione 0,1 centesimi; caso studio da PDF letto bene; una ricerca "costruzione piscine Cagliari" con filtro 0,2 centesimi (5 ditte di piscine salvate, 10 scartate perché fuori mestiere, 5 rimandate).

## [3.46.0] - 2026-10-16

### Added
- **La pipeline di vendita: Trattative** (nuova voce di menu, al posto di "Call fissate" e "In trattativa"). Una sola pipeline per tutte le origini (squadra, BNI, opportunità, passaparola, sito, cliente esistente): **call fissata → call fatta → follow-up o lettera strategica → recall o incarico → exit o nurturing**. Passaggi controllati, motivo obbligatorio per l'exit, diario di ogni trattativa.
- **Si apre una trattativa quando fissi una call:** pulsante "Call fissata" nella scheda di un'azienda e nelle schede pronte in Cassetta, "Nuova trattativa" per il passaparola. Una prenotazione su Google Calendar abbinata a un'azienda apre la trattativa da sola.
- **La squadra di vendita (V1-V4):**
  - **V1 Preparatore call** — il giorno prima: obiettivo, cosa sappiamo, apertura, domande in ordine, leve con prova, obiezioni, il ponte verso il Metodo SD, come chiudere.
  - **V2 Dopo-call** — incolli la trascrizione di Google Meet (o gli appunti di Gemini): sintesi, i problemi con le parole del cliente (citazioni verificate), obiezioni, temperatura e la **lettera strategica** in prima persona che propone il **Metodo SD come primo incarico**. Il prezzo non lo inventa mai: lascia **[INVESTIMENTO]** evidenziato da completare.
  - **V3 Recall** — se la risposta non arriva entro la data, il richiamo che riparte dalle obiezioni; dopo 2 recall senza risposta propone il nurturing.
  - **V4 Nurturing** — ogni 45 giorni un messaggio di valore per chi non ha detto un no definitivo.
- In Cassetta le voci di vendita (filtro "Vendita") con lettera e messaggi da copiare: approvare fa avanzare la trattativa (lettera mandata → si aspetta 7 giorni; recall fatto → altri 7; nurturing mandato → 45). Le voci superate da un cambio di stadio si chiudono da sole.
- Incarico → l'azienda diventa Cliente; exit → Persa con il motivo.

### Fixed
- Gli agenti firmano sempre "Alessio Loi — Karalisweb": in prova l'AI aveva inventato un cognome.

### Note
- Prova completa su copia di produzione (call fissata → preparazione → dopo-call → lettera → 2 recall → nurturing): **1,6 centesimi** con Gemini.

## [3.45.0] - 2026-10-16

### Added
- **La squadra è completa: tutti i 19 agenti previsti lavorano.** Oltre ai 4 del passo 1:
  - **1 Esploratore** — cerca aziende nuove su Google per le categorie e città delle Ricerche, scarta portali, directory, catene e chi è già nel CRM.
  - **2 Lettore del sito** — cosa dice il sito e come lo dice; ogni problema cita il sito alla lettera, e le citazioni che non si ritrovano vengono scartate.
  - **3 Posizioni su Google** — dove compare l'azienda cercando "categoria + città".
  - **4 Google Ads** — annunci su Google Ads Transparency con le date: dice se fanno pubblicità **adesso**, e lo incrocia con il tracciamento delle conversioni.
  - **6 Social, 7 Meta Ad Library, 8 LinkedIn azienda, 9 Decision maker** — li esegue Claude sul tuo Mac, con il tuo browser (LinkedIn al massimo 20 aziende al giorno, solo lettura).
  - **11 Coerenza, 13 Regista del video, 12 Scheda leve, 10 Aggancio** — la catena di sintesi: incoerenze fra canali, scaletta del video, leve con prova, apertura della chiamata, domande, obiezione, e il messaggio al decision maker.
  - **Squadra BNI: B1 Cartografo** (capitoli, formato, membri e dirigenza da BNI Connect), **B2 Stratega** (Sardegna → copertura; altrove → collaborazione con il collega, visita se online/ibrido, 121 con la dirigenza se in presenza), **B3 Preparatore 121** (messaggi WhatsApp pronti), **B4 Copertura Sardegna**.
- **L'imbuto completo:** raccolta base su tutte le aziende → in cassetta quelle con almeno 3 leve → tu dici "Approfondisci" → agenti a pagamento e di browser → sintesi → **scheda contatto in cassetta** con messaggio da copiare.
- **Cassetta per tipo:** schede contatto (temperatura, servizio da proporre, apertura, domande, obiezione, chi decide, messaggio, scaletta video), azioni BNI per capitolo, messaggi BNI con "Apri WhatsApp". Filtri Aziende / BNI.
- **Tetto di spesa:** ogni lavoro registra il suo costo reale; gli agenti a pagamento si fermano quando il mese arriva al tetto (70 € di default, `AGENTI_BUDGET_EUR`). La pagina Squadra mostra la spesa del mese, agente per agente.
- **Il cervello degli agenti:** Claude (Opus 5.5) appena si aggiunge `ANTHROPIC_API_KEY`; fino ad allora Gemini, già configurato.
- **Membri BNI:** "conosciuto" (conta per la copertura) e ruolo nella dirigenza; un messaggio BNI segnato "Mandato" sposta il membro a "richiesta 121".
- Nuovi indirizzi per l'orologio: `/api/cron/squadra-bni`, `/api/cron/esploratore`; coda per il browser `/api/agenti/browser/*` (chiave `AGENTI_BROWSER_KEY`).

### Fixed
- **Deploy:** una sola connessione SSH per tutto il rilascio (fail2ban non blocca più a metà); se pm2 perde il processo lo ricrea invece di lasciare il sito spento; la configurazione di pm2 nel repository è quella vera del server.
- Rimossi i duplicati creati da iCloud ("file 2.ts") dentro il progetto.

### Note
- Prova su dati reali (copia di produzione): approfondimento + sintesi su un'azienda ≈ **2 centesimi** con Gemini; una ricerca dell'Esploratore ≈ 0,5 centesimi (8 aziende nuove su 30 risultati).

## [3.44.0] - 2026-10-15

### Added
- **La Squadra di agenti, passo 1.** Il CRM comincia a diventare una squadra di agenti che lavorano al posto tuo (progetto completo in `PROGETTO-AGENTI.md`). Quattro agenti sono già al lavoro: **Tecnico** (con che cosa è fatto il sito, PHP, da quando è fermo), **SEO** (la pagina è ottimizzata?), **Blog** (esiste? ultimo articolo? letto da WordPress o dal feed, con data certa) e **Tracciamenti** (Analytics, Tag Manager, pixel, tag Google Ads).
- **Ogni agente consegna un referto con le prove**: per ogni leva commerciale ("il blog è fermo da 7 anni") c'è la prova ("ultimo articolo del 27/03/2019: …"). Niente dati inventati: se un agente non può leggere un sito, lo scrive.
- **Cassetta** (nuova voce di menu): di notte la squadra analizza le aziende; quelle con almeno 3 leve arrivano qui. Tu decidi: **Approfondisci** o **Scarta**. Niente parte da solo.
- **Squadra** (nuova voce di menu): tutti gli agenti previsti, quali lavorano già e quali sono da costruire, cosa hanno fatto in settimana, perché qualche lavoro non è riuscito. Pulsante "Lavora su 5 aziende" per un turno a mano.
- **Fascicolo della squadra** nella scheda di ogni azienda: l'ultimo referto di ogni agente, con leve e prove.
- Nuovo indirizzo per l'orologio del server: `POST /api/cron/squadra` (protetto da `CRON_SECRET`).

### Fixed
- **Il rilevatore di tecnologia vedeva "Magento" quasi ovunque**: cercava "mage", che compare in ogni "image". Ora servono segni veri di Magento, e il primo CMS riconosciuto vince (un sito WordPress che nomina Shopify resta WordPress). Corregge anche l'audit storico.
- I due test del blog che fallivano da tempo: il problema era nel test (non simulava la difesa SSRF), non nel codice.
- La versione mostrata nel menu era ferma a 3.33.0: ora la legge da `package.json`.

### Changed
- Lo schema del database ora descrive anche la tabella dei moduli e le colonne di conoscenza dei progetti che esistono in produzione ma non erano nello schema: così un `db push` non le può più cancellare.

### Note
- Prova su 20 aziende reali: 13 analizzate, 10 arrivate in cassetta, **7 siti hanno rifiutato la lettura** (403/503, protezioni anti-programma). Saranno il lavoro degli agenti di browser.
- Gli agenti del passo 1 non costano nulla: leggono solo pagine pubbliche, senza servizi a pagamento.

## [3.43.0] - 2026-08-11

### Added
- **Scheda soggetto: i quattro moduli in una pagina sola.** Da "Registro soggetti" si apre ora ogni azienda e si vede, in un colpo solo, cosa ne sanno tutti e quattro i moduli: investito e conversioni dal rendimento pubblicitario, keyword e posizione media dalla visibilità organica, articoli pubblicati dalla produzione contenuti, e le identità nel CRM.
- **Adapter di sola lettura** verso gli altri tre moduli (piano, criticità 2, soluzione di riserva). I dati **restano dove sono**: qui vengono letti, mai copiati e mai modificati. I file SQLite si aprono con `readOnly: true`, sul database del modulo di rendimento si eseguono solo `SELECT`.
- Ogni modulo è **opzionale e indipendente**: se non è configurato la scheda lo dice, se è irraggiungibile riporta l'errore accanto a quel modulo. Un modulo rotto non fa cadere la pagina né gli altri tre.

### Security
- La scheda passa dal client filtrato: un soggetto fuori dal proprio ambito **non si apre nemmeno conoscendone l'indirizzo esatto**.

### Note
- L'aggancio al modulo di rendimento avviene per ragione sociale, ed è dichiaratamente debole: `google_ads_accounts` non contiene né identificativo Google Maps né dominio (`docs/inventory/gads.md`, S-05). Gli altri due si agganciano per dominio, che è la loro chiave naturale.

## [3.42.0] - 2026-08-11

### Added
- **Accesso unico ai quattro moduli (OrchestraAI, Fase 3).** Il CRM diventa il fornitore d'identità della piattaforma: da qui si entra negli altri tre moduli senza reinserire le credenziali.
  - Nuova pagina **Moduli** (menu "Piattaforma"): i quattro moduli in un posto solo, ognuno con un pulsante che porta dentro già autenticati.
  - `POST /api/sso/issue` emette un token firmato **HMAC-SHA256**, valido **120 secondi**, **a uso singolo** e **legato a una sola applicazione di destinazione**: un token per SEOI non funziona su HUB.
  - Nessuna password viaggia e **nessuna sessione è condivisa**: ogni applicazione verifica il token e apre una sessione propria, con il proprio meccanismo.
  - Nessun valore di riserva per il segreto: se `ORCHESTRA_SSO_SECRET` manca o è più corta di 32 caratteri, l'emissione fallisce invece di degradare.

### Security
- Il collegamento avviene **per indirizzo di posta su utenze già esistenti**. L'accesso unico non crea utenti nelle altre applicazioni: se l'utenza non c'è o è disattivata, l'ingresso viene rifiutato con un messaggio esplicito. Creare utenti a distanza sarebbe una scelta con conseguenze, e non la prende il codice.
- Token già usati tenuti in memoria fino alla scadenza: un collegamento intercettato non è riutilizzabile.
- Confronto della firma a tempo costante.

## [3.41.0] - 2026-08-11

### Added
- **Struttura commerciale e isolamento fra clienti (OrchestraAI, Fase 1).** Il CRM ha ora la catena **Organizzazione → Azienda → Progetto**, la licenza e i sette ruoli previsti dal piano. È la parte che rende la piattaforma vendibile a terzi.
  - Cinque tabelle nuove, tutte additive: `organizations`, `companies`, `projects_core`, `licences`, `memberships`. Più una colonna `company_id` su `subjects`, **nullable**: nessun dato preesistente è stato toccato.
  - **Sette ruoli** (`PLATFORM_ADMIN`, `PLATFORM_OPERATOR`, `ORG_OWNER`, `COMPANY_OWNER`, `COMPANY_MEMBER`, `PROJECT_MEMBER`, `GUEST_LINK`). Il permesso è sempre `(ruolo, scope)`, mai ruolo da solo.
  - **Licenza per Azienda** con i limiti come colonne, non come costanti nel codice: due Progetti e tre utenti inclusi, entrambi estendibili.
  - **Conoscenza condivisa a livello Progetto** (proposta di valore, tono di voce, contatto di riferimento): si scrive una volta sola, nessun modulo ne possiede copia.
  - **Isolamento imposto dal database, non dalla disciplina.** `tenantScoped()` restituisce un client Prisma già filtrato: leggere fuori dal proprio ambito non è possibile nemmeno dimenticandosene. Le scritture verso un'azienda fuori ambito falliscono.
  - I dati commerciali e di licenza sono **invisibili** a `PROJECT_MEMBER` e `GUEST_LINK`.
  - Comandi: `npm run tenancy:bootstrap` (avvio idempotente), `npm run test:isolation`.

### Testing
- **Dieci test di isolamento**, che sono il criterio di completamento della Fase 1 scritto nel piano: *«un `PROJECT_MEMBER` non riesce, in nessun modo, a leggere dati di un'altra Company»*. Coprono lettura diretta, conteggio, creazione, modifica e cancellazione oltre confine.
- `vitest.config.ts` esclude `.claude/worktrees/`: le copie di lavoro contenevano un duplicato di ogni test e ogni esecuzione contava il doppio (302 test invece di 156).

### Changed
- La pagina **Registro soggetti** usa il client filtrato: quello che vedi dipende da chi sei.
- La migrazione `20260811120000_add_tenancy` è versionata e con `rollback.sql` scritto prima dell'esecuzione (regola 0.8). Nessun `DROP`, nessuna colonna rimossa, nessun `SET NOT NULL` su tabella popolata.

### Note
- `subjects.company_id` resta **nullable** per scelta: renderla obbligatoria su una tabella già popolata è un secondo passo, non questo.
- Un `PROJECT_MEMBER` oggi non vede alcun soggetto, nemmeno della propria azienda: i soggetti stanno a livello di Azienda e risalire dal Progetto sarebbe una scalata di privilegi. Legarli al Progetto è lavoro successivo.

## [3.40.0] - 2026-08-11

### Added
- **Registro unico dei soggetti (OrchestraAI, Fase 1).** Il CRM ospita ora l'anagrafica canonica della piattaforma: una stessa azienda che compare come lead nel CRM, cliente in SEOI, progetto in HUB e account in GADS diventa **un solo soggetto**, con tante identità quante sono le applicazioni in cui appare.
  - Tre tabelle nuove, tutte additive: `subjects`, `subject_identities`, `reconciliation_candidates`. **Nessun modello esistente è stato modificato.**
  - Nuova pagina **Registro soggetti** (menu "Piattaforma"): quante identità, quanti soggetti distinti, quali aziende compaiono in più applicazioni, e la coda dei casi dubbi.
  - Importazione in **sola lettura**: legge le sei anagrafiche da copie dei database e non scrive mai sulle origini. Il registro è ricostruibile da zero in qualunque momento.
  - Deduplicazione conservativa: uniscono **solo** lo stesso `google_place_id` e lo stesso dominio normalizzato (schema, `www.`, porta, percorso e maiuscole ignorati; i domini di hosting condiviso non uniscono mai). Tutto il resto finisce in una coda di riconciliazione manuale e **non viene unito**.
  - Comandi: `npm run registry:seed` (dati finti di sviluppo), `npm run registry:import`, `npm run registry:report`.
  - Rapporto delle sovrapposizioni in `docs/inventory/sovrapposizioni.md`.

### Changed
- La migrazione `20260811090000_add_subject_registry` è **versionata e con rollback scritto prima dell'esecuzione** (`rollback.sql`), come impone la regola 0.8 del piano. È puramente additiva: nessun `DROP`, nessuna colonna rimossa, nessuna perdita di dati possibile.

### Note
- Il registro è in **sola aggiunta**: in questa fase nessuna applicazione ci scrive sopra e nessuna ci legge. È un osservatorio, non ancora una sorgente di verità.
- Tre decisioni restano aperte e sono a registro in `docs/decisions/`: composizione dei campi di `Subject` (OPEN-01), assenza della partita IVA come terza chiave (OPEN-02), cosa fare dei doppioni una volta riconosciuti (OPEN-03).

## [3.39.2] - 2026-07-28

### Added
- **Data del 121 in programma.** Nelle tappe "121 richiesto" e "Preparo referenze" il Memo 121 mostra il campo **"121 in programma il"** (`BniMembro.next121At`): la data dell'incontro imminente (es. "con Giampaolo giovedì"). Compare anche sulla card della Pipeline. Prima un 121 richiesto/in procinto non aveva una data.

## [3.39.1] - 2026-07-28

### Changed
- **Coda 121 ripensata: non è più un calderone.** Metteva sullo stesso piano chi non ti conosce, chi hai già incontrato e i clienti. Ora la coda è solo "chi devi ancora conoscere o risentire", divisa in gruppi chiari:
  - **⏰ Recall a scadenza** · **👋 Da conoscere** (mai fatto un 121) · **🔁 Da ricoltivare** (121 fatto ma da oltre 4 mesi).
  - **Esclusi dalla coda**: i clienti acquisiti (`isCustomer`) — con loro non si fa un 121 di conoscenza — e chi ha un 121 **recente** (è relazione in corso, sta nella Pipeline, non fra le cose "da fare").

## [3.39.0] - 2026-07-28

### Added
- **Opportunità extra-BNI** (nuova sezione + menu "Opportunità"). Gestisce i clienti caldi che arrivano da **fuori BNI** e non sono lead freddi: un collega per una collaborazione, un preventivo da lavorare, un referral che arriva da chiunque. Modello `Opportunita` a sé (nessun inquinamento delle liste Hot/Warm/Cold, nessun audit/video ereditato).
  - Campi: nome, **fonte** (collega / referral / evento / ex-cliente / BNI / altro), contatti, di cosa si tratta, **stadio** (Da sentire → In corso → Preventivo → Vinto/Perso), valore stimato, e soprattutto il **promemoria** (`nextFollowupAt`) per non dimenticarle.
  - Pagina `/opportunita`: aggiunta rapida (solo il nome è obbligatorio), lista ordinata per promemoria (le scadute in cima, evidenziate), filtro per stadio, avanzamento stadio e data promemoria modificabili al volo. KPI: aperte, da risentire ora, preventivi in corso.
  - Badge "Opportunità" nella sidebar col numero di promemoria a scadenza (via `/api/dashboard/mission`).

## [3.38.1] - 2026-07-28

### Added
- **Filtro per capitolo in Rete BNI.** Con più capitoli le liste piatte erano illeggibili: una barra "Capitolo: Tutti · Atlantide · Posidonia · …" ora filtra insieme Coda 121, Pipeline e Membri. (Compare da 2 capitoli in su.)

## [3.38.0] - 2026-07-28

### Added
- **Cliente acquisito** (`BniMembro.isCustomer`). Distinto dal "cliente potenziale" (il ruolo): marca i membri che sono **già clienti** di Karalisweb. Toggle "È già un mio cliente" nel Memo 121, badge 🏆 cliente nella lista.
- **Tracciamento dei 121 già fatti.** Portare un membro allo stadio "121 fatto" (o oltre) registra automaticamente che il 121 c'è stato (esce da "mai fatto un 121" nella coda). La data dell'ultimo 121 è modificabile dal Memo 121 — utile per i tanti 121 fatti in passato, senza doverli registrare uno a uno.

### Changed
- **Partner pieni nel proprio capitolo.** Il "peso moderato" dei partner trasversali (rischio che girino i contatti ai colleghi di capitolo) **non si applica nel capitolo di Alessio**: lì il collega di riferimento è lui, quindi i partner valgono pieno (+30, cap 100). La classificazione ora tiene conto di `BniChapter.isMine` in tutti i punti (creazione, import, riclassifica, dettaglio).

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
