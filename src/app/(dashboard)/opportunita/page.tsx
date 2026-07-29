"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Target, RefreshCw, AlertTriangle, Phone, Globe, Clock, Trash2, Check,
} from "lucide-react";
import { toast } from "sonner";
import { AddOpportunitaDialog } from "@/components/opportunita/add-opportunita-dialog";
import { OPP_STAGES, getOppStage, getOppSource } from "@/lib/opportunita-stages";

interface Opp {
  id: string;
  name: string;
  source: string;
  sourceDetail: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  about: string | null;
  stage: string;
  estimatedValue: number | null;
  nextFollowupAt: string | null;
  notes: string | null;
}

function followupLabel(iso: string | null): { text: string; overdue: boolean } | null {
  if (!iso) return null;
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  if (days < 0) return { text: `scaduto da ${-days}g`, overdue: true };
  if (days === 0) return { text: "oggi", overdue: true };
  if (days === 1) return { text: "domani", overdue: false };
  if (days < 14) return { text: `tra ${days}g`, overdue: false };
  return {
    text: new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short" }),
    overdue: false,
  };
}

export default function OpportunitaPage() {
  const [items, setItems] = useState<Opp[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [followupDue, setFollowupDue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<string>("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/opportunita");
      if (!r.ok) throw new Error("Errore nel caricamento");
      const d = await r.json();
      setItems(d.opportunita || []);
      setOpenCount(d.openCount ?? 0);
      setFollowupDue(d.followupDue ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function patch(id: string, body: Record<string, unknown>) {
    try {
      const r = await fetch(`/api/opportunita/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error("Errore nel salvataggio");
      await fetchData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    }
  }

  async function remove(id: string) {
    if (!confirm("Eliminare questa opportunità?")) return;
    try {
      const r = await fetch(`/api/opportunita/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Errore");
      toast.success("Eliminata");
      await fetchData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    }
  }

  const filtered = useMemo(
    () => (stageFilter ? items.filter((o) => o.stage === stageFilter) : items),
    [items, stageFilter]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            Opportunità
          </h1>
          <p className="text-sm text-muted-foreground">
            Clienti caldi che arrivano da fuori BNI: collega, referral, preventivi. Con promemoria.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <AddOpportunitaDialog onCreated={fetchData} />
        </div>
      </div>

      {error && (
        <Card className="border-red-500">
          <CardContent className="p-4 text-center text-red-500">
            <AlertTriangle className="h-5 w-5 inline mr-2" />{error}
          </CardContent>
        </Card>
      )}

      {/* Stat */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><div className="text-2xl font-bold">{openCount}</div><div className="text-xs text-muted-foreground">Aperte</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className={`text-2xl font-bold ${followupDue > 0 ? "text-rose-500" : ""}`}>{followupDue}</div><div className="text-xs text-muted-foreground">Da risentire ora</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-2xl font-bold">{items.filter((o) => o.stage === "PREVENTIVO").length}</div><div className="text-xs text-muted-foreground">Preventivi in corso</div></CardContent></Card>
      </div>

      {/* Filtro stadio */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setStageFilter("")}
          className={`text-xs px-2.5 py-1 rounded-md border transition ${stageFilter === "" ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 hover:bg-muted border-transparent"}`}
        >Tutte</button>
        {OPP_STAGES.map((s) => (
          <button
            key={s.key}
            onClick={() => setStageFilter(s.key)}
            className={`text-xs px-2.5 py-1 rounded-md border transition ${stageFilter === s.key ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 hover:bg-muted border-transparent"}`}
          >{s.icon} {s.label}</button>
        ))}
      </div>

      {/* Lista */}
      {loading && items.length === 0 ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {items.length === 0
              ? "Nessuna opportunità ancora. Premi “Nuova opportunità” per aggiungere il primo contatto caldo."
              : "Nessuna opportunità in questo stadio."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((o) => {
            const fu = followupLabel(o.nextFollowupAt);
            const stage = getOppStage(o.stage);
            const src = getOppSource(o.source);
            return (
              <Card key={o.id} className={fu?.overdue ? "border-rose-400" : undefined}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate flex items-center gap-2 flex-wrap">
                        {o.name}
                        {stage && (
                          <Badge variant="outline" className={`text-[10px] gap-1 ${stage.color}`}>
                            {stage.icon} {stage.label}
                          </Badge>
                        )}
                        {src && (
                          <Badge variant="secondary" className="text-[10px]">{src.icon} {src.label}</Badge>
                        )}
                        {o.estimatedValue ? (
                          <span className="text-xs text-muted-foreground">≈ {o.estimatedValue.toLocaleString("it-IT")} €</span>
                        ) : null}
                      </div>
                      {o.sourceDetail && (
                        <div className="text-xs text-muted-foreground">{o.sourceDetail}</div>
                      )}
                      {o.about && <p className="text-xs mt-1 line-clamp-2">{o.about}</p>}
                      <div className="flex items-center gap-3 mt-1.5 text-xs">
                        {fu && (
                          <span className={`flex items-center gap-1 ${fu.overdue ? "text-rose-600 dark:text-rose-400 font-medium" : "text-muted-foreground"}`}>
                            <Clock className="h-3 w-3" /> {fu.text}
                          </span>
                        )}
                        {/* Avanzamento stadio rapido */}
                        <select
                          value={o.stage}
                          onChange={(e) => patch(o.id, { stage: e.target.value })}
                          className="h-7 rounded-md border bg-background px-2 text-xs"
                        >
                          {OPP_STAGES.map((s) => (
                            <option key={s.key} value={s.key}>{s.label}</option>
                          ))}
                        </select>
                        {/* Promemoria rapido */}
                        <input
                          type="date"
                          value={o.nextFollowupAt ? o.nextFollowupAt.slice(0, 10) : ""}
                          onChange={(e) => patch(o.id, { nextFollowupAt: e.target.value || null })}
                          className="h-7 rounded-md border bg-background px-2 text-xs"
                          title="Promemoria"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {o.phone && (
                        <a href={`tel:${o.phone}`} className="p-2 rounded-md hover:bg-muted text-muted-foreground" aria-label="Chiama">
                          <Phone className="h-4 w-4" />
                        </a>
                      )}
                      {o.website && (
                        <a href={o.website.startsWith("http") ? o.website : `https://${o.website}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-md hover:bg-muted text-muted-foreground" aria-label="Sito">
                          <Globe className="h-4 w-4" />
                        </a>
                      )}
                      {o.stage !== "VINTO" && (
                        <button onClick={() => patch(o.id, { stage: "VINTO" })} className="p-2 rounded-md hover:bg-emerald-500/10 text-emerald-600" title="Segna vinto">
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                      <button onClick={() => remove(o.id)} className="p-2 rounded-md hover:bg-red-500/10 text-muted-foreground" title="Elimina">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
