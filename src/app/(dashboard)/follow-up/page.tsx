"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RefreshCw,
  Loader2,
  Clock,
  AlertTriangle,
  ChevronRight,
  Repeat,
  MessageCircle,
  Archive,
  ArrowRight,
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
  pipelineStage: string;
  outreachChannel: string | null;
  videoSentAt: string | null;
}

function daysSince(date: string | null): number | null {
  if (!date) return null;
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

function stageLabel(stage: string): string {
  switch (stage) {
    case "FOLLOW_UP_1": return "Follow-up 1";
    case "FOLLOW_UP_2": return "Follow-up 2";
    case "FOLLOW_UP_3": return "Follow-up 3";
    default: return stage;
  }
}

function FollowUpCard({
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
        FOLLOW_UP: "Follow-up avanzato",
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

  const videoAge = daysSince(lead.videoSentAt);

  return (
    <Card className="card-hover">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <Link href={`/leads/${lead.id}`}>
              <h3 className="font-semibold text-sm truncate hover:underline">{lead.name}</h3>
            </Link>
            <p className="text-xs text-muted-foreground">
              {lead.category}
              {lead.opportunityScore && ` · Score: ${lead.opportunityScore}`}
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              {lead.outreachChannel && (
                <Badge variant="outline" className="text-[10px]">
                  {lead.outreachChannel === "WA" ? "WhatsApp" : "Email"}
                </Badge>
              )}
              {lead.videoSentAt && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Video {videoAge}g fa
                </span>
              )}
            </div>
          </div>
          <Badge variant="secondary" className="text-xs flex-shrink-0">
            {stageLabel(lead.pipelineStage)}
          </Badge>
        </div>

        <div className="flex gap-2 mt-3 pt-3 border-t">
          {/* Avanza al prossimo follow-up */}
          {lead.pipelineStage !== "FOLLOW_UP_3" && (
            <Button
              onClick={() => handleAction("FOLLOW_UP")}
              disabled={!!loading}
              className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white"
              size="sm"
            >
              {loading === "FOLLOW_UP" ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ArrowRight className="h-4 w-4 mr-2" />
              )}
              Avanza Follow-up
            </Button>
          )}

          {/* Archivia */}
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

export default function FollowUpPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        "/api/leads?stages=FOLLOW_UP_1,FOLLOW_UP_2,FOLLOW_UP_3&pageSize=100"
      );
      if (!res.ok) throw new Error("Errore nel caricamento");
      const json = await res.json();
      setLeads(json.leads || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Group by stage
  const fu1 = leads.filter((l) => l.pipelineStage === "FOLLOW_UP_1");
  const fu2 = leads.filter((l) => l.pipelineStage === "FOLLOW_UP_2");
  const fu3 = leads.filter((l) => l.pipelineStage === "FOLLOW_UP_3");

  const totalCount = leads.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Follow-up</h1>
          <p className="text-sm text-muted-foreground">
            Seguiti dopo l&apos;invio del video
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{totalCount} lead</Badge>
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
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : totalCount === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Repeat className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Nessun follow-up</h3>
            <p className="text-sm text-muted-foreground">
              I lead in follow-up appariranno qui.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {[
            { leads: fu1, label: "Follow-up 1", color: "text-cyan-500" },
            { leads: fu2, label: "Follow-up 2", color: "text-blue-500" },
            { leads: fu3, label: "Follow-up 3", color: "text-indigo-500" },
          ].map(
            (section) =>
              section.leads.length > 0 && (
                <div key={section.label}>
                  <div className="flex items-center gap-2 mb-3">
                    <MessageCircle className={cn("h-4 w-4", section.color)} />
                    <h2 className="font-semibold text-sm">{section.label}</h2>
                    <Badge variant="secondary" className="text-xs">
                      {section.leads.length}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {section.leads.map((lead) => (
                      <FollowUpCard key={lead.id} lead={lead} onAction={fetchData} />
                    ))}
                  </div>
                </div>
              )
          )}
        </div>
      )}
    </div>
  );
}
