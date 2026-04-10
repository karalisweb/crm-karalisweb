import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const WORKFLOW_STEPS = [
  // ============ STEP 1 — Invio video analisi ============
  {
    stepNumber: 1,
    channel: "email",
    variantLabel: null,
    name: "Invio video analisi",
    subject: "Ho analizzato il sito di {azienda}",
    body: `Ciao e buongiorno,

mi chiamo Alessio Loi, sono il fondatore di Karalisweb, agenzia di web marketing specializzata nella crescita digitale delle PMI italiane con più di 20 anni di esperienza nel settore.

Prima di continuare a leggere, cercaci su Google, preferisco che tu ti faccia un'idea autonoma di chi siamo.

Nelle ultime settimane stavo analizzando alcune aziende del settore {settore} e mi sono imbattuto in {azienda}. Ho visto che avete una presenza online attiva ma ho notato alcune cose che, secondo la mia esperienza, vi stanno facendo perdere visibilità e potenziali clienti ogni giorno.

Ho deciso di registrare un'analisi video di 10 minuti realizzata su misura per voi per offrirvi una prospettiva su quello che ho trovato sul vostro sito e quello che si potrebbe fare concretamente per migliorarlo.

Puoi vederla qui: {landingUrl}

Se quello che dico ti torna utile, possiamo approfondire insieme e parlarne direttamente.
Ti lascio qui il link per prenotare la tua consulenza gratuita: {calendlyUrl}

In caso contrario, spero potrai sfruttare comunque i suggerimenti in modo utile.

A presto,

{firma}

{casiStudio}`,
    delayDays: 0,
    condition: "always",
    mode: "manual",
    active: true,
    fromName: null,
    fromEmail: null,
    triggerStage: "VIDEO_INVIATO",
    nextStage: "FOLLOW_UP_1",
  },
  {
    stepNumber: 1,
    channel: "whatsapp",
    variantLabel: null,
    name: "Invio video WA",
    subject: null,
    body: `Ciao, ti ho scritto per mail ma nel dubbio ho pensato di mandarti anche un WhatsApp che è sempre più immediato.

Ho analizzato il sito di {azienda} e ho preparato un'analisi video su misura per voi con quello che ho trovato e le criticità che puoi già ottimizzare per attirare più clienti dai canali digitali.

La trovi qui: {landingUrl}

Se ti fa piacere parlarne, organizziamoci pure per ritagliarci 20 minuti e approfondire rispetto alla marginalità che vuoi raggiungere.

A presto,
Alessio - Karalisweb`,
    delayDays: 0,
    condition: "always",
    mode: "manual",
    active: true,
    fromName: null,
    fromEmail: null,
    triggerStage: "VIDEO_INVIATO",
    nextStage: "FOLLOW_UP_1",
  },

  // ============ STEP 2 — Casi studio / Follow-up ============
  {
    stepNumber: 2,
    channel: "email",
    variantLabel: null,
    name: "Casi studio",
    subject: "Quello che sta succedendo online (e perché riguarda {azienda})",
    body: `Qualche giorno fa ti ho inviato un'analisi video sul sito di {azienda}. Non so se hai avuto modo di vederla, ma voglio lasciarti il link di nuovo perché quello che ho trovato si inserisce in un contesto più ampio che vale la pena conoscere.

Te lo spiego in pochi dati.

Il 46% delle ricerche su Google ha un intento di ricerca locale. Tradotto, le persone cercano già quello che offri, nella tua zona. La domanda esiste, la questione è solo chi la intercetta.

Il 76% di chi fa una ricerca locale visita un'attività entro 24 ore, e il 28% di quelle visite si trasforma in un acquisto. Stiamo parlando di traffico che si converte in fatturato offline, non in metriche astratte.

L'87% dei consumatori legge le recensioni online prima di scegliere un fornitore con lo stesso livello di fiducia del passaparola. Chi non ha una reputazione digitale solida viene semplicemente escluso dalla lista prima ancora che il processo di scelta inizi.

{casiStudio}

E poi c'è un elemento nuovo che sta cambiando le regole più velocemente di quanto molti si aspettino: strumenti come ChatGPT e Google Gemini stanno diventando il primo punto di ricerca per molti utenti.

Questi sistemi selezionano solo le aziende con segnali digitali forti.
Chi è debole online, non viene suggerito. Sparisce.

Fai una prova adesso: apri ChatGPT e cerca '{settore} a [città]'. Guarda chi compare. E guarda chi non compare.

Il video che ti ho preparato mostra esattamente dove {azienda} si trova rispetto a tutto questo.

Se ti va di parlarne, mi piacerebbe capire meglio in quale direzione vuoi portare l'azienda, dal sito è difficile leggerlo, e prima di dirti se e come possiamo aiutarti ho bisogno di sentirlo da te direttamente.

Se ti riconosci in quello che ti ho scritto, 20 minuti insieme potrebbero valere la pena:
{calendlyUrl}

A presto,

{firma}`,
    delayDays: 3,
    condition: "always",
    mode: "manual",
    active: true,
    fromName: null,
    fromEmail: null,
    triggerStage: "FOLLOW_UP_1",
    nextStage: "FOLLOW_UP_2",
  },
  {
    stepNumber: 2,
    channel: "whatsapp",
    variantLabel: null,
    name: "Follow-up WA",
    subject: null,
    body: `Tolto il passaparola, quanto è facile trovare {azienda} online?

È la domanda che mi faccio ogni volta che analizzo un sito come il vostro perché spesso il problema non è la qualità di quello che offri ma quanto è semplice per chi non ti conosce ancora arrivare fino a te.

Ti basta guardare gli ultimi 7 anni per capire di cosa sto parlando.

Perché se il sito bastasse, non esisterebbe la guerra che c'è su Google.
E buttare soldi in ads senza una base solida probabilmente hai già visto dove porta.

Diverso è capire come sfruttare quello che hai già e fare in modo che la ruota giri davvero (e senza attriti).

L'analisi che ti ho mandato risponde esattamente a questo. La consulenza inclusa serve a capire come tradurla in qualcosa di concreto per {azienda}, con le priorità giuste e nell'ordine giusto.

Ti propongo di bloccarla subito così da avere massima scelta con le disponibilità ancora libere: {calendlyUrl}

Fammi sapere`,
    delayDays: 3,
    condition: "always",
    mode: "manual",
    active: true,
    fromName: null,
    fromEmail: null,
    triggerStage: "FOLLOW_UP_1",
    nextStage: "FOLLOW_UP_2",
  },

  // ============ STEP 3 — Chiusura ciclo (con varianti) ============

  // Email Variante A — Video visto
  {
    stepNumber: 3,
    channel: "email",
    variantLabel: "A",
    name: "Chiusura ciclo (video visto)",
    subject: "{azienda} - aggiornamento chiusura ciclo",
    body: `Ciao,
sono Francesca, assistant manager in Karalisweb.

Ti scrivo perché stiamo chiudendo le analisi di questo ciclo e {azienda} è ancora tra le aziende in lista.

Alessio lavora su un numero limitato di realtà alla volta, ogni analisi richiede circa tre settimane e prima di passare al ciclo successivo volevo assicurarmi che tu avessi ricevuto tutto.

Se hai domande su quello che ha trovato, o vuoi semplicemente capire da dove si partirebbe, puoi prenotare direttamente con lui: {calendlyUrl}

In questo modo, partendo da quanto già visto insieme, potrai approfondire in modo concreto come allineare la tua presenza online a obiettivi realistici.

Nel caso in cui avessi dubbi che vuoi smarcare prima della call, scrivimi pure. Ti ricordo solo che chiuderemo questo ciclo tra 5 giorni.

A presto,

{firma}`,
    delayDays: 3,
    condition: "video_watched",
    mode: "manual",
    active: true,
    fromName: "Francesca - Karalisweb",
    fromEmail: null,
    triggerStage: "FOLLOW_UP_2",
    nextStage: "FOLLOW_UP_3",
  },

  // Email Variante B — Video NON visto
  {
    stepNumber: 3,
    channel: "email",
    variantLabel: "B",
    name: "Caso studio (video non visto)",
    subject: "Una cosa che riguarda il vostro settore",
    body: `Ciao,

sono Francesca, project manager in Karalisweb.

Nei giorni scorsi ti ha scritto Alessio riguardo a {azienda}. Passo io perché voglio lasciarti un dato concreto prima che questo ciclo di lavoro si chiuda.

Stiamo seguendo un'azienda del vostro settore, stessa dimensione, stesso mercato di riferimento. Quando abbiamo iniziato riceveva 4-5 richieste di preventivo al mese dai canali digitali.

Oggi sono 22, con un costo per contatto più che dimezzato in soli sei mesi.

Non so se {azienda} ha lo stesso margine, dipende da cose che non conosco ancora.

Ma so che Alessio ha già analizzato il vostro sito e ha identificato esattamente dove state perdendo domanda intercettabile.

Se ti va di capire cosa ha trovato, blocca ora la tua analisi gratuita e ottieni una consulenza di digital marketing su misura per la tua realtà: {calendlyUrl}

Per qualsiasi domanda, resto a disposizione.

A presto,

{firma}`,
    delayDays: 3,
    condition: "video_not_watched",
    mode: "manual",
    active: true,
    fromName: "Francesca - Karalisweb",
    fromEmail: null,
    triggerStage: "FOLLOW_UP_2",
    nextStage: "FOLLOW_UP_3",
  },

  // WA Variante A — Video visto
  {
    stepNumber: 3,
    channel: "whatsapp",
    variantLabel: "A",
    name: "Urgenza WA (video visto)",
    subject: null,
    body: `Ciao, Alessio mi ha detto che hai visto l'analisi sviluppata per {azienda}.

Volevo solo avvisarti che chiudiamo il ciclo tra 5 giorni e volevo assicurarmi che il posto per la consulenza con Alessio non restasse vuoto per una questione di timing.

Per accedere alla consulenza strategica inclusa con l'analisi puoi ancora scegliere tra le disponibilità rimaste libere.

Se hai perso il link per procedere con la prenotazione, te lo riporto qui: {calendlyUrl}

Aggiornami una volta bloccata la disponibilità così dò conferma ad Alessio per l'appuntamento e blocco lo slot in agenda.

A presto,

Francesca - Karalisweb`,
    delayDays: 3,
    condition: "video_watched",
    mode: "manual",
    active: true,
    fromName: "Francesca - Karalisweb",
    fromEmail: null,
    triggerStage: "FOLLOW_UP_2",
    nextStage: "FOLLOW_UP_3",
  },

  // WA Variante B — Video NON visto
  {
    stepNumber: 3,
    channel: "whatsapp",
    variantLabel: "B",
    name: "Caso studio WA (non visto)",
    subject: null,
    body: `Ciao, Alessio mi ha segnalato {azienda} rispetto all'analisi preliminare del sito.

Ti scrivo perché stiamo chiudendo il ciclo con l'accesso gratuito alla consulenza strategica.

La consulenza strategica ti permette di comprendere come applicare i suggerimenti offerti in fase di analisi, secondo le logiche di marketing aggiornate agli update di Febbraio 2026.

Se hai perso il link per procedere con la prenotazione, te lo riporto qui: {calendlyUrl}

Aggiornami una volta bloccata la disponibilità così dò conferma ad Alessio per l'appuntamento e blocco lo slot in agenda.

A presto,

Francesca - Karalisweb`,
    delayDays: 3,
    condition: "video_not_watched",
    mode: "manual",
    active: true,
    fromName: "Francesca - Karalisweb",
    fromEmail: null,
    triggerStage: "FOLLOW_UP_2",
    nextStage: "FOLLOW_UP_3",
  },
];

export async function seedWorkflow() {
  console.log("Seeding workflow steps...");

  for (const step of WORKFLOW_STEPS) {
    await db.workflowStep.upsert({
      where: {
        uq_step_channel_variant: {
          stepNumber: step.stepNumber,
          channel: step.channel,
          variantLabel: step.variantLabel ?? "",
        },
      },
      update: {
        name: step.name,
        subject: step.subject,
        body: step.body,
        delayDays: step.delayDays,
        condition: step.condition,
        fromName: step.fromName,
        fromEmail: step.fromEmail,
        triggerStage: step.triggerStage,
        nextStage: step.nextStage,
      },
      create: {
        stepNumber: step.stepNumber,
        channel: step.channel,
        name: step.name,
        variantLabel: step.variantLabel ?? "",
        subject: step.subject,
        body: step.body,
        delayDays: step.delayDays,
        condition: step.condition,
        mode: step.mode,
        active: step.active,
        fromName: step.fromName,
        fromEmail: step.fromEmail,
        triggerStage: step.triggerStage,
        nextStage: step.nextStage,
      },
    });
  }

  console.log(`Seeded ${WORKFLOW_STEPS.length} workflow steps`);
}

// Eseguibile direttamente
if (require.main === module) {
  seedWorkflow()
    .then(() => db.$disconnect())
    .catch((e) => {
      console.error(e);
      db.$disconnect();
      process.exit(1);
    });
}
