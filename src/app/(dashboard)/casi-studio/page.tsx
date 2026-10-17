"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { STATI_CASO, data } from "@/components/ricerca/etichette";
import { LanciaAdesso } from "@/components/ricerca/lancia-adesso";

interface Chiave {
  id: string;
  tipo: string;
  valore: string;
  attiva: boolean;
  zonaIndice: number;
  usi: number;
  trovati: number;
  _count: { ritrovamenti: number };
}
interface Caso {
  id: string;
  titolo: string;
  settore: string | null;
  aziendaNome: string | null;
  personaNome: string | null;
  storia: string | null;
  stato: "DA_CONFERMARE" | "ATTIVO" | "SCADUTO";
  validoFino: string | null;
  createdAt: string;
  chiavi: Chiave[];
}

export default function CasiStudioPage() {
  const [casi, setCasi] = useState<Caso[] | null>(null);
  const [carico, setCarico] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const carica = useCallback(async () => {
    const r = await fetch("/api/ricerca/casi-studio");
    const d = await r.json();
    setCasi(d.casi ?? []);
  }, []);
  useEffect(() => {
    carica();
  }, [carica]);

  async function caricaPdf(file: File) {
    setCarico(true);
    try {
      const form = new FormData();
      form.append("pdf", file);
      const r = await fetch("/api/ricerca/casi-studio", { method: "POST", body: form });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Errore");
      toast.success("Letto: controlla le chiavi e conferma");
      window.location.href = `/casi-studio/${d.caso.id}`;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    } finally {
      setCarico(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="space-y-5 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6 text-primary" /> Casi studio</h1>
          <p className="text-sm text-muted-foreground">Ogni caso dice cosa cercare prima: aziende dello stesso settore, aziende simili, persone simili al titolare. Vale 6 mesi.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <LanciaAdesso squadra="ricerca" etichetta="Cerca adesso" onFatto={carica} />
          <input ref={input} type="file" accept="application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && caricaPdf(e.target.files[0])} />
          <Button onClick={() => input.current?.click()} disabled={carico}>
            {carico ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />} {carico ? "Lo sto leggendo…" : "Carica un PDF"}
          </Button>
        </div>
      </div>

      {!casi ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
      ) : casi.length === 0 ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground text-center">Nessun caso studio. Carica il PDF di un cliente: l&apos;agente ne ricava la storia da 30 secondi e le chiavi di ricerca.</CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {casi.map((c) => {
            const trovati = c.chiavi.reduce((n, k) => n + k._count.ritrovamenti, 0);
            return (
              <Link key={c.id} href={`/casi-studio/${c.id}`} className="block">
                <Card className={`hover:border-primary transition h-full ${c.stato === "DA_CONFERMARE" ? "border-amber-400" : ""}`}><CardContent className="p-4 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold break-words">{c.titolo}</span>
                    <Badge variant={c.stato === "ATTIVO" ? "default" : "secondary"} className="text-[10px]">{STATI_CASO[c.stato]}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">{[c.settore, c.aziendaNome, c.personaNome].filter(Boolean).join(" · ")}</div>
                  {c.storia && <p className="text-sm line-clamp-3 whitespace-pre-wrap">{c.storia}</p>}
                  <div className="text-xs text-muted-foreground">
                    {c.stato === "ATTIVO" && c.validoFino ? `Valido fino al ${data(c.validoFino)} · ` : ""}{trovati} trovati
                  </div>
                </CardContent></Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
