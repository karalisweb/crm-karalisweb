# KW Sales CRM - Guida Deploy

Versione attuale: **3.1.1**

---

## Informazioni Server

| Parametro | Valore |
|-----------|--------|
| **Host** | vmi2996361.contaboserver.net |
| **IP** | 185.192.97.108 |
| **User** | root |
| **Path applicazione** | `/opt/sales-app` |
| **PM2 process name** | `sales-crm` |
| **Porta locale** | 3003 |
| **Porta server** | 3003 |
| **URL pubblico** | https://crm.karalisdemo.it |
| **Nginx config** | `/etc/nginx/sites-available/crm.karalisdemo.it` |
| **GitHub repo** | github.com/karalisweb/crm-karalisweb |
| **Branch** | main |
| **Database** | PostgreSQL (locale o docker) |
| **ORM** | Prisma 7.2 |
| **Framework** | Next.js 16 (App Router) |

---

## Deploy con Script

### Deploy standard (commit + push + build + restart)

```bash
./deploy.sh "descrizione delle modifiche"
```

### Deploy con aggiornamento versione

```bash
# Bug fix (3.1.0 > 3.1.1)
./deploy.sh --bump patch "fix calcolo opportunity score"

# Nuova funzionalita (3.1.0 > 3.2.0)
./deploy.sh --bump minor "aggiunto audit email marketing"

# Breaking change (3.1.0 > 4.0.0)
./deploy.sh --bump major "redesign pipeline completo"
```

### Deploy senza bump versione

```bash
./deploy.sh --no-bump "hotfix veloce"
```

### Deploy non-interattivo (per automazione/Claude Code)

```bash
./deploy.sh --ci "messaggio commit"
./deploy.sh --ci --bump minor "messaggio"
```

Il flag `--bump` aggiorna automaticamente la versione in:
- `package.json`
- `DEPLOY.md` (questo file)
- `sidebar.tsx` (versione in UI)
- `settings/page.tsx` (versione in UI)
- `README.md` (versione in header)
- `TECHNICAL-DOCS.md` (versione in header)
- `CHANGELOG.md` (auto-entry)
- `GUIDA_UTENTE.md` (versione + data)

---

## Cosa fa deploy.sh (9 step)

| Step | Azione | Dettaglio |
|------|--------|-----------|
| 0 | **Versioning** (opzionale) | Se `--bump`, aggiorna versione in tutti i file |
| 1 | **Verifica CHANGELOG** | Controlla che CHANGELOG contenga la versione corrente |
| 2 | **Verifica Git** | Controlla modifiche locali |
| 3 | **Build locale** | Type-check + build di verifica |
| 4 | **Commit** | `git add .` + `git commit -m "messaggio"` |
| 5 | **Push** | `git push origin main` |
| 6 | **Pull VPS** | Con git stash automatico |
| 7 | **Dipendenze** | npm install (solo se package.json cambiato) + Prisma generate + db push |
| 8 | **Build server** | `npm run build` sul VPS |
| 9 | **Restart** | `pm2 restart sales-crm` + health check su /login |

---

## Comandi Manuali

### Deploy manuale (senza script)

```bash
# 1. Push locale
git add . && git commit -m "messaggio" && git push origin main

# 2. Sul server
ssh root@185.192.97.108
cd /opt/sales-app
git pull origin main
npm install
npm run build
pm2 restart sales-crm --update-env
```

### Solo Restart

```bash
ssh root@185.192.97.108 'pm2 restart sales-crm'
```

### Verifica Logs

```bash
ssh root@185.192.97.108 'pm2 logs sales-crm --lines 20 --nostream'
```

### Verifica Status

```bash
ssh root@185.192.97.108 'pm2 show sales-crm'
```

### Health Check

```bash
ssh root@185.192.97.108 'curl -s http://localhost:3003/api/health'
# Ritorna {"status":"ok"} se tutto funziona
```

### Verifica Nginx

```bash
ssh root@185.192.97.108 'nginx -t && systemctl reload nginx'
```

---

## Regole per deploy.sh

Lo script `deploy.sh` legge la versione dinamicamente da `package.json` e contiene nella sezione CONFIGURAZIONE:

```bash
APP_NAME="KW Sales CRM"            # Nome app
VPS_HOST="root@185.192.97.108"     # Accesso VPS
VPS_PATH="/opt/sales-app"          # Path sul server
BRANCH="main"                      # Branch Git
PM2_PROCESS="sales-crm"            # Nome processo PM2
LOCAL_PORT=3003                     # Porta in sviluppo locale
SERVER_PORT=3003                    # Porta sul server
PUBLIC_URL="https://crm.karalisdemo.it"  # URL pubblico
```

---

## Versioning

Formato: **Semantic Versioning** `vMAJOR.MINOR.PATCH`

- **MAJOR**: breaking changes, redesign completo
- **MINOR**: nuove funzionalita
- **PATCH**: bug fix, correzioni minori

La versione va tenuta sincronizzata in:

| File | Campo |
|------|-------|
| `package.json` | `"version"` |
| `DEPLOY.md` | Intestazione |
| `README.md` | Intestazione |
| `TECHNICAL-DOCS.md` | Intestazione |
| `GUIDA_UTENTE.md` | Intestazione + footer |
| `CHANGELOG.md` | Entry per versione |
| **Sidebar UI** | Sotto il nome app |
| **Settings page** | Box versione |

Per aggiornare tutto in automatico usare `--bump`:
```bash
./deploy.sh --bump patch "fix bug"
```

---

## File esclusi dal deploy

| File/Cartella | Motivo |
|---------------|--------|
| `.env` | Configurazioni ambiente |
| `.env.production` | Configurazioni produzione |
| `node_modules/` | Installate sul server con `npm install` |
| `.next/` | Rigenerata con `npm run build` |

---

## Note Importanti

1. **Build obbligatoria**: Sales CRM usa Next.js, quindi dopo ogni pull serve `npm run build` prima di riavviare PM2. Lo script lo fa automaticamente (step 8).

2. **Database PostgreSQL**: Il database di produzione e separato. Le migrazioni vanno eseguite manualmente se lo schema cambia:
   ```bash
   ssh root@185.192.97.108 'cd /opt/sales-app && npx prisma migrate deploy'
   ```

3. **Prisma Client**: Dopo `npm install`, Prisma genera automaticamente il client. Se necessario:
   ```bash
   ssh root@185.192.97.108 'cd /opt/sales-app && npx prisma generate'
   ```

4. **Rate Limiting SSH**: Il server ha un rate limiter sulle connessioni SSH. Se ricevi errori "Connection closed", aspetta 30-60 secondi prima di riprovare.

5. **PM2 fallback**: Se il processo non esiste ancora, lo script lo crea automaticamente con `pm2 start npm --name 'sales-crm' -- start`.

6. **Endpoint protetti**: Gli endpoint `/api/internal/*` e `/api/cron/*` richiedono `CRON_SECRET`. Configurare nel `.env` del server.

7. **Backup DB**: Usare `./scripts/backup-db.sh` per backup con rotazione (ultimi 30 backup).

---

## Troubleshooting

### L'app non si avvia
```bash
ssh root@185.192.97.108 'pm2 logs sales-crm --lines 50 --nostream'
```

### Errore durante la build
```bash
ssh root@185.192.97.108 'cd /opt/sales-app && npm run build 2>&1 | tail -30'
```

### Verifica file deployati
```bash
ssh root@185.192.97.108 'ls -la /opt/sales-app/src/app/'
```

### Reinstalla dipendenze da zero
```bash
ssh root@185.192.97.108 'cd /opt/sales-app && rm -rf node_modules && npm install && npm run build && pm2 restart sales-crm'
```

### Verifica porta in uso
```bash
ssh root@185.192.97.108 'lsof -i :3003'
```

### Riavvia Nginx (se problemi di routing)
```bash
ssh root@185.192.97.108 'nginx -t && systemctl reload nginx'
```

### Esegui migrazioni database
```bash
ssh root@185.192.97.108 'cd /opt/sales-app && npx prisma migrate deploy'
```

### Recovery job bloccati
```bash
curl -X POST https://crm.karalisdemo.it/api/cron/recover-stuck-jobs \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## Setup Iniziale (solo prima volta)

Per il primo deploy su un nuovo server, usare `server-setup.sh`:

```bash
ssh root@185.192.97.108 'bash -s' < server-setup.sh
```

Questo script esegue: clone repo, npm install, build, configurazione Nginx, certificato SSL, avvio PM2.

---

*Ultimo aggiornamento: 2026-03-15*
