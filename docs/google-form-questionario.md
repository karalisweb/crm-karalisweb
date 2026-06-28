# Self-assessment (Google Form) + collegamento al CRM

Il questionario è un **self-assessment a 10 domande**: ogni risposta vale dei punti.
Il totale smista il lead nel CRM:

| Fascia | Punteggio | Dove finisce nel CRM |
|--------|-----------|----------------------|
| **ALTA** | 24–30 | `CALDO_REATTIVO`, priorità 1 → video subito |
| **MEDIA** | 17–23 | `CALDO_REATTIVO`, priorità 2 → video, dopo gli alti |
| **BASSA** | 10–16 | `NURTURING` → niente video ora, tocchi lenti |

(Le soglie 24/17 sono in `src/app/api/public/questionnaire/route.ts`, facilmente modificabili.)

---

## Passo 1 — crea il Form come QUIZ
Nel Google Form: **Impostazioni → Quiz → "Rendi un quiz" ON**. Così a ogni risposta puoi
assegnare i punti. Attiva anche **"Raccogli indirizzi email"** (serve a riconoscere il lead).

## Passo 2 — le 10 domande (con punti per risposta)

Tono: parla di **direzione/obiettivi**, non di "analisi del sito". Punti: 1 = poco in target, 3 = molto in target per noi.

1. **Quanti nuovi clienti arrivano oggi dai canali online (sito, Google, social)?**
   - Quasi nessuno, è quasi tutto passaparola — **3**
   - Qualcuno, ma in modo discontinuo — **2**
   - Una quota costante e prevedibile — **1**

2. **Se un cliente cerca su Google un'attività come la vostra nella vostra zona, vi trova?**
   - Non lo so / credo di no — **3**
   - Forse, ma non in alto — **2**
   - Sì, siamo tra i primi — **1**

3. **Sapete quanti contatti vi arrivano dal sito ogni mese?**
   - No, non lo misuriamo — **3**
   - In modo approssimativo — **2**
   - Sì, con precisione — **1**

4. **Quanto è chiaro, sul vostro sito, perché un cliente dovrebbe scegliere voi e non un concorrente?**
   - Poco / non saprei — **3**
   - Abbastanza, ma migliorabile — **2**
   - Molto chiaro — **1**

5. **State investendo in pubblicità online (Google/Meta)?**
   - Sì, ma senza risultati chiari — **3**
   - No, mai provato — **2**
   - Sì, e funziona bene — **1**

6. **Quanto è una priorità, nei prossimi 6 mesi, aumentare i clienti dai canali digitali?**
   - È una priorità concreta — **3**
   - Ci interessa, ma senza fretta — **2**
   - Per ora non è una priorità — **1**

7. **Chi segue oggi il marketing digitale dell'azienda?**
   - Nessuno, ce ne occupiamo quando capita — **3**
   - Un collaboratore saltuario / part-time — **2**
   - Un'agenzia o una persona dedicata — **1**

8. **Se ci fosse un piano chiaro per portare più clienti, avreste un budget da dedicarci?**
   - Sì, se i numeri tornano — **3**
   - Forse, dipende — **2**
   - No, non in questo periodo — **1**

9. **Chi decide sugli investimenti di marketing in azienda?**
   - Io, direttamente — **3**
   - Io con un socio/responsabile — **2**
   - Deve passare da altri — **1**

10. **Quanto siete soddisfatti della vostra presenza online oggi?**
    - Poco, sappiamo di essere indietro — **3**
    - Così così — **2**
    - Molto soddisfatti — **1**

> Min 10 punti, max 30. (Sono una bozza: cambia pure testo/punti nel Form, lo smistamento non si rompe — il punteggio lo calcola il Form.)

## Passo 3 — lo script (Apps Script)
Menu **⋮ → Editor di script**, incolla, salva, poi crea il trigger.

```javascript
// === CONFIG ===
const CRM_WEBHOOK_URL = "https://IL-TUO-DOMINIO-CRM/api/public/questionnaire";
const SECRET = "INCOLLA-QUI-LO-STESSO-SECRET-DEL-SERVER";

function onFormSubmit(e) {
  try {
    const resp = e.response;
    let email = "";
    try { email = resp.getRespondentEmail() || ""; } catch (err) {}

    const responses = {};
    let score = 0;
    const items = resp.getItemResponses();
    for (let i = 0; i < items.length; i++) {
      const ans = items[i].getResponse();
      responses[items[i].getItem().getTitle()] = ans;
      const s = items[i].getScore();           // punti (Form in modalità Quiz)
      if (typeof s === "number") score += s;
      if (!email && typeof ans === "string" && ans.indexOf("@") > 0) email = ans.trim();
    }

    UrlFetchApp.fetch(CRM_WEBHOOK_URL, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({ secret: SECRET, email: email, responses: responses, score: score }),
      muteHttpExceptions: true,
    });
  } catch (err) { console.error("Errore invio al CRM: " + err); }
}
```

## Passo 4 — il trigger
Editor di script → **orologio (Trigger)** → **Aggiungi trigger** → funzione `onFormSubmit`,
evento **All'invio del modulo**. Salva e concedi l'autorizzazione.

## Prova
Compila il Form con l'email di un lead presente nel CRM. In pochi secondi:
- punteggio alto → compare in caldi con priorità 1; medio → priorità 2; basso → Nurturing.
- Il punteggio e la fascia restano scritti nello storico del lead.

## Note
- Match **per email**: se il lead non ha email nel CRM, la compilazione resta loggata come "non agganciata".
- Il link del Form va incollato in **Impostazioni → Link Questionario** (placeholder `{{QUESTIONARIO}}` nelle mail).
- Se il Form NON è in modalità Quiz, il punteggio arriva 0 e il lead va comunque in `CALDO_REATTIVO` (vale la sola compilazione).
