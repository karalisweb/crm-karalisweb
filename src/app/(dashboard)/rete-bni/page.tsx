"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import {
  Handshake,
  Users,
  Gift,
  Heart,
  Trophy,
  Snowflake,
  RefreshCw,
  AlertTriangle,
  Search,
  Phone,
  Globe,
  CalendarDays,
  ArrowRight,
} from "lucide-react";
import { AddMembroDialog } from "@/components/bni/add-membro-dialog";
import { Register121Dialog, type BniMembroLite } from "@/components/bni/register-121-dialog";

interface Stats {
  membersTotal: number;
  oneToOnesTotal: number;
  oneToOnesThisMonth: number;
  referralsReceived: number;
  membersInterested: number;
  bniLeadsOpen: number;
  bniClients: number;
  coldMembers: number;
}

interface Membro {
  id: string;
  name: string;
  profession: string | null;
  company: string | null;
  chapter: string | null;
  phone: string | null;
  website: string | null;
  status: string;
  oneToOneCount: number;
  lastOneToOneAt: string | null;
  _count?: { referredLeads: number };
}

interface GeneratedLead {
  id: string;
  name: string;
  bniOriginType: string | null;
  pipelineStage: string;
}

interface OneToOne {
  id: string;
  date: string;
  location: string | null;
  notes: string | null;
  memberInterested: boolean;
  interestService: string | null;
  referralsCount: number;
  membro: { id: string; name: string; company: string | null; chapter: string | null };
  generatedLeads: GeneratedLead[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function daysAgoLabel(iso: string | null): string {
  if (!iso) return "mai";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "oggi";
  if (days === 1) return "ieri";
  if (days < 30) return `${days} giorni fa`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 mese fa" : `${months} mesi fa`;
}

function StatCard({
  icon: Icon,
  value,
  label,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
  accent?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`rounded-lg p-2 ${accent ?? "bg-muted text-foreground"}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold leading-none">{value}</div>
            <div className="text-xs text-muted-foreground mt-1">{label}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ReteBniPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [membri, setMembri] = useState<Membro[]>([]);
  const [chapters, setChapters] = useState<string[]>([]);
  const [oneToOnes, setOneToOnes] = useState<OneToOne[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rStats, rMembri, r121] = await Promise.all([
        fetch("/api/bni/stats"),
        fetch("/api/bni/membri"),
        fetch("/api/bni/one-to-one?limit=20"),
      ]);
      if (!rStats.ok || !rMembri.ok || !r121.ok)
        throw new Error("Errore nel caricamento");
      const [dStats, dMembri, d121] = await Promise.all([
        rStats.json(),
        rMembri.json(),
        r121.json(),
      ]);
      setStats(dStats);
      setMembri(dMembri.membri || []);
      setChapters(dMembri.chapters || []);
      setOneToOnes(d121.oneToOnes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const membriLite: BniMembroLite[] = useMemo(
    () => membri.map((m) => ({ id: m.id, name: m.name, company: m.company, chapter: m.chapter })),
    [membri]
  );

  const filteredMembri = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return membri;
    return membri.filter((m) =>
      [m.name, m.company, m.profession, m.chapter]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q))
    );
  }, [membri, query]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Handshake className="h-6 w-6 text-primary" />
            Rete BNI
          </h1>
          <p className="text-sm text-muted-foreground">
            121 e referenze dei capitoli — cosa entra in pipeline dalla rete
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <AddMembroDialog chapters={chapters} onCreated={fetchData} />
          <Register121Dialog membri={membriLite} chapters={chapters} onSaved={fetchData} />
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

      {/* Stat cards */}
      {loading && !stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-[76px] w-full rounded-xl" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={Handshake} value={stats.oneToOnesThisMonth} label="121 questo mese" accent="bg-primary/10 text-primary" />
          <StatCard icon={Gift} value={stats.referralsReceived} label="Referenze ricevute" accent="bg-emerald-500/10 text-emerald-500" />
          <StatCard icon={Heart} value={stats.membersInterested} label="Membri interessati" accent="bg-amber-500/10 text-amber-500" />
          <StatCard icon={Trophy} value={stats.bniClients} label="Clienti da BNI" accent="bg-green-500/10 text-green-500" />
          <StatCard icon={ArrowRight} value={stats.bniLeadsOpen} label="Opportunità aperte" accent="bg-blue-500/10 text-blue-500" />
          <StatCard icon={Users} value={stats.membersTotal} label="Membri in rete" />
          <StatCard icon={Handshake} value={stats.oneToOnesTotal} label="121 totali" />
          <StatCard icon={Snowflake} value={stats.coldMembers} label="Da ricoltivare (>4 mesi)" accent="bg-sky-500/10 text-sky-500" />
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Membri */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" /> Membri
              {!loading && (
                <Badge variant="secondary">{filteredMembri.length}</Badge>
              )}
            </h2>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca per nome, azienda, capitolo…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {loading && membri.length === 0 ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : filteredMembri.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                {membri.length === 0
                  ? "Nessun membro ancora. Aggiungine uno o registra un 121."
                  : "Nessun membro corrisponde alla ricerca."}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredMembri.map((m) => (
                <Card key={m.id}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium truncate flex items-center gap-2">
                          {m.name}
                          {m.status === "VISITATORE" && (
                            <Badge variant="outline" className="text-[10px]">ospite</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {[m.profession, m.company].filter(Boolean).join(" · ") || "—"}
                          {m.chapter ? ` · ${m.chapter}` : ""}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Handshake className="h-3 w-3" /> {m.oneToOneCount} 121
                          </span>
                          <span className="flex items-center gap-1">
                            <Gift className="h-3 w-3" /> {m._count?.referredLeads ?? 0} opp.
                          </span>
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" /> {daysAgoLabel(m.lastOneToOneAt)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {m.phone && (
                          <a
                            href={`tel:${m.phone}`}
                            className="p-2 rounded-md hover:bg-muted text-muted-foreground"
                            aria-label="Chiama"
                          >
                            <Phone className="h-4 w-4" />
                          </a>
                        )}
                        {m.website && (
                          <a
                            href={m.website.startsWith("http") ? m.website : `https://${m.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-md hover:bg-muted text-muted-foreground"
                            aria-label="Sito"
                          >
                            <Globe className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Ultimi 121 */}
        <div className="space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <CalendarDays className="h-4 w-4" /> Ultimi 121
          </h2>

          {loading && oneToOnes.length === 0 ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : oneToOnes.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                Ancora nessun 121 registrato. Dopo un incontro, premi “Registra 121”.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {oneToOnes.map((o) => (
                <Card key={o.id}>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium truncate">
                        {o.membro.name}
                        {o.membro.company ? (
                          <span className="text-muted-foreground font-normal">
                            {" "}· {o.membro.company}
                          </span>
                        ) : null}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatDate(o.date)}
                      </span>
                    </div>

                    {o.notes && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{o.notes}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-1.5">
                      {o.memberInterested && (
                        <Badge variant="outline" className="gap-1 text-amber-600 border-amber-500/40">
                          <Heart className="h-3 w-3" />
                          Interessato{o.interestService ? `: ${o.interestService}` : ""}
                        </Badge>
                      )}
                      {o.referralsCount > 0 && (
                        <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-500/40">
                          <Gift className="h-3 w-3" />
                          {o.referralsCount} referenz{o.referralsCount === 1 ? "a" : "e"}
                        </Badge>
                      )}
                      {!o.memberInterested && o.referralsCount === 0 && (
                        <span className="text-xs text-muted-foreground">Solo incontro</span>
                      )}
                    </div>

                    {o.generatedLeads.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {o.generatedLeads.map((l) => (
                          <Link
                            key={l.id}
                            href={`/leads/${l.id}`}
                            className="text-xs px-2 py-1 rounded-md bg-muted hover:bg-muted/70 flex items-center gap-1"
                          >
                            {l.name}
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
