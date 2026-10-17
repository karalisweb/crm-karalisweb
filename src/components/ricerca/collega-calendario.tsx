"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Stato {
  collegato: boolean;
  ultimaLettura: string | null;
  errore: string | null;
  esito: string | null;
}

/** Il riquadro per collegare il Google Calendar di Alessio (link segreto iCal). */
export function CollegaCalendario({ onCambio }: { onCambio: () => void }) {
  const [stato, setStato] = useState<Stato | null>(null);
  const [url, setUrl] = useState("");
  const [occupato, setOccupato] = useState(false);
  const [versione, setVersione] = useState(0);

  useEffect(() => {
    let vivo = true;
    fetch("/api/ricerca/bni/calendario").then((r) => r.json()).then((d) => vivo && setStato(d));
    return () => {
      vivo = false;
    };
  }, [versione]);

  async function invia(body: Record<string, string>) {
    setOccupato(true);
    try {
      const r = await fetch("/api/ricerca/bni/calendario", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Errore");
      if (body.azione === "scollega") toast.success("Calendario scollegato");
      else toast.success(`Calendario letto: ${d.fissati} incontri fissati, ${d.fatti} fatti${d.nonAbbinati?.length ? ` · non riconosciuti: ${d.nonAbbinati.join(", ")}` : ""}`, { duration: 10000 });
      setUrl("");
      setVersione((v) => v + 1);
      onCambio();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    } finally {
      setOccupato(false);
    }
  }

  if (!stato) return null;
  if (stato.collegato) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <CalendarCheck className="h-4 w-4 text-green-600" />
        <span>
          Calendario collegato: gli incontri prenotati entrano da soli.
          {stato.ultimaLettura && ` Ultima lettura ${new Date(stato.ultimaLettura).toLocaleString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`}
          {stato.esito && ` (${stato.esito})`}
        </span>
        {stato.errore && <span className="text-red-600">· Problema: {stato.errore}</span>}
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => invia({ azione: "leggi" })} disabled={occupato}>
          {occupato && <Loader2 className="h-3 w-3 mr-1 animate-spin" />} Rileggi adesso
        </Button>
      </div>
    );
  }
  return (
    <Card className="border-blue-600"><CardContent className="p-4 space-y-3 text-sm">
      <div className="font-semibold flex items-center gap-2"><CalendarCheck className="h-4 w-4 text-blue-600" /> Collega il tuo Google Calendar</div>
      <p className="text-muted-foreground">Così gli incontri che ti prenotano entrano da soli tra i fissati, e diventano &quot;fatti&quot; quando la data è passata.</p>
      <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
        <li>Apri Google Calendar dal computer → ingranaggio → <b>Impostazioni</b>.</li>
        <li>A sinistra, sotto &quot;Impostazioni dei miei calendari&quot;, clicca il tuo calendario.</li>
        <li>Scorri fino a <b>&quot;Indirizzo segreto in formato iCal&quot;</b> e copialo.</li>
        <li>Incollalo qui sotto. Resta salvato nel CRM e non si vede più.</li>
      </ol>
      <div className="flex flex-wrap gap-2">
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://calendar.google.com/calendar/ical/…/basic.ics" className="flex-1 min-w-[240px]" type="password" autoComplete="off" />
        <Button onClick={() => invia({ url })} disabled={occupato || !url.trim()}>
          {occupato && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Collega
        </Button>
      </div>
    </CardContent></Card>
  );
}
