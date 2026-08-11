/**
 * Dataset finto per l'ambiente di sviluppo.
 *
 * NON sono dati reali: nessuna azienda qui esiste. Servono a verificare la
 * macchina di deduplicazione con un risultato atteso noto.
 *
 * Ogni voce dichiara `expect`, che è ciò che la deduplicazione DEVE produrre.
 * Il verificatore (verify.mjs) confronta il risultato con questa dichiarazione.
 */

export const SUBJECTS = [
  // ── Sovrapposizioni CERTE ────────────────────────────────────────────────
  {
    key: 'colombo',
    expect: { subjects: 1, identities: 4, via: 'place_id + dominio' },
    crmLead: {
      name: 'Hotel Colombo Palace S.r.l.',
      website: 'https://www.colombopalace.it/camere',
      placeId: 'ChIJ-demo-colombo-001',
      email: 'info@colombopalace.it',
    },
    gadsAccount: { customerId: '111-000-0001', customerName: 'Colombo Palace' },
    seoiClient: { name: 'Colombo Palace', domain: 'colombopalace.it' },
    hubProject: { name: 'Colombo Palace', slug: 'colombo-palace', wpUrl: 'https://www.colombopalace.it' },
  },
  {
    key: 'officina3mt',
    expect: { subjects: 1, identities: 2, via: 'dominio' },
    crmLead: {
      name: 'Officina 3MT snc',
      website: 'http://officina3mt.it',
      placeId: 'ChIJ-demo-3mt-002',
      email: null,
    },
    seoiClient: { name: 'Officina 3MT', domain: 'WWW.Officina3MT.IT' },
  },
  {
    key: 'casabulldog',
    expect: { subjects: 1, identities: 2, via: 'dominio (schema e www diversi)' },
    crmLead: {
      name: 'Casa Bulldog',
      website: 'http://casabulldog.com/',
      placeId: null,
      email: 'prenotazioni@casabulldog.com',
    },
    hubProject: { name: 'Casa Bulldog', slug: 'casa-bulldog', wpUrl: 'https://www.casabulldog.com' },
  },
  {
    key: 'economy',
    expect: { subjects: 1, identities: 2, via: 'dominio (porta e percorso)' },
    seoiClient: { name: 'Economy Transfert', domain: 'economytransfert.it' },
    hubProject: { name: 'Economy Transfert', slug: 'economy', wpUrl: 'https://economytransfert.it:443/home' },
  },
  {
    key: 'prestige',
    expect: { subjects: 1, identities: 2, via: 'dominio' },
    crmOpportunita: { name: 'Prestige NCC', website: 'prestigencc.it', email: 'info@prestigencc.it' },
    seoiClient: { name: 'Prestige NCC Cagliari', domain: 'https://prestigencc.it/' },
  },
  {
    key: 'sardegnatr',
    expect: { subjects: 1, identities: 2, via: 'dominio (lead + membro BNI)' },
    crmLead: {
      name: 'Sardegna Trasferimenti',
      website: 'https://sardegnatrasferimenti.it',
      placeId: 'ChIJ-demo-sard-006',
      email: null,
    },
    crmBniMembro: { name: 'Sardegna Trasferimenti', website: 'www.sardegnatrasferimenti.it.', email: null },
  },
  {
    key: 'dupinterno',
    expect: { subjects: 1, identities: 2, via: 'dominio (doppione dentro il CRM)' },
    crmLead: {
      name: 'Serramenti Nuoro',
      website: 'https://serramentinuoro.it',
      placeId: 'ChIJ-demo-serr-008',
      email: null,
    },
    crmLead2: {
      name: 'SERRAMENTI NUORO SRL',
      website: 'http://www.serramentinuoro.it/contatti',
      placeId: null,
      email: null,
    },
  },

  // ── Casi INCERTI: non si uniscono, vanno in coda ─────────────────────────
  {
    key: 'gologone',
    expect: { subjects: 2, identities: 2, queue: 'similar_name' },
    crmLead: {
      name: 'Ristorante Su Gologone',
      website: 'https://sugologone.it',
      placeId: 'ChIJ-demo-golo-010',
      email: null,
    },
    seoiClient: { name: 'Su Gologone Experience', domain: 'sugologone-experience.it' },
  },
  {
    key: 'edilizia',
    expect: { subjects: 2, identities: 2, queue: 'shared_email_domain' },
    crmLead: {
      name: 'Edilizia Sarda Srl',
      website: 'https://ediliziasarda.it',
      placeId: null,
      email: null,
    },
    crmOpportunita: { name: 'Edilizia Sarda', website: null, email: 'amministrazione@ediliziasarda.it' },
  },
  {
    key: 'infissi',
    expect: { subjects: 2, identities: 2, queue: 'domain_host_mismatch' },
    crmLead: {
      name: 'Infissi Nuragici',
      website: 'https://infissinuragici.it',
      placeId: null,
      email: null,
    },
    hubProject: { name: 'Infissi Nuragici Blog', slug: 'infissi-blog', wpUrl: 'https://blog.infissinuragici.it' },
  },
  {
    key: 'autofficina',
    expect: { subjects: 2, identities: 2, queue: 'same_normalized_name' },
    crmLead: { name: 'Autofficina Piras', website: null, placeId: null, email: null },
    crmBniMembro: { name: 'Autofficina Piras S.r.l.', website: null, email: null },
  },
  {
    key: 'hosting',
    expect: { subjects: 2, identities: 2, queue: 'nessuna: dominio di hosting ignorato' },
    // Due soggetti diversi con lo stesso valore nel campo sito: è spazzatura
    // di compilazione. Il dominio di hosting NON deve mai unire.
    crmLead: { name: 'Falegnameria Loi', website: 'business.site', placeId: null, email: null },
    crmOpportunita: { name: 'Tende Cagliari', website: 'business.site', email: null },
  },

  // ── Soggetti isolati, senza sovrapposizione ──────────────────────────────
  { key: 'iso1', expect: { subjects: 1, identities: 1 },
    crmLead: { name: 'Pasticceria Aresu', website: 'https://pasticceriaaresu.it', placeId: 'ChIJ-demo-ares-020', email: null } },
  { key: 'iso2', expect: { subjects: 1, identities: 1 },
    crmLead: { name: 'Lavanderia Su Nuraghe', website: null, placeId: 'ChIJ-demo-lava-021', email: null } },
  { key: 'iso3', expect: { subjects: 1, identities: 1 },
    seoiClient: { name: 'Agriturismo Monte Ortobene', domain: 'monteortobene.it' } },
  { key: 'iso4', expect: { subjects: 1, identities: 1 },
    crmBniMembro: { name: 'Studio Legale Marras', website: 'studiolegalemarras.it', email: 'avv@studiolegalemarras.it' } },
  { key: 'iso5', expect: { subjects: 1, identities: 1 },
    crmOpportunita: { name: 'Tipografia Ogliastra', website: 'tipografiaogliastra.it', email: null } },

  // ── GADS: nessuna chiave canonica disponibile ────────────────────────────
  // `google_ads_accounts` non ha né place_id né dominio (vedi docs/inventory/gads.md,
  // rilievo S-05). Questi account NON sono collegabili automaticamente.
  { key: 'gads1', expect: { subjects: 1, identities: 1, nota: 'GADS senza chiavi' },
    gadsAccount: { customerId: '111-000-0002', customerName: 'Officina 3MT' } },
  { key: 'gads2', expect: { subjects: 1, identities: 1, nota: 'GADS senza chiavi' },
    gadsAccount: { customerId: '111-000-0003', customerName: 'Economy Transfert' } },
  { key: 'gads3', expect: { subjects: 1, identities: 1, nota: 'GADS senza chiavi' },
    gadsAccount: { customerId: '111-000-0004', customerName: 'Prestige NCC' } },
  { key: 'gads4', expect: { subjects: 1, identities: 1, nota: 'GADS senza chiavi' },
    gadsAccount: { customerId: '111-000-0005', customerName: 'Massimo Borio' } },
  { key: 'gads5', expect: { subjects: 1, identities: 1, nota: 'GADS senza chiavi' },
    gadsAccount: { customerId: '111-000-0006', customerName: 'Casa Bulldog' } },
  { key: 'gads6', expect: { subjects: 1, identities: 1, nota: 'GADS senza chiavi' },
    gadsAccount: { customerId: '111-000-0007', customerName: 'Sardegna Trasferimenti' } },
];
