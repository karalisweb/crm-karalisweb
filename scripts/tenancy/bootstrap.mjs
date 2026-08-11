/**
 * Avvio della tenancy — idempotente, eseguibile più volte senza danno.
 *
 * Crea la catena Organization → Company → Project per Karalisweb, la licenza,
 * assegna a ogni utente esistente una Membership, e attribuisce i soggetti
 * già nel registro all'azienda.
 *
 * Non cancella nulla e non modifica alcun dato preesistente: aggiunge righe
 * nelle tabelle nuove e riempie `subjects.company_id` dove è ancora vuoto.
 */
import pg from 'pg';

const { Client } = pg;
const URL = process.env.TARGET_URL || process.env.DATABASE_URL;
if (!URL) { console.error('TARGET_URL o DATABASE_URL non impostata'); process.exit(1); }

const ORG_SLUG = process.env.ORG_SLUG || 'karalisweb';
const ORG_NAME = process.env.ORG_NAME || 'Karalisweb';
const COMPANY_SLUG = process.env.COMPANY_SLUG || 'karalisweb';
const COMPANY_NAME = process.env.COMPANY_NAME || 'Karalisweb';
const PROJECT_SLUG = process.env.PROJECT_SLUG || 'acquisizione';
const PROJECT_NAME = process.env.PROJECT_NAME || 'Acquisizione clienti';

const uuid = () => crypto.randomUUID();

const main = async () => {
  const c = new Client({ connectionString: URL });
  await c.connect();
  await c.query('BEGIN');
  try {
    // 1. Organizzazione
    let r = await c.query('SELECT id FROM organizations WHERE slug=$1', [ORG_SLUG]);
    const orgId = r.rowCount ? r.rows[0].id : uuid();
    if (!r.rowCount) {
      await c.query(
        `INSERT INTO organizations (id,name,slug,created_at,updated_at)
         VALUES ($1,$2,$3,now(),now())`, [orgId, ORG_NAME, ORG_SLUG]);
    }

    // 2. Azienda
    r = await c.query('SELECT id FROM companies WHERE slug=$1', [COMPANY_SLUG]);
    const companyId = r.rowCount ? r.rows[0].id : uuid();
    if (!r.rowCount) {
      await c.query(
        `INSERT INTO companies (id,organization_id,name,slug,status,created_at,updated_at)
         VALUES ($1,$2,$3,$4,'ACTIVE',now(),now())`,
        [companyId, orgId, COMPANY_NAME, COMPANY_SLUG]);
    }

    // 3. Licenza — i limiti della sezione 3.1: due Progetti, tre utenti.
    r = await c.query('SELECT id FROM licences WHERE company_id=$1', [companyId]);
    if (!r.rowCount) {
      await c.query(
        `INSERT INTO licences (id,company_id,plan,status,max_projects,max_users,
                               starts_at,created_at,updated_at)
         VALUES ($1,$2,'internal','ACTIVE',2,3,now(),now(),now())`,
        [uuid(), companyId]);
    }

    // 4. Progetto
    r = await c.query('SELECT id FROM projects_core WHERE company_id=$1 AND slug=$2',
                      [companyId, PROJECT_SLUG]);
    const projectId = r.rowCount ? r.rows[0].id : uuid();
    if (!r.rowCount) {
      await c.query(
        `INSERT INTO projects_core (id,company_id,name,slug,status,created_at,updated_at)
         VALUES ($1,$2,$3,$4,'ACTIVE',now(),now())`,
        [projectId, companyId, PROJECT_NAME, PROJECT_SLUG]);
    }

    // 5. Membership. Gli ADMIN esistenti diventano PLATFORM_ADMIN, gli altri
    //    COMPANY_MEMBER sull'azienda. Nessun utente resta senza ambito.
    const users = await c.query('SELECT id, email, role FROM users ORDER BY created_at');
    let nuoveMembership = 0;
    for (const u of users.rows) {
      const platform = u.role === 'ADMIN';
      const role = platform ? 'PLATFORM_ADMIN' : 'COMPANY_MEMBER';
      const scopeType = platform ? 'GLOBAL' : 'COMPANY';
      const scopeId = platform ? null : companyId;
      const esiste = await c.query(
        `SELECT 1 FROM memberships
          WHERE user_id=$1 AND role=$2::"MembershipRole"
            AND scope_type=$3::"ScopeType"
            AND scope_id IS NOT DISTINCT FROM $4`,
        [u.id, role, scopeType, scopeId]);
      if (!esiste.rowCount) {
        await c.query(
          `INSERT INTO memberships (id,user_id,role,scope_type,scope_id,created_at,created_by)
           VALUES ($1,$2,$3::"MembershipRole",$4::"ScopeType",$5,now(),'bootstrap')`,
          [uuid(), u.id, role, scopeType, scopeId]);
        nuoveMembership++;
      }
    }

    // 6. I soggetti già nel registro appartengono a questa azienda.
    const upd = await c.query(
      'UPDATE subjects SET company_id=$1 WHERE company_id IS NULL', [companyId]);

    await c.query('COMMIT');

    const tot = await c.query(`SELECT
        (SELECT count(*)::int FROM organizations) org,
        (SELECT count(*)::int FROM companies) comp,
        (SELECT count(*)::int FROM projects_core) proj,
        (SELECT count(*)::int FROM licences) lic,
        (SELECT count(*)::int FROM memberships) mem,
        (SELECT count(*)::int FROM subjects WHERE company_id IS NOT NULL) subj,
        (SELECT count(*)::int FROM subjects WHERE company_id IS NULL) orfani`);
    const t = tot.rows[0];
    console.log('Tenancy avviata:');
    console.log(`  organizzazioni ....... ${t.org}`);
    console.log(`  aziende .............. ${t.comp}`);
    console.log(`  progetti ............. ${t.proj}`);
    console.log(`  licenze .............. ${t.lic}`);
    console.log(`  membership ........... ${t.mem} (${nuoveMembership} nuove)`);
    console.log(`  soggetti attribuiti .. ${t.subj} (${upd.rowCount} in questa esecuzione)`);
    console.log(`  soggetti senza azienda ${t.orfani}`);
    await c.end();
  } catch (e) {
    await c.query('ROLLBACK');
    await c.end();
    throw e;
  }
};

main().catch((e) => { console.error('BOOTSTRAP FALLITO:', e.message); process.exit(1); });
