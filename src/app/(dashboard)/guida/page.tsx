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
            Ogni mattina il CRM ha gia pronto il lavoro: i lead sono stati analizzati
            durante la notte da Gemini AI. Ecco i passaggi:
          </p>

          <div className="space-y-3">
            <Step n={1}>
              <p>
                <strong>Apri &quot;Hot Leads&quot;</strong> dalla sidebar. Qui trovi i lead con
                score &ge;80 e analisi Gemini completa.
              </p>
            </Step>

            <Step n={2}>
              <p>
                <strong>Verifica le Ads</strong>: per ogni lead clicca i link a Google Ads Transparency
                e Meta Ad Library. Poi torna nel CRM e clicca SI o NO per ogni canale.
              </p>
            </Step>

            <Step n={3}>
              <p>
                <strong>Clicca &quot;Passa a Video&quot;</strong> (appare solo se entrambe le Ads sono verificate).
                Il lead si sposta in Fare Video.
              </p>
            </Step>

            <Step n={4}>
              <p>
                <strong>Vai in &quot;Fare Video&quot;</strong>. Clicca &quot;Rigenera Testo Tella&quot;
                per generare lo script definitivo con i dati ads verificati. Appare il badge verde
                &quot;Script Tella generato&quot;. Il counter nella sidebar mostra X/Y.
              </p>
            </Step>

            <Step n={5}>
              <p>
                <strong>Registra il video</strong> leggendo lo script come teleprompter.
                Carica su Karalisweb e copia il link.
              </p>
            </Step>

            <Step n={6}>
              <p>
                <strong>Invia il link via WhatsApp</strong> e clicca &quot;Video Inviato&quot;.
                Il sistema traccia se il prospect apre il video.
              </p>
            </Step>
          </div>

          <Tip>
            Obiettivo: 5 video al giorno. I badge nella sidebar si aggiornano in tempo reale
            ad ogni azione — non serve ricaricare la pagina.
          </Tip>
        </Section>

        {/* SEZIONE 2: Pipeline */}
        <Section title="Come funziona la Pipeline" icon={BarChart3}>
          <p>La pipeline ha 18 stage. Ogni lead si muove in questo ordine:</p>

          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="p-2 rounded bg-muted/50">
                <strong>DA_ANALIZZARE</strong>
                <p className="text-xs text-muted-foreground">Lead appena importati, in attesa di analisi Gemini</p>
              </div>
              <div className="p-2 rounded bg-muted/50">
                <strong>HOT_LEAD / WARM_LEAD</strong>
                <p className="text-xs text-muted-foreground">Classificati da Gemini in base allo score</p>
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
            Il flusso e: Analisi Gemini → Score → HOT/WARM/COLD → Verifica Ads manuale →
            Passa a Video → Rigenera Script Tella → Registra video → Video Inviato → Follow-up → Cliente.
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
            L'analisi viene eseguita automaticamente dopo l'audit del sito.
            Puoi anche rilanciarla manualmente dal tab &quot;Analisi Strategica&quot; del lead.
          </p>

          <Tip>
            L'analisi batch gira ogni notte alle 3:00. La mattina trovi tutto pronto.
            Se serve analizzare un lead urgente, usa il bottone &quot;Analizza&quot; nella pagina del lead.
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
              Se nessun WhatsApp viene trovato ma c'e un telefono, viene mostrato con badge grigio
              &quot;da verificare&quot;.
            </p>
          </div>

          <div className="mt-4">
            <h4 className="font-semibold mb-2">Video Tracking</h4>
            <p className="text-muted-foreground">
              Quando invii il link della pagina video al prospect, il sistema traccia se lo aprono.
              Nella scheda del lead vedrai:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-1">
              <li>Quante volte il video e stato visto</li>
              <li>Quando e stato visto l'ultima volta</li>
              <li>Badge &quot;VISTO&quot; appare automaticamente</li>
              <li>Notifica toast in tempo reale quando il prospect apre il video</li>
            </ul>
          </div>

          <Tip>
            Il tracking funziona tramite uno snippet JavaScript nella pagina Karalisweb.
            Lo snippet e gia configurato. Se un lead ha il badge &quot;VISTO&quot;, e il momento
            giusto per il follow-up!
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
            La verifica delle Ads e <strong>100% manuale</strong>. Solo tu puoi determinare
            se un lead ha Google Ads o Meta Ads attive.
          </p>

          <div className="space-y-3 mt-2">
            <Step n={1}>
              <p>
                Nella card del lead, trovi i bottoni <strong>SI / NO</strong> separati
                per Google Ads e Meta Ads. Di default sono &quot;da verificare&quot;.
              </p>
            </Step>
            <Step n={2}>
              <p>
                Clicca il link <strong>Google Ads Transparency</strong> o <strong>Meta Ad Library</strong>
                per verificare manualmente se l&apos;azienda ha campagne attive.
              </p>
            </Step>
            <Step n={3}>
              <p>
                Torna nel CRM e clicca <strong>SI</strong> o <strong>NO</strong>.
                Lo score si ricalcola automaticamente (+20 se almeno un canale attivo).
              </p>
            </Step>
          </div>

          <Tip>
            Il pulsante &quot;Passa a Video&quot; e bloccato finche non hai verificato
            ENTRAMBI i canali (Google Ads E Meta Ads). Non serve che siano attive,
            basta che tu abbia controllato e cliccato SI o NO.
          </Tip>
        </Section>
      </div>
    </div>
  );
}
