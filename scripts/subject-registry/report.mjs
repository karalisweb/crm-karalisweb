/**
 * Verifica il registro contro le attese dichiarate nel dataset di sviluppo
 * e produce docs/inventory/sovrapposizioni.md.
 *
 * Sola lettura sul registro: non modifica nulla.
 */
import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TARGET = process.env.TARGET_URL;
const OUT = process.env.REPORT_OUT ||
  path.resolve(__dirname, '../../../../../docs/inventory/sovrapposizioni.md');
const DATASET_LABEL = process.env.DATASET_LABEL || 'ambiente di sviluppo (dati finti)';

const SOURCE_LABELS = {
  crm_lead: 'CRM — Lead',
  crm_opportunita: 'CRM — Opportunità',
  crm_bnimembro: 'CRM — Membri BNI',
  gads_account: 'GADS — Account',
  seoi_client: 'SEOI — Clienti',
  hub_project: 'HUB — Progetti',
};

const REASON_LABELS = {
  shared_email_domain: 'Dominio di posta aziendale in comune',
  domain_host_mismatch: 'Uno è sottodominio dell\'altro',
  same_normalized_name: 'Ragione sociale identica una volta normalizzata',
  similar_name: 'Ragione sociale molto simile',
  shared_distinctive_tokens: 'Parole distintive in comune nel nome',
  shared_hosting_domain: 'Stesso dominio di hosting (indizio debole)',
  shared_domain_distinct_places: 'Stesso sito ma schede Google distinte',
};

async function collect(c) {
  const q = (sql, p) => c.query(sql, p).then((r) => r.rows);

  const [{ n: identities }] = await q('SELECT count(*)::int n FROM subject_identities');
  const [{ n: subjects }] = await q('SELECT count(*)::int n FROM subjects');
  const [{ n: queued }] = await q(
    "SELECT count(*)::int n FROM reconciliation_candidates WHERE status='PENDING'");

  const bySource = await q(
    `SELECT source::text, count(*)::int n FROM subject_identities GROUP BY 1 ORDER BY 1`);

  const multi = await q(
    `SELECT s.id, s.display_name, s.google_place_id, s.primary_domain,
            count(i.id)::int n,
            string_agg(DISTINCT i.source::text, ', ' ORDER BY i.source::text) sources
       FROM subjects s JOIN subject_identities i ON i.subject_id = s.id
      GROUP BY s.id HAVING count(i.id) > 1
      ORDER BY count(i.id) DESC, s.display_name`);

  const spread = await q(
    `SELECT n, count(*)::int subjects FROM (
        SELECT s.id, count(i.id)::int n FROM subjects s
          JOIN subject_identities i ON i.subject_id = s.id GROUP BY s.id) t
      GROUP BY n ORDER BY n`);

  const crossApp = await q(
    `SELECT count(*)::int n FROM (
        SELECT s.id FROM subjects s JOIN subject_identities i ON i.subject_id = s.id
         GROUP BY s.id
        HAVING count(DISTINCT split_part(i.source::text, '_', 1)) > 1) t`);

  const doubts = await q(
    `SELECT rc.reason, rc.score, rc.evidence,
            l.display_name a, l.primary_domain ad,
            r.display_name b, r.primary_domain bd
       FROM reconciliation_candidates rc
       JOIN subjects l ON l.id = rc.left_subject_id
       JOIN subjects r ON r.id = rc.right_subject_id
      WHERE rc.status = 'PENDING'
      ORDER BY rc.score DESC, rc.reason, l.display_name
      LIMIT 20`);

  const byReason = await q(
    `SELECT reason, count(*)::int n FROM reconciliation_candidates
      WHERE status='PENDING' GROUP BY 1 ORDER BY 2 DESC, 1`);

  const noKeys = await q(
    `SELECT count(*)::int n FROM subjects
      WHERE google_place_id IS NULL AND primary_domain IS NULL`);

  // Domini che NON identificano un soggetto: portali, aggregatori, catene.
  // Sono i siti condivisi da piu soggetti con schede Google distinte.
  const portals = await q(
    `SELECT primary_domain, count(*)::int n
       FROM subjects
      WHERE primary_domain IS NOT NULL AND google_place_id IS NOT NULL
      GROUP BY 1 HAVING count(*) > 1
      ORDER BY 2 DESC LIMIT 15`);
  const [{ n: portalSubjects }] = await q(
    `SELECT coalesce(sum(n),0)::int n FROM (
       SELECT count(*)::int n FROM subjects
        WHERE primary_domain IS NOT NULL AND google_place_id IS NOT NULL
        GROUP BY primary_domain HAVING count(*) > 1) t`);

  return { identities, subjects, queued, bySource, multi, spread, crossApp: crossApp[0].n,
           doubts, byReason, noKeys: noKeys[0].n, portals, portalSubjects };
}

function render(d, stampISO) {
  const pct = (x, tot) => (tot ? ((x / tot) * 100).toFixed(1).replace('.', ',') : '0,0');
  const L = [];

  L.push('# Sovrapposizioni fra le anagrafiche');
  L.push('');
  L.push(`> Prodotto da \`scripts/subject-registry/report.mjs\` il ${stampISO}.`);
  L.push('> Rigenerabile in qualunque momento: il registro è ricostruibile per intero');
  L.push('> dall\'importazione, che non modifica nessuna anagrafica di origine.');
  L.push('>');
  L.push(`> **Insieme misurato:** ${DATASET_LABEL}.`);
  L.push('');
  L.push('## 1. Numeri');
  L.push('');
  L.push('| Misura | Valore |');
  L.push('|---|---:|');
  L.push(`| Identità totali importate | **${d.identities}** |`);
  L.push(`| Soggetti distinti | **${d.subjects}** |`);
  L.push(`| Sovrapposizioni certe (soggetti con più di un'identità) | **${d.multi.length}** |`);
  L.push(`| Identità assorbite dalle sovrapposizioni certe | ${d.identities - d.subjects} |`);
  L.push(`| Soggetti presenti in più di un'applicazione | ${d.crossApp} |`);
  L.push(`| Sovrapposizioni incerte, in coda di riconciliazione | **${d.queued}** |`);
  L.push(`| Soggetti senza alcuna chiave canonica | ${d.noKeys} (${pct(d.noKeys, d.subjects)} %) |`);
  L.push('');
  L.push(`Il tasso di duplicazione certa è del **${pct(d.identities - d.subjects, d.identities)} %**: ` +
         `su ${d.identities} identità, ${d.identities - d.subjects} sono risultate essere lo stesso ` +
         `soggetto di un'altra.`);
  L.push('');

  L.push('### Identità per anagrafica di origine');
  L.push('');
  L.push('| Anagrafica | Identità |');
  L.push('|---|---:|');
  for (const r of d.bySource) L.push(`| ${SOURCE_LABELS[r.source] || r.source} | ${r.n} |`);
  L.push('');

  L.push('### Distribuzione dei soggetti');
  L.push('');
  L.push('| Identità per soggetto | Soggetti |');
  L.push('|---:|---:|');
  for (const r of d.spread) L.push(`| ${r.n} | ${r.subjects} |`);
  L.push('');

  L.push('## 2. Sovrapposizioni certe');
  L.push('');
  L.push('Collegate automaticamente. Solo due regole uniscono: **stesso `google_place_id`**');
  L.push('e **stesso dominio normalizzato**. Nient\'altro.');
  L.push('');
  L.push('L\'ultima colonna è la chiave che identifica il soggetto risultante, non');
  L.push('necessariamente quella che ha prodotto l\'unione: un soggetto può avere');
  L.push('entrambe le chiavi ed essere stato unito per dominio.');
  L.push('');
  if (!d.multi.length) {
    L.push('_Nessuna._');
  } else {
    L.push('| Soggetto | Identità | Anagrafiche | Chiave del soggetto |');
    L.push('|---|---:|---|---|');
    for (const m of d.multi) {
      const key = m.google_place_id ? `place: \`${m.google_place_id}\``
                : m.primary_domain ? `dominio: \`${m.primary_domain}\`` : '—';
      const src = m.sources.split(', ').map((s) => SOURCE_LABELS[s] || s).join(' + ');
      L.push(`| ${m.display_name} | ${m.n} | ${src} | ${key} |`);
    }
  }
  L.push('');

  L.push('## 3. Sovrapposizioni incerte — coda di riconciliazione');
  L.push('');
  L.push('**Nessuna di queste è stata unita.** Il codice non decide: propone.');
  L.push('Vanno riviste a mano, come prescrive la sezione 3.2 del piano.');
  L.push('');
  if (d.byReason.length) {
    L.push('| Motivo | Casi |');
    L.push('|---|---:|');
    for (const r of d.byReason) L.push(`| ${REASON_LABELS[r.reason] || r.reason} | ${r.n} |`);
    L.push('');
  }
  L.push(`### I primi ${Math.min(20, d.doubts.length)} casi dubbi`);
  L.push('');
  if (!d.doubts.length) {
    L.push('_Nessuno._');
  } else {
    L.push('| # | Fiducia | Motivo | Soggetto A | Soggetto B |');
    L.push('|---:|---:|---|---|---|');
    d.doubts.forEach((r, i) => {
      const a = r.ad ? `${r.a} (\`${r.ad}\`)` : r.a;
      const b = r.bd ? `${r.b} (\`${r.bd}\`)` : r.b;
      L.push(`| ${i + 1} | ${String(r.score).replace('.', ',')} | ` +
             `${REASON_LABELS[r.reason] || r.reason} | ${a} | ${b} |`);
    });
    if (d.queued > d.doubts.length) {
      L.push('');
      L.push(`_Mostrati ${d.doubts.length} casi su ${d.queued}._`);
    }
  }
  L.push('');

  L.push('## 4. Domini che non identificano un soggetto');
  L.push('');
  L.push('Siti indicati da **piu soggetti diversi**, ciascuno con la propria scheda');
  L.push('Google. Non sono il sito *dell\'* azienda: sono il portale su cui l\'azienda');
  L.push('e pubblicata, oppure l\'insegna di una catena con piu sedi.');
  L.push('');
  L.push('**Non uniscono mai.** Due schede Google distinte sono due soggetti distinti,');
  L.push('qualunque sito condividano: il `google_place_id` e la chiave prioritaria');
  L.push('della sezione 3.2 e non puo essere scavalcato da una di rango inferiore.');
  L.push('');
  if (!d.portals.length) {
    L.push('_Nessuno._');
  } else {
    L.push(`In totale **${d.portalSubjects} soggetti** hanno come sito un dominio ` +
           'condiviso con almeno un altro soggetto.');
    L.push('');
    L.push('| Dominio | Soggetti che lo indicano |');
    L.push('|---|---:|');
    for (const p of d.portals) L.push(`| \`${p.primary_domain}\` | ${p.n} |`);
  }
  L.push('');
  L.push('> **Lettura commerciale.** Un soggetto il cui unico sito e un portale e un');
  L.push('> soggetto **senza sito proprio**. E un dato di qualificazione, non un difetto');
  L.push('> del registro.');
  L.push('');

  L.push('## 5. Cosa questi numeri non dicono');
  L.push('');
  L.push('- **Non descrivono la produzione.** Sono misurati sull\'insieme indicato in testa.');
  L.push('  I volumi reali richiedono accesso ai database di produzione, che il piano');
  L.push('  (criticità 3) chiede di verificare prima di scegliere fra soluzione primaria');
  L.push('  e di riserva.');
  L.push('- **La terza chiave di deduplicazione non esiste.** La sezione 3.2 prevede');
  L.push('  `google_place_id` → dominio → **partita IVA**. Nessuna delle sei anagrafiche');
  L.push('  raccoglie la partita IVA: il terzo livello non è applicabile oggi.');
  L.push('  Vedi `docs/decisions/OPEN-02.md`.');
  L.push('- **GADS non è collegabile automaticamente.** `google_ads_accounts` non ha né');
  L.push('  `place_id` né dominio: i suoi account possono solo finire in coda per');
  L.push('  somiglianza di ragione sociale. Vedi `docs/inventory/gads.md`, rilievo S-05.');
  L.push('- **La coda non è un elenco di errori.** È l\'elenco di ciò che il codice');
  L.push('  ha deliberatamente rifiutato di decidere.');
  L.push('');
  return L.join('\n') + '\n';
}

const main = async () => {
  if (!TARGET) throw new Error('TARGET_URL non impostata');
  const c = new Client({ connectionString: TARGET });
  await c.connect();
  const d = await collect(c);
  await c.end();

  const stamp = process.env.REPORT_STAMP || new Date().toISOString().slice(0, 10);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, render(d, stamp));
  console.log(`Rapporto scritto in ${OUT}`);
  console.log(`  identità ${d.identities} | soggetti ${d.subjects} | ` +
              `certe ${d.multi.length} | incerte ${d.queued}`);
};

main().catch((e) => { console.error('REPORT FALLITO:', e.message); process.exit(1); });
