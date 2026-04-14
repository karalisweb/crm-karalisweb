import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/internal/seed-workflow-steps
 *
 * Precarica i 4 step del workflow follow-up video:
 * - Step 1 (T+0 da videoSentAt): da Alessio — presentazione + link video
 * - Step 2 (T+3): da Alessio — dati mercato + caso studio
 * - Step 3A (T+6, video visto): da Francesca — chiusura ciclo
 * - Step 3B (T+6, video NON visto): da Francesca — caso studio settore
 *
 * Rimuove tutti gli step esistenti e li sostituisce.
 * Auth: CRON_SECRET in prod, libero da /api/internal/ in dev (middleware).
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.CRON_SECRET;

  if (expectedToken && process.env.NODE_ENV === "production") {
    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const FROM_EMAIL = "consulenza@karalisweb.net";
  const TRIGGER_STAGE = "VIDEO_INVIATO";

  // ==========================================
  // STEP 1 — Invio video (T+0, auto)
  // ==========================================
  const STEP_1_BODY = `Ciao e buongiorno,

mi chiamo Alessio Loi, sono il fondatore di Karalisweb, agenzia di web marketing specializzata nella crescita digitale delle PMI italiane con più di 20 anni di esperienza nel settore.

Prima di continuare a leggere, cercaci su Google, preferisco che tu ti faccia un'idea autonoma di chi siamo.

Nelle ultime settimane stavo analizzando alcune aziende del settore {settore} e mi sono imbattuto in {azienda}. Ho visto che avete una presenza online attiva ma ho notato alcune cose che, secondo la mia esperienza, vi stanno facendo perdere visibilità e potenziali clienti ogni giorno.

Ho deciso di registrare un'analisi video di 10 minuti realizzata su misura per voi per offrirvi una prospettiva su quello che ho trovato sul vostro sito e quello che si potrebbe fare concretamente per migliorarlo.

Puoi vederla qui {landingUrl}

Se quello che dico ti torna utile, possiamo approfondire insieme e parlarne direttamente.
Ti lascio qui il link per prenotare la tua consulenza gratuita: {linkPrenotazione}

In caso contrario, spero potrai sfruttare comunque i suggerimenti in modo utile.


A presto,

{firma}

{casiStudio}`;

  // ==========================================
  // STEP 2 — Casi studio / dati mercato (T+3, auto)
  // ==========================================
  const STEP_2_BODY = `Qualche giorno fa ti ho inviato un'analisi video sul sito di {azienda}. Non so se hai avuto modo di vederla, ma voglio lasciarti il link di nuovo perché quello che ho trovato si inserisce in un contesto più ampio che vale la pena conoscere.

Te lo spiego in pochi dati.

Il 46% delle ricerche su Google ha un intento di ricerca locale. Tradotto, le persone cercano già quello che offri, nella tua zona. La domanda esiste, la questione è solo chi la intercetta.

Il 76% di chi fa una ricerca locale visita un'attività entro 24 ore, e il 28% di quelle visite si trasforma in un acquisto. Stiamo parlando di traffico che si converte in fatturato offline, non in metriche astratte.

L'87% dei consumatori legge le recensioni online prima di scegliere un fornitore con lo stesso livello di fiducia del passaparola. Chi non ha una reputazione digitale solida viene semplicemente escluso dalla lista prima ancora che il processo di scelta inizi.

[add caso specifico con dati clienti]

E poi c'è un elemento nuovo che sta cambiando le regole più velocemente di quanto molti si aspettino: strumenti come ChatGPT e Google Gemini stanno diventando il primo punto di ricerca per molti utenti.

Questi sistemi selezionano solo le aziende con segnali digitali forti.
Chi è debole online, non viene suggerito. Sparisce.

Fai una prova adesso: apri ChatGPT e cerca '{settore} a [città]'. Guarda chi compare. E guarda chi non compare.

Il video che ti ho preparato mostra esattamente dove {azienda} si trova rispetto a tutto questo.
Puoi vederlo qui: {landingUrl}

Se ti va di parlarne, mi piacerebbe capire meglio in quale direzione vuoi portare l'azienda, dal sito è difficile leggerlo, e prima di dirti se e come possiamo aiutarti ho bisogno di sentirlo da te direttamente.

Se ti riconosci in quello che ti ho scritto, 20 minuti insieme potrebbero valere la pena:
{linkPrenotazione}


A presto,

{firma}`;

  // ==========================================
  // STEP 3A — Francesca, video VISTO (T+6, auto)
  // ==========================================
  const STEP_3A_BODY = `Ciao,

sono Francesca, assistant manager in Karalisweb.

Ti scrivo perché stiamo chiudendo le analisi di questo ciclo e {azienda} è ancora tra le aziende in lista.

Alessio lavora su un numero limitato di realtà alla volta, ogni analisi richiede circa tre settimane e prima di passare al ciclo successivo volevo assicurarmi che tu avessi ricevuto tutto.

Se hai domande su quello che ha trovato, o vuoi semplicemente capire da dove si partirebbe, puoi prenotare direttamente con lui: {linkPrenotazione}

In questo modo, partendo da quanto già visto insieme, potrai approfondire in modo concreto come allineare la tua presenza online a obiettivi realistici.

Nel caso in cui avessi dubbi che vuoi smarcare prima della call, scrivimi pure. Ti ricordo solo che chiuderemo questo ciclo tra 5 giorni.

A presto,
{firma}`;

  // ==========================================
  // STEP 3B — Francesca, video NON visto (T+6, auto)
  // ==========================================
  const STEP_3B_BODY = `Ciao,

sono Francesca, project manager in Karalisweb.

Nei giorni scorsi ti ha scritto Alessio riguardo a {azienda}. Passo io perché voglio lasciarti un dato concreto prima che questo ciclo di lavoro si chiuda.

Stiamo seguendo un'azienda del vostro settore, stessa dimensione, stesso mercato di riferimento. Quando abbiamo iniziato riceveva 4-5 richieste di preventivo al mese dai canali digitali.

Oggi sono 22, con un costo per contatto più che dimezzato in soli sei mesi.

Non so se {azienda} ha lo stesso margine, dipende da cose che non conosco ancora.

Ma so che Alessio ha già analizzato il vostro sito e ha identificato esattamente dove state perdendo domanda intercettabile.

Se ti va di capire cosa ha trovato, blocca ora la tua analisi gratuita e ottieni una consulenza di digital marketing su misura per la tua realtà: {linkPrenotazione}

Per qualsiasi domanda, resto a disposizione.

A presto,

{firma}`;

  const steps = [
    {
      stepNumber: 1,
      channel: "email",
      variantLabel: "",
      name: "Invio video analisi",
      subject: "Ho analizzato il sito di {azienda}",
      body: STEP_1_BODY,
      delayDays: 0,
      condition: "always",
      mode: "auto",
      active: true,
      fromName: "Alessio Loi",
      fromEmail: FROM_EMAIL,
      triggerStage: TRIGGER_STAGE,
      nextStage: null,
    },
    {
      stepNumber: 2,
      channel: "email",
      variantLabel: "",
      name: "Casi studio + dati mercato",
      subject: "Quello che sta succedendo online (e perché riguarda {azienda})",
      body: STEP_2_BODY,
      delayDays: 3,
      condition: "always",
      mode: "auto",
      active: true,
      fromName: "Alessio Loi",
      fromEmail: FROM_EMAIL,
      triggerStage: TRIGGER_STAGE,
      nextStage: null,
    },
    {
      stepNumber: 3,
      channel: "email",
      variantLabel: "A",
      name: "Francesca — chiusura ciclo (video visto)",
      subject: "{azienda} — chiusura ciclo",
      body: STEP_3A_BODY,
      delayDays: 3,
      condition: "video_watched",
      mode: "auto",
      active: true,
      fromName: "Francesca",
      fromEmail: FROM_EMAIL,
      triggerStage: TRIGGER_STAGE,
      nextStage: "FOLLOW_UP_2",
    },
    {
      stepNumber: 3,
      channel: "email",
      variantLabel: "B",
      name: "Francesca — caso studio settore (video non visto)",
      subject: "Una cosa che riguarda il vostro settore",
      body: STEP_3B_BODY,
      delayDays: 3,
      condition: "video_not_watched",
      mode: "auto",
      active: true,
      fromName: "Francesca",
      fromEmail: FROM_EMAIL,
      triggerStage: TRIGGER_STAGE,
      nextStage: "FOLLOW_UP_2",
    },
  ];

  try {
    // Wipe existing steps (executions hanno onDelete: Cascade)
    await db.workflowStep.deleteMany({});

    // Insert new
    const created = await db.workflowStep.createMany({
      data: steps,
    });

    return NextResponse.json({
      success: true,
      created: created.count,
      steps: steps.map((s) => ({
        stepNumber: s.stepNumber,
        variant: s.variantLabel,
        name: s.name,
        delayDays: s.delayDays,
        condition: s.condition,
      })),
    });
  } catch (error) {
    console.error("[seed-workflow-steps] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Errore durante il seed",
      },
      { status: 500 }
    );
  }
}
