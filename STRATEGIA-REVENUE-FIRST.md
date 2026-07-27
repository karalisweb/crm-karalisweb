# 🎯 STRATEGIA — CRM Revenue-First (la svolta)

> **Deciso da Alessio (2026-07-27):** il cold outreach non sta portando fatturato.
> I soldi arrivano da due canali che il CRM oggi **non** gestisce come motori primari:
> **passaparola BNI** e **riattivazione ex-clienti**.
> Questo documento è il piano per spostare il baricentro del CRM su questi due motori.
>
> Companion di `ROADMAP.md` (che resta valido per sicurezza/deploy, ma la Fase 2 "WOW"
> e la Fase 3 "autonomia cold" vanno **congelate** finché i due motori revenue non sono in piedi).

---

## 1. La tesi

Per un'agenzia come Karalisweb il **cold outreach ha il ROI più basso di tutti i canali**:
converte poco, brucia reputazione del dominio, e richiede tantissima infrastruttura
(drip per temperatura, esclusione franchising, approvazioni, quote T1, video AI, WhatsApp
booking…) per spremere un tasso di risposta misero.

I due canali che portano davvero soldi sono **warm per natura**:

| Canale | Perché converte | Sforzo per euro |
|--------|-----------------|-----------------|
| **BNI / passaparola** | Il contatto arriva pre-venduto da un membro di cui si fida. Chiudi in 1–2 incontri. | Basso |
| **Riattivazione ex-clienti** | Ti conoscono, si fidano, hanno budget storico. Il restyling è la vendita più facile che esista, e generano referral a loro volta. | Bassissimo |

**Evidenza di una giornata tipo (27/07):** pranzo con ex-cliente che vuole riprendere,
telefonata a vecchio cliente con un problema, un contatto passato sabato. Tre eventi da
canale warm in pochi giorni → oggi **vivono nella testa e nel telefono di Alessio, non nel CRM.**

---

## 2. Diagnosi: dov'è l'energia del CRM oggi

- **Navigazione:** 20+ pagine, quasi tutte cold (`Hot/Warm/Cold Leads`, `Da Analizzare`,
  `Fare Video`, `Video Inviati/Visti`, `Approvazione`, `Registro Email`, `Follow-up` outreach…).
- **Schema:** `Lead` con temperatura, tier, canali outreach, tracking video. Il BNI è agganciato
  come sotto-caso (`bniOriginType`, `referredByMembroId`, `OneToOne`).
- **ROADMAP:** Fase 2 (6 WOW) e Fase 3 (autonomia end-to-end) sono **interamente al servizio del cold**
  (video AI per fare 50 video/giorno, WhatsApp che fissa call da solo sui prospect freddi…).
- **`Clienti`:** semplice lista dei lead con stato `CLIENTE`. **Nessun** concetto di cliente
  dormiente, ultimo contatto, opportunità di restyling, referral chiesto.
- **BNI:** traccia membri, 121 e referral *ricevuti*. **Non** traccia: visite/partecipazioni ai
  capitoli, referral *dati* (reciprocità), ROI per partner ("chi mi porta soldi").

**Conclusione:** il CRM è ottimizzato per il canale debole e cieco sui due canali forti.

---

## 3. Principio guida

> **Ogni euro di sviluppo va sul canale che porta euro.**
> Il cold non si butta (l'infrastruttura è fatta e paga costi marginali): si **retrocede a sottofondo**
> con cap basso, e si smette di investirci sviluppo nuovo. Lo sforzo si sposta sui due motori warm.

Riutilizzo intelligente: il **motore audit + talking points** — nato per il cold — è molto più
potente puntato sul **sito attuale di un ex-cliente**: genera da solo il pitch del restyling
("carica in 6s, Core Web Vitals rossi, blog fermo da 14 mesi"). Non buttiamo niente, lo ri-orientiamo.

---

## 4. MOTORE 1 — Riattivazione ex-clienti  ⭐ priorità massima

**Obiettivo:** trasformare la lista statica `Clienti` in una macchina che ogni settimana dice
ad Alessio *chi richiamare, perché, e con quale gancio*.

### Gap oggi
- `Clienti` = lista piatta di stato `CLIENTE`. Nessuna nozione di "dormiente".
- Non si sa da quanto tempo non si sente un cliente.
- Nessun collegamento tra cliente e opportunità di restyling.
- Nessuna traccia del "referral chiesto sì/no".

### Cosa costruire
1. **Dashboard "Clienti da riattivare"** — lista ex-clienti ordinata per *giorni dall'ultimo contatto*
   (riusa `Activity.createdAt` più recente per lead). Soglie: 🟢 <90gg · 🟡 90–180 · 🔴 >180.
2. **Audit-on-demand del cliente** — bottone "Analizza sito attuale" che lancia `runFullAudit` sul
   sito del cliente → genera i talking-point restyling **automaticamente**. (Riuso totale del motore audit.)
3. **Gancio restyling** — mostrare in cima al profilo cliente i 3 problemi più vendibili trovati
   dall'audit, pronti da dire al telefono.
4. **Task "richiama" + flag referral** — per ogni cliente: `next_followup_at` + un flag
   `referral_chiesto` (sì/no/quando) così nessuna richiesta di referral viene dimenticata.
5. **Segnale "cliente con problema"** — campo/nota rapida per marcare (come oggi: "vecchio cliente
   con un problema") e farlo risalire in cima alla lista di richiamo.

### Cosa riusare (zero-costo)
- Motore `audit/index.ts` + `talking-points.ts` (già scritti).
- `Activity` per ricostruire l'ultimo contatto.
- `Task` per i reminder di richiamo.

### Metriche
- N° ex-clienti riattivati / mese · € restyling venduti · referral ottenuti da ex-clienti.

---

## 5. MOTORE 2 — BNI / passaparola spinto

**Obiettivo:** rendere misurabile e sistematico ciò che oggi funziona ma è "a mano":
121, visite ai capitoli, referral dati e ricevuti, e capire **quali partner portano soldi**.

### Gap oggi (rispetto a ciò che già esiste: `BniMembro`, `OneToOne`, referral ricevuti)
- Nessuna traccia di **visite/partecipazioni ai capitoli** (l'attività che genera fiducia).
- Nessuna traccia dei **referral DATI** (la reciprocità BNI è la leva: dai per ricevere).
- Nessun **ROI per partner**: chi mi ha passato contatti → quanti sono diventati clienti → € generati.
- I 121 si registrano, ma manca il "prossimo 121 da fissare" come coda operativa.

### Cosa costruire
1. **ROI per membro/partner** — sulla scheda `BniMembro`: referral ricevuti → convertiti → € generati.
   Ordina i partner per valore così Alessio sa con chi coltivare i 121.
2. **Referral dati** — registrare anche i referral che *Alessio dà* (a chi, con che esito) per
   misurare e alimentare la reciprocità.
3. **Coda 121** — "membri senza 121 da >X settimane" → lista di chi ricontattare (riusa
   `BniMembro.lastOneToOneAt`, già indicizzato).
4. **Log partecipazioni capitolo** — visite/relatori/ospiti portati, come attività leggere.

### Cosa riusare
- `BniMembro`, `OneToOne`, relazione `BniReferral` (già in schema).
- `/rete-bni` come home del motore (esiste già la pagina).

### Metriche
- € generati per partner · tasso conversione referral BNI · n° 121/settimana · referral dati vs ricevuti.

---

## 6. MOTORE 0 — Inbox referral in arrivo  (piccolo, ponte, fallo subito)

**Problema:** "sabato mi hanno passato un contatto" oggi non ha un posto dove atterrare.

**Cosa costruire:** un punto d'ingresso rapido (mobile-first) per registrare un referral appena
arriva: *chi te l'ha passato (partner BNI o ex-cliente o altro), di cosa ha bisogno, stato, follow-up*.
Alimenta sia il Motore 1 (se viene da ex-cliente) sia il Motore 2 (se viene da BNI).
È il pezzo più piccolo e va costruito per primo perché **cattura il fatturato che oggi si perde**.

---

## 7. Il cold: cosa farne

- **Non spegnere:** l'infrastruttura è fatta, i costi marginali sono bassi, lasciala girare con cap basso.
- **Congelare lo sviluppo:** Fase 2 (WOW #1 video AI, #4 WhatsApp booking) e Fase 3 (autonomia cold)
  della ROADMAP restano **in pausa** finché i due motori warm non sono in piedi e misurati.
- **Eccezione utile:** WOW #5 (copilota pre-call) e l'audit sono trasversali → utili anche ai warm.

---

## 8. Sequenza consigliata

| # | Blocco | Perché in quest'ordine | Effort |
|---|--------|------------------------|--------|
| 1 | **Motore 0 — Inbox referral** | Ferma subito la perdita di contatti caldi. Piccolo. | ⚡ |
| 2 | **Motore 1 — Riattivazione ex-clienti** | ROI più alto e immediato; riusa l'audit. | 🔧 |
| 3 | **Motore 2 — BNI ROI + coda 121 + referral dati** | Rende sistematico il canale che già funziona. | 🔧 |
| 4 | Retrocessione cold (cap basso, congelare WOW) | Libera focus e budget. | ⚡ |
| 5 | Dashboard revenue-first (KPI dei due motori in home) | Misura ciò che conta davvero. | 🔧 |

## 9. Cosa NON fare

- ❌ Non buttare l'infrastruttura cold (costa poco tenerla, molto ricostruirla).
- ❌ Non partire dalle WOW (video AI / WhatsApp): amplificano il canale sbagliato.
- ❌ Non trasformare i due motori in nuovo cold mascherato: la forza è la **relazione**, non il volume.

---

## 📌 Stato

- **Creato:** 2026-07-27 · Autore: Alessio + Claude · App: v3.32.0
- **Decisione:** "prima il piano scritto" → questo documento. Implementazione da avviare motore per motore.
- **Prossimo passo proposto:** partire dal **Motore 0 (Inbox referral)** come primo blocco di codice.
