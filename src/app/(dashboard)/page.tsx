"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Video,
  ExternalLink,
  Check,
  Copy,
  ArrowRight,
  Flame,
  Clock,
  RefreshCw,
  Loader2,
} from "lucide-react";
import Link from "next/link";

interface GeminiAnalysis {
  cliche_found?: string;
  primary_error_pattern?: string;
  strategic_note?: string;
  teleprompter_script?: {
    atto_1?: string;
    atto_2?: string;
    atto_3?: string;
    atto_4?: string;
  };
}

interface MissionLead {
  id: string;
  name: string;
  category: string | null;
  website: string | null;
  opportunityScore: number | null;
  geminiAnalysis: GeminiAnalysis | null;
  videoSentAt?: string | null;
  commercialTag?: string | null;
}

interface MissionData {
  videoDaFare: MissionLead[];
  followUpPrioritari: MissionLead[];
  badges: {
    daRegistrare: number;
    daAnalizzare: number;
    followUp: number;
    inviati: number;
    appuntamenti: number;
    inChiusura: number;
    hotLeads: number;
    warmLeads: number;
  };
}

export default function MissionPage() {
  const [data, setData] = useState<MissionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  const fetchMission = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/mission");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMission();
  }, [fetchMission]);

  const handleMarkSent = async (leadId: string) => {
    setActionLoading(leadId);
    try {
      const res = await fetch(`/api/leads/${leadId}/quick-log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "VIDEO_SENT" }),
      });
      if (res.ok) {
        // Rimuovi dalla lista e refresh
        await fetchMission();
      }
    } catch {
      // silently fail
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkInTrattativa = async (leadId: string) => {
    setActionLoading(leadId);
    try {
      const res = await fetch(`/api/leads/${leadId}/quick-log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RESPONSE_RECEIVED", respondedVia: "follow-up" }),
      });
      if (res.ok) {
        await fetchMission();
      }
    } catch {
      // silently fail
    } finally {
      setActionLoading(null);
    }
  };

  const handleCopyFollowUp = (lead: MissionLead) => {
    const msg = `Ciao! Ti scrivo per un breve follow-up: qualche giorno fa ti ho mandato un video-analisi personalizzato sul posizionamento digitale di ${lead.name}. L'hai avuto modo di guardare? Sono a disposizione se vuoi approfondire.`;
    navigator.clipboard.writeText(msg);
    setCopiedId(lead.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const res = await fetch("/api/dashboard/regenerate", { method: "POST" });
      if (res.ok) {
        await fetchMission();
      }
    } catch {
      // silently fail
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) return <MissionSkeleton />;

  const videoDaFare = data?.videoDaFare || [];
  const followUp = data?.followUpPrioritari || [];
  const badges = data?.badges;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          Missione di Oggi
        </h1>
        <p className="text-muted-foreground mt-1">
          {videoDaFare.length > 0
            ? `${videoDaFare.length} video da registrare, ${followUp.length} follow-up in attesa`
            : "Nessun lead analizzato pronto. Lancia le analisi Gemini per popolare la lista."}
        </p>
      </div>

      {/* KPI row compatta */}
      {badges && (
        <div className="grid grid-cols-5 gap-3">
          <MiniKpi label="Video Pronti" value={badges.daRegistrare} color="red" max={5} />
          <MiniKpi label="Da Analizzare" value={badges.daAnalizzare} color="amber" />
          <MiniKpi label="Follow-up" value={badges.followUp} color="amber" />
          <MiniKpi label="Inviati" value={badges.inviati} color="blue" />
          <MiniKpi label="Appuntamenti" value={badges.appuntamenti} color="green" />
        </div>
      )}

      {/* SEZIONE A: I 5 VIDEO DI OGGI */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Video className="h-5 w-5 text-red-500" />
            I {videoDaFare.length} Video di Oggi
          </h2>
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-accent"
          >
            {regenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Rigenera lista
          </button>
        </div>

        {videoDaFare.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <Video className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">
                Nessun lead con analisi pronto.{" "}
                {badges && badges.daAnalizzare > 0
                  ? `Ci sono ${badges.daAnalizzare} lead da analizzare con Gemini.`
                  : "Importa nuovi lead dallo scouting."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {videoDaFare.map((lead, index) => (
              <VideoMissionCard
                key={lead.id}
                lead={lead}
                index={index + 1}
                loading={actionLoading === lead.id}
                onMarkSent={() => handleMarkSent(lead.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* SEZIONE B: FOLLOW-UP PRIORITARI */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            Follow-up Prioritari
            {followUp.length > 0 && (
              <Badge variant="outline" className="ml-1 bg-amber-500/10 text-amber-500 border-amber-500/30">
                {followUp.length}
              </Badge>
            )}
          </h2>
          <Link
            href="/follow-up"
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            Vedi tutti <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {followUp.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">Nessun follow-up in attesa. Ottimo lavoro!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {followUp.map((lead) => (
              <FollowUpCard
                key={lead.id}
                lead={lead}
                loading={actionLoading === lead.id}
                copied={copiedId === lead.id}
                onCopyMessage={() => handleCopyFollowUp(lead)}
                onMarkInTrattativa={() => handleMarkInTrattativa(lead.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ==========================================
// SUB-COMPONENTS
// ==========================================

function MiniKpi({
  label,
  value,
  color,
  max,
}: {
  label: string;
  value: number;
  color: "red" | "amber" | "blue" | "green";
  max?: number;
}) {
  const colorClasses = {
    red: "text-red-500 bg-red-500/10",
    amber: "text-amber-500 bg-amber-500/10",
    blue: "text-blue-500 bg-blue-500/10",
    green: "text-green-500 bg-green-500/10",
  };

  return (
    <Card>
      <CardContent className="p-3 text-center">
        <span className={`text-2xl font-bold tabular-nums ${colorClasses[color].split(" ")[0]}`}>
          {value}
          {max ? <span className="text-sm font-normal text-muted-foreground">/{max}</span> : null}
        </span>
        <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
}

function VideoMissionCard({
  lead,
  index,
  loading,
  onMarkSent,
}: {
  lead: MissionLead;
  index: number;
  loading: boolean;
  onMarkSent: () => void;
}) {
  const analysis = lead.geminiAnalysis;
  const cliche = analysis?.cliche_found;
  const errorPattern = analysis?.primary_error_pattern;

  return (
    <Card className="overflow-hidden border-l-4 border-l-red-500/60 hover:border-l-red-500 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-red-500/80 bg-red-500/10 rounded-full w-6 h-6 flex items-center justify-center shrink-0">
                {index}
              </span>
              <Link
                href={`/leads/${lead.id}`}
                className="font-semibold text-base hover:text-primary truncate"
              >
                {lead.name}
              </Link>
              {lead.opportunityScore && (
                <Badge
                  variant={lead.opportunityScore >= 80 ? "destructive" : "default"}
                  className="text-xs shrink-0"
                >
                  {lead.opportunityScore >= 80 && <Flame className="h-3 w-3 mr-0.5" />}
                  {lead.opportunityScore}
                </Badge>
              )}
            </div>

            <p className="text-xs text-muted-foreground mb-2">
              {lead.category || "—"}
              {lead.website && (
                <a
                  href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-blue-400 hover:text-blue-300 inline-flex items-center gap-0.5"
                >
                  Sito <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </p>

            {/* Gancio di Vendita */}
            {cliche && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 mt-2">
                <p className="text-xs font-medium text-amber-600 uppercase tracking-wide mb-1">
                  Gancio di Vendita {errorPattern && `— ${errorPattern}`}
                </p>
                <p className="text-lg font-bold text-amber-400 leading-snug">
                  &ldquo;{cliche}&rdquo;
                </p>
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex flex-col gap-2 shrink-0">
            <a
              href="https://www.tella.tv/library"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-colors"
            >
              <Video className="h-3.5 w-3.5" />
              Apri Tella
            </a>
            <button
              onClick={onMarkSent}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Inviato
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FollowUpCard({
  lead,
  loading,
  copied,
  onCopyMessage,
  onMarkInTrattativa,
}: {
  lead: MissionLead;
  loading: boolean;
  copied: boolean;
  onCopyMessage: () => void;
  onMarkInTrattativa: () => void;
}) {
  const sentAt = lead.videoSentAt ? new Date(lead.videoSentAt) : null;
  const daysAgo = sentAt
    ? Math.floor((Date.now() - sentAt.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <Card className="border-l-4 border-l-amber-500/40 hover:border-l-amber-500 transition-colors">
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Link
                href={`/leads/${lead.id}`}
                className="font-medium text-sm hover:text-primary truncate"
              >
                {lead.name}
              </Link>
              {lead.opportunityScore && (
                <Badge variant="secondary" className="text-[10px] shrink-0">
                  {lead.opportunityScore}
                </Badge>
              )}
              {daysAgo !== null && (
                <span className="text-[10px] text-amber-500 font-medium shrink-0">
                  {daysAgo}g fa
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {lead.category || "—"}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={onCopyMessage}
              className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-md bg-accent text-accent-foreground hover:bg-accent/80 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-green-500" />
                  Copiato
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  Follow-up
                </>
              )}
            </button>
            <button
              onClick={onMarkInTrattativa}
              disabled={loading}
              className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-md bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <ArrowRight className="h-3 w-3" />
              )}
              Trattativa
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MissionSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-64 mb-2" />
        <Skeleton className="h-5 w-96" />
      </div>
      <div className="grid grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-3">
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div>
        <Skeleton className="h-7 w-48 mb-4" />
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-28 w-full mb-3" />
        ))}
      </div>
    </div>
  );
}
