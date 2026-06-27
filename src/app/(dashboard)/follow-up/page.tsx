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
  Repeat,
  Send,
  CheckCircle2,
  Video,
  Archive,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Entry {
  id: string;
  name: string;
  email: string | null;
  sentAt: string | null;
  followupAt: string | null;
  hook: string | null;
  status: string;
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

function FollowUpCard({ entry: e, onRefresh }: { entry: Entry; onRefresh: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);

  const markResponded = async () => {
    setBusy("responded");
    try {
      const res = await fetch(`/api/leads/${e.id}/quick-log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RESPONSE_RECEIVED", respondedVia: "email" }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${e.name} → Ha risposto`);
      onRefresh();
    } catch {
      toast.error("Errore nel salvataggio");
    } finally {
      setBusy(null);
    }
  };

  const changeStage = async (stage: string, label: string) => {
    setBusy(stage);
    try {
      const res = await fetch(`/api/leads/${e.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipelineStage: stage }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${e.name} → ${label}`);
      onRefresh();
    } catch {
      toast.error("Errore nello spostamento");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="card-hover">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <Link href={`/leads/${e.id}`}>
              <h3 className="font-semibold text-sm truncate hover:underline">{e.name}</h3>
            </Link>
            {e.email && <p className="text-xs text-muted-foreground truncate">{e.email}</p>}
            {e.hook && (
              <p className="text-xs text-muted-foreground italic mt-1 line-clamp-2">“{e.hook}”</p>
            )}
          </div>
          <Badge className="text-xs shrink-0 flex items-center gap-1 bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
            <Repeat className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">In attesa</span>
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 pt-3 border-t text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Send className="h-3 w-3" /> 1ª mail: {fmtDate(e.sentAt)}
          </span>
          {e.followupAt && (
            <span className="flex items-center gap-1 text-yellow-500">
              <Repeat className="h-3 w-3" /> Richiamo: {fmtDate(e.followupAt)}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
          <Button
            onClick={markResponded}
            disabled={!!busy}
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {busy === "responded" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Ha risposto
          </Button>
          <Button
            onClick={() => changeStage("FARE_VIDEO", "Fare Video")}
            disabled={!!busy}
            size="sm"
            variant="outline"
          >
            {busy === "FARE_VIDEO" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Video className="h-4 w-4 mr-2" />
            )}
            Fare Video
          </Button>
          <Button
            onClick={() => changeStage("ARCHIVIATO", "Archiviato")}
            disabled={!!busy}
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
          >
            {busy === "ARCHIVIATO" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Archive className="h-4 w-4 mr-2" />
            )}
            Archivia
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function FollowUpPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/outreach-log");
      if (!res.ok) throw new Error("Errore nel caricamento");
      const json = await res.json();
      const all: Entry[] = json.entries || [];
      // Solo chi ha ricevuto la mail di richiamo ed è ancora in attesa di risposta
      setEntries(all.filter((e) => e.status === "followup"));
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
          <h1 className="text-2xl font-bold">Follow-up</h1>
          <p className="text-sm text-muted-foreground">
            Lead a cui è partita la mail di richiamo dopo qualche giorno, in attesa di risposta
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{entries.length} lead</Badge>
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
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Repeat className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Nessun follow-up in corso</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Qui appaiono i lead a cui è stata inviata la mail di richiamo (“ti era arrivata la mail
              di qualche giorno fa?”) e che non hanno ancora risposto.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <FollowUpCard key={e.id} entry={e} onRefresh={fetchData} />
          ))}
        </div>
      )}
    </div>
  );
}
