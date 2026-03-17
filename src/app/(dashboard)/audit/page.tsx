"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Globe,
  Clock,
  Loader2,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  PlayCircle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

interface AuditLead {
  id: string;
  name: string;
  website: string | null;
  category: string | null;
  auditStatus: string;
  search: {
    query: string;
    location: string;
  } | null;
}

interface AuditData {
  pending: AuditLead[];
  running: AuditLead[];
  failed: AuditLead[];
}

function AuditContent() {
  const [isRunningBatch, setIsRunningBatch] = useState(false);
  const [runningAuditIds, setRunningAuditIds] = useState<Set<string>>(new Set());
  const [data, setData] = useState<AuditData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch("/api/audit/status");
      if (!response.ok) throw new Error("Failed to fetch");
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError("Errore nel caricamento");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch and polling
  useEffect(() => {
    fetchData();

    // Refresh every 5 seconds to see progress
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const runBatchAudit = async () => {
    setIsRunningBatch(true);
    try {
      const response = await fetch("/api/audit", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 50 }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(`Audit completato: ${result.processed} elaborati, ${result.failed} falliti`);
        fetchData(); // Refresh data
      } else {
        toast.error(result.error || "Errore nell'avvio batch audit");
      }
    } catch (err) {
      toast.error("Errore nella richiesta");
    } finally {
      setIsRunningBatch(false);
    }
  };

  const runSingleAudit = async (leadId: string) => {
    setRunningAuditIds(prev => new Set(prev).add(leadId));
    try {
      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(`Audit completato: Score ${result.score}, Tag: ${result.commercialTag}`);
        fetchData(); // Refresh data
      } else {
        toast.error(result.error || "Errore nell'audit");
      }
    } catch (err) {
      toast.error("Errore nella richiesta");
    } finally {
      setRunningAuditIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(leadId);
        return newSet;
      });
    }
  };

  if (isLoading) {
    return <AuditSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="p-4 rounded-full bg-red-500/10 mb-4">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
        <h3 className="font-semibold mb-1">Errore nel caricamento</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Impossibile caricare i dati degli audit
        </p>
        <Button onClick={fetchData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Riprova
        </Button>
      </div>
    );
  }

  const pending = data?.pending || [];
  const running = data?.running || [];
  const failed = data?.failed || [];
  const runningCount = running.length;
  const pendingCount = pending.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Audit</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Lead con sito in attesa di analisi
          </p>
        </div>

        {/* Batch Audit Button */}
        {pendingCount > 0 && (
          <Button
            onClick={runBatchAudit}
            disabled={isRunningBatch}
            className="gap-2"
          >
            {isRunningBatch ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Elaborazione...
              </>
            ) : (
              <>
                <PlayCircle className="h-4 w-4" />
                Avvia Audit ({pendingCount})
              </>
            )}
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-blue-500">{runningCount}</div>
            <div className="text-xs text-muted-foreground">In corso</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-gray-500">{pendingCount}</div>
            <div className="text-xs text-muted-foreground">In attesa</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-red-500">{failed.length}</div>
            <div className="text-xs text-muted-foreground">Falliti</div>
          </CardContent>
        </Card>
      </div>

      {/* Audit in corso */}
      {runningCount > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
            Audit in corso ({runningCount})
          </h2>
          <div className="grid gap-3">
            {running.map((lead) => (
              <AuditLeadCard
                key={lead.id}
                lead={lead}
                onRunAudit={() => {}}
                isRunning={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* In attesa */}
      {pendingCount > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-500" />
            In attesa ({pendingCount})
          </h2>
          <div className="grid gap-3">
            {pending.map((lead) => (
              <AuditLeadCard
                key={lead.id}
                lead={lead}
                onRunAudit={() => runSingleAudit(lead.id)}
                isRunning={runningAuditIds.has(lead.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Falliti */}
      {failed.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Falliti ({failed.length})
          </h2>
          <p className="text-sm text-muted-foreground">
            Questi siti non sono stati raggiungibili durante l'audit. Puoi riprovare.
          </p>
          <div className="grid gap-3">
            {failed.map((lead) => (
              <AuditLeadCard
                key={lead.id}
                lead={lead}
                onRunAudit={() => runSingleAudit(lead.id)}
                isRunning={runningAuditIds.has(lead.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {pending.length === 0 && running.length === 0 && failed.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="p-4 rounded-full bg-green-500/10 mb-4">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <h3 className="font-semibold mb-1">Tutti gli audit completati</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Non ci sono lead in attesa di audit
          </p>
          <Link
            href="/search"
            className="text-sm text-primary hover:underline"
          >
            Lancia una nuova ricerca
          </Link>
        </div>
      )}
    </div>
  );
}

interface AuditLeadCardProps {
  lead: AuditLead;
  onRunAudit: () => void;
  isRunning: boolean;
}

function AuditLeadCard({ lead, onRunAudit, isRunning }: AuditLeadCardProps) {
  const statusConfig = {
    RUNNING: {
      label: "In corso...",
      icon: Loader2,
      color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      spin: true,
    },
    PENDING: {
      label: "In attesa",
      icon: Clock,
      color: "bg-gray-500/10 text-gray-500 border-gray-500/20",
      spin: false,
    },
    FAILED: {
      label: "Fallito",
      icon: AlertCircle,
      color: "bg-red-500/10 text-red-500 border-red-500/20",
      spin: false,
    },
  };

  const config = statusConfig[lead.auditStatus as keyof typeof statusConfig] || statusConfig.PENDING;
  const StatusIcon = config.icon;
  const showRunButton = lead.auditStatus === "PENDING" || lead.auditStatus === "FAILED";

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <Link href={`/leads/${lead.id}`}>
              <h3 className="font-semibold text-sm truncate hover:underline">{lead.name}</h3>
            </Link>

            {lead.category && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {lead.category}
              </p>
            )}

            {lead.website && (
              <a
                href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
              >
                <Globe className="h-3 w-3" />
                <span className="truncate max-w-[200px]">
                  {lead.website.replace(/^https?:\/\//, "")}
                </span>
                <ExternalLink className="h-3 w-3" />
              </a>
            )}

            {lead.search && (
              <p className="text-xs text-muted-foreground mt-2">
                Da: {lead.search.query} - {lead.search.location}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {showRunButton && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRunAudit}
                disabled={isRunning}
                className="h-8"
              >
                {isRunning ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <PlayCircle className="h-3 w-3" />
                )}
              </Button>
            )}
            <Badge variant="outline" className={`text-xs shrink-0 ${config.color}`}>
              <StatusIcon className={`h-3 w-3 mr-1 ${config.spin || isRunning ? "animate-spin" : ""}`} />
              {isRunning ? "In corso..." : config.label}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AuditSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Skeleton className="h-7 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-3">
              <Skeleton className="h-8 w-12 mx-auto mb-1" />
              <Skeleton className="h-4 w-16 mx-auto" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2 mb-2" />
              <Skeleton className="h-3 w-1/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function AuditPage() {
  return <AuditContent />;
}
