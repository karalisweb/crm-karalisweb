"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Handshake, RefreshCw } from "lucide-react";
import { LanciaAdesso } from "@/components/ricerca/lancia-adesso";
import { TrackerIncontri, type Fissato, type Tracker, type Visita } from "@/components/ricerca/tracker-incontri";

interface Settimana {
  obiettivo: number;
  fatti: number;
  fissati: number;
  richiesteAperte: number;
  inizio: string;
}

export default function Bni121Page() {
  const [dati, setDati] = useState<{ settimana: Settimana; calendario: Fissato[]; tracker: Tracker; visite: Visita[] } | null>(null);
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
          <p className="text-sm text-muted-foreground">Cosa fare con i 121: obiettivo 10 a settimana. I messaggi sono già scritti: li mandi da qui con WhatsApp. Chi è chi nei capitoli lo trovi nella Rubrica BNI.</p>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardContent className="p-4">
              <div className={`text-2xl font-bold ${fatti >= s.obiettivo ? "text-green-600 dark:text-green-400" : ""}`}>{fatti}/{s.obiettivo}</div>
              <div className="text-xs text-muted-foreground">121 questa settimana</div>
              <div className="mt-2 h-1.5 rounded bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: `${Math.min(100, (fatti / s.obiettivo) * 100)}%` }} /></div>
            </CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-2xl font-bold">{s.fatti}</div><div className="text-xs text-muted-foreground">Fatti</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-2xl font-bold">{s.fissati}</div><div className="text-xs text-muted-foreground">In calendario</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-2xl font-bold">{s.richiesteAperte}</div><div className="text-xs text-muted-foreground">Richieste aperte (obiettivo 15)</div></CardContent></Card>
          </div>

          <TrackerIncontri tracker={dati.tracker} fissati={dati.calendario} visite={dati.visite} onCambio={carica} />

        </>
      ) : null}
    </div>
  );
}
