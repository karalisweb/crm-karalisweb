"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Key,
  Target,
  Scale,
  MapPin,
  ListChecks,
  Sparkles,
  Swords,
  Clock,
  FileText,
  GitBranch,
  Lightbulb,
} from "lucide-react";
import { AddMembroDialog } from "@/components/bni/add-membro-dialog";
import { Register121Dialog, type BniMembroLite } from "@/components/bni/register-121-dialog";
import { Membro121Panel } from "@/components/bni/membro-121-panel";
import { ImportMembriDialog } from "@/components/bni/import-membri-dialog";
import { BNI_STAGES, getStage } from "@/lib/bni/bni-stages";
import { toast } from "sonner";

interface Stats {
  membersTotal: number;
  oneToOnesTotal: number;
  oneToOnesThisMonth: number;
  referralsReceived: number;
  membersInterested: number;
  bniLeadsOpen: number;
  bniClients: number;
  coldMembers: number;
  partnersCount: number;
  clientsCount: number;
  referralsGivenTotal: number;
  referralsGivenThisMonth: number;
  never121: number;
  chaptersToVisit: number;
  offerteAperte: number;
  recallDovuti: number;
  reciprocityBalance: number;
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
  memberRole: string | null;
  buyerPersona: string | null;
  clientScore: number;
  partnerScore: number;
  seeking: string | null;
  oneToOneCount: number;
  lastOneToOneAt: string | null;
  bniStage: string | null;
  nextRecallAt: string | null;
  _count?: { referredLeads: number };
}

interface QueueItem extends Membro {
  priority: number;
  reason: string;
  roleLabel: string;
  roleIcon: string;
  isMyChapter: boolean;
  referralsReceived: number;
  referralsGiven: number;
}

/** Badge dello stadio pipeline BNI. */
function StageBadge({ stage }: { stage: string | null }) {
  const s = getStage(stage);
  if (!s || s.key === "DA_AVVICINARE") return null;
  return (
    <Badge variant="outline" className={`text-[10px] gap-1 ${s.color}`}>
      <span>{s.icon}</span>
      {s.label}
    </Badge>
  );
}

interface ChapterTarget {
  id: string;
  name: string;
  memberRole: string | null;
  clientScore: number;
  partnerScore: number;
  buyerPersona: string | null;
}

interface ChapterPitch {
  headline: string;
  openingAngle: string;
  targets: Array<{ name: string; why: string }>;
  competitorWarning: string | null;
  focus: string | null;
}

interface ChapterRow {
  name: string;
  meta: {
    city: string | null;
    region: string | null;
    mode: string | null;
    meetingDay: string | null;
    visitStatus: string;
    isMine: boolean;
  } | null;
  membersCount: number;
  partnersCount: number;
  clientsCount: number;
  competitorsCount: number;
  attractiveness: number;
  topTargets: ChapterTarget[];
  personaMix: Record<string, number>;
  pitch: ChapterPitch;
  visitable: boolean;
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

const PERSONA_ICONS: Record<string, string> = {
  CASA: "🏠",
  MICROTURISMO: "🏡",
  PERSONA: "👤",
  ALTRO: "📦",
};

const ROLE_STYLE: Record<string, string> = {
  PARTNER: "text-emerald-600 border-emerald-500/40",
  CLIENTE: "text-blue-600 border-blue-500/40",
  CONCORRENTE: "text-red-600 border-red-500/40",
  NEUTRO: "text-muted-foreground",
};

const ROLE_ICON: Record<string, string> = {
  PARTNER: "🔑",
  CLIENTE: "🎯",
  CONCORRENTE: "⚔️",
  NEUTRO: "🤝",
};

const VISIT_STATUS_LABEL: Record<string, string> = {
  DA_ANALIZZARE: "Da analizzare",
  ANALIZZATO: "Analizzato",
  VISITA_PIANIFICATA: "Visita pianificata",
  VISITATO: "Visitato",
};

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
  value: number | string;
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
          <div className="min-w-0">
            <div className="text-2xl font-bold leading-none">{value}</div>
            <div className="text-xs text-muted-foreground mt-1">{label}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Badge del ruolo sui due assi (partner di potere / cliente potenziale / concorrente). */
function RoleBadge({ role }: { role: string | null }) {
  if (!role) return null;
  return (
    <Badge variant="outline" className={`text-[10px] gap-1 ${ROLE_STYLE[role] ?? ""}`}>
      <span>{ROLE_ICON[role] ?? ""}</span>
      {role === "PARTNER" ? "Partner" : role === "CLIENTE" ? "Cliente" : role === "CONCORRENTE" ? "Concorrente" : "Neutro"}
    </Badge>
  );
}

export default function ReteBniPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [membri, setMembri] = useState<Membro[]>([]);
  const [chapters, setChapters] = useState<string[]>([]);
  const [chapterRows, setChapterRows] = useState<ChapterRow[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [oneToOnes, setOneToOnes] = useState<OneToOne[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [classifying, setClassifying] = useState(false);

  // Pannello memo 121 (matcher di reciprocità)
  const [panelMembro, setPanelMembro] = useState<{ id: string; name: string } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rStats, rMembri, r121, rChapters, rQueue] = await Promise.all([
        fetch("/api/bni/stats"),
        fetch("/api/bni/membri"),
        fetch("/api/bni/one-to-one?limit=20"),
        fetch("/api/bni/chapters"),
        fetch("/api/bni/queue?limit=40"),
      ]);
      if (!rStats.ok || !rMembri.ok || !r121.ok) throw new Error("Errore nel caricamento");
      const [dStats, dMembri, d121, dChapters, dQueue] = await Promise.all([
        rStats.json(),
        rMembri.json(),
        r121.json(),
        rChapters.ok ? rChapters.json() : Promise.resolve({ chapters: [] }),
        rQueue.ok ? rQueue.json() : Promise.resolve({ queue: [] }),
      ]);
      setStats(dStats);
      setMembri(dMembri.membri || []);
      setChapters(dMembri.chapters || []);
      setOneToOnes(d121.oneToOnes || []);
      setChapterRows(dChapters.chapters || []);
      setQueue(dQueue.queue || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /** Riclassifica i membri già in archivio sui due assi. */
  async function classifyAll() {
    setClassifying(true);
    try {
      const r = await fetch("/api/bni/classify?all=1", { method: "POST" });
      if (!r.ok) throw new Error("Errore nella classificazione");
      const d = await r.json();
      toast.success(`${d.updated} membri classificati su clienti / partner`);
      await fetchData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    } finally {
      setClassifying(false);
    }
  }

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
            Chi mi porta clienti, chi posso servire, e a chi devo ancora dare
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <ImportMembriDialog chapters={chapters} onImported={fetchData} />
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
          <StatCard icon={Key} value={stats.partnersCount} label="Partner di potere" accent="bg-emerald-500/10 text-emerald-500" />
          <StatCard icon={Target} value={stats.clientsCount} label="Clienti potenziali" accent="bg-blue-500/10 text-blue-500" />
          <StatCard icon={Handshake} value={stats.oneToOnesThisMonth} label="121 questo mese" accent="bg-primary/10 text-primary" />
          <StatCard
            icon={Scale}
            value={stats.reciprocityBalance > 0 ? `+${stats.reciprocityBalance}` : stats.reciprocityBalance}
            label="Bilancio dato/ricevuto"
            accent={
              stats.reciprocityBalance >= 0
                ? "bg-emerald-500/10 text-emerald-500"
                : "bg-amber-500/10 text-amber-500"
            }
          />
          <StatCard icon={Gift} value={stats.referralsReceived} label="Referenze ricevute" accent="bg-emerald-500/10 text-emerald-500" />
          <StatCard icon={ArrowRight} value={stats.referralsGivenTotal} label="Referenze date" accent="bg-sky-500/10 text-sky-500" />
          <StatCard icon={Trophy} value={stats.bniClients} label="Clienti da BNI" accent="bg-green-500/10 text-green-500" />
          <StatCard icon={Snowflake} value={stats.never121} label="Mai fatto un 121" accent="bg-orange-500/10 text-orange-500" />
          {stats.recallDovuti > 0 && (
            <StatCard icon={Clock} value={stats.recallDovuti} label="Recall da fare oggi" accent="bg-rose-500/10 text-rose-500" />
          )}
          {stats.offerteAperte > 0 && (
            <StatCard icon={FileText} value={stats.offerteAperte} label="Offerte BNI aperte" accent="bg-purple-500/10 text-purple-500" />
          )}
        </div>
      ) : null}

      <Tabs defaultValue="coda" className="space-y-4">
        <TabsList>
          <TabsTrigger value="coda" className="gap-2">
            <ListChecks className="h-4 w-4" />
            Coda 121
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="gap-2">
            <GitBranch className="h-4 w-4" />
            Pipeline
          </TabsTrigger>
          <TabsTrigger value="capitoli" className="gap-2">
            <MapPin className="h-4 w-4" />
            Capitoli
          </TabsTrigger>
          <TabsTrigger value="membri" className="gap-2">
            <Users className="h-4 w-4" />
            Membri
          </TabsTrigger>
          <TabsTrigger value="storico" className="gap-2">
            <CalendarDays className="h-4 w-4" />
            Ultimi 121
          </TabsTrigger>
        </TabsList>

        {/* ─── CODA 121 ─────────────────────────────────────────────── */}
        <TabsContent value="coda" className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              Chi incontrare adesso. I partner pesano il doppio: portano clienti nel tempo.
            </p>
            <Button variant="outline" size="sm" onClick={classifyAll} disabled={classifying}>
              <Sparkles className={`h-4 w-4 ${classifying ? "animate-pulse" : ""}`} />
              Riclassifica
            </Button>
          </div>

          {loading && queue.length === 0 ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : queue.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                Nessun membro in coda. Aggiungi membri, poi premi “Riclassifica”
                per assegnare clienti e partner.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {queue.map((m, idx) => (
                <Card key={m.id} className={idx < 3 ? "border-primary/40" : undefined}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-muted-foreground tabular-nums">#{idx + 1}</span>
                          {m.name}
                          <RoleBadge role={m.memberRole} />
                          <StageBadge stage={m.bniStage} />
                          {m.buyerPersona && (
                            <span title={m.buyerPersona}>{PERSONA_ICONS[m.buyerPersona]}</span>
                          )}
                          {m.isMyChapter && (
                            <Badge variant="secondary" className="text-[10px]">mio capitolo</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {[m.profession, m.company].filter(Boolean).join(" · ") || "—"}
                          {m.chapter ? ` · ${m.chapter}` : ""}
                        </div>
                        <p className="text-xs mt-1 text-amber-600 dark:text-amber-400">{m.reason}</p>
                        {m.seeking && (
                          <p className="text-[11px] mt-1 text-muted-foreground truncate">
                            Cerca: {m.seeking}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className="flex items-center gap-1">
                          {m.phone && (
                            <a
                              href={`tel:${m.phone}`}
                              className="p-2 rounded-md hover:bg-muted text-muted-foreground"
                              aria-label="Chiama"
                            >
                              <Phone className="h-4 w-4" />
                            </a>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setPanelMembro({ id: m.id, name: m.name })}
                          >
                            <Gift className="h-4 w-4" />
                            Memo 121
                          </Button>
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          dato {m.referralsGiven} · ricevuto {m.referralsReceived}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── PIPELINE BNI ─────────────────────────────────────────── */}
        <TabsContent value="pipeline" className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Dove sei con ogni membro: dal bigliettino al 121, all&apos;offerta, al recall.
            Cambi stadio dal <strong>Memo 121</strong> di ciascuno.
          </p>
          {loading && membri.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {BNI_STAGES.map((stage) => {
                const inStage = membri.filter(
                  (m) => (m.bniStage ?? "DA_AVVICINARE") === stage.key
                );
                return (
                  <div key={stage.key} className="rounded-lg border bg-muted/20 p-2 space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-sm font-medium flex items-center gap-1.5">
                        <span>{stage.icon}</span> {stage.label}
                      </span>
                      <Badge variant="secondary">{inStage.length}</Badge>
                    </div>
                    <div className="space-y-1.5">
                      {inStage.map((m) => {
                        const recallOverdue =
                          m.bniStage === "RECALL" && m.nextRecallAt &&
                          new Date(m.nextRecallAt).getTime() <= Date.now();
                        return (
                          <button
                            key={m.id}
                            onClick={() => setPanelMembro({ id: m.id, name: m.name })}
                            className={`w-full text-left rounded-md bg-background border p-2 hover:bg-muted/50 transition ${
                              recallOverdue ? "border-rose-400" : ""
                            }`}
                          >
                            <div className="text-xs font-medium truncate flex items-center gap-1.5">
                              {m.name}
                              {m.memberRole === "PARTNER" && <span>🔑</span>}
                              {m.memberRole === "CLIENTE" && <span>🎯</span>}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {m.profession || m.company || m.chapter || "—"}
                            </div>
                            {recallOverdue && (
                              <div className="text-[10px] text-rose-600 mt-0.5">
                                recall scaduto
                              </div>
                            )}
                          </button>
                        );
                      })}
                      {inStage.length === 0 && (
                        <p className="text-[11px] text-muted-foreground px-1 py-2">Nessuno</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ─── CAPITOLI ─────────────────────────────────────────────── */}
        <TabsContent value="capitoli" className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Quanto vale visitare ogni capitolo, e chi intercettare nel libero networking.
          </p>

          {loading && chapterRows.length === 0 ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-xl" />
              ))}
            </div>
          ) : chapterRows.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                Nessun capitolo ancora. I capitoli compaiono qui quando i membri hanno
                il campo “capitolo” compilato.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {chapterRows.map((c) => (
                <Card key={c.name}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <div className="font-semibold flex items-center gap-2 flex-wrap">
                          <MapPin className="h-4 w-4 text-primary shrink-0" />
                          {c.name}
                          {c.meta?.isMine && (
                            <Badge variant="secondary" className="text-[10px]">il mio capitolo</Badge>
                          )}
                          {c.meta?.mode && (
                            <Badge variant="outline" className="text-[10px]">{c.meta.mode}</Badge>
                          )}
                          {c.meta?.visitStatus && (
                            <Badge variant="outline" className="text-[10px]">
                              {VISIT_STATUS_LABEL[c.meta.visitStatus] ?? c.meta.visitStatus}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {[c.meta?.city, c.meta?.meetingDay].filter(Boolean).join(" · ") || "—"}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xl font-bold leading-none">{c.attractiveness}</div>
                        <div className="text-[10px] text-muted-foreground">attrattività</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-500/40">
                        <Key className="h-3 w-3" /> {c.partnersCount} partner
                      </Badge>
                      <Badge variant="outline" className="gap-1 text-blue-600 border-blue-500/40">
                        <Target className="h-3 w-3" /> {c.clientsCount} clienti
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <Users className="h-3 w-3" /> {c.membersCount} membri
                      </Badge>
                      {c.competitorsCount > 0 && (
                        <Badge variant="outline" className="gap-1 text-red-600 border-red-500/40">
                          <Swords className="h-3 w-3" /> {c.competitorsCount} concorrenti
                        </Badge>
                      )}
                      {Object.entries(c.personaMix).map(([p, n]) => (
                        <Badge key={p} variant="secondary" className="text-[10px]">
                          {PERSONA_ICONS[p] ?? ""} {p.toLowerCase()} {n}
                        </Badge>
                      ))}
                    </div>

                    {/* Come giocartela qui: il pitch dedicato al capitolo */}
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-1.5">
                      <div className="text-xs font-semibold flex items-center gap-1.5">
                        <Lightbulb className="h-3.5 w-3.5 text-primary" />
                        Come giocartela qui — {c.pitch.headline}
                      </div>
                      <p className="text-xs text-muted-foreground">{c.pitch.openingAngle}</p>
                      {c.pitch.targets.length > 0 && (
                        <ul className="text-xs space-y-0.5 mt-1">
                          {c.pitch.targets.map((t) => (
                            <li key={t.name}>
                              <span className="font-medium">{t.name}</span>
                              <span className="text-muted-foreground"> — {t.why}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {c.pitch.competitorWarning && (
                        <p className="text-xs text-red-600 dark:text-red-400 flex gap-1.5 mt-1">
                          <Swords className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          {c.pitch.competitorWarning}
                        </p>
                      )}
                    </div>

                    {c.topTargets.length > 0 && (
                      <div>
                        <div className="text-xs font-medium mb-1.5">
                          Da intercettare nel libero networking:
                        </div>
                        <div className="space-y-1">
                          {c.topTargets.map((t, i) => (
                            <button
                              key={t.id}
                              onClick={() => setPanelMembro({ id: t.id, name: t.name })}
                              className="w-full text-left text-xs flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted"
                            >
                              <span className="text-muted-foreground tabular-nums">{i + 1}.</span>
                              <span className="font-medium truncate">{t.name}</span>
                              <RoleBadge role={t.memberRole} />
                              {t.buyerPersona && <span>{PERSONA_ICONS[t.buyerPersona]}</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── MEMBRI ───────────────────────────────────────────────── */}
        <TabsContent value="membri" className="space-y-3">
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
                        <div className="font-medium truncate flex items-center gap-2 flex-wrap">
                          {m.name}
                          <RoleBadge role={m.memberRole} />
                          {m.buyerPersona && <span>{PERSONA_ICONS[m.buyerPersona]}</span>}
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
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPanelMembro({ id: m.id, name: m.name })}
                        >
                          <Gift className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── STORICO 121 ──────────────────────────────────────────── */}
        <TabsContent value="storico" className="space-y-3">
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
                          <span className="text-muted-foreground font-normal"> · {o.membro.company}</span>
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
        </TabsContent>
      </Tabs>

      {/* Memo 121: matcher di reciprocità */}
      <Membro121Panel
        membroId={panelMembro?.id ?? null}
        membroName={panelMembro?.name}
        open={!!panelMembro}
        onOpenChange={(o) => !o && setPanelMembro(null)}
        onSaved={fetchData}
      />
    </div>
  );
}
