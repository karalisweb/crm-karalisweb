"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Eye,
  RefreshCw,
  AlertTriangle,
  Phone,
  CheckCircle2,
  ChevronRight,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Lead {
  id: string;
  name: string;
  phone: string | null;
  category: string | null;
  opportunityScore: number | null;
  videoSentAt: string | null;
  videoViewedAt: string | null;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function VideoVistoCard({ lead, onAction }: { lead: Lead; onAction: () => void }) {
  const [loading, setLoading] = useState<string | null>(null);

  const markResponded = async (via: string) => {
    setLoading(via);
    try {
      const res = await fetch(`/api/leads/${lead.id}/quick-log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RESPONSE_RECEIVED", respondedVia: via }),
      });
      if (!res.ok) throw new Error("Errore");
      toast.success(`${lead.name} → Ha risposto`);
      onAction();
    } catch {
      toast.error("Errore nel salvataggio");
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card className="card-hover">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <Link href={`/leads/${lead.id}`}>
              <h3 className="font-semibold text-sm truncate hover:underline">{lead.name}</h3>
            </Link>
            <p className="text-xs text-muted-foreground">
              {lead.category}
              {lead.opportunityScore != null && ` · Score: ${lead.opportunityScore}`}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1 text-green-500">
                <Eye className="h-3 w-3" /> Visto: {fmtDate(lead.videoViewedAt)}
              </span>
              <span>Inviato: {fmtDate(lead.videoSentAt)}</span>
            </div>
          </div>
          <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-xs shrink-0">
            Ha visto il video
          </Badge>
        </div>

        <div className="flex gap-2 mt-3 pt-3 border-t">
          {lead.phone && (
            <Button asChild size="sm" className="flex-1 bg-purple-600 hover:bg-purple-700 text-white">
              <a href={`tel:${lead.phone}`}>
                <Phone className="h-4 w-4 mr-2" /> Chiama
              </a>
            </Button>
          )}
          <Button
            onClick={() => markResponded("telefono")}
            disabled={!!loading}
            variant="outline"
            size="sm"
          >
            {loading === "telefono" ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Ha risposto
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/leads/${lead.id}`}>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function VideoVistiPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/video-visti");
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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Video Visti</h1>
          <p className="text-sm text-muted-foreground">
            Hanno aperto il video: sono i più caldi, chiamali ora
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{total} lead</Badge>
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
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : leads.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Eye className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Nessun video visto ancora</h3>
            <p className="text-sm text-muted-foreground">
              Quando un prospect apre il video che gli hai inviato, comparirà qui.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => (
            <VideoVistoCard key={lead.id} lead={lead} onAction={fetchData} />
          ))}
        </div>
      )}
    </div>
  );
}
