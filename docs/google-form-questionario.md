# Self-assessment — script che CREA il Form da solo

Niente copia-incolla a mano. Incolli **un solo script**, premi **Esegui una volta**, e lui:
- crea il Google Form con tutte le 10 domande e le 3 risposte ciascuna,
- collega il Form al CRM (al momento dell'invio manda punteggio + email),
- ti stampa il **link del Form** da mettere in *Impostazioni → Link Questionario*.

## Come si usa (5 minuti)
1. Vai su **script.google.com** → **Nuovo progetto**.
2. Cancella tutto e incolla lo script qui sotto.
3. In alto scegli la funzione **`createForm`** e premi **Esegui** (Google chiederà l'autorizzazione: concedila).
4. Apri il menu **Esecuzioni / Log**: troverai stampato il **link del Form**. Copialo (e mandamelo, o mettilo in Impostazioni).

Fatto. Da quel momento, chi compila il Form viene agganciato e smistato nel CRM in automatico.

> Il punteggio NON usa la "modalità Quiz": lo calcola lo script dalle risposte (più affidabile). Le risposte valgono 3 / 2 / 1 punti come indicato nell'array `QUESTIONS`: cambia testi o punti lì dentro, e funziona tutto lo stesso.

```javascript
// ============ CONFIG (già compilato — non toccare) ============
const CRM_WEBHOOK_URL = "https://crm.karalisdemo.it/api/public/questionnaire";
const SECRET = "kw_quest_2026_x7Qm9pLdRt4v"; // password Form↔CRM: lasciala così

// Le 10 domande: testo + [risposta, punti]. 3 = molto in target, 1 = poco.
const QUESTIONS = [
  { q: "Quanti nuovi clienti arrivano oggi dai canali online (sito, Google, social)?",
    a: [["Quasi nessuno, è quasi tutto passaparola", 3], ["Qualcuno, ma in modo discontinuo", 2], ["Una quota costante e prevedibile", 1]] },
  { q: "Se un cliente cerca su Google un'attività come la vostra nella vostra zona, vi trova?",
    a: [["Non lo so / credo di no", 3], ["Forse, ma non in alto", 2], ["Sì, siamo tra i primi", 1]] },
  { q: "Sapete quanti contatti vi arrivano dal sito ogni mese?",
    a: [["No, non lo misuriamo", 3], ["In modo approssimativo", 2], ["Sì, con precisione", 1]] },
  { q: "Quanto è chiaro, sul vostro sito, perché un cliente dovrebbe scegliere voi e non un concorrente?",
    a: [["Poco / non saprei", 3], ["Abbastanza, ma migliorabile", 2], ["Molto chiaro", 1]] },
  { q: "State investendo in pubblicità online (Google/Meta)?",
    a: [["Sì, ma senza risultati chiari", 3], ["No, mai provato", 2], ["Sì, e funziona bene", 1]] },
  { q: "Quanto è una priorità, nei prossimi 6 mesi, aumentare i clienti dai canali digitali?",
    a: [["È una priorità concreta", 3], ["Ci interessa, ma senza fretta", 2], ["Per ora non è una priorità", 1]] },
  { q: "Chi segue oggi il marketing digitale dell'azienda?",
    a: [["Nessuno, ce ne occupiamo quando capita", 3], ["Un collaboratore saltuario / part-time", 2], ["Un'agenzia o una persona dedicata", 1]] },
  { q: "Se ci fosse un piano chiaro per portare più clienti, avreste un budget da dedicarci?",
    a: [["Sì, se i numeri tornano", 3], ["Forse, dipende", 2], ["No, non in questo periodo", 1]] },
  { q: "Chi decide sugli investimenti di marketing in azienda?",
    a: [["Io, direttamente", 3], ["Io con un socio/responsabile", 2], ["Deve passare da altri", 1]] },
  { q: "Quanto siete soddisfatti della vostra presenza online oggi?",
    a: [["Poco, sappiamo di essere indietro", 3], ["Così così", 2], ["Molto soddisfatti", 1]] },
];

// ============ Crea il Form (eseguire UNA volta) ============
function createForm() {
  const form = FormApp.create("Self-assessment — Karalisweb");
  form.setDescription("Poche domande per capire in che direzione vuoi portare l'azienda. Bastano 5 minuti.");
  form.setCollectEmail(true);

  QUESTIONS.forEach(function (item) {
    const mc = form.addMultipleChoiceItem();
    mc.setTitle(item.q);
    mc.setRequired(true);
    mc.setChoiceValues(item.a.map(function (x) { return x[0]; }));
  });

  ScriptApp.newTrigger("onFormSubmit").forForm(form).onFormSubmit().create();

  Logger.log("✅ FORM PRONTO");
  Logger.log("LINK da mettere in Impostazioni → Link Questionario:");
  Logger.log(form.getPublishedUrl());
  Logger.log("Link per modificarlo a mano: " + form.getEditUrl());
}

// ============ All'invio: calcola punteggio e manda al CRM ============
function onFormSubmit(e) {
  try {
    const resp = e.response;
    let email = "";
    try { email = resp.getRespondentEmail() || ""; } catch (err) {}

    const pointsByAnswer = {};
    QUESTIONS.forEach(function (item) {
      item.a.forEach(function (x) { pointsByAnswer[x[0]] = x[1]; });
    });

    const responses = {};
    let score = 0;
    const items = resp.getItemResponses();
    for (let i = 0; i < items.length; i++) {
      const ans = items[i].getResponse();
      responses[items[i].getItem().getTitle()] = ans;
      if (typeof ans === "string" && pointsByAnswer[ans] != null) score += pointsByAnswer[ans];
      if (!email && typeof ans === "string" && ans.indexOf("@") > 0) email = ans.trim();
    }

    UrlFetchApp.fetch(CRM_WEBHOOK_URL, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({ secret: SECRET, email: email, responses: responses, score: score }),
      muteHttpExceptions: true,
    });
  } catch (err) { Logger.log("Errore invio al CRM: " + err); }
}
```

## Smistamento nel CRM (in base al punteggio)
| Fascia | Punteggio (su 30) | Dove va il lead |
|--------|------|-----------------|
| ALTA | 24–30 | Caldo, priorità 1 → video subito |
| MEDIA | 17–23 | Caldo, priorità 2 → video, dopo gli alti |
| BASSA | 10–16 | Nurturing → niente video ora |

(Soglie modificabili in `src/app/api/public/questionnaire/route.ts`.)
