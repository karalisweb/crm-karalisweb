# 🚀 ROADMAP — KW Sales CRM

> **Visione:** trasformare il CRM in una macchina che lavora da sola — dal lead trovato
> fino al video inviato e alla call fissata, con l'umano coinvolto solo per vendere.
>
> Creato: 2026-06-14 · Base: audit pre-lancio (mobile, guida, changelog, sicurezza, wow)
> Versione app al momento dell'audit: **v3.16.0**

**Legenda priorità:** 🔴 bloccante · 🟠 alta · 🟡 media · 🟢 nice-to-have
**Effort:** ⚡ <½ giornata · 🔧 ½–2 giorni · 🏗️ 3+ giorni

---

## FASE 0 — SICUREZZA (bloccante: prima di andare sul mercato) 🔴

> Tutte le voci verificate leggendo il codice durante l'audit del 2026-06-14.

### Critiche (launch blocker)
- [ ] 🔴⚡ **Ruotare la password root del VPS** `185.192.97.108` (è committata in chiaro in `CLAUDE.md` → trattarla come compromessa). Passare a **SSH solo-chiave**, disabilitare login password, e **rimuovere il segreto dalla git history** (`git filter-repo` / BFG).
- [x] 🔴🔧 **C1 — Forzare il 2FA lato server.** ✅ FATTO: `authorize()` (`src/lib/auth.ts`) ora verifica l'OTP server-side (single-use) quando `twoFactorEnabled`; senza OTP valido niente sessione. Login page e verify-otp aggiornati di conseguenza.
- [x] 🔴🔧 **C2 — Chiudere `/api/internal/*` e i cron.** ✅ FATTO: `src/middleware.ts` ora richiede `Authorization: Bearer <CRON_SECRET>` fail-closed su tutti `/api/cron/` e `/api/internal/` (con confronto a tempo costante); `/api/health` reso pubblico per il deploy.
- [x] 🔴⚡ **C3 — Togliere i segreti dai log.** ✅ FATTO: rimossi i log in chiaro di OTP (`otp.ts`) e link di reset (`password-reset.ts`).
- [x] 🔴⚡ **C4 — Rimuovere il fallback JWT.** ✅ FATTO: `verify-otp` non emette più token (niente segreto di fallback); il codice è verificato direttamente al login.

### Alte
- [x] 🟠🔧 **SSRF — chiudere i buchi.** ✅ FATTO (in gran parte): `src/lib/url-validator.ts` ora ha `assertPublicUrl()` che **risolve il DNS** e verifica gli IP (anti DNS-rebinding di base), copre IPv6 privati e IPv4 decimale/hex/ottale. Agganciato in `runFullAudit` (`audit/index.ts`, incluso il redirect-hop) e in `leads/manual`. _Residuo:_ TOCTOU (IP-pinning del socket) e i sub-fetch in `seo-checker`/`blog-detector` (stesso host già validato) — nota in fondo.
- [ ] 🟠⚡ **Relay email autenticato.** `leads/[id]/send-email/route.ts` accetta un `to` arbitrario → forzare `to` = email del lead + rate-limit per utente. _(dietro auth; medio, non ancora fatto)_
- [x] 🟠⚡ **`GET /api/users`** ✅ FATTO: gateato ad ADMIN.
- [ ] 🟠⚡ **Decisione isolamento dati.** Oggi ogni utente vede/modifica TUTTI i lead. Se resta team unico, ok consapevole; se SaaS multi-cliente, scoping per owner/org su tutte le query.

### Medie
- [~] 🟡⚡ **CSP + HSTS** in `next.config.ts`. ✅ HSTS + Permissions-Policy aggiunti. ⏳ CSP rinviata (richiede test mirato: la login page usa stili inline) — da fare in un passaggio dedicato.
- [ ] 🟡⚡ **Rate-limit / lockout sul login** (oggi brute-force libero; OTP e reset invece sono già limitati).
- [x] 🟡⚡ **Confronto segreti timing-safe** su cron/internal. ✅ FATTO a livello middleware (`safeEqual` a tempo costante).
- [ ] 🟡⚡ **Unsubscribe firmato (HMAC)** — `api/public/unsubscribe` usa un token non firmato (IDOR).
- [ ] 🟡⚡ **CORS `video-view`** non riflettere `Origin` arbitrario con `Allow-Credentials`.
- [ ] 🟡 **Sign-off su next-auth@5 beta + Next 16** in produzione (pin versioni, monitorare advisory).

---

## FASE 1 — FIX RAPIDI: UX mobile + documentazione 🟠

- [x] 🟠⚡ **Navigazione mobile.** ✅ FATTO: nel `MobileHeader` un bottone 🔍 emette l'evento `open-command-palette` che apre la `CommandPalette` (ascoltata in `command-palette.tsx`) → tutte le ~20 pagine ora raggiungibili da telefono. Rimossi i controlli morti (campanella/Notifiche), voce "Profilo" collegata.
- [ ] 🟡⚡ **Tap target ≥44px** su `unified-lead-card.tsx` (verifica ads `h-6`, tier pills ~18px) e `contact-info-editor.tsx` (`h-6 w-6`).
- [ ] 🟡⚡ **Densità card lead** su mobile: i 5 campi della riga collassata a 2 colonne sotto `sm:` (`unified-lead-card.tsx:921`).
- [x] 🟠⚡ **Changelog — riparato + reso durevole.** ✅ Corruzione `nn`/`n` riparata nel `CHANGELOG.md` E corretto **alla radice il generatore in `deploy.sh`** (ora usa `awk` con a-capo reali, testato) → non si corromperà più ad ogni deploy.
- [ ] 🟡🔧 **Guida utente — sorgente unico.** Eliminare la doppia copia: tenere **una sola fonte** (in-app `/guida` come master, oppure `GUIDA_UTENTE.md` renderizzato) così non possono più divergere. Aggiungere le sezioni mancanti (workflow email automatico, Video Outreach, Ha Risposto, Calendar sync, 2FA/profilo), correggere accenti e incoerenze (soglie Warm 50 vs 60, URL demo vs prod), indicare **dove** sta la checklist di verifica.

---

## FASE 1.5 — DEPLOY SUPER-AUTOMATICO & A PROVA DI ERRORE 🟠

> Richiesta esplicita di Alessio: "automatizza bene il deploy, tutto super automatico e a prova di errore".
> Obiettivo: `git push` → produzione, con build/test/health-check e rollback automatici. Zero SSH manuale.

- [x] 🟠🔧 **Pipeline CI/CD** (GitHub Actions). ✅ FATTO: `.github/workflows/ci.yml` → install + prisma generate + lint + `npm run build` ad ogni push/PR su `main`. Se rosso, non si deploya.
- [x] 🟠🔧 **Deploy script a prova di errore**. ✅ FATTO in `deploy.sh`: `set -eo pipefail`, build locale di verifica già presente, **health-check reale su `/api/health` con retry** e **ROLLBACK automatico** al commit precedente (reset+build+restart) se il sito non risponde.
- [x] 🟠⚡ **Gate ENV obbligatorie**. ✅ FATTO: il deploy si ferma PRIMA del restart se mancano `DATABASE_URL`/`NEXTAUTH_SECRET`/`CRON_SECRET` nel `.env` del server (il vecchio sito resta online). _Opzionale futuro:_ gate anche a runtime via `instrumentation.ts`.
- [x] 🟡⚡ **Backup DB automatico pre-migrazione**. ✅ FATTO: `scripts/backup-db.sh` eseguito prima di `prisma db push --accept-data-loss`.
- [~] 🟡⚡ **Smoke test post-deploy**: coperto in parte dall'health-check `/api/health`. ⏳ Da aggiungere: notifica email/WA su degrado.
- [ ] 🟢⚡ **Healthcheck Docker** nel `docker-compose.yml` + restart policy (rilevante solo se passate al path Docker; oggi girate su PM2).

---

## FASE 2 — LE 6 FUNZIONI WOW 💥 *(progetto separato — DOPO aver sistemato tutto il resto)*

> ⚠️ Da NON iniziare finché Fasi 0, 1, 1.5 non sono chiuse. Quando si parte, queste 6 voci
> diventano un **progetto/todolist dedicato** (richiesta di Alessio).
> Ordinate per ROZ (impatto / sforzo). #1 e #2 sono i moltiplicatori principali.

- [ ] 🟠🏗️ **WOW #1 — Video AI auto-generati (avatar + voce).** Rimuove il collo di bottiglia (registrazione manuale Tella): script → video finito senza registrare. Integrazione HeyGen/Synthesia/D-ID + ElevenLabs (voice clone di Alessio). *Da 5 a 50 video/giorno.* ⚠️ costo esterno (vedi note).
- [ ] 🟠🔧 **WOW #2 — Alert "ti guarda ORA → chiama".** Push in tempo reale quando il prospect apre/finisce il video. Riusa il tracking esistente (`api/public/video-view`). Web Push (gratis) + bottone "Chiama ora". Basso sforzo, alta resa.
- [ ] 🟠🔧 **WOW #3 — Benchmark competitor locale.** Da Apify (categoria+città già disponibili) trovare 1-2 competitor e generare il confronto ("loro 320 recensioni + Google Ads, voi 45 e zero"). Alimenta anche lo script video. Angolo che converte di più sulle PMI locali.
- [ ] 🟡🏗️ **WOW #4 — WhatsApp nativo a 2 vie + booking AI.** WhatsApp Business API (Twilio/360dialog) + AI che gestisce le prime risposte e **fissa la call da sola** (Calendar già integrato). Le PMI italiane vivono su WhatsApp. ⚠️ costo per conversazione (vedi note).
- [ ] 🟡🔧 **WOW #5 — Copilota anti-obiezioni / briefing pre-call.** Prima della chiamata, "bigliettino" AI per *quel* lead: 3 ganci migliori + obiezioni probabili + risposte. Riusa l'enum obiezioni e l'audit già presenti. Extra costo LLM marginale.
- [ ] 🟡🔧 **WOW #6 — Landing con audit "live" interattivo.** All'apertura della landing, mini-audit animato del sito del prospect (gauge score + problemi specifici). Effetto-wow + prova di competenza. Solo compute.

---

## FASE 3 — "LAVORA DA SOLO": autonomia end-to-end 🟢

> L'obiettivo finale: un lead attraversa search → audit → script → **video (WOW #1)** →
> landing → invio → follow-up → **call fissata (WOW #4)** senza tocco umano.

- [ ] 🟡🔧 **Catena full-auto.** Collegare le WOW #1 e #4 alla pipeline esistente (cron + workflow engine) così che da `FARE_VIDEO` si arrivi a `VIDEO_INVIATO` e ai follow-up senza intervento.
- [ ] 🟡🔧 **Lista chiamate auto-prioritizzata** (predittivo da won/lost storici + segnale "sta guardando ora" di WOW #2).
- [ ] 🟢🔧 **Report giornaliero automatico al team** (riepilogo: lead nuovi, hot, video visti, da chiamare) via email/WhatsApp ogni mattina.
- [ ] 🟢⚡ **Monitoring & self-healing**: estendere `recover-stuck-jobs` con alert su fallimenti cron/circuit-breaker Apify.

---

## ⚠️ NOTE COSTI & DIPENDENZE

Il vincolo di progetto è **max €100/mese** (CLAUDE.md). Le WOW #1 e #4 da sole possono superarlo:
- **#1 Avatar video**: HeyGen/Synthesia a consumo o piani (~€20-100+/mese) + ElevenLabs (~€22-99/mese).
- **#4 WhatsApp API**: Meta addebita per conversazione (~€0.03-0.08 cad. in IT) + canone BSP.
- **#2, #3, #5, #6**: costi marginali (push gratis, Apify già pagato, LLM incrementale, compute).
> **Decisione da prendere:** alzare il budget operativo o partire da #2/#3/#5/#6 (a basso costo) e introdurre #1/#4 quando il ROI dei primi clienti lo giustifica.

---

## 📌 STATO

- **Totale voci:** 34 (15 sicurezza · 5 UX/docs · 6 deploy/robustezza · 6 WOW · 4 autonomia)
- **Piano deciso (2026-06-14):** prima "tutto il resto" → **Fase 0 → Fase 1 → Fase 1.5**; POI le **WOW come progetto separato**; infine Fase 3.
- **Branch:** `fix/pre-lancio-sicurezza-ux` · ogni modifica validata con `npm run build` ✅ (compila pulito).

### ✅ Completato (sessione 2026-06-14)
- **Sicurezza:** C1 2FA server-side · C2 lockdown cron/internal (+health pubblico) · C3 niente segreti nei log · C4 niente fallback secret · SSRF hardening (DNS + IPv6 + IP encoded) · `GET /api/users` solo ADMIN · HSTS/Permissions-Policy · confronto segreti timing-safe.
- **UX/docs:** navigazione mobile sbloccata (bottone 🔍 → command palette) · changelog riparato.

### ⏳ Da fare subito dopo (resto di "tutto il resto", prima delle WOW)
1. **Azione MANUALE Alessio:** ruotare password root VPS + SSH key-only + scrub git history (è in `CLAUDE.md`).
2. **ENV gate** all'avvio (`NEXTAUTH_SECRET`, `CRON_SECRET` obbligatori) — collegato a Fase 1.5.
3. Fase 1: tap-target ≥44px, densità card mobile, **guida a sorgente unico** + sezioni mancanti, script changelog durevole.
4. Fase 1.5: **deploy automatico a prova di errore** (CI/CD + health-check + rollback).
5. Sicurezza minori: relay `send-email`, lockout login, CSP testata, unsubscribe HMAC, CORS video-view, decisione isolamento dati.
