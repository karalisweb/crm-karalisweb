"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChevronDown,
  ChevronUp,
  BookOpen,
  Search,
  Video,
  Send,
  BarChart3,
  MessageCircle,
  Zap,
  AlertTriangle,
  CalendarCheck,
} from "lucide-react";

function Section({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card>
      <button
        className="w-full p-4 flex items-center justify-between text-left"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <span className="font-semibold">{title}</span>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {open && (
        <CardContent className="pt-0 pb-4 px-4">
          <div className="space-y-4 text-sm leading-relaxed">{children}</div>
        </CardContent>
      )}
    </Card>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
        {n}
      </div>
      <div className="flex-1 pt-0.5">{children}</div>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex gap-2">
      <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
      <div className="text-sm">{children}</div>
    </div>
  );
}

export default function GuidaPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Guida</h1>
        <p className="text-sm text-muted-foreground">
          Workflow quotidiano e come usare il CRM
        </p>
      </div>

      <div className="space-y-3">
        {/* SEZIONE 1: Routine mattutina */}
        <Section title="Routine mattutina (5 video/giorno)" icon={Video} defaultOpen={true}>
          <p>
            Ogni mattina il CRM ha gi&agrave; pronto il lavoro: i nuovi lead sono stati analizzati
            durante la notte da Gemini AI. Ecco i passaggi:
          </p>

          <div className="space-y-3">
            <Step n={1}>
              <p>
                <strong>Apri &quot;Hot Leads&quot;</strong> dalla sidebar. Qui trovi i lead con
                score &ge;80 e analisi Gemini completa: i pi&ugrave; promettenti.
              </p>
            </Step>

            <Step n={2}>
              <p>
                <strong>Verifica le Ads</strong>: per ogni lead apri i link a Google Ads Transparency
                e Meta Ad Library, poi torna nel CRM e clicca S&Igrave; o NO per ogni canale.
              </p>
            </Step>

            <Step n={3}>
              <p>
                <strong>Porta il lead alla fase video</strong> (possibile solo dopo aver verificato
                entrambe le Ads). Il lead compare in &quot;Fare Video&quot;.
              </p>
            </Step>

            <Step n={4}>
              <p>
                <strong>Apri il lead da &quot;Fare Video&quot;</strong>: si apre direttamente sulla
                scheda <strong>Video Outreach</strong>, con i 5 step da seguire in ordine.
              </p>
            </Step>

            <Step n={5}>
              <p>
                <strong>Segui i 5 step</strong>: analizza il sito, genera lo script (e lo
                &quot;Script per Tella&quot;), registra il video, crea la landing page.
              </p>
            </Step>

            <Step n={6}>
              <p>
                <strong>Invia il messaggio</strong> con il link della landing (Step 5). Da qui parte
                il follow-up e il sistema traccia se il prospect apre il video.
              </p>
            </Step>
          </div>

          <Tip>
            Obiettivo: 5 video al giorno. I badge nella sidebar si aggiornano in tempo reale
            ad ogni azione — non serve ricaricare la pagina.
          </Tip>
        </Section>

        {/* SEZIONE 1b: Video Outreach (5 step) */}
        <Section title="Video Outreach: i 5 step del video" icon={Video}>
          <p>
            &Egrave; <strong>l&apos;unico modo corretto</strong> per produrre e inviare il video
            personalizzato. Lo trovi nella scheda <strong>Video Outreach</strong> del lead.
            Gli step si sbloccano in ordine: finch&eacute; non completi quello prima, il successivo
            resta chiuso (lucchetto). Puoi sempre tornare indietro a modificare uno step gi&agrave; fatto.
          </p>
          <p className="text-muted-foreground">
            Strumenti usati: <strong>Tella</strong> (registri il video), <strong>YouTube</strong>
            {" "}(lo ospiti, in modalit&agrave; non in elenco), <strong>WordPress</strong> (dove vive
            la landing page). Sono gi&agrave; configurati dall&apos;amministratore.
          </p>

          <div className="space-y-3">
            <Step n={1}>
              <p>
                <strong>Analisi Sito</strong> — Clicca &quot;Analizza Sito&quot;. Il sistema legge il
                sito e trova i punti deboli concreti (con frasi prese dal sito). Poi
                <strong> Approva</strong>, <strong>Modifica</strong> o <strong>Rigenera</strong> con una nota.
              </p>
            </Step>
            <Step n={2}>
              <p>
                <strong>Script &amp; Punto di Dolore</strong> — Clicca &quot;Genera Script&quot;: l&apos;AI
                scrive il copione in 5 atti. Sotto, genera lo <strong>&quot;Script per Tella&quot;</strong>
                {" "}(il testo fluido da leggere) e copialo col pulsante arancione.
              </p>
            </Step>
            <Step n={3}>
              <p>
                <strong>Video YouTube</strong> — Registra il video su <strong>Tella</strong> leggendo
                lo Script per Tella, caricalo su <strong>YouTube come &quot;non in elenco&quot;</strong>,
                poi <strong>incolla qui il link YouTube</strong> e salva.
              </p>
            </Step>
            <Step n={4}>
              <p>
                <strong>Landing Page</strong> — Clicca &quot;Crea Landing Page&quot;: il CRM genera una
                pagina (su WordPress) col tuo video e il punto di dolore. <strong>Copia l&apos;URL</strong>:
                &egrave; quello che invierai al prospect.
              </p>
            </Step>
            <Step n={5}>
              <p>
                <strong>Invia Messaggio</strong> — Clicca &quot;Avvia Follow-up Email&quot; per la
                sequenza automatica (msg 1 subito, msg 2 a +3 giorni, msg 3 a +6), oppure usa
                &quot;Apri WhatsApp&quot; per inviare il link a mano.
              </p>
            </Step>
          </div>

          <Tip>
            Nella pagina <strong>Fare Video</strong> ogni lead mostra 5 pallini e un&apos;etichetta
            &quot;X/5&quot;: i lead pi&ugrave; indietro stanno in cima, cos&igrave; sai da dove ripartire.
            Il follow-up automatico via email richiede che il lead abbia un&apos;email; altrimenti usa WhatsApp.
          </Tip>
        </Section>

        {/* SEZIONE 2: Pipeline */}
        <Section title="Come funziona la Pipeline" icon={BarChart3}>
          <p>
            La pipeline ha 21 stadi, ma per la maggior parte del lavoro ne usi pochi.
            Ogni lead sta sempre in <strong>uno solo</strong> stadio e si muove in questo ordine:
          </p>

          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="p-2 rounded bg-muted/50">
                <strong>DA_ANALIZZARE</strong>
                <p className="text-xs text-muted-foreground">Lead appena importati, in attesa di analisi Gemini</p>
              </div>
              <div className="p-2 rounded bg-muted/50">
                <strong>HOT / WARM / COLD LEAD</strong>
                <p className="text-xs text-muted-foreground">Classificati in base allo score: Hot &ge;80, Warm 50-79, Cold &lt;50</p>
              </div>
              <div className="p-2 rounded bg-muted/50">
                <strong>FARE_VIDEO</strong>
                <p className="text-xs text-muted-foreground">Pronti per registrare il video personalizzato</p>
              </div>
              <div className="p-2 rounded bg-muted/50">
                <strong>VIDEO_INVIATO</strong>
                <p className="text-xs text-muted-foreground">Video inviato, in attesa di reazione</p>
              </div>
              <div className="p-2 rounded bg-muted/50">
                <strong>FOLLOW_UP 1/2/3</strong>
                <p className="text-xs text-muted-foreground">Follow-up progressivi se non rispondono</p>
              </div>
              <div className="p-2 rounded bg-muted/50">
                <strong>LINKEDIN</strong>
                <p className="text-xs text-muted-foreground">Contatto via LinkedIn</p>
              </div>
              <div className="p-2 rounded bg-muted/50">
                <strong>TELEFONATA 1/2/3</strong>
                <p className="text-xs text-muted-foreground">Chiamate progressive</p>
              </div>
              <div className="p-2 rounded bg-muted/50">
                <strong>CALL_FISSATA</strong>
                <p className="text-xs text-muted-foreground">Appuntamento confermato</p>
              </div>
              <div className="p-2 rounded bg-muted/50">
                <strong>IN_TRATTATIVA</strong>
                <p className="text-xs text-muted-foreground">Trattativa commerciale in corso</p>
              </div>
              <div className="p-2 rounded bg-muted/50">
                <strong>CLIENTE</strong>
                <p className="text-xs text-muted-foreground">Deal chiuso, cliente acquisito</p>
              </div>
            </div>

            <p className="text-muted-foreground mt-2">
              <strong>Stage di uscita:</strong> PERSO (non interessato), ARCHIVIATO (ricontattare dopo),
              NON_TARGET (nessun segnale commerciale), SENZA_SITO (niente da analizzare)
            </p>
          </div>

          <Tip>
            Il flusso &egrave;: Analisi Gemini → Score → HOT/WARM/COLD → Verifica Ads manuale →
            Fare Video (5 step: analisi, script, video, landing, invio) → Video Inviato →
            Follow-up → Cliente.
          </Tip>
        </Section>

        {/* SEZIONE 3: Nuova ricerca */}
        <Section title="Come avviare una nuova ricerca" icon={Search}>
          <div className="space-y-3">
            <Step n={1}>
              <p>
                Vai su <strong>&quot;Nuova Ricerca&quot;</strong> dalla sidebar.
              </p>
            </Step>
            <Step n={2}>
              <p>
                Inserisci <strong>categoria</strong> (es. &quot;Ristoranti&quot;, &quot;Dentisti&quot;,
                &quot;Imprese edili&quot;) e <strong>zona</strong> (es. &quot;Milano centro&quot;,
                &quot;Roma EUR&quot;).
              </p>
            </Step>
            <Step n={3}>
              <p>
                Clicca <strong>&quot;Cerca&quot;</strong>. Il sistema usa Apify per cercare su Google Maps
                e importa automaticamente i lead trovati.
              </p>
            </Step>
            <Step n={4}>
              <p>
                I lead con sito web vengono analizzati automaticamente: estrazione dati strategici,
                WhatsApp, e poi analisi Gemini AI. Il tutto avviene in background.
              </p>
            </Step>
          </div>
        </Section>

        {/* SEZIONE 4: Analisi Gemini */}
        <Section title="Analisi Gemini AI" icon={Zap}>
          <p>
            Gemini analizza ogni lead e produce uno <strong>script video personalizzato</strong> (teleprompter).
            L'analisi si basa su dati reali estratti dal sito:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Testo homepage, pagina &quot;chi siamo&quot;, pagina servizi</li>
            <li>Coerenza tra cosa dice il sito e cosa fa l'azienda</li>
            <li>Presenza/assenza di Google Ads e Meta Ads</li>
            <li>Problemi specifici e concreti (non generici)</li>
          </ul>

          <p className="mt-2">
            L&apos;analisi viene eseguita automaticamente di notte sui nuovi lead con sito.
            Puoi anche rilanciarla a mano dallo <strong>Step 1 del Video Outreach</strong>
            {" "}(&quot;Analizza Sito&quot;) nella scheda del lead.
          </p>

          <Tip>
            L&apos;analisi batch gira ogni notte. La mattina trovi tutto pronto. Se ti serve
            analizzare un lead subito, usa &quot;Analizza Sito&quot; nello Step 1 del Video Outreach.
          </Tip>
        </Section>

        {/* SEZIONE 5: WhatsApp e Video Tracking */}
        <Section title="WhatsApp e Video Tracking" icon={MessageCircle}>
          <div>
            <h4 className="font-semibold mb-2">WhatsApp</h4>
            <p className="text-muted-foreground">
              Il sistema cerca attivamente il numero WhatsApp dell'azienda in due modi:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-1">
              <li><strong>Dal sito web</strong>: link wa.me o api.whatsapp.com (badge verde &quot;dal sito&quot;)</li>
              <li><strong>Da Google Maps</strong>: usa il telefono trovato su Google Maps (badge giallo &quot;da Google Maps&quot;)</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              Se nessun WhatsApp viene trovato ma c&apos;&egrave; un telefono, viene mostrato con badge grigio
              &quot;da verificare&quot;.
            </p>
          </div>

          <div className="mt-4">
            <h4 className="font-semibold mb-2">Video Tracking</h4>
            <p className="text-muted-foreground">
              Quando invii al prospect il link della landing page con il video, il sistema traccia
              se lo apre. Nella scheda del lead vedrai:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-1">
              <li>Quante volte il video &egrave; stato visto</li>
              <li>Quando &egrave; stato visto l&apos;ultima volta e la percentuale guardata</li>
              <li>Il badge &quot;VISTO&quot; che appare automaticamente</li>
              <li>Una notifica in tempo reale quando il prospect apre il video</li>
            </ul>
          </div>

          <Tip>
            Il tracking funziona tramite un piccolo codice (snippet JavaScript) gi&agrave; inserito
            nella landing page: non devi configurarlo tu. Se un lead ha il badge &quot;VISTO&quot;,
            &egrave; il momento giusto per il follow-up!
          </Tip>
        </Section>

        {/* SEZIONE 6: Servizi esterni */}
        <Section title="Servizi esterni" icon={BookOpen}>
          <p>Il CRM usa due servizi esterni:</p>

          <div className="space-y-3 mt-2">
            <Card className="bg-muted/50">
              <CardContent className="p-3">
                <h4 className="font-semibold">Apify</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Scraping Google Maps per trovare aziende + Meta Ad Library per verificare ads attive.
                  Configurabile in Impostazioni.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-muted/50">
              <CardContent className="p-3">
                <h4 className="font-semibold">Gemini AI</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Analisi strategica delle aziende e generazione script video personalizzati.
                  Configurabile in Impostazioni.
                </p>
              </CardContent>
            </Card>
          </div>

          <p className="text-muted-foreground mt-2">
            Vai in <strong>Impostazioni</strong> per verificare lo stato di connessione di ogni servizio
            e per aggiornare le API key.
          </p>
        </Section>

        {/* SEZIONE 7: Verifica Ads Manuale */}
        <Section title="Verifica Ads (Solo Manuale)" icon={Send}>
          <p>
            La verifica delle Ads &egrave; <strong>100% manuale</strong>: solo tu puoi stabilire
            con certezza se un lead ha Google Ads o Meta Ads attive.
          </p>

          <div className="space-y-3 mt-2">
            <Step n={1}>
              <p>
                Nella scheda del lead trovi i pulsanti <strong>S&Igrave; / NO</strong> separati
                per Google Ads e Meta Ads. Di partenza sono &quot;da verificare&quot;.
              </p>
            </Step>
            <Step n={2}>
              <p>
                Apri il link <strong>Google Ads Transparency</strong> o <strong>Meta Ad Library</strong>
                per controllare se l&apos;azienda ha campagne attive.
              </p>
            </Step>
            <Step n={3}>
              <p>
                Torna nel CRM e clicca <strong>S&Igrave;</strong> o <strong>NO</strong>.
                Lo score si ricalcola da solo (+20 se almeno un canale &egrave; attivo).
              </p>
            </Step>
          </div>

          <Tip>
            Per portare il lead alla fase video devi aver verificato <strong>entrambi</strong> i
            canali (Google Ads E Meta Ads). Non serve che siano attive: basta che tu abbia
            controllato e cliccato S&Igrave; o NO. Nel dubbio, lascia &quot;da verificare&quot; e
            scrivi una nota nella scheda Informazioni.
          </Tip>
        </Section>

        {/* SEZIONE 8: Scheda lead, Messaggi e Note */}
        <Section title="Scheda lead: Messaggi, Note e Risposte" icon={MessageCircle}>
          <p>
            Aprendo un lead trovi quattro schede: <strong>Informazioni</strong>, <strong>Messaggi</strong>,
            {" "}<strong>Video Outreach</strong> e <strong>Attivit&agrave;</strong>.
          </p>

          <div>
            <h4 className="font-semibold mb-1">Scrivere una nota</h4>
            <p className="text-muted-foreground">
              Nella scheda <strong>Informazioni</strong>, in fondo, c&apos;&egrave; il campo
              <strong> Note</strong>. Usalo per annotare ci&ograve; che il sistema non pu&ograve; sapere
              (es. &quot;sito in manutenzione&quot;, &quot;numero diverso da Google&quot;). Le note
              sono il tuo strumento pi&ugrave; prezioso.
            </p>
          </div>

          <div className="mt-3">
            <h4 className="font-semibold mb-1">Inviare un messaggio</h4>
            <p className="text-muted-foreground">
              Nella scheda <strong>Messaggi</strong>: scegli il canale (WhatsApp o Email) e il tipo
              di messaggio. Il testo &egrave; gi&agrave; precompilato e personalizzato. Con
              <strong> &quot;Apri WhatsApp&quot;</strong> apri la chat col testo pronto; con
              <strong> &quot;Invia Email&quot;</strong> l&apos;email parte dal CRM. Ogni invio finisce
              da solo nello storico.
            </p>
          </div>

          <div className="mt-3">
            <h4 className="font-semibold mb-1">Registrare una risposta</h4>
            <p className="text-muted-foreground">
              Quando il prospect risponde, usa il riquadro verde
              <strong> &quot;Segna come Ha risposto&quot;</strong> indicando il canale
              (WhatsApp / Email / Telefono). Il lead passa in <strong>Ha Risposto</strong> e si
              ferma il follow-up automatico.
            </p>
          </div>

          <Tip>
            La scheda <strong>Attivit&agrave;</strong> &egrave; lo storico automatico del lead
            (messaggi, video visti, cambi di stage): non devi scrivere nulla a mano, si compila da sola.
          </Tip>
        </Section>

        {/* SEZIONE 9: Follow-up automatico */}
        <Section title="Follow-up automatico via email" icon={Send}>
          <p>
            Il CRM pu&ograve; mandare da solo i messaggi di richiamo, cos&igrave; non devi ricordarti
            tu le scadenze.
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>&Egrave; una sequenza di 3 step: msg 1 (subito), msg 2 (+3 giorni), msg 3 (+6 giorni).</li>
            <li>
              Il msg 3 ha due versioni scelte in automatico: <strong>3A</strong> se il prospect ha
              guardato il video, <strong>3B</strong> se non lo ha guardato.
            </li>
            <li>La sequenza si ferma da sola appena il prospect risponde o prenota la call.</li>
          </ul>
          <p className="text-muted-foreground mt-2">
            Tu lo fai partire dallo <strong>Step 5 del Video Outreach</strong>
            {" "}(&quot;Avvia Follow-up Email&quot;). La configurazione dei testi &egrave; in
            <strong> Impostazioni → Workflow</strong> (solo admin).
          </p>
        </Section>

        {/* SEZIONE 10: Appuntamenti e Profilo/2FA */}
        <Section title="Appuntamenti, Profilo e Sicurezza" icon={CalendarCheck}>
          <div>
            <h4 className="font-semibold mb-1">Call Fissate e calendario</h4>
            <p className="text-muted-foreground">
              Quando fissi una call, porta il lead nello stage <strong>Call Fissata</strong>. Nella
              pagina <strong>Call Fissate</strong> puoi vederle in vista <strong>Calendario</strong>
              {" "}(settimanale) o <strong>Lista</strong>, con i pulsanti in alto a destra.
            </p>
          </div>
          <div className="mt-3">
            <h4 className="font-semibold mb-1">Profilo e 2FA</h4>
            <p className="text-muted-foreground">
              Alla voce <strong>Profilo</strong> (in basso nella sidebar) cambi la password (min. 8
              caratteri) e attivi la <strong>verifica in due passaggi (2FA)</strong>: a ogni accesso
              ti verr&agrave; chiesto un codice usa-e-getta inviato via email. Consigliato tenerla attiva.
            </p>
          </div>
        </Section>

        {/* SEZIONE 11: Glossario */}
        <Section title="Mini-glossario" icon={BookOpen}>
          <ul className="space-y-2 text-muted-foreground">
            <li><strong className="text-foreground">Lead</strong> — un&apos;azienda potenziale cliente, con i suoi dati.</li>
            <li><strong className="text-foreground">Score (Opportunity Score)</strong> — voto 0-100: pi&ugrave; &egrave; alto, pi&ugrave; vale la pena lavorarlo.</li>
            <li><strong className="text-foreground">Pipeline / Stage</strong> — il percorso di vendita e il singolo gradino in cui sta il lead.</li>
            <li><strong className="text-foreground">Audit</strong> — analisi automatica del sito (SEO, tracciamenti, social, sicurezza).</li>
            <li><strong className="text-foreground">Follow-up</strong> — i messaggi di richiamo quando il lead non risponde subito.</li>
            <li><strong className="text-foreground">Hot / Warm / Cold</strong> — la &quot;temperatura&quot; dal voto: Hot &ge;80, Warm 50-79, Cold &lt;50.</li>
            <li><strong className="text-foreground">Punto di dolore</strong> — il problema concreto che usi come gancio nella chiamata e nel video.</li>
            <li><strong className="text-foreground">Landing page</strong> — la pagina web dove il prospect guarda il tuo video.</li>
            <li><strong className="text-foreground">UTM</strong> — etichetta in fondo al link (es. <code>?utm=client</code>) che ci dice che il prospect arriva dal nostro messaggio. &Egrave; aggiunta in automatico.</li>
          </ul>
        </Section>
      </div>
    </div>
  );
}
