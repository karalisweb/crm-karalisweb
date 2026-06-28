# Collegare il Google Form al CRM (promozione automatica a CALDO)

Quando un prospect **compila il questionario** (Google Form), il CRM deve saperlo e
promuovere il lead a `CALDO_REATTIVO`, fermando la sequenza fredda. Google Form non ha
un webhook nativo: si aggancia con un piccolo script (Apps Script) che a ogni invio
chiama l'endpoint `POST /api/public/questionnaire` del CRM.

## Cosa serve (una volta sola)

1. **Il Form deve raccogliere l'email** del rispondente (è la chiave per riconoscere il lead):
   - Impostazioni del Form → attiva **"Raccogli indirizzi email"**, **oppure**
   - aggiungi una domanda "La tua email" (campo email).
2. Un **secret** condiviso: scegli una stringa lunga a caso e mettila
   - sul server, nella variabile d'ambiente `QUESTIONNAIRE_WEBHOOK_SECRET`,
   - e nello script qui sotto (campo `SECRET`).

## Lo script (Apps Script)

Dal Google Form: menu **⋮ → Editor di script**, incolla questo, salva, poi crea il trigger.

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
    const items = resp.getItemResponses();
    for (let i = 0; i < items.length; i++) {
      const title = items[i].getItem().getTitle();
      const answer = items[i].getResponse();
      responses[title] = answer;
      if (!email && typeof answer === "string" && answer.indexOf("@") > 0) {
        email = answer.trim();
      }
    }

    UrlFetchApp.fetch(CRM_WEBHOOK_URL, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({ secret: SECRET, email: email, responses: responses }),
      muteHttpExceptions: true,
    });
  } catch (err) {
    console.error("Errore invio al CRM: " + err);
  }
}
```

## Creare il trigger

Editor di script → icona **orologio (Trigger)** → **Aggiungi trigger**:
- Funzione: `onFormSubmit`
- Evento: **All'invio del modulo** (On form submit)
- Salva (concedi l'autorizzazione richiesta da Google).

## Provare

Compila il Form con l'email di un lead presente nel CRM (in Hot/Warm/Cold o Archivio).
In pochi secondi quel lead deve passare a **CALDO_REATTIVO** (compare in "Ha Risposto").
Se non succede: verifica che l'email coincida, che il `SECRET` sia identico ai due lati,
e i log dell'esecuzione nell'editor di script.

## Note

- Il match avviene **per email**. Se un lead non ha email nel CRM, la compilazione resta
  loggata lato server come "non agganciata".
- Il link del questionario nelle mail è il placeholder `{{QUESTIONARIO}}`, impostato in
  **Impostazioni → (outreach) Link Questionario**.
