/**
 * Franchising / catene note → fuori target.
 *
 * Un punto vendita in franchising non decide il proprio marketing: lo fa la sede /
 * l'insegna nazionale. Quindi questi lead vanno scartati (NON_TARGET) e non lavorati.
 *
 * Rilevamento DETERMINISTICO sul nome del lead: confronto per TOKEN interi (non
 * sottostringa cieca) così "Tigotà Vicenza" matcha ma "Pasticceria Tigani" no.
 *
 * ⚠️ ESTENDI con criterio: meglio NON inserire parole comuni o cognomi (es. "Toscano",
 * "Self", "Expert") perché scarterebbero attività indipendenti per errore. Inserisci
 * solo insegne DISTINTIVE. Quando incontri un nuovo franchising, aggiungilo qui sotto.
 */

export const FRANCHISE_BRANDS: string[] = [
  // — Fast food / ristorazione catena —
  "McDonald's", "Burger King", "KFC", "Subway", "Old Wild West", "Roadhouse",
  "Wagamama", "Spizzico", "Autogrill", "Chef Express", "Domino's Pizza", "Poke House",
  "Alice Pizza", "La Piadineria", "Cioccolatitaliani", "Rossopomodoro", "America Graffiti",
  "Calavera", "That's Vapore", "Temakinho", "Pescaria",
  // — Caffè / gelato / dolci catena —
  "Starbucks", "Arnold Coffee", "Venchi", "Grom", "Cioccolati Italiani",
  // — Supermercati / discount —
  "Conad", "Coop", "Carrefour", "Eurospin", "Lidl", "Esselunga", "Despar", "Todis",
  "Crai", "Famila", "Penny Market", "Aldi", "Bennet", "Interspar", "Eurospar",
  // — Cura persona / beauty / profumerie —
  "Acqua & Sapone", "Acqua e Sapone", "Tigotà", "Douglas", "Kiko", "Yves Rocher",
  "Jean Louis David", "L'Erbolario", "The Body Shop", "Wycon", "Beauty Star", "Profumeria Limoni",
  // — Abbigliamento / calzature retail —
  "Original Marines", "OVS", "Calzedonia", "Intimissimi", "Tezenis", "Yamamay",
  "Piazza Italia", "Terranova", "Pull&Bear", "Bershka", "Stradivarius",
  "Primadonna", "Bata", "Geox", "Pittarosso", "Deichmann", "Scarpe&Scarpe",
  "Foot Locker", "Cisalfa", "Decathlon", "Calliope", "Oviesse",
  // — Ottica / udito —
  "Salmoiraghi & Viganò", "GrandVision", "Ottica Avanzi", "Amplifon", "Clinica Baviera",
  // — Casa / arredo / fai da te —
  "Mondo Convenienza", "Maisons du Monde", "Leroy Merlin", "Bricoman", "Brico io",
  "Poltronesofà", "Chateau d'Ax", "Kasanova", "Flying Tiger", "Semeraro", "Aiazzone",
  // — Elettronica —
  "MediaWorld", "Unieuro", "Euronics", "Trony", "Comet",
  // — Telefonia (rivenditori insegna) —
  "WindTre", "Vodafone", "Iliad", "Fastweb",
  // — Animali —
  "Arcaplanet", "Maxi Zoo", "Isola dei Tesori",
  // — Immobiliare in rete —
  "Tecnocasa", "Tempocasa", "Gabetti", "RE/MAX", "Remax", "Grimaldi Immobiliare",
  "Engel & Völkers", "Professionecasa", "Fondocasa", "Toscano Immobiliare",
  // — Spedizioni / servizi —
  "Mail Boxes Etc", "Fermopoint", "Punto Poste",
  // — Viaggi —
  "Bluvacanze", "CartOrange", "Welcome Travel", "Robintur",
  // — Fitness —
  "McFIT", "Virgin Active", "Anytime Fitness", "Get Fit", "Fitactive", "Mc Fit",
  // — Auto / gomme / noleggio —
  "Norauto", "Midas", "Euromaster", "Bosch Car Service", "Carglass", "Doctorglass",
  "Europcar", "Hertz", "Avis", "Maggiore Rent", "Locauto",
  // — Bimbi —
  "Prénatal", "Prenatal", "Toys Center", "Bimbo Store", "Chicco Store",
];

/** Normalizza per il confronto: minuscole, via accenti/punteggiatura, spazi singoli. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD") // scompone gli accenti; i segni combinanti vengono tolti sotto
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Pre-normalizza la lista una volta sola. Scarta i marchi troppo corti (rischio match casuali).
const NORM_BRANDS: Array<{ brand: string; norm: string }> = FRANCHISE_BRANDS.map((brand) => ({
  brand,
  norm: normalize(brand),
})).filter((b) => b.norm.replace(/ /g, "").length >= 3);

/**
 * Se il nome del lead corrisponde a un franchising noto, ritorna il marchio; altrimenti null.
 * Match per TOKEN interi: il marchio normalizzato deve comparire come sequenza di parole
 * intere dentro il nome (evita falsi positivi su parti di parola).
 */
export function detectFranchise(name: string | null | undefined): string | null {
  if (!name) return null;
  const padded = ` ${normalize(name)} `;
  for (const { brand, norm } of NORM_BRANDS) {
    if (padded.includes(` ${norm} `)) return brand;
  }
  return null;
}
