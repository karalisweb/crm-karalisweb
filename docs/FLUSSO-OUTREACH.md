# Flusso Outreach — fonte di verità

> Questo documento descrive **l'unico** flusso di acquisizione attivo e gli orari reali
> dei cron. Se trovi altra documentazione che descrive un "workflow a step (Step 1/2/3)"
> o un secondo motore email, è **obsoleta**: quel motore (`workflow-engine`) è stato
> rimosso perché in produzione non ha mai eseguito nulla.

## Il flusso, dall'inizio alla vendita

1. **Scraping** (`scheduled-searches`) → nuovi lead da Google Maps.
2. **Analisi AI** (`batch-gemini-analysis`) → ogni lead viene classificato `HOT_LEAD` / `WARM_LEAD` / `COLD_LEAD` / `NON_TARGET`.
3. **Mail di primo contatto opt-in** (`opt-in-mailer`, **unico motore email**):
   - Gira ogni ora nei giorni feriali, con un tetto giornaliero (`emailDailyCap`).
   - Ogni mail è scritta dall'AI con un gancio reale; l'**oggetto ruota** a ogni invio (lista `optInSubjects`).
   - Mira ai lead `HOT_LEAD`/`WARM_LEAD` con email, non ancora contattati.
4. **Follow-up automatico**: se dopo N giorni il lead non ha risposto, l'`opt-in-mailer`
   manda un secondo messaggio gentile (campo `optInFollowupAt`). Tutto è tracciato in
   **Registro Email** (`/registro-email`).
5. **Interesse manifestato** → si entra nel flusso video:
   - **Fare Video** → analisi + script generati dall'AI → si registra il video → si crea la **landing**.
   - **Segna video come inviato** (`start-video-followup`) → il lead passa a `VIDEO_INVIATO`,
     si attiva il tracking visualizzazioni. L'invio del link è **manuale** (WhatsApp/email).
   - **Video Inviati / Video Visti** → tracking in tempo reale (aperture, % guardata, completamento).
6. **Promemoria follow-up video** (`check-video-followup`): se dopo `followUpDaysVideo`
   giorni il prospect non ha guardato il video, crea un task di promemoria.
7. **Ha Risposto → Call Fissate → In Trattativa → Clienti**: gestione commerciale manuale.

La configurazione del punto 3-4 sta in **Impostazioni → Invio Mail**.

## Cron reali (crontab VPS, app su :3003)

| Quando | Endpoint | Scopo |
|--------|----------|-------|
| `0 9-18 * * 1-5` | `/api/cron/opt-in-mailer` | **Mail opt-in + follow-up** (motore unico) |
| `0 * * * *` | `/api/cron/scheduled-searches` | Ricerche programmate |
| `30 1,8,13,17 * * *` | `/api/cron/batch-gemini-analysis` | Analisi AI a batch |
| `0 2 * * *` | `/api/cron/check-video-followup` | Promemoria se video non guardato |
| `5 2 * * *` | `/api/cron/recover-stuck-jobs` | Reset job bloccati >30min |
| `0 3 * * *` + `0 11,17 * * *` | `/api/cron/recover-emails` | Recupero invii email |
| `0 6 * * *` | `/api/cron/daily-report` | Report giornaliero via email |
| `0 8 * * *` | `/api/cron/check-recontact` | Riporta archiviati in pipeline |
| `*/30 8-19 * * *` | `/api/cron/sync-calendar` | Sync appuntamenti Google Calendar |

> ⚠️ **Non** esiste più un cron `workflow-engine`. Se lo trovi nel crontab, va rimosso
> (vedi nota deploy). Tutti gli endpoint cron richiedono `Authorization: Bearer <CRON_SECRET>`.
