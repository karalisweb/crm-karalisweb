# 🔐 Rotazione segreti — Runbook pre-lancio

> Questo documento elenca i segreti da **ruotare** prima di andare sul mercato e
> come metterli in sicurezza. Sono **azioni da eseguire a mano** (sul server e su
> GitHub): non vengono fatte automaticamente dal codice.
>
> **Perché:** alcuni segreti sono stati storicamente scritti in chiaro nei file di
> progetto (es. la password root del VPS in `CLAUDE.md`). Anche se quei file ora
> sono stati ripuliti, i valori che ci sono passati vanno considerati **compromessi**.

---

## 1. Password root del VPS → passare a chiave SSH

La password root del server (`185.192.97.108`) era in chiaro: va cambiata **e**,
meglio ancora, sostituita con una **chiave SSH** (più sicura di qualsiasi password).

**A) Genera una chiave SSH sul tuo Mac (se non ne hai già una):**
```bash
ssh-keygen -t ed25519 -C "karalisweb-deploy"
# Premi invio per il percorso di default (~/.ssh/id_ed25519)
# Imposta una passphrase quando richiesto
```

**B) Copia la chiave pubblica sul server (ti chiederà la password attuale, l'ultima volta):**
```bash
ssh-copy-id root@185.192.97.108
```

**C) Cambia comunque la password root (così la vecchia non vale più):**
```bash
ssh root@185.192.97.108
passwd            # imposta una nuova password forte e salvala nel password manager
```

**D) (Consigliato) Disabilita il login con password, lascia solo la chiave:**
```bash
# Sul server, in /etc/ssh/sshd_config imposta:
#   PasswordAuthentication no
#   PermitRootLogin prohibit-password
systemctl restart ssh
```
> Verifica di riuscire ad entrare con la chiave **prima** di disabilitare la password,
> per non restare chiuso fuori.

---

## 2. Token GitHub

Se è mai stato usato/incollato un Personal Access Token GitHub in chiaro, **revocalo e rigeneralo**:

1. Vai su GitHub → **Settings → Developer settings → Personal access tokens**.
2. **Revoca** il token vecchio.
3. Genera un nuovo token con i **permessi minimi** necessari (di norma: solo `repo`).
4. Salvalo nel password manager. Non incollarlo mai in file di progetto o chat.

---

## 3. Segreti applicativi (`.env` di produzione)

Sul server, in `/opt/sales-app/.env`, assicurati che siano **valori forti e unici**
(rigenerali se sospetti siano stati esposti):

| Variabile | Cosa è | Come generarne uno nuovo |
|-----------|--------|--------------------------|
| `NEXTAUTH_SECRET` | firma le sessioni di login | `openssl rand -base64 32` |
| `CRON_SECRET` | protegge gli endpoint cron/internal | `openssl rand -base64 32` |
| `DB_PASSWORD` | password PostgreSQL | password forte dal password manager |
| `DATABASE_URL` | connessione DB (contiene la password) | aggiorna se cambi `DB_PASSWORD` |

> Dopo aver modificato il `.env`, riavvia l'app (`./deploy.sh` o `pm2 restart sales-crm`).
> Cambiare `NEXTAUTH_SECRET` **disconnette tutti gli utenti** (dovranno rifare il login): normale.

---

## 4. Database PostgreSQL

In `docker-compose.yml` la password DB usa un default debole (`postgres`) se la
variabile non è impostata. In produzione imposta **sempre** un valore forte:
```bash
# nel .env del server:
DB_PASSWORD=<password-forte-dal-password-manager>
```

---

## 5. Credenziale admin di bootstrap

Lo script di seed crea l'utente `admin@agenzia.it` con una password di test (`admin123`).
**Non** usarla in produzione: dopo il primo accesso, cambia la password dal **Profilo**,
oppure crea un nuovo utente admin con una password forte ed elimina quello di test.

---

## ✅ Checklist finale

- [ ] Password root VPS cambiata + chiave SSH attiva
- [ ] (Consigliato) `PasswordAuthentication no` sul server
- [ ] Token GitHub revocato e rigenerato
- [ ] `NEXTAUTH_SECRET` e `CRON_SECRET` forti e non esposti
- [ ] `DB_PASSWORD` forte impostata nel `.env`
- [ ] Password dell'utente admin cambiata (non `admin123`)
- [ ] Nessun segreto in chiaro nei file di progetto (verificato)
