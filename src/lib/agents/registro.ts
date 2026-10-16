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

export type Famiglia = "server" | "browser" | "sintesi";
export type Squadra = "commerciale" | "bni" | "vendita";
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

const REGOLE_BROWSER = `Regole: solo lettura. Non scrivere a nessuno, non mettere like, non seguire, non accettare cookie oltre il necessario (rifiuta i non essenziali). Se serve un accesso che non c'è o compare un CAPTCHA, chiudi il lavoro come FALLITO spiegando perché. Ogni affermazione nel referto ha la sua prova (link + citazione o data letta sulla pagina).`;

export const SQUADRA: SchedaAgente[] = [
  { chiave: "esploratore", numero: "1", nome: "Esploratore", compito: "Trova aziende nuove su Google Search (e Google Maps dalle Ricerche)", famiglia: "server", squadra: "commerciale", stato: "attivo", nota: "Google Maps resta nelle Ricerche; LinkedIn si usa per conoscere le aziende, non per trovarle" },
  { chiave: "lettore", numero: "2", nome: "Lettore del sito", compito: "Cosa dice il sito e come lo dice", famiglia: "sintesi", squadra: "commerciale", stato: "attivo" },
  { chiave: "tecnico", numero: "2.5", nome: "Tecnico", compito: "Con che cosa è fatto il sito, se è aggiornato, da quando è fermo", famiglia: "server", squadra: "commerciale", stato: "attivo" },
  { chiave: "seo", numero: "3", nome: "SEO della pagina", compito: "Titolo, descrizione, sitemap, dati strutturati, telefono", famiglia: "server", squadra: "commerciale", stato: "attivo" },
  { chiave: "posizioni", numero: "3", nome: "Posizioni su Google", compito: "Dove compaiono cercando \"categoria + città\"", famiglia: "server", squadra: "commerciale", stato: "attivo" },
  { chiave: "blog", numero: "3.5", nome: "Blog", compito: "Esiste un blog, ultimo articolo, di cosa parla", famiglia: "server", squadra: "commerciale", stato: "attivo" },
  { chiave: "google_ads", numero: "4", nome: "Google Ads", compito: "Annunci su Ads Transparency, incrociati con il tag nel sito", famiglia: "server", squadra: "commerciale", stato: "attivo" },
  { chiave: "tracciamenti", numero: "5", nome: "Tracciamenti", compito: "Analytics, Tag Manager, pixel", famiglia: "server", squadra: "commerciale", stato: "attivo" },
  {
    chiave: "social", numero: "6", nome: "Social", compito: "Presenza, ultimo post, di cosa parlano, coerenza col sito", famiglia: "browser", squadra: "commerciale", stato: "attivo",
    istruzioni: `Trova i profili social dell'azienda: parti dai link indicati nel lavoro; se mancano, cerca su Google "<nome azienda> <città> facebook" e "... instagram". Per Facebook e Instagram (e YouTube/TikTok se ci sono): apri il profilo, leggi la data dell'ultimo post visibile, conta i post degli ultimi 3 mesi (anche "circa"), riassumi in una frase di cosa parlano, e confronta con quello che dice il sito (offerta, tono). Leve tipiche: profilo fermo da mesi; post solo promozionali; social che raccontano un'azienda diversa dal sito; profilo assente. Findings: { profili: [{ piattaforma, url, ultimoPost (AAAA-MM-GG o null), postUltimi3Mesi, temi, follower? }], coerenzaConSito }. ${REGOLE_BROWSER}`,
  },
  {
    chiave: "meta_ads", numero: "7", nome: "Meta Ad Library", compito: "Inserzioni attive e passate, coerenza con social e sito", famiglia: "browser", squadra: "commerciale", stato: "attivo",
    istruzioni: `Apri https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=IT e cerca la PAGINA Facebook dell'azienda (non solo il nome: verifica che sia la loro, ad esempio dal link al sito). Annota: inserzioni attive ora (quante, da quando), inserzioni passate (se la libreria le mostra), cosa promettono, dove portano (sito/landing/WhatsApp). Confronta con il sito e i social. Leve tipiche: pixel installato ma zero inserzioni; inserzioni che portano alla homepage generica; promesse diverse dal sito; mai fatto inserzioni. Findings: { pagina, inserzioniAttive, attiveDal, inserzioniPassate, esempi: [{ testo, destinazione, dal }] }. ${REGOLE_BROWSER}`,
  },
  {
    chiave: "linkedin_azienda", numero: "8", nome: "LinkedIn azienda", compito: "Pagina aziendale e ultimo post", famiglia: "browser", squadra: "commerciale", stato: "attivo",
    nota: "Con il browser di Alessio, al massimo ~20 aziende al giorno",
    istruzioni: `Usa Chrome di Alessio (è già entrato in LinkedIn). Cerca la pagina aziendale (link nel lavoro, oppure ricerca "<nome azienda>" tra le aziende, verificando sito e città). Annota: esiste?, follower, numero dipendenti dichiarato, data dell'ultimo post, di cosa parlano gli ultimi post. Muoviti con calma, come una persona: una pagina alla volta. Findings: { url, esiste, follower, dipendentiDichiarati, ultimoPost, temi }. Leve tipiche: pagina assente o ferma (importante se vendono ad altre aziende). ${REGOLE_BROWSER}`,
  },
  {
    chiave: "decision_maker", numero: "9", nome: "Decision maker", compito: "Chi decide in azienda", famiglia: "browser", squadra: "commerciale", stato: "attivo",
    nota: "Solo nome e ruolo pubblici; nessuna raccolta di dipendenti",
    istruzioni: `Trova chi decide (titolare, amministratore, socio, responsabile marketing): prima la pagina "chi siamo" del sito, poi la pagina LinkedIn dell'azienda (sezione Persone) con il Chrome di Alessio. Riporta SOLO nome, ruolo e link al profilo pubblico della persona che decide (al massimo 2 persone). Non raccogliere elenchi di dipendenti, non salvare dati privati. Findings: { persone: [{ nome, ruolo, profilo, fonte }], certezza: "alta"|"media"|"bassa" }. ${REGOLE_BROWSER}`,
  },
  { chiave: "aggancio", numero: "10", nome: "Aggancio", compito: "Prepara il messaggio al decision maker (lo mandi tu)", famiglia: "sintesi", squadra: "commerciale", stato: "attivo" },
  { chiave: "coerenza", numero: "11", nome: "Coerenza", compito: "Confronta tutti i segnali fra loro", famiglia: "sintesi", squadra: "commerciale", stato: "attivo" },
  { chiave: "scheda_leve", numero: "12", nome: "Scheda leve", compito: "Su cosa fare leva nel contatto, con le prove", famiglia: "sintesi", squadra: "commerciale", stato: "attivo" },
  { chiave: "regista_video", numero: "13", nome: "Regista del video", compito: "Cosa mostrare nel video di analisi", famiglia: "sintesi", squadra: "commerciale", stato: "attivo" },
  {
    chiave: "cartografo_bni", numero: "B1", nome: "Cartografo capitoli", compito: "Capitoli, formato, membri e dirigenza su BNI Connect", famiglia: "browser", squadra: "bni", stato: "attivo",
    istruzioni: `Usa Chrome di Alessio su BNI Connect (è già entrato). Per la regione indicata nel lavoro: elenca i capitoli (nome, città, provincia, giorno e ora della riunione, formato: in presenza / online / ibrido, link alla pagina del capitolo). Per ogni capitolo apri l'elenco membri e riporta per ciascuno: nome, azienda, categoria professionale, telefono se pubblicato, e se ha un ruolo nella dirigenza (presidente, vicepresidente, responsabile formazione). Puoi seguire il metodo della skill bni-121 per navigare BNI Connect. Findings: { regione, capitoli: [{ nome, citta, provincia, formato, giorno, ora, url, membri: [{ nome, azienda, categoria, telefono, dirigenza }] }] }. ${REGOLE_BROWSER}`,
  },
  { chiave: "stratega_bni", numero: "B2", nome: "Stratega di capitolo", compito: "Copertura, collaborazione, visita o 121 con la dirigenza", famiglia: "sintesi", squadra: "bni", stato: "attivo" },
  { chiave: "preparatore_121", numero: "B3", nome: "Preparatore 121", compito: "Scrive la richiesta di 121 o di collaborazione (la mandi tu)", famiglia: "sintesi", squadra: "bni", stato: "attivo" },
  { chiave: "preparazione_call", numero: "V1", nome: "Preparatore call", compito: "La pagina da avere davanti durante la call di vendita", famiglia: "sintesi", squadra: "vendita", stato: "attivo" },
  { chiave: "dopo_call", numero: "V2", nome: "Dopo-call", compito: "Dalla trascrizione di Meet: lettera strategica o follow-up e prossimo passo", famiglia: "sintesi", squadra: "vendita", stato: "attivo" },
  { chiave: "recall", numero: "V3", nome: "Recall", compito: "Il richiamo quando la risposta non arriva", famiglia: "sintesi", squadra: "vendita", stato: "attivo" },
  { chiave: "nurturing", numero: "V4", nome: "Nurturing", compito: "Un messaggio di valore ogni 45 giorni", famiglia: "sintesi", squadra: "vendita", stato: "attivo" },
  { chiave: "copertura_sardegna", numero: "B4", nome: "Copertura Sardegna", compito: "Chi conosci e chi manca, capitolo per capitolo", famiglia: "server", squadra: "bni", stato: "attivo" },
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
};

/** Gli agenti che esegue Claude sul Mac di Alessio, con il browser. */
export const CHIAVI_BROWSER = SQUADRA.filter((a) => a.famiglia === "browser").map((a) => a.chiave);

export function schedaDi(chiave: string): SchedaAgente | undefined {
  return SQUADRA.find((a) => a.chiave === chiave);
}

export function famigliaDi(chiave: string): Famiglia | undefined {
  return schedaDi(chiave)?.famiglia;
}
