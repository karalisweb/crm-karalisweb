"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Video,
  Globe,
  ExternalLink,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Copy,
  Sparkles,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { VideoScriptData } from "@/types";

interface Lead {
  id: string;
  name: string;
  phone: string | null;
  website: string | null;
  category: string | null;
  opportunityScore: number | null;
  commercialTag: string | null;
  videoScriptData: VideoScriptData | null;
  danielaNotes: string | null;
}

function VideoScriptCard({ script, leadName }: { script: VideoScriptData; leadName: string }) {
  const copyScript = () => {
    const text = [
      `COMPLIMENTO: ${script.compliment}`,
      "",
      ...script.problemBlocks.map((b, i) => [
        `BLOCCO ${i + 1} — ${b.area}`,
        `Problema: ${b.problem}`,
        `Impatto: ${b.impact}`,
        "",
      ].join("\n")),
      `CTA: ${script.cta}`,
    ].join("\n");

    navigator.clipboard.writeText(text);
    toast.success("Script copiato!");
  };

  return (
    <div className="space-y-3">
      {/* Complimento */}
      <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-500 mb-1">
          Apertura — Complimento
        </p>
        <p className="text-sm">{script.compliment}</p>
      </div>

      {/* 3 Blocchi problema */}
      {script.problemBlocks.map((block, i) => (
        <div key={i} className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-red-400 mb-1">
            Blocco {i + 1} — {block.area}
          </p>
          <p className="text-sm font-medium">{block.problem}</p>
          <p className="text-xs text-muted-foreground mt-1">{block.impact}</p>
        </div>
      ))}

      {/* CTA */}
      <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-primary mb-1">
          Chiusura — CTA
        </p>
        <p className="text-sm">{script.cta}</p>
      </div>

      {/* Copy button */}
      <Button onClick={copyScript} variant="outline" size="sm" className="w-full">
        <Copy className="h-4 w-4 mr-2" />
        Copia script
      </Button>
    </div>
  );
}

function VideoLeadCard({
  lead,
  index,
  onAction,
}: {
  lead: Lead;
  index: number;
  onAction: () => void;
}) {
  const [expanded, setExpanded] = useState(index === 0);
  const [generatingScript, setGeneratingScript] = useState(false);
  const [markingDone, setMarkingDone] = useState(false);
  const [script, setScript] = useState<VideoScriptData | null>(lead.videoScriptData);

  const handleGenerateScript = async () => {
    setGeneratingScript(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/generate-script`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Errore nella generazione");
      const json = await res.json();
      setScript(json.videoScriptData);
      toast.success("Script generato!");
    } catch {
      toast.error("Errore nella generazione dello script");
    } finally {
      setGeneratingScript(false);
    }
  };

  const handleVideoSent = async () => {
    setMarkingDone(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/quick-log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "VIDEO_SENT" }),
      });
      if (!res.ok) throw new Error("Errore");
      toast.success(`Video per ${lead.name} marcato come inviato!`);
      onAction();
    } catch {
      toast.error("Errore nel salvataggio");
    } finally {
      setMarkingDone(false);
    }
  };

  return (
    <Card className="card-hover overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div
          className="px-4 py-3 flex items-center justify-between cursor-pointer bg-purple-500/10 border-b border-purple-500/20"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Video className="h-4 w-4 text-purple-400" />
            </div>
            <div>
              <p className="font-semibold text-sm">{lead.name}</p>
              <p className="text-xs text-muted-foreground">
                {lead.category}
                {lead.opportunityScore && ` · Score: ${lead.opportunityScore}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {script ? (
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 text-xs">
                Script pronto
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                No script
              </Badge>
            )}
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>

        {expanded && (
          <div className="p-4 space-y-4">
            {/* Link sito */}
            {lead.website && (
              <a
                href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2.5 bg-primary/10 border border-primary/20 rounded-lg text-primary hover:bg-primary/20 transition-colors"
              >
                <Globe className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm font-medium truncate">
                  {lead.website.replace(/^https?:\/\//, "").replace(/\/.*$/, "")}
                </span>
                <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 opacity-60 ml-auto" />
              </a>
            )}

            {/* Note di Daniela */}
            {lead.danielaNotes && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                  Note di Daniela
                </p>
                <p className="text-sm">{lead.danielaNotes}</p>
              </div>
            )}

            {/* Script video */}
            {script ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Script Video
                </p>
                <VideoScriptCard script={script} leadName={lead.name} />
              </div>
            ) : (
              <div className="p-6 text-center border border-dashed border-muted-foreground/30 rounded-lg">
                <Sparkles className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-3">
                  Lo script video non e ancora stato generato
                </p>
                <Button
                  onClick={handleGenerateScript}
                  disabled={generatingScript}
                  size="sm"
                >
                  {generatingScript ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Genera Script
                </Button>
              </div>
            )}

            {/* Azioni */}
            <div className="flex gap-2 pt-2 border-t">
              <Button
                onClick={handleVideoSent}
                disabled={markingDone}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                size="sm"
              >
                {markingDone ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Video Inviato
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href={`/leads/${lead.id}`}>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function VideoDaFarePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/leads?stage=VIDEO_DA_FARE&pageSize=50");
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

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Video da Fare</h1>
          <p className="text-sm text-muted-foreground">
            Workspace di Alessio — Video personalizzati da registrare
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{total} video</Badge>
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
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}><CardContent className="p-0">
              <Skeleton className="h-14 w-full" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            </CardContent></Card>
          ))}
        </div>
      ) : leads.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Nessun video da fare</h3>
            <p className="text-sm text-muted-foreground mb-4">
              I lead qualificati appariranno qui con lo script pronto.
            </p>
            <Button asChild><Link href="/da-qualificare">Vai a Qualificare</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {leads.map((lead, index) => (
            <VideoLeadCard key={lead.id} lead={lead} index={index} onAction={fetchData} />
          ))}
        </div>
      )}
    </div>
  );
}
