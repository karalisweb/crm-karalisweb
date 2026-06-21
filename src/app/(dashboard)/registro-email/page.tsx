"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Mail,
  RefreshCw,
  AlertTriangle,
  Send,
  Repeat,
  CheckCircle2,
  Archive,
  Ban,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Status = "sent" | "followup" | "responded" | "expired" | "unsubscribed";

interface Entry {
  id: string;
  name: string;
  email: string | null;
  sentAt: string | null;
  followupAt: string | null;
  respondedAt: string | null;
  respondedVia: string | null;
  subject: string | null;
  hook: string | null;
  status: Status;
}

interface Stats {
  total: number;
  sent: number;
  followup: number;
  responded: number;
  expired: number;
  unsubscribed: number;
}

const STATUS_META: Record<
  Status,
  { label: string; className: string; icon: React.ReactNode }
> = {
  sent: {
    label: "Inviata · in attesa",
    className: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    icon: <Send className="h-3.5 w-3.5" />,
  },
  followup: {
    label: "Follow-up · in attesa",
    className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    icon: <Repeat className="h-3.5 w-3.5" />,
  },
  responded: {
    label: "Ha risposto",
    className: "bg-green-500/10 text-green-500 border-green-500/20",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  expired: {
    label: "Archiviato · nessuna risposta",
    className: "bg-muted text-muted-foreground border-border",
    icon: <Archive className="h-3.5 w-3.5" />,
  },
  unsubscribed: {
    label: "Disiscritto",
    className: "bg-red-500/10 text-red-500 border-red-500/20",
    icon: <Ban className="h-3.5 w-3.5" />,
  },
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Filter = "all" | "waiting" | "responded" | "expired";

export default function RegistroEmailPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/outreach-log");
      if (!res.ok) throw new Error("Errore nel caricamento");
      const json = await res.json();
      setEntries(json.entries || []);
      setStats(json.stats || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = entries.filter((e) => {
    if (filter === "all") return true;
    if (filter === "waiting") return e.status === "sent" || e.status === "followup";
    if (filter === "responded") return e.status === "responded";
    if (filter === "expired") return e.status === "expired";
    return true;
  });

  const filterButtons: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "Tutti", count: stats?.total ?? 0 },
    { key: "waiting", label: "In attesa", count: (stats?.sent ?? 0) + (stats?.followup ?? 0) },
    { key: "responded", label: "Hanno risposto", count: stats?.responded ?? 0 },
    { key: "expired", label: "Archiviati", count: stats?.expired ?? 0 },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Registro Email</h1>
          <p className="text-sm text-muted-foreground">
            Tutte le mail di primo contatto: inviate, follow-up, risposte e archiviazioni
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
          Aggiorna
        </Button>
      </div>

      {/* Statistiche rapide */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatBox label="Mail inviate" value={stats.total} icon={<Mail className="h-4 w-4" />} />
          <StatBox label="In attesa" value={stats.sent + stats.followup} icon={<Repeat className="h-4 w-4" />} />
          <StatBox label="Risposte" value={stats.responded} icon={<CheckCircle2 className="h-4 w-4" />} accent="green" />
          <StatBox label="Archiviati" value={stats.expired} icon={<Archive className="h-4 w-4" />} />
        </div>
      )}

      {/* Filtri */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {filterButtons.map((b) => (
          <Button
            key={b.key}
            size="sm"
            variant={filter === b.key ? "default" : "outline"}
            onClick={() => setFilter(b.key)}
            className="whitespace-nowrap shrink-0"
          >
            {b.label}
            <Badge variant="secondary" className="ml-2">
              {b.count}
            </Badge>
          </Button>
        ))}
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
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Nessuna mail in questo filtro</h3>
            <p className="text-sm text-muted-foreground">
              Le mail di primo contatto inviate dal sistema appariranno qui.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((e) => {
            const meta = STATUS_META[e.status];
            return (
              <Card key={e.id} className="card-hover">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <Link href={`/leads/${e.id}`}>
                        <h3 className="font-semibold text-sm truncate hover:underline">{e.name}</h3>
                      </Link>
                      {e.email && (
                        <p className="text-xs text-muted-foreground truncate">{e.email}</p>
                      )}
                      {e.hook && (
                        <p className="text-xs text-muted-foreground italic mt-1 line-clamp-2">
                          “{e.hook}”
                        </p>
                      )}
                    </div>
                    <Badge className={cn("text-xs shrink-0 flex items-center gap-1", meta.className)}>
                      {meta.icon}
                      <span className="hidden sm:inline">{meta.label}</span>
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 pt-3 border-t text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Send className="h-3 w-3" /> Inviata: {fmtDate(e.sentAt)}
                    </span>
                    {e.followupAt && (
                      <span className="flex items-center gap-1">
                        <Repeat className="h-3 w-3" /> Follow-up: {fmtDate(e.followupAt)}
                      </span>
                    )}
                    {e.respondedAt && (
                      <span className="flex items-center gap-1 text-green-500">
                        <CheckCircle2 className="h-3 w-3" /> Risposto: {fmtDate(e.respondedAt)}
                        {e.respondedVia ? ` (${e.respondedVia})` : ""}
                      </span>
                    )}
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

function StatBox({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent?: "green";
}) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
          {icon}
          {label}
        </div>
        <p className={cn("text-2xl font-bold", accent === "green" && "text-green-500")}>{value}</p>
      </CardContent>
    </Card>
  );
}
