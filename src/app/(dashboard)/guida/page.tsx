"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChevronDown,
  ChevronUp,
  BookOpen,
  Chrome,
  Search,
  Eye,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
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
          Come verificare i lead prima di passarli ad Alessio
        </p>
      </div>

      <div className="space-y-3">
        {/* SEZIONE 1: Come verificare un lead */}
        <Section title="Come verificare un lead" icon={CheckCircle2} defaultOpen={true}>
          <p>
            Il sistema analizza automaticamente i siti web dei lead e trova problemi.
            Per ogni voce della checklist vedrai un badge colorato:
          </p>
          <div className="flex gap-3 my-2">
            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-emerald-500/15 text-emerald-500">
              Sì
            </span>
            <span className="text-muted-foreground text-sm">= il sistema ha trovato questa cosa sul sito</span>
          </div>
          <div className="flex gap-3 my-2">
            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-red-500/15 text-red-400">
              No
            </span>
            <span className="text-muted-foreground text-sm">= il sistema NON ha trovato questa cosa sul sito</span>
          </div>
          <p>
            Ma il sistema <strong>non è perfetto</strong>: a volte sbaglia.
            Il tuo compito è <strong>controllare che i dati siano veri</strong> prima
            di passare il lead ad Alessio.
          </p>

          <div className="space-y-3">
            <Step n={1}>
              <p>
                <strong>Apri la pagina &quot;Da Chiamare&quot;</strong> dal menu a sinistra.
                Vedrai i lead ordinati per punteggio (il più alto in cima).
              </p>
            </Step>

            <Step n={2}>
              <p>
                <strong>Clicca sul link del sito web</strong> (il rettangolo blu con il dominio,
                tipo &quot;gegcostruzioni.it&quot;). Si apre il sito in una nuova scheda.
              </p>
            </Step>

            <Step n={3}>
              <p>
                <strong>Controlla i punti della checklist</strong>. Ogni voce mostra{" "}
                <strong>Sì</strong> o <strong>No</strong> (cosa ha rilevato il sistema) e
                le istruzioni su come verificare manualmente.
              </p>
            </Step>

            <Step n={4}>
              <p>
                <strong>Spunta le checkbox</strong> man mano che verifichi. Quando sono tutte
                spuntate, il lead diventa &quot;Verificato&quot; e Alessio sa che può fidarsi
                dei dati.
              </p>
            </Step>

            <Step n={5}>
              <p>
                <strong>Usa il campo &quot;Note verifica&quot;</strong> per scrivere qualsiasi
                osservazione utile. Ad esempio: &quot;sito in rifacimento&quot;,
                &quot;GTM presente ma non trovo i tag&quot;, &quot;numero di telefono diverso da quello
                su Google&quot;, ecc. Le note si salvano automaticamente e Alessio le leggerà
                prima di chiamare.
              </p>
            </Step>
          </div>

          <Tip>
            Se non sei sicura di un punto, <strong>NON spuntare</strong> la checkbox.
            Scrivi il dubbio nel campo note e vai avanti. Meglio lasciare un lead
            non verificato che confermarlo con dati sbagliati.
          </Tip>
        </Section>

        {/* SEZIONE 2: Estensioni Chrome */}
        <Section title="Estensioni Chrome da installare" icon={Chrome}>
          <p>
            Queste estensioni ti aiutano a verificare velocemente cosa c'è su un sito.
            Si installano una volta e poi funzionano sempre.
          </p>

          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-semibold">Tag Assistant Legacy (by Google)</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Serve per verificare: Google Analytics, Google Tag Manager, Google Ads
                  </p>
                  <div className="mt-3 space-y-1">
                    <p className="text-xs"><strong>Come si usa:</strong></p>
                    <p className="text-xs text-muted-foreground">
                      1. Installa l'estensione dal link sotto
                    </p>
                    <p className="text-xs text-muted-foreground">
                      2. Apri il sito del lead
                    </p>
                    <p className="text-xs text-muted-foreground">
                      3. Clicca sull'icona dell'estensione in alto a destra nel browser
                    </p>
                    <p className="text-xs text-muted-foreground">
                      4. Clicca &quot;Enable&quot; e ricarica la pagina
                    </p>
                    <p className="text-xs text-muted-foreground">
                      5. Guarda le icone colorate: <span className="text-green-500 font-semibold">Verde</span> = tag funzionante,{" "}
                      <span className="text-red-500 font-semibold">Rosso</span> = errore,{" "}
                      <strong>Niente</strong> = non c'è nessun tag
                    </p>
                  </div>
                </div>
              </div>
              <a
                href="https://chromewebstore.google.com/detail/tag-assistant-legacy-by-g/kejbdjndbnbjgmefkgdddjlbokphdefk"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Installa Tag Assistant
                <ExternalLink className="h-3 w-3" />
              </a>
            </CardContent>
          </Card>

          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div>
                <h4 className="font-semibold">Meta Pixel Helper (by Facebook)</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Serve per verificare: Facebook Pixel, Meta Pixel
                </p>
                <div className="mt-3 space-y-1">
                  <p className="text-xs"><strong>Come si usa:</strong></p>
                  <p className="text-xs text-muted-foreground">
                    1. Installa l'estensione dal link sotto
                  </p>
                  <p className="text-xs text-muted-foreground">
                    2. Apri il sito del lead
                  </p>
                  <p className="text-xs text-muted-foreground">
                    3. Guarda l'icona dell'estensione in alto a destra:
                  </p>
                  <p className="text-xs text-muted-foreground">
                    - <span className="text-gray-400 font-semibold">Grigia</span> = NON c'è il pixel (confermato)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    - <span className="text-blue-500 font-semibold">Blu con un numero</span> = il pixel C'È
                  </p>
                </div>
              </div>
              <a
                href="https://chromewebstore.google.com/detail/meta-pixel-helper/fdgfkebogiimcoedlicjlajpkdmockpc"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Installa Meta Pixel Helper
                <ExternalLink className="h-3 w-3" />
              </a>
            </CardContent>
          </Card>
        </Section>

        {/* SEZIONE 3: Come controllare caso per caso */}
        <Section title="Come controllare caso per caso" icon={Search}>
          {/* Analytics */}
          <div>
            <h4 className="font-semibold mb-2">Google Analytics (GA4)</h4>
            <p className="text-muted-foreground mb-2">
              <strong>Metodo facile</strong> (con estensione):
              Apri il sito con Tag Assistant attivo. Se vedi un tag &quot;Google Analytics&quot; o
              &quot;GA4&quot; con icona verde, c'è Analytics.
            </p>
            <p className="text-muted-foreground mb-2">
              <strong>Metodo manuale:</strong>{" "}
              Tasto destro sulla pagina → &quot;Visualizza sorgente pagina&quot; →
              Cerca (Ctrl+F) queste parole: <code className="bg-muted px-1 rounded">gtag</code>,{" "}
              <code className="bg-muted px-1 rounded">analytics</code>,{" "}
              <code className="bg-muted px-1 rounded">G-</code>.
              Se non trovi niente, non c'è Analytics.
            </p>
            <Tip>
              <strong>Caso difficile:</strong> se nel sorgente trovi{" "}
              <code className="bg-muted px-1 rounded">GTM-</code> ma NON trovi{" "}
              <code className="bg-muted px-1 rounded">G-</code>, vuol dire che c'è Google Tag Manager
              ma Analytics potrebbe essere configurato DENTRO Tag Manager. In questo caso
              non puoi verificare facilmente - lascia la checkbox non spuntata e scrivi
              una nota.
            </Tip>
          </div>

          {/* Facebook Pixel */}
          <div>
            <h4 className="font-semibold mb-2">Facebook/Meta Pixel</h4>
            <p className="text-muted-foreground mb-2">
              <strong>Metodo facile</strong> (con estensione):
              Apri il sito con Meta Pixel Helper installato. Guarda l'icona:
              grigia = no pixel, blu = sì.
            </p>
            <p className="text-muted-foreground">
              <strong>Metodo manuale:</strong>{" "}
              Sorgente pagina → Cerca{" "}
              <code className="bg-muted px-1 rounded">fbq</code> o{" "}
              <code className="bg-muted px-1 rounded">facebook.net</code>.
              Se non trovi niente, non c'è il pixel.
            </p>
          </div>

          {/* Google Ads */}
          <div>
            <h4 className="font-semibold mb-2">Google Ads</h4>
            <p className="text-muted-foreground mb-2">
              Sorgente pagina → Cerca{" "}
              <code className="bg-muted px-1 rounded">AW-</code> o{" "}
              <code className="bg-muted px-1 rounded">googleads</code>.
              Se non trovi niente, non hanno il tag Google Ads.
            </p>
            <Tip>
              Come per Analytics: se c'è GTM, il tag Ads potrebbe essere dentro.
              Se trovi solo GTM senza tag Ads visibile, lascia non spuntato.
            </Tip>
          </div>

          {/* Cookie Banner */}
          <div>
            <h4 className="font-semibold mb-2">Cookie Banner (GDPR)</h4>
            <p className="text-muted-foreground">
              Apri il sito in una <strong>finestra anonima</strong> (Ctrl+Shift+N su Chrome).
              Alla prima visita dovrebbe apparire un banner/popup che chiede di accettare i cookie.
              Se non appare niente, non c'è il cookie banner. Semplice!
            </p>
          </div>

          {/* Form Contatto */}
          <div>
            <h4 className="font-semibold mb-2">Form di Contatto</h4>
            <p className="text-muted-foreground">
              Naviga il sito: guarda la homepage e cerca una pagina &quot;Contatti&quot; o
              &quot;Contattaci&quot;. Se non c'è nessun modulo da compilare (con campi tipo
              nome, email, messaggio), allora non c'è form di contatto.
            </p>
          </div>

          {/* Sito in generale */}
          <div>
            <h4 className="font-semibold mb-2">Controllo generale del sito</h4>
            <p className="text-muted-foreground">
              Quando apri il sito, chiediti:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-1">
              <li>Il sito si carica? Funziona?</li>
              <li>Il contenuto corrisponde alla categoria del lead? (es. se il CRM dice &quot;impresa edile&quot;, il sito parla di edilizia?)</li>
              <li>Il sito sembra aggiornato o abbandonato?</li>
              <li>Ha contenuti reali o è un template vuoto / pagina di parcheggio?</li>
              <li>È un sito vero dell'azienda o un aggregatore / portale generico?</li>
            </ul>
          </div>
        </Section>

        {/* SEZIONE 4: Casi dubbi */}
        <Section title="Cosa fare nei casi dubbi" icon={HelpCircle}>
          <div className="space-y-3">
            <p>
              <strong>Se non sei sicura di un punto della checklist:</strong>
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>
                <strong>NON spuntare</strong> la checkbox - meglio lasciare in sospeso che
                confermare dati sbagliati
              </li>
              <li>
                <strong>Scrivi nel campo &quot;Note verifica&quot;</strong> sotto la checklist.
                Spiega il dubbio, ad esempio: &quot;GTM presente, tag potrebbero essere dentro&quot;
                oppure &quot;sito lentissimo, non riesco a verificare&quot;
              </li>
              <li>
                Se il sito ha <strong>Google Tag Manager (GTM)</strong> ma non vedi i tag
                direttamente, scrivi nelle note: &quot;GTM presente, tag potrebbero essere dentro&quot;
              </li>
              <li>
                Se il sito <strong>non si carica</strong> o dà errore, non spuntare niente e
                scrivilo nelle note
              </li>
              <li>
                Se noti qualcosa di <strong>interessante o utile</strong> (es. &quot;hanno un e-commerce
                ma nessun tracking&quot;, &quot;il numero di telefono è diverso&quot;, &quot;sito in
                manutenzione&quot;), <strong>scrivilo nelle note</strong> - Alessio lo apprezzerà
              </li>
              <li>
                In caso di dubbio, <strong>chiedi ad Alessio</strong> - è meglio chiedere che
                confermare qualcosa di sbagliato
              </li>
            </ul>

            <Tip>
              Ricorda: lo scopo della verifica è dare ad Alessio <strong>argomenti solidi</strong> per
              la chiamata. Se dici &quot;confermato: non hanno Analytics&quot; e poi il cliente dice
              &quot;veramente sì, ce l'abbiamo&quot;, Alessio fa una brutta figura. Meglio
              essere prudenti! Le note sono il tuo strumento migliore per segnalare cose
              che il sistema non può vedere.
            </Tip>
          </div>
        </Section>
      </div>
    </div>
  );
}
