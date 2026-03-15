"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Video, RefreshCw, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { UnifiedLeadCard } from "@/components/leads/unified-lead-card";
import type { UnifiedLead } from "@/components/leads/unified-lead-card";

export default function VideoDaFarePage() {
  const [leads, setLeads] = useState<UnifiedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/leads?stage=FARE_VIDEO&pageSize=50");
      if (!res.ok) throw new Error("Errore nel caricamento");
      const json = await res.json();
      setLeads(json.leads || []);
      setTotal(json.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Video da Fare</h1>
          <p className="text-sm text-muted-foreground">
            Workspace di Alessio — Video personalizzati da registrare
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{total} video</Badge>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Aggiorna
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-500">
          <CardContent className="p-4 text-center text-red-500">
            <AlertTriangle className="h-5 w-5 inline mr-2" />
            {error}
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}><CardContent className="p-0">
              <Skeleton className="h-14 w-full" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            </CardContent></Card>
          ))}
        </div>
      ) : leads.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Nessun video da fare</h3>
            <p className="text-sm text-muted-foreground mb-4">
              I lead analizzati appariranno qui con lo script pronto.
            </p>
            <Button asChild><Link href="/da-analizzare">Vai a Da Analizzare</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => (
            <UnifiedLeadCard key={lead.id} lead={lead} variant="video" onAction={fetchData} />
          ))}
        </div>
      )}
    </div>
  );
}
