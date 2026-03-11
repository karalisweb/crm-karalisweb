"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Trash2, RotateCcw, Plus, Download, Save, Settings } from "lucide-react";

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

interface ScheduledConfig {
  scheduledSearchesPerRun: number;
  scheduledSearchHour: number;
  scheduledLeadsPerSearch: number;
}

const STATUS_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  QUEUED: { label: "In coda", variant: "outline" },
  RUNNING: { label: "In esecuzione", variant: "default" },
  COMPLETED: { label: "Completata", variant: "secondary" },
  FAILED: { label: "Fallita", variant: "destructive" },
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const LEADS_OPTIONS = [10, 20, 30, 50, 100];

export function ScheduledSearchesTab() {
  const [searches, setSearches] = useState<ScheduledSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [newQuery, setNewQuery] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [seeding, setSeeding] = useState(false);

  // Configurazione
  const [config, setConfig] = useState<ScheduledConfig>({
    scheduledSearchesPerRun: 1,
    scheduledSearchHour: 2,
    scheduledLeadsPerSearch: 50,
  });
  const [configLoading, setConfigLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);

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

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/crm");
      if (res.ok) {
        const data = await res.json();
        setConfig({
          scheduledSearchesPerRun: data.scheduledSearchesPerRun ?? 1,
          scheduledSearchHour: data.scheduledSearchHour ?? 2,
          scheduledLeadsPerSearch: data.scheduledLeadsPerSearch ?? 50,
        });
      }
    } catch (error) {
      console.error("Error fetching config:", error);
    } finally {
      setConfigLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSearches();
    fetchConfig();
  }, [fetchSearches, fetchConfig]);

  async function saveConfig() {
    setSavingConfig(true);
    try {
      const res = await fetch("/api/settings/crm", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        toast.success("Configurazione salvata");
      } else {
        const data = await res.json();
        toast.error(data.error || "Errore nel salvataggio");
      }
    } catch {
      toast.error("Errore nel salvataggio configurazione");
    } finally {
      setSavingConfig(false);
    }
  }

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
  const nightsRemaining = config.scheduledSearchesPerRun > 0
    ? Math.ceil(queued / config.scheduledSearchesPerRun)
    : queued;

  return (
    <div className="space-y-4">
      {/* Pannello Configurazione */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurazione Ricerche Automatiche
          </CardTitle>
          <CardDescription>
            Imposta quante ricerche eseguire, a che ora e quanti lead importare per ogni ricerca.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {configLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Ricerche per esecuzione */}
                <div className="space-y-2">
                  <Label htmlFor="searches-per-run">Ricerche per esecuzione</Label>
                  <Select
                    value={String(config.scheduledSearchesPerRun)}
                    onValueChange={(v) =>
                      setConfig((prev) => ({ ...prev, scheduledSearchesPerRun: Number(v) }))
                    }
                  >
                    <SelectTrigger id="searches-per-run">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n} {n === 1 ? "ricerca" : "ricerche"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Quante ricerche eseguire per notte</p>
                </div>

                {/* Ora esecuzione */}
                <div className="space-y-2">
                  <Label htmlFor="search-hour">Ora esecuzione</Label>
                  <Select
                    value={String(config.scheduledSearchHour)}
                    onValueChange={(v) =>
                      setConfig((prev) => ({ ...prev, scheduledSearchHour: Number(v) }))
                    }
                  >
                    <SelectTrigger id="search-hour">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HOURS.map((h) => (
                        <SelectItem key={h} value={String(h)}>
                          {String(h).padStart(2, "0")}:00
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Ora italiana di esecuzione</p>
                </div>

                {/* Lead per ricerca */}
                <div className="space-y-2">
                  <Label htmlFor="leads-per-search">Lead per ricerca</Label>
                  <Select
                    value={String(config.scheduledLeadsPerSearch)}
                    onValueChange={(v) =>
                      setConfig((prev) => ({ ...prev, scheduledLeadsPerSearch: Number(v) }))
                    }
                  >
                    <SelectTrigger id="leads-per-search">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEADS_OPTIONS.map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n} lead
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Massimo lead importati per ricerca</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-muted-foreground">
                  Ogni notte alle {String(config.scheduledSearchHour).padStart(2, "0")}:00 verranno
                  eseguite {config.scheduledSearchesPerRun}{" "}
                  {config.scheduledSearchesPerRun === 1 ? "ricerca" : "ricerche"} con max{" "}
                  {config.scheduledLeadsPerSearch} lead ciascuna.
                </p>
                <Button onClick={saveConfig} disabled={savingConfig}>
                  {savingConfig ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salva
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Coda Ricerche */}
      <Card>
        <CardHeader>
          <CardTitle>Coda Ricerche</CardTitle>
          <CardDescription>
            Gestisci le ricerche programmate. L&apos;audit parte in automatico per ogni lead con sito web.
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
                Totale: {searches.length} | ~{nightsRemaining} notti rimanenti
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
          <CardTitle>Lista Ricerche</CardTitle>
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
