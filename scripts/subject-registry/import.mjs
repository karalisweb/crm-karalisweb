/**
 * Importazione nel registro unico dei soggetti — SOLA LETTURA sulle origini.
 *
 * Legge le sei anagrafiche, crea le SubjectIdentity corrispondenti, e collega
 * allo stesso Subject solo ciò che corrisponde con CERTEZZA.
 *
 * Regole di collegamento (piano, sezione 3.2):
 *   CERTO   1. stesso google_place_id
 *   CERTO   2. stesso dominio normalizzato (esclusi i domini di hosting)
 *   —       3. stessa partita IVA: non applicabile, nessuna anagrafica la raccoglie
 *   INCERTO tutto il resto → coda di riconciliazione manuale, MAI unito
 *
 * "Nessuna deduplicazione automatica su ragione sociale: produce falsi positivi."
 *
 * Le origini non vengono mai modificate: le connessioni SQLite sono aperte in
 * sola lettura e sulle origini PostgreSQL si eseguono solo SELECT.
 */
import pg from 'pg';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  normalizeDomain, normalizePlaceId, normalizeName,
  emailDomain, isHostingDomain, diceSimilarity,
  sharedDistinctiveTokens, tokenDocumentFrequency,
} from './lib/normalize.mjs';

const { Client } = pg;

const SOURCES = {
  CRM_READ: process.env.SRC_CRM_URL,     // copia del DB CRM
  GADS_READ: process.env.SRC_GADS_URL,   // copia del DB GADS
  SEOI_DB: process.env.SRC_SEOI_DB,      // copia del file SQLite SEOI
  HUB_DB: process.env.SRC_HUB_DB,        // copia del file SQLite HUB
  TARGET: process.env.TARGET_URL,        // dove vive il registro
};

// ── Lettura delle origini ───────────────────────────────────────────────────

async function readCrm() {
  const c = new Client({ connectionString: SOURCES.CRM_READ });
  await c.connect();
  const out = [];
  const leads = await c.query(
    'SELECT id, name, website, place_id, email FROM leads ORDER BY created_at');
  for (const r of leads.rows) {
    out.push({ source: 'crm_lead', externalId: r.id, name: r.name,
               website: r.website, placeId: r.place_id, email: r.email });
  }
  const opps = await c.query(
    'SELECT id, name, website, email FROM opportunita ORDER BY created_at');
  for (const r of opps.rows) {
    out.push({ source: 'crm_opportunita', externalId: r.id, name: r.name,
               website: r.website, placeId: null, email: r.email });
  }
  const bni = await c.query(
    'SELECT id, name, website, email FROM bni_membri ORDER BY created_at');
  for (const r of bni.rows) {
    out.push({ source: 'crm_bnimembro', externalId: r.id, name: r.name,
               website: r.website, placeId: null, email: r.email });
  }
  await c.end();
  return out;
}

async function readGads() {
  if (!SOURCES.GADS_READ) return [];
  const c = new Client({ connectionString: SOURCES.GADS_READ });
  await c.connect();
  // google_ads_accounts non ha né place_id né dominio: vedi docs/inventory/gads.md, S-05.
  const r = await c.query(
    'SELECT customer_id, customer_name FROM google_ads_accounts ORDER BY customer_id');
  await c.end();
  return r.rows.map((x) => ({
    source: 'gads_account', externalId: x.customer_id, name: x.customer_name,
    website: null, placeId: null, email: null,
  }));
}

async function readSqlite(file, sql, map) {
  if (!file) return [];
  const { DatabaseSync } = await import('node:sqlite');
  const db = new DatabaseSync(file, { readOnly: true }); // sola lettura, esplicita
  try {
    return db.prepare(sql).all().map(map);
  } finally {
    db.close();
  }
}

const readSeoi = () => readSqlite(
  SOURCES.SEOI_DB,
  'SELECT id, name, domain FROM clients ORDER BY id',
  (r) => ({ source: 'seoi_client', externalId: String(r.id), name: r.name,
            website: r.domain, placeId: null, email: null }));

const readHub = () => readSqlite(
  SOURCES.HUB_DB,
  'SELECT id, name, slug, wp_url, client_email FROM projects ORDER BY id',
  (r) => ({ source: 'hub_project', externalId: String(r.id), name: r.name,
            website: r.wp_url, placeId: null, email: r.client_email, slug: r.slug }));

// ── Estrazione delle chiavi ─────────────────────────────────────────────────

function enrich(raw) {
  const domain = normalizeDomain(raw.website);
  return {
    ...raw,
    key: `${raw.source}:${raw.externalId}`,
    placeKey: normalizePlaceId(raw.placeId),
    domain,
    domainUsable: domain && !isHostingDomain(domain) ? domain : null,
    hostingDomain: domain && isHostingDomain(domain) ? domain : null,
    emailDom: emailDomain(raw.email),
    nameKey: normalizeName(raw.name),
  };
}

// ── Insiemi disgiunti ───────────────────────────────────────────────────────

class UnionFind {
  constructor() { this.parent = new Map(); this.links = []; }
  find(x) {
    if (!this.parent.has(x)) this.parent.set(x, x);
    let r = x;
    while (this.parent.get(r) !== r) r = this.parent.get(r);
    let c = x;
    while (this.parent.get(c) !== c) { const n = this.parent.get(c); this.parent.set(c, r); c = n; }
    return r;
  }
  union(a, b, reason, evidence) {
    const ra = this.find(a), rb = this.find(b);
    this.links.push({ a, b, reason, evidence, merged: ra !== rb });
    if (ra === rb) return false;
    this.parent.set(ra, rb);
    return true;
  }
}

// ── Motore ──────────────────────────────────────────────────────────────────

export function buildRegistry(rawIdentities) {
  const ids = rawIdentities.map(enrich);
  const uf = new UnionFind();
  ids.forEach((i) => uf.find(i.key));

  // CERTO 1 — stesso google_place_id
  const byPlace = new Map();
  for (const i of ids) {
    if (!i.placeKey) continue;
    if (!byPlace.has(i.placeKey)) byPlace.set(i.placeKey, []);
    byPlace.get(i.placeKey).push(i);
  }
  const certainLinks = [];
  for (const [place, group] of byPlace) {
    for (let n = 1; n < group.length; n++) {
      const merged = uf.union(group[0].key, group[n].key, 'google_place_id', { place });
      if (merged) certainLinks.push({ rule: 'google_place_id', value: place, a: group[0].key, b: group[n].key });
    }
  }

  // CERTO 2 — stesso dominio normalizzato (hosting escluso)
  //
  // Con un vincolo che vale piu della regola: se due identita hanno DUE schede
  // Google distinte, sono due soggetti distinti, qualunque sito condividano.
  // Il google_place_id e la chiave prioritaria (piano, sezione 3.2) e non puo
  // essere scavalcato da una chiave di rango inferiore.
  //
  // Senza questo vincolo, misurato sui dati reali dell 11 agosto 2026:
  // 206 appartamenti diversi elencati su "br.bluepillow.com" diventavano UN
  // soggetto solo; 114 su "booking.com"; 15 negozi della stessa catena su
  // "iperceramica.it". Il sito non e sempre il sito DELL azienda: spesso e il
  // portale su cui l azienda e pubblicata, o l insegna di una catena.
  const byDomain = new Map();
  for (const i of ids) {
    if (!i.domainUsable) continue;
    if (!byDomain.has(i.domainUsable)) byDomain.set(i.domainUsable, []);
    byDomain.get(i.domainUsable).push(i);
  }
  const nonIdentifyingDomains = [];
  for (const [dom, group] of byDomain) {
    const places = new Set(group.map((g) => g.placeKey).filter(Boolean));
    if (places.size > 1) {
      // Dominio non identificante: portale, aggregatore, o catena.
      nonIdentifyingDomains.push({ domain: dom, identities: group.length, places: places.size });
      continue;
    }
    for (let n = 1; n < group.length; n++) {
      const merged = uf.union(group[0].key, group[n].key, 'normalized_domain', { domain: dom });
      if (merged) certainLinks.push({ rule: 'normalized_domain', value: dom, a: group[0].key, b: group[n].key });
    }
  }

  // Componenti → Subject
  const components = new Map();
  for (const i of ids) {
    const root = uf.find(i.key);
    if (!components.has(root)) components.set(root, []);
    components.get(root).push(i);
  }

  // ── INCERTI: proposte per la coda manuale, mai unite ──────────────────────
  const compOf = new Map();
  for (const [root, members] of components) for (const m of members) compOf.set(m.key, root);
  const candidates = new Map();
  // Insieme dei place_id di ogni componente: serve al filtro qui sotto.
  const placesOf = new Map();
  for (const [root, members] of components) {
    placesOf.set(root, new Set(members.map((m) => m.placeKey).filter(Boolean)));
  }

  const propose = (a, b, reason, score, evidence) => {
    const ca = compOf.get(a.key), cb = compOf.get(b.key);
    if (ca === cb) return;                       // già lo stesso soggetto

    // Stessa regola che vale per le unioni: se i due soggetti hanno DUE schede
    // Google distinte, non sono lo stesso soggetto. Proporli a mano non e
    // prudenza, e far perdere tempo a chi rivede: la risposta e gia nota.
    // Senza questo filtro, sui dati reali dell 11 agosto 2026 la coda passava
    // da 313 a 3 292 voci, quasi tutte coppie di attivita diverse che
    // condividono il dominio di posta del portale che le pubblica.
    const pa = placesOf.get(ca), pb = placesOf.get(cb);
    if (pa && pb && pa.size && pb.size) {
      let condiviso = false;
      for (const p of pa) if (pb.has(p)) { condiviso = true; break; }
      if (!condiviso) return;
    }
    const [x, y] = ca < cb ? [ca, cb] : [cb, ca];
    const id = `${x}|${y}`;
    const prev = candidates.get(id);
    if (!prev || score > prev.score) {
      candidates.set(id, { left: x, right: y, reason, score, evidence,
                           sampleA: a.name, sampleB: b.name });
    }
  };

  // a) dominio di posta aziendale che coincide con il dominio di un altro.
  // Indicizzato: il doppio ciclo su 3 204 identita erano 10 milioni di
  // confronti e faceva superare i dieci minuti.
  const byDomainIdx = new Map();
  const byEmailIdx = new Map();
  for (const i of ids) {
    if (i.domainUsable) {
      if (!byDomainIdx.has(i.domainUsable)) byDomainIdx.set(i.domainUsable, []);
      byDomainIdx.get(i.domainUsable).push(i);
    }
    if (i.emailDom) {
      if (!byEmailIdx.has(i.emailDom)) byEmailIdx.set(i.emailDom, []);
      byEmailIdx.get(i.emailDom).push(i);
    }
  }
  const MAX_GRUPPO_EMAIL = 20;   // oltre, e un portale: non identifica nessuno
  for (const [dom, withEmail] of byEmailIdx) {
    const withSite = byDomainIdx.get(dom) || [];
    if (withEmail.length + withSite.length > MAX_GRUPPO_EMAIL) continue;
    for (const a of withEmail) {
      for (const b of withSite) {
        if (a.key !== b.key) {
          propose(a, b, 'shared_email_domain', 0.75,
                  { emailDomain: dom, otherDomain: dom });
        }
      }
      for (const b of withEmail) {
        if (a.key < b.key) propose(a, b, 'shared_email_domain', 0.70, { emailDomain: dom });
      }
    }
  }

  // b) uno è sottodominio dell'altro
  const domainList = [...new Set(ids.filter((i) => i.domainUsable).map((i) => i.domainUsable))];
  for (const d1 of domainList) {
    for (const d2 of domainList) {
      if (d1 === d2) continue;
      if (!d2.endsWith('.' + d1)) continue;
      for (const a of ids.filter((i) => i.domainUsable === d1)) {
        for (const b of ids.filter((i) => i.domainUsable === d2)) {
          propose(a, b, 'domain_host_mismatch', 0.65, { base: d1, sub: d2 });
        }
      }
    }
  }

  // c) stesso dominio di hosting: mai unire, ma vale come indizio debole
  const byHosting = new Map();
  for (const i of ids) {
    if (!i.hostingDomain) continue;
    if (!byHosting.has(i.hostingDomain)) byHosting.set(i.hostingDomain, []);
    byHosting.get(i.hostingDomain).push(i);
  }
  for (const [dom, group] of byHosting) {
    for (let x = 0; x < group.length; x++)
      for (let y = x + 1; y < group.length; y++)
        propose(group[x], group[y], 'shared_hosting_domain', 0.30, { hostingDomain: dom });
  }

  // d) ragione sociale identica, molto simile, o con token distintivi condivisi.
  //
  // Confrontare tutte le coppie sono 5 milioni di calcoli di similarita su
  // 3 204 nomi: troppo. Si confrontano solo le coppie che condividono almeno
  // un token — due nomi senza nemmeno una parola in comune non possono essere
  // ne identici, ne molto simili, ne avere token distintivi condivisi.
  const named = ids.filter((i) => i.nameKey);
  const df = tokenDocumentFrequency(named.map((i) => i.nameKey));
  const corpus = named.length;

  const tokenIdx = new Map();
  for (const i of named) {
    for (const t of new Set(i.nameKey.split(' '))) {
      if (!tokenIdx.has(t)) tokenIdx.set(t, []);
      tokenIdx.get(t).push(i);
    }
  }

  const MAX_BLOCCO = 300;   // token cosi frequenti non restringono nulla
  const visti = new Set();
  for (const [, blocco] of tokenIdx) {
    if (blocco.length > MAX_BLOCCO) continue;
    for (let x = 0; x < blocco.length; x++) {
      for (let y = x + 1; y < blocco.length; y++) {
        const a = blocco[x], b = blocco[y];
        const coppia = a.key < b.key ? a.key + '|' + b.key : b.key + '|' + a.key;
        if (visti.has(coppia)) continue;
        visti.add(coppia);

        if (a.nameKey === b.nameKey) {
          propose(a, b, 'same_normalized_name', 0.60, { name: a.nameKey });
          continue;
        }
        const sim = diceSimilarity(a.nameKey, b.nameKey);
        if (sim >= 0.80) {
          propose(a, b, 'similar_name', Math.min(0.55, sim / 2),
                  { a: a.nameKey, b: b.nameKey, similarity: Number(sim.toFixed(3)) });
          continue;
        }
        const tok = sharedDistinctiveTokens(a.nameKey, b.nameKey, df, corpus);
        if (tok) {
          propose(a, b, 'shared_distinctive_tokens', 0.45,
                  { a: a.nameKey, b: b.nameKey, ...tok });
        }
      }
    }
  }

  // e) domini non identificanti: per i gruppi piccoli vale la pena proporli a
  // mano (possono essere la stessa azienda con due schede duplicate su Google);
  // per i gruppi grandi no, sarebbero migliaia di coppie inutili.
  const MAX_GRUPPO_PROPONIBILE = 5;
  for (const nid of nonIdentifyingDomains) {
    const group = byDomain.get(nid.domain);
    if (group.length > MAX_GRUPPO_PROPONIBILE) continue;
    for (let x = 0; x < group.length; x++) {
      for (let y = x + 1; y < group.length; y++) {
        propose(group[x], group[y], 'shared_domain_distinct_places', 0.55,
                { domain: nid.domain, schedeGoogleDistinte: nid.places });
      }
    }
  }

  return { ids, components, certainLinks, candidates: [...candidates.values()],
           nonIdentifyingDomains: nonIdentifyingDomains.sort((a, b) => b.identities - a.identities) };
}

// ── Scrittura del registro ──────────────────────────────────────────────────

function pickDisplayName(members) {
  // Il nome più lungo è di solito il più completo. Non è una chiave.
  return members.map((m) => m.name).filter(Boolean)
    .sort((a, b) => b.length - a.length)[0] || '(senza nome)';
}

async function writeRegistry(target, result) {
  const c = new Client({ connectionString: target });
  await c.connect();
  await c.query('BEGIN');
  try {
    await c.query('TRUNCATE reconciliation_candidates, subject_identities, subjects CASCADE');

    const subjectIdByRoot = new Map();
    for (const [root, members] of result.components) {
      const placeId = members.map((m) => m.placeKey).find(Boolean) || null;
      const domain = members.map((m) => m.domainUsable).find(Boolean) || null;
      const id = crypto.randomUUID();
      await c.query(
        `INSERT INTO subjects (id, display_name, google_place_id, primary_domain,
                               vat_number, country_code, created_at, updated_at)
         VALUES ($1,$2,$3,$4,NULL,'IT',now(),now())`,
        [id, pickDisplayName(members), placeId, domain]);
      subjectIdByRoot.set(root, id);

      for (const m of members) {
        await c.query(
          `INSERT INTO subject_identities (id, subject_id, source, external_id, payload, seen_at, created_at)
           VALUES ($1,$2,$3::"SubjectSource",$4,$5,now(),now())`,
          [crypto.randomUUID(), id, m.source, m.externalId,
           JSON.stringify({ name: m.name, website: m.website ?? null,
                            domain: m.domainUsable, placeId: m.placeKey,
                            emailDomain: m.emailDom })]);
      }
    }

    for (const cand of result.candidates) {
      const l = subjectIdByRoot.get(cand.left), r = subjectIdByRoot.get(cand.right);
      if (!l || !r || l === r) continue;
      const [a, b] = l < r ? [l, r] : [r, l];
      await c.query(
        `INSERT INTO reconciliation_candidates
           (id, left_subject_id, right_subject_id, reason, score, evidence, status, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,'PENDING',now())
         ON CONFLICT (left_subject_id, right_subject_id) DO NOTHING`,
        [crypto.randomUUID(), a, b, cand.reason, cand.score,
         JSON.stringify({ ...cand.evidence, esempioA: cand.sampleA, esempioB: cand.sampleB })]);
    }

    await c.query('COMMIT');
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    await c.end();
  }
}

export async function runImport() {
  const raw = [
    ...(await readCrm()),
    ...(await readGads()),
    ...(await readSeoi()),
    ...(await readHub()),
  ];
  const result = buildRegistry(raw);
  if (SOURCES.TARGET) await writeRegistry(SOURCES.TARGET, result);
  return result;
}

// pathToFileURL, non un'interpolazione: il percorso contiene spazi e va codificato.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runImport()
    .then((r) => {
      console.log(`identità lette ......... ${r.ids.length}`);
      console.log(`soggetti distinti ...... ${r.components.size}`);
      console.log(`collegamenti certi ..... ${r.certainLinks.length}`);
      console.log(`candidati in coda ...... ${r.candidates.length}`);
    })
    .catch((e) => { console.error('IMPORT FALLITO:', e); process.exit(1); });
}
