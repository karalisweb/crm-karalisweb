/**
 * Popola l'ambiente di SVILUPPO con dati finti.
 *
 * Crea quattro archivi che imitano le anagrafiche reali:
 *   - CRM   → PostgreSQL di sviluppo: leads, opportunita, bni_membri
 *   - GADS  → PostgreSQL di sviluppo (database separato): google_ads_accounts
 *   - SEOI  → SQLite di prova: clients
 *   - HUB   → SQLite di prova: projects
 *
 * NON tocca alcun database reale. Rifiuta di partire se l'URL del database
 * non è quello di sviluppo.
 */
import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SUBJECTS } from './dataset.dev.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { Client } = pg;

const CRM_URL = process.env.DEV_CRM_URL;
const GADS_URL = process.env.DEV_GADS_URL;
const FIXTURE_DIR = process.env.DEV_FIXTURE_DIR;

function guard() {
  for (const [name, url] of [['DEV_CRM_URL', CRM_URL], ['DEV_GADS_URL', GADS_URL]]) {
    if (!url) throw new Error(`${name} non impostata`);
    if (!/localhost|127\.0\.0\.1/.test(url)) {
      throw new Error(`${name} non punta a localhost: mi fermo. (${url.replace(/:[^:@]*@/, ':***@')})`);
    }
  }
  if (!FIXTURE_DIR) throw new Error('DEV_FIXTURE_DIR non impostata');
}

const uuid = () => crypto.randomUUID();

async function seedCrm() {
  const c = new Client({ connectionString: CRM_URL });
  await c.connect();
  await c.query('TRUNCATE leads, opportunita, bni_membri RESTART IDENTITY CASCADE');

  let leads = 0, opps = 0, bni = 0;
  for (const s of SUBJECTS) {
    for (const l of [s.crmLead, s.crmLead2].filter(Boolean)) {
      await c.query(
        `INSERT INTO leads (id, name, website, place_id, email, source, pipeline_stage,
                            audit_status, talking_points, qualification_errors,
                            created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,'google_maps','DA_ANALIZZARE','PENDING','{}','{}',now(),now())`,
        [uuid(), l.name, l.website, l.placeId, l.email],
      );
      leads++;
    }
    if (s.crmOpportunita) {
      const o = s.crmOpportunita;
      await c.query(
        `INSERT INTO opportunita (id, name, website, email, source, stage, created_at, updated_at)
         VALUES ($1,$2,$3,$4,'altro','DA_SENTIRE',now(),now())`,
        [uuid(), o.name, o.website, o.email],
      );
      opps++;
    }
    if (s.crmBniMembro) {
      const b = s.crmBniMembro;
      await c.query(
        `INSERT INTO bni_membri (id, name, website, email, status, bni_stage,
                                 client_score, partner_score, role_locked, is_customer,
                                 one_to_one_count, created_at, updated_at)
         VALUES ($1,$2,$3,$4,'ATTIVO','DA_AVVICINARE',0,0,false,false,0,now(),now())`,
        [uuid(), b.name, b.website, b.email],
      );
      bni++;
    }
  }
  await c.end();
  return { leads, opps, bni };
}

async function seedGads() {
  const c = new Client({ connectionString: GADS_URL });
  await c.connect();
  // Riproduce le sole colonne che servono all'importazione.
  await c.query(`
    CREATE TABLE IF NOT EXISTS google_ads_accounts (
      id uuid PRIMARY KEY,
      customer_id varchar(20) UNIQUE NOT NULL,
      customer_name varchar(255),
      is_active boolean NOT NULL DEFAULT true,
      business_type varchar(50),
      strategy_notes text,
      created_at timestamptz NOT NULL DEFAULT now()
    )`);
  await c.query('TRUNCATE google_ads_accounts');
  let n = 0;
  for (const s of SUBJECTS) {
    if (!s.gadsAccount) continue;
    await c.query(
      `INSERT INTO google_ads_accounts (id, customer_id, customer_name) VALUES ($1,$2,$3)`,
      [uuid(), s.gadsAccount.customerId, s.gadsAccount.customerName],
    );
    n++;
  }
  await c.end();
  return { accounts: n };
}

async function seedSqliteFixtures() {
  const { DatabaseSync } = await import('node:sqlite');
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });

  const seoiPath = path.join(FIXTURE_DIR, 'seoi.dev.db');
  fs.rmSync(seoiPath, { force: true });
  const seoi = new DatabaseSync(seoiPath);
  seoi.exec(`CREATE TABLE clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, domain TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1, is_prospect INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')))`);
  let seoiN = 0;
  for (const s of SUBJECTS) {
    if (!s.seoiClient) continue;
    seoi.prepare('INSERT INTO clients (name, domain) VALUES (?, ?)')
        .run(s.seoiClient.name, s.seoiClient.domain);
    seoiN++;
  }
  seoi.close();

  const hubPath = path.join(FIXTURE_DIR, 'hub.dev.db');
  fs.rmSync(hubPath, { force: true });
  const hub = new DatabaseSync(hubPath);
  hub.exec(`CREATE TABLE projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL,
      wp_url TEXT, client_name TEXT, client_email TEXT, agency_id INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  let hubN = 0;
  for (const s of SUBJECTS) {
    if (!s.hubProject) continue;
    const p = s.hubProject;
    hub.prepare('INSERT INTO projects (name, slug, wp_url, client_name) VALUES (?,?,?,?)')
       .run(p.name, p.slug, p.wpUrl, p.name);
    hubN++;
  }
  hub.close();

  return { seoiClients: seoiN, hubProjects: hubN, seoiPath, hubPath };
}

const main = async () => {
  guard();
  const crm = await seedCrm();
  const gads = await seedGads();
  const sq = await seedSqliteFixtures();
  console.log('Ambiente di sviluppo popolato con dati FINTI:');
  console.log(`  CRM  leads .............. ${crm.leads}`);
  console.log(`  CRM  opportunita ........ ${crm.opps}`);
  console.log(`  CRM  bni_membri ......... ${crm.bni}`);
  console.log(`  GADS google_ads_accounts  ${gads.accounts}`);
  console.log(`  SEOI clients ............ ${sq.seoiClients}`);
  console.log(`  HUB  projects ........... ${sq.hubProjects}`);
  console.log(`  TOTALE righe di origine . ${crm.leads + crm.opps + crm.bni + gads.accounts + sq.seoiClients + sq.hubProjects}`);
};

main().catch((e) => { console.error('SEED FALLITO:', e.message); process.exit(1); });
