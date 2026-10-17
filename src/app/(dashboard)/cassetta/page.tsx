"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Inbox, RefreshCw, AlertTriangle, Check, X } from "lucide-react";
import { toast } from "sonner";
import { AZIONI, CorpoVoce, siDopoCall, type VoceCassetta } from "@/components/agents/voci-cassetta";
import { CallFissataDialog } from "@/components/vendita/call-fissata-dialog";

type Stato = "IN_ATTESA" | "APPROVATO" | "SCARTATO";
type Area = "tutto" | "vendita" | "aziende" | "bni";

const TAB: { stato: Stato; label: string }[] = [
  { stato: "IN_ATTESA", label: "Da decidere" },
  { stato: "APPROVATO", label: "Approvate" },
  { stato: "SCARTATO", label: "Scartate" },
];

const AREE: { area: Area; label: string }[] = [
  { area: "tutto", label: "Tutto" },
  { area: "vendita", label: "Vendita" },
  { area: "aziende", label: "Aziende" },
  { area: "bni", label: "BNI" },
];

/** In cima le voci più vicine a un incontro: schede contatto e messaggi, poi il resto. */
const ORDINE: Record<string, number> = {
  PREPARAZIONE_121: 0, PREPARAZIONE_CALL: 1, DOPO_CALL: 2, RECALL: 3, NURTURING_PROPOSTO: 4, MESSAGGIO_NURTURING: 5,
  MESSAGGIO_BNI: 6, VISITA_CAPITOLO: 7, SCHEDA_CONTATTO: 8, AZIONE_BNI: 9, FASCICOLO_BASE: 10,
};

export default function CassettaPage() {
  const [stato, setStato] = useState<Stato>("IN_ATTESA");
  const [area, setArea] = useState<Area>("tutto");
  const [voci, setVoci] = useState<VoceCassetta[]>([]);
  const [conteggi, setConteggi] = useState<Partial<Record<Stato, number>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inDecisione, setInDecisione] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/cassetta?stato=${stato}`);
      if (!r.ok) throw new Error("Errore nel caricamento della cassetta");
      const d = await r.json();
      setVoci(d.voci || []);
      setConteggi(d.conteggi || {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
    } finally {
      setLoading(false);
    }
  }, [stato]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function decidi(id: string, decisione: "APPROVATO" | "SCARTATO") {
    setInDecisione(id);
    try {
      const r = await fetch(`/api/cassetta/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decisione }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Errore");
      setVoci((v) => v.filter((x) => x.id !== id));
      setConteggi((c) => ({ ...c, IN_ATTESA: Math.max((c.IN_ATTESA ?? 1) - 1, 0), [decisione]: (c[decisione] ?? 0) + 1 }));
      toast.success(decisione === "APPROVATO" ? "Fatto" : "Scartata");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    } finally {
      setInDecisione(null);
    }
  }

  const visibili = voci
    .filter((v) =>
      area === "tutto" ||
      (area === "vendita" ? !!v.trattativa : area === "bni" ? !v.lead && !v.trattativa : !!v.lead && !v.trattativa)
    )
    .sort((a, b) => (ORDINE[a.kind] ?? 9) - (ORDINE[b.kind] ?? 9));

  return (
    <div className="space-y-5 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Inbox className="h-6 w-6 text-primary" />
            Da approvare
          </h1>
          <p className="text-sm text-muted-foreground">
            Messaggi e proposte che gli agenti hanno preparato per te. Niente parte finché non lo approvi.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} aria-label="Aggiorna">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TAB.map((t) => (
          <button
            key={t.stato}
            onClick={() => setStato(t.stato)}
            className={`text-xs px-2.5 py-1 rounded-md border transition ${stato === t.stato ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 hover:bg-muted border-transparent"}`}
          >
            {t.label} {conteggi[t.stato] ? `(${conteggi[t.stato]})` : ""}
          </button>
        ))}
        <span className="w-px bg-border mx-1" />
        {AREE.map((a) => (
          <button
            key={a.area}
            onClick={() => setArea(a.area)}
            className={`text-xs px-2.5 py-1 rounded-md border transition ${area === a.area ? "border-primary text-primary" : "bg-muted/50 hover:bg-muted border-transparent"}`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {error && (
        <Card className="border-red-500">
          <CardContent className="p-4 text-center text-red-500">
            <AlertTriangle className="h-5 w-5 inline mr-2" />{error}
          </CardContent>
        </Card>
      )}

      {loading && voci.length === 0 ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}</div>
      ) : visibili.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {stato === "IN_ATTESA"
              ? "Niente da decidere. La squadra lavora di notte: domattina qui trovi il lavoro nuovo."
              : "Nessuna voce."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visibili.map((v) => (
            <Card key={v.id}>
              <CardContent className="p-4 space-y-3">
                <CorpoVoce v={v} />
                {v.status === "IN_ATTESA" ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" className="flex-1 sm:flex-none" onClick={() => decidi(v.id, "APPROVATO")} disabled={inDecisione === v.id}>
                      <Check className="h-4 w-4 mr-1" /> {v.kind === "DOPO_CALL" ? siDopoCall(v.payload) : AZIONI[v.kind]?.si ?? "Approva"}
                    </Button>
                    {v.kind === "SCHEDA_CONTATTO" && v.lead && (
                      <CallFissataDialog leadId={v.lead.id} nome={v.lead.name} origine="squadra" daVoce={v.id} variante="outline" />
                    )}
                    <Button size="sm" variant="outline" className="flex-1 sm:flex-none" onClick={() => decidi(v.id, "SCARTATO")} disabled={inDecisione === v.id}>
                      <X className="h-4 w-4 mr-1" /> {AZIONI[v.kind]?.no ?? "Scarta"}
                    </Button>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    Decisa il {v.decidedAt ? new Date(v.decidedAt).toLocaleDateString("it-IT") : "—"}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
