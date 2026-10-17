"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Handshake, RefreshCw } from "lucide-react";
import { LanciaAdesso } from "@/components/ricerca/lancia-adesso";
import { CollegaCalendario } from "@/components/ricerca/collega-calendario";
import { CollegamentiLinkedin, type StatoLinkedin } from "@/components/ricerca/collegamenti-linkedin";
import { TrackerIncontri, type Fissato, type Tracker, type Visita } from "@/components/ricerca/tracker-incontri";

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
  const [dati, setDati] = useState<{ settimana: Settimana; calendario: Fissato[]; tracker: Tracker; visite: Visita[]; linkedin: StatoLinkedin } | null>(null);
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
          <p className="text-sm text-muted-foreground">Cosa fare con i 121: obiettivo 8 a settimana. I messaggi sono già scritti: li mandi da qui con WhatsApp. Chi è chi nei capitoli lo trovi nella Rubrica BNI.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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

        </>
      ) : null}
    </div>
  );
}
