"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RefreshCw,
  Loader2,
  AlertTriangle,
  ChevronRight,
  Linkedin,
  ArrowRight,
  Archive,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Lead {
  id: string;
  name: string;
  website: string | null;
  category: string | null;
  opportunityScore: number | null;
}

function LinkedInCard({
  lead,
  onAction,
}: {
  lead: Lead;
  onAction: () => void;
}) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleAction = async (action: string) => {
    setLoading(action);
    try {
      const res = await fetch(`/api/leads/${lead.id}/quick-log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("Errore");
      const labels: Record<string, string> = {
        LINKEDIN_SENT: "Connessione LinkedIn inviata",
        MARK_ARCHIVED: "Lead archiviato",
      };
      toast.success(labels[action] || "Azione completata");
      onAction();
    } catch {
      toast.error("Errore nell'azione");
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
              <h3 className="font-semibold text-sm truncate hover:underline">
                {lead.name}
              </h3>
            </Link>
            <p className="text-xs text-muted-foreground">
              {lead.category}
              {lead.opportunityScore && ` · Score: ${lead.opportunityScore}`}
            </p>
          </div>
          <Badge
            variant="secondary"
            className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-xs flex-shrink-0"
          >
            LinkedIn
          </Badge>
        </div>

        <div className="flex gap-2 mt-3 pt-3 border-t">
          <Button
            onClick={() => handleAction("LINKEDIN_SENT")}
            disabled={!!loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            size="sm"
          >
            {loading === "LINKEDIN_SENT" ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <ArrowRight className="h-4 w-4 mr-2" />
            )}
            Connessione Inviata
          </Button>
          <Button
            onClick={() => handleAction("MARK_ARCHIVED")}
            disabled={!!loading}
            variant="outline"
            className="border-orange-500/50 text-orange-500 hover:bg-orange-500/10"
            size="sm"
          >
            {loading === "MARK_ARCHIVED" ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Archive className="h-4 w-4 mr-2" />
            )}
            Archivia
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

export default function LinkedInPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/leads?stage=LINKEDIN&pageSize=50");
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
          <h1 className="text-2xl font-bold">LinkedIn</h1>
          <p className="text-sm text-muted-foreground">
            Lead da contattare via LinkedIn
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{total} lead</Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
          >
            <RefreshCw
              className={cn("h-4 w-4 mr-2", loading && "animate-spin")}
            />
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
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : leads.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Linkedin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">
              Nessun lead LinkedIn
            </h3>
            <p className="text-sm text-muted-foreground">
              I lead da contattare via LinkedIn appariranno qui.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => (
            <LinkedInCard key={lead.id} lead={lead} onAction={fetchData} />
          ))}
        </div>
      )}
    </div>
  );
}
