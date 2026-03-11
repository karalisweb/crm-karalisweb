"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Trash2, RotateCcw, Plus, Download } from "lucide-react";

interface ScheduledSearch {
  id: string;
  query: string;
  location: string;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";
  priority: number;
  lastRunAt: string | null;
  searchId: string | null;
  errorMessage: string | null;
  createdAt: string;
}

const STATUS_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  QUEUED: { label: "In coda", variant: "outline" },
  RUNNING: { label: "In esecuzione", variant: "default" },
  COMPLETED: { label: "Completata", variant: "secondary" },
  FAILED: { label: "Fallita", variant: "destructive" },
};

export function ScheduledSearchesTab() {
  const [searches, setSearches] = useState<ScheduledSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [newQuery, setNewQuery] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [seeding, setSeeding] = useState(false);

  const fetchSearches = useCallback(async () => {
    try {
      const res = await fetch("/api/scheduled-searches");
      if (res.ok) {
        setSearches(await res.json());
      }
    } catch (error) {
      console.error("Error fetching scheduled searches:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSearches();
  }, [fetchSearches]);

  async function seedDefaults() {
    setSeeding(true);
    try {
      const res = await fetch("/api/scheduled-searches/seed", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        fetchSearches();
      } else {
        toast.error(data.error || "Errore nel caricamento");
      }
    } catch {
      toast.error("Errore nel caricamento lista predefinita");
    } finally {
      setSeeding(false);
    }
  }

  async function addSearch() {
    if (!newQuery.trim() || !newLocation.trim()) {
      toast.error("Inserisci categoria e citta");
      return;
    }
    try {
      const res = await fetch("/api/scheduled-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          searches: [{ query: newQuery.trim(), location: newLocation.trim() }],
        }),
      });
      if (res.ok) {
        toast.success("Ricerca aggiunta alla coda");
        setNewQuery("");
        setNewLocation("");
        fetchSearches();
      } else {
        const data = await res.json();
        toast.error(data.error || "Errore");
      }
    } catch {
      toast.error("Errore nell'aggiunta");
    }
  }

  async function deleteSearch(id: string) {
    try {
      const res = await fetch(`/api/scheduled-searches/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Ricerca rimossa");
        setSearches((prev) => prev.filter((s) => s.id !== id));
      }
    } catch {
      toast.error("Errore nella rimozione");
    }
  }

  async function requeueSearch(id: string) {
    try {
      const res = await fetch(`/api/scheduled-searches/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requeue: true }),
      });
      if (res.ok) {
        toast.success("Ricerca rimessa in coda");
        fetchSearches();
      }
    } catch {
      toast.error("Errore nel re-queue");
    }
  }

  const queued = searches.filter((s) => s.status === "QUEUED").length;
  const completed = searches.filter((s) => s.status === "COMPLETED").length;
  const failed = searches.filter((s) => s.status === "FAILED").length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Ricerche Programmate</CardTitle>
          <CardDescription>
            Vengono eseguite automaticamente 2 ricerche per notte alle 02:00.
            Ogni ricerca importa fino a 50 lead da Google Maps.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Statistiche */}
          <div className="flex gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{queued}</Badge>
              <span className="text-sm text-muted-foreground">In coda</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{completed}</Badge>
              <span className="text-sm text-muted-foreground">Completate</span>
            </div>
            {failed > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="destructive">{failed}</Badge>
                <span className="text-sm text-muted-foreground">Fallite</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Totale: {searches.length} | ~{Math.ceil(queued / 2)} notti rimanenti
              </span>
            </div>
          </div>

          {/* Azioni rapide */}
          <div className="flex gap-2 flex-wrap">
            <Button onClick={seedDefaults} variant="outline" disabled={seeding}>
              {seeding ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Carica Lista Predefinita (39 ricerche)
            </Button>
          </div>

          {/* Form aggiunta manuale */}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Input
                placeholder="Categoria (es. Infissi)"
                value={newQuery}
                onChange={(e) => setNewQuery(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Input
                placeholder="Citta (es. Lecce)"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
              />
            </div>
            <Button onClick={addSearch}>
              <Plus className="h-4 w-4 mr-1" />
              Aggiungi
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista ricerche */}
      <Card>
        <CardHeader>
          <CardTitle>Coda Ricerche</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : searches.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nessuna ricerca programmata. Usa &quot;Carica Lista Predefinita&quot; per iniziare.
            </p>
          ) : (
            <div className="space-y-2">
              {searches.map((search) => {
                const badge = STATUS_BADGES[search.status];
                return (
                  <div
                    key={search.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {search.query} — {search.location}
                        </p>
                        {search.lastRunAt && (
                          <p className="text-xs text-muted-foreground">
                            Ultima esecuzione: {new Date(search.lastRunAt).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        )}
                        {search.errorMessage && (
                          <p className="text-xs text-destructive truncate">
                            {search.errorMessage}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {(search.status === "COMPLETED" || search.status === "FAILED") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => requeueSearch(search.id)}
                          title="Rimetti in coda"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteSearch(search.id)}
                        title="Rimuovi"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
