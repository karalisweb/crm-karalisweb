"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Gauge, Handshake, RefreshCw } from "lucide-react";
import { LanciaAdesso } from "@/components/ricerca/lancia-adesso";
import { CollegaCalendario } from "@/components/ricerca/collega-calendario";
import { CollegamentiLinkedin, type StatoLinkedin } from "@/components/ricerca/collegamenti-linkedin";
import { TrackerIncontri, type Fissato, type Tracker, type Visita } from "@/components/ricerca/tracker-incontri";
import { ImbutoPresentazione, type PresentazioneImbuto } from "@/components/ricerca/motore-121";
import Link from "next/link";

interface Settimana {
  obiettivo: number;
  fatti: number;
  fissati: number;
  richiesteAperte: number;
  inizio: string;
  nomiFatti: string[];
  nomiFissati: string[];
  prossima: { nome: string; quando: string }[];
}

export default function Bni121Page() {
  const [dati, setDati] = useState<{
    settimana: Settimana; calendario: Fissato[]; tracker: Tracker; visite: Visita[]; linkedin: StatoLinkedin;
    seguito: (PresentazioneImbuto & { membro: { id: string; name: string } })[];
    motore: { richiesteSettimana: number; obiettivoRichieste: number; tetto: number; fissatiProssima: number };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const carica = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/ricerca/bni");
      if (!r.ok) throw new Error("Errore nel caricamento");
      setDati(await r.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    carica();
  }, [carica]);

  const s = dati?.settimana;
  const fatti = s ? s.fatti + s.fissati : 0;

  return (
    <div className="space-y-5 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Handshake className="h-6 w-6 text-primary" /> Incontri BNI</h1>
          <p className="text-sm text-muted-foreground">Il motore 121: 20 richieste a settimana (in Cassetta alle 14, da mandare su WhatsApp fra le 15 e le 18), fino a 12 incontri a settimana. Al primo 121 non si vende: si dà e si chiede.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/cruscotto"><Button variant="outline" size="sm"><Gauge className="h-4 w-4 mr-1" /> Cruscotto</Button></Link>
          <LanciaAdesso squadra="bni" etichetta="Prepara le richieste adesso" onFatto={carica} />
          <Button variant="outline" size="sm" onClick={carica} disabled={loading} aria-label="Aggiorna"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></Button>
        </div>
      </div>

      {error && <Card className="border-red-500"><CardContent className="p-4 text-red-500"><AlertTriangle className="h-4 w-4 inline mr-2" />{error}</CardContent></Card>}

      {loading && !dati ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
      ) : dati && s ? (
        <>
          <CollegaCalendario onCambio={carica} />

          <Card><CardContent className="p-4 space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="text-sm font-semibold">Questa settimana</div>
              <div className={`text-sm ${fatti >= s.obiettivo ? "text-green-600 dark:text-green-400 font-semibold" : "text-muted-foreground"}`}>
                {fatti >= s.obiettivo ? "Obiettivo raggiunto" : `Ne mancano ${s.obiettivo - fatti} per arrivare a ${s.obiettivo}`}
              </div>
            </div>
            <div className="h-3 rounded bg-muted overflow-hidden flex">
              <div className="h-full bg-green-600" style={{ width: `${Math.min(100, (s.fatti / s.obiettivo) * 100)}%` }} />
              <div className="h-full bg-blue-600" style={{ width: `${Math.min(100 - Math.min(100, (s.fatti / s.obiettivo) * 100), (s.fissati / s.obiettivo) * 100)}%` }} />
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
              <span><span className="inline-block h-2.5 w-2.5 rounded-sm bg-green-600 mr-1.5" />{s.fatti} fatti</span>
              <span><span className="inline-block h-2.5 w-2.5 rounded-sm bg-blue-600 mr-1.5" />{s.fissati} fissati entro domenica</span>
              <span className="text-muted-foreground">obiettivo {s.obiettivo}</span>
            </div>
            {dati.motore && (
              <div className="text-xs text-muted-foreground">
                Richieste preparate questa settimana: {dati.motore.richiesteSettimana}/{dati.motore.obiettivoRichieste} · tetto {dati.motore.tetto} incontri a settimana
                {Math.max(s.fatti + s.fissati, dati.motore.fissatiProssima) >= dati.motore.tetto && <span className="text-amber-600"> · tetto pieno: le richieste nuove sono ferme</span>}
              </div>
            )}
            {s.nomiFatti.length > 0 && <div className="text-xs text-muted-foreground">Fatti: {s.nomiFatti.join(", ")}</div>}
            {s.nomiFissati.length > 0 && <div className="text-xs text-muted-foreground">Fissati: {s.nomiFissati.join(", ")}</div>}
          </CardContent></Card>

          <Card><CardContent className="p-4 space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="text-sm font-semibold">Settimana prossima</div>
              <div className={`text-sm ${s.prossima.length >= s.obiettivo ? "text-green-600 dark:text-green-400 font-semibold" : "text-muted-foreground"}`}>
                {s.prossima.length} fissati su {s.obiettivo}
              </div>
            </div>
            <div className="h-3 rounded bg-muted overflow-hidden"><div className="h-full bg-blue-600" style={{ width: `${Math.min(100, (s.prossima.length / s.obiettivo) * 100)}%` }} /></div>
            {s.prossima.length > 0 && (
              <div className="text-xs text-muted-foreground">
                {s.prossima.map((p) => `${p.nome} (${new Date(p.quando).toLocaleDateString("it-IT", { weekday: "short", day: "numeric" })})`).join(", ")}
              </div>
            )}
          </CardContent></Card>

          <TrackerIncontri tracker={dati.tracker} fissati={dati.calendario} visite={dati.visite} onCambio={carica} />

          <CollegamentiLinkedin dati={dati.linkedin} onCambio={carica} />

          <Card><CardContent className="p-4 space-y-3">
            <div className="text-sm font-semibold">Il seguito: le presentazioni</div>
            {!dati.seguito?.length ? (
              <p className="text-xs text-muted-foreground">Ancora nessuna presentazione chiesta. Dopo il 121 detta il vocale: le persone che il membro conosce bene vanno in Cassetta con il messaggio pronto.</p>
            ) : (
              <div className="space-y-2">
                {dati.seguito.map((p) => (
                  <div key={p.id} className="border-b last:border-0 pb-2 space-y-1">
                    <div className="text-sm">
                      {p.nome} {p.ruolo && <span className="text-muted-foreground">— {p.ruolo}</span>}
                      <span className="text-xs text-muted-foreground"> · tramite <Link href={`/bni/membri/${p.membro.id}`} className="underline">{p.membro.name}</Link></span>
                    </div>
                    <ImbutoPresentazione p={p} onCambio={carica} />
                  </div>
                ))}
              </div>
            )}
          </CardContent></Card>

        </>
      ) : null}
    </div>
  );
}
