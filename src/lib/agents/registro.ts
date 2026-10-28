/**
 * Registro della squadra: tutti gli agenti di PROGETTO-AGENTI.md.
 *
 * - Gli agenti di SERVER e di SINTESI girano nell'app (AGENTI_ESEGUIBILI).
 * - Gli agenti di BROWSER li esegue Claude sul Mac di Alessio, con il suo browser: l'app
 *   mette in coda i lavori e riceve i referti (/api/agenti/browser/*). Le istruzioni che
 *   Claude segue per ciascuno sono qui sotto, in `istruzioni`.
 */
import { agenteTecnico } from "./agenti/tecnico";
import { agenteSeo } from "./agenti/seo";
import { agenteBlog } from "./agenti/blog";
import { agenteTracciamenti } from "./agenti/tracciamenti";
import { agenteLettore } from "./agenti/lettore";
import { agentePosizioni } from "./agenti/posizioni";
import { agenteGoogleAds } from "./agenti/google-ads";
import { agenteAggancio, agenteCoerenza, agenteRegistaVideo, agenteSchedaLeve } from "./agenti/sintesi";
import type { AgenteEseguibile } from "./tipi";
import { agenteMetaAdsServer, agenteSocialServer } from "./agenti/meta";
import { agenteConcorrenti, agenteContatto, agenteGanci, agenteRecensioni, agenteSchedaGoogle, agenteSitoVisto, agenteTrovaSito } from "./agenti/arricchimento";

export type Famiglia = "server" | "browser" | "sintesi";
export type Squadra = "commerciale" | "bni" | "vendita" | "ricerca";
export type StatoAgente = "attivo" | "da_costruire" | "esistente_altrove";

export interface SchedaAgente {
  chiave: string;
  numero: string;
  nome: string;
  compito: string;
  famiglia: Famiglia;
  squadra: Squadra;
  stato: StatoAgente;
  nota?: string;
  /** Solo agenti di browser: cosa deve fare Claude, passo per passo. */
  istruzioni?: string;
}

const REGOLE_BROWSER = `Regole: solo lettura. Non scrivere a nessuno, non mettere like, non seguire, non accettare cookie oltre il necessario (rifiuta i non essenziali). Se serve un accesso che non c'è o compare un CAPTCHA, chiudi il lavoro come FALLITO spiegando perché (se LinkedIn mostra un CAPTCHA, una verifica di sicurezza o il limite di ricerche commerciali, scrivi esattamente "CAPTCHA", "verifica di sicurezza" o "limite di ricerche": tutto il lavoro su LinkedIn si ferma per 48 ore). L'avviso "Hai raggiunto il limite mensile di ricerche di profili… Premium" NON è un blocco: usa i risultati che si vedono, apri i profili dal loro link diretto, guarda la rete di una persona dalla pagina dei suoi collegamenti, e chiudi il lavoro come FATTO con quello che hai trovato (scrivi nel referto che alcuni risultati erano nascosti). Ogni affermazione nel referto ha la sua prova (link + citazione o data letta sulla pagina).`;

export const SQUADRA: SchedaAgente[] = [
  { chiave: "trova_sito", numero: "A0", nome: "Trova sito", compito: "Il sito per più strade (Google, email, dominio) e se cercando il nome esce", famiglia: "server", squadra: "commerciale", stato: "attivo" },
  { chiave: "sito_visto", numero: "A3", nome: "Sito visto", compito: "Foto su telefono e computer, velocità, se sembra vecchio", famiglia: "sintesi", squadra: "commerciale", stato: "attivo" },
  { chiave: "contatto", numero: "A4", nome: "Dal cliente al contatto", compito: "Telefono cliccabile, WhatsApp, modulo, quanti clic per un preventivo", famiglia: "server", squadra: "commerciale", stato: "attivo" },
  { chiave: "scheda_google", numero: "A5b", nome: "La scheda Google", compito: "Se la scheda Maps è curata: rivendicata, foto, descrizione, ultimo aggiornamento", famiglia: "server", squadra: "commerciale", stato: "attivo" },
  { chiave: "recensioni", numero: "A5", nome: "Recensioni", compito: "Cosa lodano e di cosa si lamentano i clienti, con le loro parole", famiglia: "sintesi", squadra: "commerciale", stato: "attivo" },
  { chiave: "concorrenti", numero: "A2", nome: "Concorrenti", compito: "Chi esce prima su Google Maps per la stessa ricerca, e con che numeri", famiglia: "server", squadra: "commerciale", stato: "attivo" },
  { chiave: "ganci", numero: "A9", nome: "I 3 ganci", compito: "I 3 ganci con i numeri per la prima frase della chiamata", famiglia: "sintesi", squadra: "commerciale", stato: "attivo" },
  { chiave: "esploratore", numero: "1", nome: "Esploratore", compito: "Trova aziende nuove su Google Search (e Google Maps dalle Ricerche)", famiglia: "server", squadra: "commerciale", stato: "attivo", nota: "Google Maps resta nelle Ricerche; LinkedIn si usa per conoscere le aziende, non per trovarle" },
  { chiave: "lettore", numero: "2", nome: "Lettore del sito", compito: "Cosa dice il sito e come lo dice", famiglia: "sintesi", squadra: "commerciale", stato: "attivo" },
  { chiave: "tecnico", numero: "2.5", nome: "Tecnico", compito: "Con che cosa è fatto il sito, se è aggiornato, da quando è fermo", famiglia: "server", squadra: "commerciale", stato: "attivo" },
  { chiave: "seo", numero: "3", nome: "SEO della pagina", compito: "Titolo, descrizione, sitemap, dati strutturati, telefono", famiglia: "server", squadra: "commerciale", stato: "attivo" },
  { chiave: "posizioni", numero: "3", nome: "Posizioni su Google", compito: "Dove compaiono cercando \"categoria + città\"", famiglia: "server", squadra: "commerciale", stato: "attivo" },
  { chiave: "blog", numero: "3.5", nome: "Blog", compito: "Esiste un blog, ultimo articolo, di cosa parla", famiglia: "server", squadra: "commerciale", stato: "attivo" },
  { chiave: "google_ads", numero: "4", nome: "Google Ads", compito: "Annunci su Ads Transparency, incrociati con il tag nel sito", famiglia: "server", squadra: "commerciale", stato: "attivo" },
  { chiave: "tracciamenti", numero: "5", nome: "Tracciamenti", compito: "Analytics, Tag Manager, pixel", famiglia: "server", squadra: "commerciale", stato: "attivo" },
  {
    chiave: "social", numero: "6", nome: "Social", compito: "Pagina Facebook (follower, ultimo post, temi) e Instagram collegato, letti dal server", famiglia: "server", squadra: "commerciale", stato: "attivo",
    istruzioni: `Trova i profili social dell'azienda: parti dai link indicati nel lavoro; se mancano, cerca su Google "<nome azienda> <città> facebook" e "... instagram". Per Facebook e Instagram (e YouTube/TikTok se ci sono): apri il profilo, leggi la data dell'ultimo post visibile, conta i post degli ultimi 3 mesi (anche "circa"), riassumi in una frase di cosa parlano, e confronta con quello che dice il sito (offerta, tono). Leve tipiche: profilo fermo da mesi; post solo promozionali; social che raccontano un'azienda diversa dal sito; profilo assente. Findings: { profili: [{ piattaforma, url, ultimoPost (AAAA-MM-GG o null), postUltimi3Mesi, temi, follower? }], coerenzaConSito }. ${REGOLE_BROWSER}`,
  },
  {
    chiave: "meta_ads", numero: "7", nome: "Meta Ad Library", compito: "Inserzioni attive e passate della pagina, lette dal server", famiglia: "server", squadra: "commerciale", stato: "attivo",
    istruzioni: `Apri https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=IT e cerca la PAGINA Facebook dell'azienda (non solo il nome: verifica che sia la loro, ad esempio dal link al sito). Annota: inserzioni attive ora (quante, da quando), inserzioni passate (se la libreria le mostra), cosa promettono, dove portano (sito/landing/WhatsApp). Confronta con il sito e i social. Se NON sei sicuro che la pagina sia la loro (nessun link al sito, nome uguale ma altra città), scrivi pagina: null e non dare leve: meglio niente che un dato sbagliato. Scrivi solo fatti verificabili (quante inserzioni, da quando, dove portano), mai supposizioni ("non funziona", "spendono al buio"). Leve tipiche: inserzioni attive che portano alla homepage generica; promesse diverse dal sito; mai fatto inserzioni mentre i concorrenti sì. Findings: { pagina, inserzioniAttive, attiveDal, inserzioniPassate, esempi: [{ testo, destinazione, dal }] }. ${REGOLE_BROWSER}`,
  },
  {
    chiave: "instagram", numero: "6b", nome: "Instagram e coerenza", compito: "Ultimo post di Instagram, quanto pubblica e se racconta la stessa azienda di Facebook", famiglia: "browser", squadra: "commerciale", stato: "attivo",
    nota: "Col Chrome di Alessio: Instagram senza accesso non mostra i post",
    istruzioni: `Usa Chrome di Alessio. Apri il profilo Instagram dell'azienda (azienda.linkNoti.instagram; se manca cercalo su Instagram per nome, verificando che sia la loro: stesso nome, città, sito o telefono in bio). Se Instagram chiede l'accesso e non sei dentro, chiudi come FALLITO scrivendo "accesso a Instagram non disponibile".
Annota: esiste?, follower, data dell'ultimo post (AAAA-MM-GG; i post fissati in alto non contano come ultimi), quanti post negli ultimi 3 mesi (anche "circa"), di cosa parlano in una frase, che tono hanno.
Poi la COERENZA con Facebook: confronta con azienda.social (pagina Facebook, ultimo post, temi; se c'è il link apri anche la pagina Facebook). Sono la stessa azienda raccontata allo stesso modo? Stessi contenuti o diversi? Uno vivo e l'altro fermo? Tono diverso? Scrivi solo quello che vedi.
Leve tipiche: Instagram fermo da mesi; Instagram e Facebook che raccontano cose diverse; uno curato e l'altro abbandonato; profilo assente. Findings: { url, esiste, follower, ultimoPost, postUltimi3Mesi, temi, tono, coerenzaFacebook: "coerenti"|"diversi"|"solo_instagram"|"solo_facebook"|"nessuno", perche }. ${REGOLE_BROWSER}`,
  },
  {
    chiave: "linkedin_azienda", numero: "8", nome: "LinkedIn azienda", compito: "Pagina aziendale e ultimo post", famiglia: "browser", squadra: "commerciale", stato: "attivo",
    nota: "Con il browser di Alessio, al massimo ~20 aziende al giorno",
    istruzioni: `Usa Chrome di Alessio (è già entrato in LinkedIn). Cerca la pagina aziendale (link nel lavoro, oppure ricerca "<nome azienda>" tra le aziende, verificando sito e città). Annota: esiste?, follower, numero dipendenti dichiarato, data dell'ultimo post (AAAA-MM-GG), quanti post negli ultimi 3 mesi (anche "circa"), di cosa parlano gli ultimi post. Muoviti con calma, come una persona: una pagina alla volta. Findings: { url, esiste, follower, dipendentiDichiarati, ultimoPost, postUltimi3Mesi, temi }. Leve tipiche: pagina assente o ferma (importante se vendono ad altre aziende). ${REGOLE_BROWSER}`,
  },
  {
    chiave: "decision_maker", numero: "9", nome: "Chi decide e il collegamento", compito: "Chi decide in azienda e se è collegato ad Alessio: decide se l'azienda va avanti", famiglia: "browser", squadra: "commerciale", stato: "attivo",
    nota: "Motore 121: un'azienda arriva in Da decidere solo se chi decide è collegato ad Alessio (contatto diretto o almeno un contatto in comune)",
    istruzioni: `Trova chi decide con la via corta di Alessio, con il suo Chrome (è già entrato in LinkedIn):
1. Il modo più veloce (provato il 2026-10-19): cerca fra le PERSONE "<nome azienda> <città>" (anche senza srl, o con il nome del titolare se è nel nome dell'azienda). Chi decide di solito ha nel titolo "Titolare / Amministratore / Socio presso <azienda>". Se non esce, apri la pagina aziendale (azienda.paginaLinkedin o ricerca fra le Aziende, verificando sito e città) e la scheda "Persone".
2. Chi decide: CEO, titolare, amministratore, fondatore, socio. NON vale un dipendente o un ex dipendente: se c'è solo quello, scrivi persone: [].
3. Per ognuno (al massimo 2): il grado del collegamento con Alessio (1 = già collegati, 2 = contatti in comune, 3 = nessuno), quanti contatti in comune ("X e altri N collegamenti in comune" → numeroInComune = N+…), e i nomi di TUTTI: clicca la scritta "collegamenti in comune" (apre la lista completa) e scorrila tutta, pagina per pagina, fino a 50 nomi, mettendo per primi i membri BNI. Nomi e cognomi come li scrive LinkedIn. Se apri il profilo, guarda se ci sono punti di contatto con chi è in comune.
4. Se su LinkedIn non c'è nessuno: la pagina "chi siamo" del sito, la sezione "Informazioni" e i post firmati della pagina Facebook dell'azienda (grado 3). Se non si trova da nessuna parte, scrivi persone: [] (l'azienda NON si scarta: Alessio scriverà alla pagina).
5. Facebook e Instagram (decisione di Alessio del 2026-10-25: i titolari stanno lì ogni giorno). Per chi decide cerca il profilo PERSONALE su Facebook e su Instagram: nome e cognome + città o azienda, verificando con foto, lavoro o città (meglio nessun profilo che quello sbagliato). Su Facebook, se il profilo li mostra, leggi gli "amici in comune" con Alessio e riporta i nomi (fino a 30, prima i membri BNI). Solo lettura: niente richieste di amicizia, niente like, niente messaggi.
I punti di contatto si scrivono con questi codici: COLLEGAMENTO_DIRETTO (è già collegato ad Alessio), MEMBRO_BNI (il ponte è un membro BNI), STESSA_AZIENDA (hanno lavorato nella stessa azienda), COMMENTI_RECIPROCI (si commentano o reagiscono ai post), STESSO_GRUPPO (stesso capitolo, associazione, club, ordine), STESSA_CITTA, STESSA_SCUOLA. Scrivi solo quelli che vedi sulle pagine, con la prova nelle evidenze.
Al massimo 3 ricerche per azienda. Dei dipendenti NON salvare elenchi. Mai richieste di collegamento né messaggi: li manda Alessio.
Findings: { persone: [{ nome, ruolo, profilo, profiloFacebook, profiloInstagram, fonte: "linkedin"|"sito"|"facebook", grado: 1|2|3, numeroInComune, contattiInComune: [nomi], amiciInComuneFacebook: [nomi], puntiContatto: [codici] }], certezza: "alta"|"media"|"bassa" }. Leve tipiche: "<nome> (titolare) ha in comune con Alessio <contatto>: chiedere a lui la presentazione". ${REGOLE_BROWSER}`,
  },
  { chiave: "aggancio", numero: "10", nome: "Aggancio", compito: "Prepara il messaggio al decision maker (lo mandi tu)", famiglia: "sintesi", squadra: "commerciale", stato: "attivo" },
  { chiave: "coerenza", numero: "11", nome: "Coerenza", compito: "Confronta tutti i segnali fra loro", famiglia: "sintesi", squadra: "commerciale", stato: "attivo" },
  { chiave: "scheda_leve", numero: "12", nome: "Scheda leve", compito: "Su cosa fare leva nel contatto, con le prove", famiglia: "sintesi", squadra: "commerciale", stato: "attivo" },
  { chiave: "regista_video", numero: "13", nome: "Regista del video", compito: "Cosa mostrare nel video di analisi", famiglia: "sintesi", squadra: "commerciale", stato: "attivo" },
  {
    chiave: "cartografo_bni", numero: "B1", nome: "Cartografo capitoli", compito: "Capitoli, formato, membri e dirigenza su BNI Connect", famiglia: "browser", squadra: "bni", stato: "attivo",
    istruzioni: `Usa Chrome di Alessio su BNI Connect (è già entrato). Per la regione indicata nel lavoro: elenca i capitoli (nome, città, provincia, giorno e ora della riunione, formato: in presenza / online / ibrido, sede o indirizzo della riunione — oppure "online" —, link alla pagina del capitolo). Per ogni capitolo apri l'elenco membri e riporta per ciascuno: nome, azienda, categoria professionale, telefono se pubblicato, e il ruolo nella dirigenza se ne ha uno ADESSO (presidente, vicepresidente, responsabile formazione, responsabile eventi). Puoi seguire il metodo della skill bni-121 per navigare BNI Connect. Findings: { regione, capitoli: [{ nome, citta, provincia, formato, giorno, ora, sede, url, membri: [{ nome, azienda, categoria, telefono, dirigenza }] }] }. ${REGOLE_BROWSER}`,
  },
  { chiave: "pianificatore_121", numero: "B2", nome: "Pianificatore 121", compito: "20 richieste a settimana alle 14 dei feriali, tetto di 12 121 fissati, 2 capitoli alla volta, con il tuo ordine dentro ogni capitolo", famiglia: "server", squadra: "bni", stato: "attivo" },
  { chiave: "segnalazioni", numero: "B8", nome: "Contatti da segnalare", compito: "Prima del 121, 1-3 aziende del CRM utili al mestiere del membro: si dà prima di chiedere", famiglia: "sintesi", squadra: "bni", stato: "attivo" },
  { chiave: "preparatore_121", numero: "B3", nome: "Preparatore 121", compito: "Scrive la richiesta di 121 (la mandi tu) e il foglio del giorno prima", famiglia: "sintesi", squadra: "bni", stato: "attivo" },
  {
    chiave: "rete_membro", numero: "B5", nome: "Rete del membro e incrocio", compito: "Dalla rete LinkedIn del membro: chi decide nelle aziende del serbatoio (l'incrocio) e 3-5 persone da farsi presentare", famiglia: "browser", squadra: "bni", stato: "attivo",
    nota: "Con il browser di Alessio, dentro il budget LinkedIn comune (25 letture al giorno)",
    istruzioni: `Usa Chrome di Alessio su LinkedIn (è già entrato). Il lavoro indica un membro BNI (nome, azienda, capitolo, profilo se noto). 1) Trova il suo profilo: il link del lavoro, oppure cerca nome + azienda, verificando azienda e città. 2) Guarda la sua rete: se i collegamenti sono visibili usa la ricerca Persone con il filtro "Collegamenti di <nome>"; altrimenti i "collegamenti in comune" con Alessio. 3) L'INCROCIO (la parte più importante): per ogni azienda in input.aziendeDaCercare cerca fra le Persone, con il filtro "Collegamenti di <membro>", il nome dell'azienda. Se fra i suoi collegamenti c'è chi DECIDE in quell'azienda (titolare, socio, amministratore; non un dipendente), è un ponte: riporta leadId (quello dell'input), azienda, nome, ruolo, link al profilo e i punti di contatto fra il membro e quella persona (guarda i due profili: aziende passate, città, gruppi, scuole, commenti). Una ricerca per azienda, al massimo 8.
4) Poi scegli fino a 5 altre persone della sua rete che sono titolari, soci, amministratori o responsabili di un'azienda (non semplici dipendenti, non concorrenti di Alessio: niente web agency, marketing, grafica, comunicazione), meglio se in Sardegna e nei settori dei casi studio indicati nel lavoro. Per ognuna: nome, ruolo, azienda, sito dell'azienda se è nel profilo, link al profilo, località, perché è interessante (una riga), punti di contatto con il membro.
I punti di contatto si scrivono con questi codici: COLLEGAMENTO_DIRETTO (è già collegato ad Alessio), MEMBRO_BNI (il ponte è un membro BNI), STESSA_AZIENDA (hanno lavorato nella stessa azienda), COMMENTI_RECIPROCI (si commentano o reagiscono ai post), STESSO_GRUPPO (stesso capitolo, associazione, club, ordine), STESSA_CITTA, STESSA_SCUOLA. Scrivi solo quelli che vedi sulle pagine, con la prova nelle evidenze.
Apri al massimo una quindicina di pagine in tutto, con calma. Non mandare richieste di collegamento né messaggi. Findings: { profiloMembro, ponti: [{ leadId, azienda, nome, ruolo, profilo, puntiContatto: [codici] }], persone: [{ nome, ruolo, azienda, sitoAzienda, profilo, localita, perche, puntiContatto: [codici] }] }. ${REGOLE_BROWSER}`,
  },
  {
    chiave: "linkedin_membri", numero: "B7", nome: "Profili LinkedIn dei membri", compito: "Trova il profilo LinkedIn dei membri BNI, per collegarti con tutti", famiglia: "browser", squadra: "bni", stato: "attivo",
    nota: "Solo lettura: le richieste di collegamento le manda Alessio",
    istruzioni: `Usa Chrome di Alessio su LinkedIn (è già entrato). Il lavoro ha una lista di membri BNI della Sardegna (id, nome, azienda, categoria, capitolo). Per ognuno: cerca nome e cognome tra le Persone, verifica che sia lui o lei (azienda, mestiere o località in Sardegna). Guarda il pulsante sul profilo: "Messaggio" vuol dire già collegati con Alessio, "In sospeso" vuol dire richiesta già inviata, "Collegati" vuol dire da collegare. NON premere nessun pulsante: solo lettura. Se non lo trovi con certezza, segnalo come non trovato (meglio nessun profilo che quello sbagliato). Con calma, una ricerca alla volta. Findings: { profili: [{ id, profilo, stato: "DA_COLLEGARE" | "COLLEGATI" | "RICHIESTA_INVIATA" | "NON_TROVATO" }] }. ${REGOLE_BROWSER}`,
  },
  {
    chiave: "scalda", numero: "R4", nome: "Commenti alle pagine", compito: "Legge i post della pagina dell'azienda (Facebook, Instagram o LinkedIn), anche i precedenti fino a 90 giorni, e propone fino a 10 commenti al giorno, uno per azienda: al 7° si contatta chi decide", famiglia: "browser", squadra: "ricerca", stato: "attivo",
    nota: "Solo lettura: i commenti li incolla Alessio dalla Cassetta (decisione del 2026-10-25: si commenta la pagina dell'azienda, la leggono anche i concorrenti)",
    istruzioni: `Usa Chrome di Alessio (è già entrato in Facebook, Instagram e LinkedIn). Il lavoro ha una lista di aziende (leadId, azienda, città, decisore se noto, piattaforma, pagina = link alla PAGINA DELL'AZIENDA su quella piattaforma, giaCommentati = link dei post già commentati da Alessio).
1. Per ognuna apri la pagina (non il profilo personale di chi decide) e prendi il post più recente dell'azienda che NON è in giaCommentati (non i post fissati in alto, non le condivisioni senza testo), purché sia degli ultimi 90 giorni: se l'ultimo è già commentato, scendi al precedente. Se non c'è nessun post da commentare negli ultimi 90 giorni, salta l'azienda.
2. Scrivi un commento proposto: 1-2 frasi in italiano, con la voce di Alessio (titolare di un'agenzia web e marketing a Cagliari), specifico su quello che dice il post, utile o sincero. Lo leggono anche i concorrenti dell'azienda: deve far fare bella figura sia all'azienda sia ad Alessio. Niente vendita, niente link, niente "complimenti per il post" generici, niente emoji in fila.
3. Segnali: se negli ultimi 30 giorni la pagina o chi decide ha risposto a un commento di Alessio, messo un like o scritto ad Alessio, riportalo.
NON pubblicare nulla, NON mettere like, NON seguire: solo lettura. Al massimo 3 pagine per azienda.
Un commento per azienda, al massimo 10 in tutto: prima le aziende già commentate (si va avanti verso il 7°), poi le altre.
Findings: { commenti: [{ leadId, piattaforma, post (link al post), estratto (una frase del post), commento }], segnali: [{ leadId, tipo: "like" | "commento" | "risposta" | "messaggio" }] }. ${REGOLE_BROWSER}`,
  },
  { chiave: "dopo_121", numero: "B6", nome: "Dopo-121", compito: "Dalla trascrizione di Meet o dal vocale compila la scheda del membro", famiglia: "sintesi", squadra: "bni", stato: "attivo" },
  { chiave: "preparazione_call", numero: "V1", nome: "Preparatore call", compito: "La pagina da avere davanti durante la call di vendita", famiglia: "sintesi", squadra: "vendita", stato: "attivo" },
  { chiave: "dopo_call", numero: "V2", nome: "Dopo-call", compito: "Dalla trascrizione di Meet: lettera strategica o follow-up e prossimo passo", famiglia: "sintesi", squadra: "vendita", stato: "attivo" },
  { chiave: "recall", numero: "V3", nome: "Recall", compito: "Il richiamo quando la risposta non arriva", famiglia: "sintesi", squadra: "vendita", stato: "attivo" },
  { chiave: "nurturing", numero: "V4", nome: "Nurturing", compito: "Un messaggio di valore ogni 45 giorni", famiglia: "sintesi", squadra: "vendita", stato: "attivo" },
  { chiave: "copertura_sardegna", numero: "B4", nome: "Copertura", compito: "Chi conosci e chi manca, capitolo per capitolo; la visita quando ne conosci un terzo", famiglia: "server", squadra: "bni", stato: "attivo" },
  { chiave: "lettore_casi", numero: "R1", nome: "Lettore casi studio", compito: "Dal PDF: la storia da 30 secondi e le chiavi di ricerca (settore, aziende simili, persone simili)", famiglia: "sintesi", squadra: "ricerca", stato: "attivo" },
  {
    chiave: "cerca_meta", numero: "R2", nome: "Cercatore Meta", compito: "Aziende su Facebook e Instagram per settore e zona", famiglia: "browser", squadra: "ricerca", stato: "attivo",
    istruzioni: `Cerca aziende su Facebook e Instagram per il termine e la zona del lavoro (es. "piscine Cagliari"). Facebook: ricerca con il filtro Pagine, termine + città. Instagram: ricerca account con termine e città (anche l'hashtag del termine). Prendi solo pagine di aziende vere della zona (non gruppi, non persone private, non portali o directory), fino a 15. Per ognuna: nome, piattaforma (facebook o instagram), link alla pagina, sito se indicato nella pagina, città, telefono se pubblico, categoria. Findings: { aziende: [{ nome, piattaforma, pagina, sito, citta, telefono, categoria }] }. ${REGOLE_BROWSER}`,
  },
  {
    chiave: "cerca_linkedin", numero: "R3", nome: "Cercatore LinkedIn", compito: "Pagine aziendali del settore dei casi studio (prima la nicchia, prima la Sardegna); oppure persone nella rete di un membro BNI", famiglia: "browser", squadra: "ricerca", stato: "attivo",
    nota: "Con il browser di Alessio; massimo 2 lavori LinkedIn al giorno",
    istruzioni: `Usa Chrome di Alessio su LinkedIn (è già entrato). Due tipi di lavoro, lo dice input.modo:

A) modo "aziende" (il caso normale): prima l'AZIENDA, mai le persone. Cerca su LinkedIn le PAGINE AZIENDALI (filtro "Aziende") per i termini dell'input (es. "costruzione piscine", "piscine"), con la località della zona (input.zona: prima "Sardegna", poi "Italia"). Salta le province in input.provinceEscluse (lì ci sono i concorrenti del cliente del caso studio). Apri al massimo 15 pagine, una alla volta, con calma. Per ognuna riporta solo quello che è scritto nella pagina: nome, link della pagina LinkedIn, sito web, sede (città e provincia), settore dichiarato, numero di dipendenti dichiarato. Tieni solo aziende che fanno il mestiere dei termini (non fornitori, non negozi se cerchi costruttori, non associazioni). input.giaVisti dice quante volte la chiave è già stata usata: vai oltre i primi risultati già visti.
Findings: { aziende: [{ nome, linkedin, sito, citta, provincia, settore, dipendenti }] }.

B) modo "rete": la rete LinkedIn di un membro BNI (input.membro). Apri i suoi collegamenti e trova 3-10 persone che sono titolari o decidono in aziende dei settori dei casi studio (input.settoriCasiStudio). Findings: { persone: [{ nome, ruolo, azienda, sitoAzienda, profilo, localita, perche }] }.

In entrambi i casi: solo lettura, mai richieste di collegamento né messaggi. ${REGOLE_BROWSER}`,
  },
];

/** Gli agenti che girano nell'app, per fase. */
export const AGENTI_ESEGUIBILI: Record<string, AgenteEseguibile> = {
  tecnico: agenteTecnico,
  seo: agenteSeo,
  blog: agenteBlog,
  tracciamenti: agenteTracciamenti,
  lettore: agenteLettore,
  posizioni: agentePosizioni,
  google_ads: agenteGoogleAds,
  coerenza: agenteCoerenza,
  regista_video: agenteRegistaVideo,
  scheda_leve: agenteSchedaLeve,
  aggancio: agenteAggancio,
  trova_sito: agenteTrovaSito,
  sito_visto: agenteSitoVisto,
  contatto: agenteContatto,
  recensioni: agenteRecensioni,
  scheda_google: agenteSchedaGoogle,
  concorrenti: agenteConcorrenti,
  ganci: agenteGanci,
  social: agenteSocialServer,
  meta_ads: agenteMetaAdsServer,
};

/** Gli agenti che esegue Claude sul Mac di Alessio, con il browser. */
export const CHIAVI_BROWSER = SQUADRA.filter((a) => a.famiglia === "browser").map((a) => a.chiave);

export function schedaDi(chiave: string): SchedaAgente | undefined {
  return SQUADRA.find((a) => a.chiave === chiave);
}

export function famigliaDi(chiave: string): Famiglia | undefined {
  return schedaDi(chiave)?.famiglia;
}
