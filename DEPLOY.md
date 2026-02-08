# KW Sales CRM - Guida Deploy

Versione attuale: **2.0.0**

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
# Bug fix (2.0.0 > 2.0.1)
./deploy.sh --bump patch "fix calcolo opportunity score"

# Nuova funzionalita (2.0.0 > 2.1.0)
./deploy.sh --bump minor "aggiunto audit email marketing"

# Breaking change (2.0.0 > 3.0.0)
./deploy.sh --bump major "redesign pipeline completo"
```

Il flag `--bump` aggiorna automaticamente la versione in:
- `package.json`
- `deploy.sh` (header + variabile APP_VERSION)
- `DEPLOY.md` (questo file)

---

## Cosa fa deploy.sh (6 step)

| Step | Azione | Dettaglio |
|------|--------|-----------|
| 0 | **Versioning** (opzionale) | Se `--bump`, aggiorna versione in tutti i file |
| 1 | **Verifica Git** | Controlla modifiche locali |
| 2 | **Commit** | `git add .` + `git commit -m "messaggio"` |
| 3 | **Push** | `git push origin main` |
| 4 | **Pull + Install** | Sul VPS: `git pull` + `npm install` |
| 5 | **Build** | Sul VPS: `npm run build` (Next.js) |
| 6 | **Restart** | `pm2 restart sales-crm --update-env` |

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

### Verifica Nginx

```bash
ssh root@185.192.97.108 'nginx -t && systemctl reload nginx'
```

---

## Regole per deploy.sh

Lo script `deploy.sh` deve sempre contenere nella sezione CONFIGURAZIONE:

```bash
APP_NAME="KW Sales CRM"            # Nome app
APP_VERSION="X.Y.Z"                # Versione corrente (semantic versioning)
VPS_HOST="root@185.192.97.108"     # Accesso VPS
VPS_PATH="/opt/sales-app"          # Path sul server
BRANCH="main"                      # Branch Git
PM2_PROCESS="sales-crm"            # Nome processo PM2
LOCAL_PORT=3003                     # Porta in sviluppo locale
SERVER_PORT=3003                    # Porta sul server
PUBLIC_URL="https://crm.karalisdemo.it"  # URL pubblico
NGINX_CONFIG="/etc/nginx/sites-available/crm.karalisdemo.it"  # Config Nginx
```

L'header ASCII dello script deve riportare tutte queste informazioni come riferimento rapido.

---

## Versioning

Formato: **Semantic Versioning** `vMAJOR.MINOR.PATCH`

- **MAJOR**: breaking changes, redesign completo
- **MINOR**: nuove funzionalita
- **PATCH**: bug fix, correzioni minori

La versione va tenuta sincronizzata in:

| File | Campo | Esempio |
|------|-------|---------|
| `package.json` | `"version"` | `"2.0.0"` |
| `deploy.sh` | `APP_VERSION` + header | `APP_VERSION="2.0.0"` |
| `DEPLOY.md` | Intestazione | `Versione attuale: **2.0.0**` |
| **Sidebar UI** | Sotto il nome app | `v2.0.0` |

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

1. **Build obbligatoria**: Sales CRM usa Next.js, quindi dopo ogni pull serve `npm run build` prima di riavviare PM2. Lo script lo fa automaticamente (step 5).

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

6. **Inngest**: I job asincroni (audit, ricerche) sono gestiti da Inngest. Verificare che l'endpoint Inngest sia configurato correttamente in produzione.

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

### Seed dati iniziali
```bash
ssh root@185.192.97.108 'cd /opt/sales-app && npx tsx prisma/seed.ts'
```

---

## Setup Iniziale (solo prima volta)

Per il primo deploy su un nuovo server, usare `server-setup.sh`:

```bash
ssh root@185.192.97.108 'bash -s' < server-setup.sh
```

Questo script esegue: clone repo, npm install, build, configurazione Nginx, certificato SSL, avvio PM2.

---

*Ultimo aggiornamento: 2026-02-08*
