"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Inbox, RefreshCw, AlertTriangle, Check, X, Globe, Star } from "lucide-react";
import { toast } from "sonner";
import { LeveList } from "@/components/agents/leve-list";
import type { Leva } from "@/lib/agents/tipi";

type Stato = "IN_ATTESA" | "APPROVATO" | "SCARTATO";

interface Voce {
  id: string;
  kind: string;
  title: string;
  status: Stato;
  createdAt: string;
  decidedAt: string | null;
  payload: { sito?: string; leve?: Leva[]; riepiloghi?: Record<string, string> };
  lead: {
    id: string;
    name: string;
    website: string | null;
    category: string | null;
    address: string | null;
    googleRating: string | number | null;
    googleReviewsCount: number | null;
  };
}

const TAB: { stato: Stato; label: string }[] = [
  { stato: "IN_ATTESA", label: "Da decidere" },
  { stato: "APPROVATO", label: "Approfondire" },
  { stato: "SCARTATO", label: "Scartate" },
];

export default function CassettaPage() {
  const [stato, setStato] = useState<Stato>("IN_ATTESA");
  const [voci, setVoci] = useState<Voce[]>([]);
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
      setConteggi((c) => ({
        ...c,
        IN_ATTESA: Math.max((c.IN_ATTESA ?? 1) - 1, 0),
        [decisione]: (c[decisione] ?? 0) + 1,
      }));
      toast.success(decisione === "APPROVATO" ? "Da approfondire" : "Scartata");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    } finally {
      setInDecisione(null);
    }
  }

  return (
    <div className="space-y-5 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Inbox className="h-6 w-6 text-primary" />
            Cassetta
          </h1>
          <p className="text-sm text-muted-foreground">
            Le aziende in cui la squadra ha trovato abbastanza leve. Decidi tu su quali approfondire.
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
      ) : voci.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {stato === "IN_ATTESA"
              ? "Niente da decidere. La squadra lavora di notte: domattina qui trovi le aziende nuove."
              : "Nessuna voce."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {voci.map((v) => {
            const leve = v.payload.leve ?? [];
            const rating = v.lead.googleRating != null ? Number(v.lead.googleRating) : null;
            return (
              <Card key={v.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/leads/${v.lead.id}`} className="font-semibold hover:underline break-words">
                        {v.lead.name}
                      </Link>
                      <Badge variant="secondary" className="text-[10px]">{leve.length} leve</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                      {v.lead.category && <span>{v.lead.category}</span>}
                      {rating != null && (
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3" /> {rating.toFixed(1)} ({v.lead.googleReviewsCount ?? 0})
                        </span>
                      )}
                      {v.lead.website && (
                        <a href={v.lead.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline min-w-0 truncate">
                          <Globe className="h-3 w-3 shrink-0" />
                          <span className="truncate">{v.lead.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</span>
                        </a>
                      )}
                    </div>
                  </div>

                  <LeveList leve={leve} />

                  {v.status === "IN_ATTESA" ? (
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" className="flex-1 sm:flex-none" onClick={() => decidi(v.id, "APPROVATO")} disabled={inDecisione === v.id}>
                        <Check className="h-4 w-4 mr-1" /> Approfondisci
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 sm:flex-none" onClick={() => decidi(v.id, "SCARTATO")} disabled={inDecisione === v.id}>
                        <X className="h-4 w-4 mr-1" /> Scarta
                      </Button>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      Decisa il {v.decidedAt ? new Date(v.decidedAt).toLocaleDateString("it-IT") : "—"}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
