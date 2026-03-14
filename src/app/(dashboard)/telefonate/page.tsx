"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RefreshCw,
  Loader2,
  AlertTriangle,
  ChevronRight,
  Phone,
  PhoneCall,
  ArrowRight,
  Archive,
  Calendar,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Lead {
  id: string;
  name: string;
  phone: string | null;
  website: string | null;
  category: string | null;
  opportunityScore: number | null;
  pipelineStage: string;
}

function stageLabel(stage: string): string {
  switch (stage) {
    case "TELEFONATA_1":
      return "Telefonata 1";
    case "TELEFONATA_2":
      return "Telefonata 2";
    case "TELEFONATA_3":
      return "Telefonata 3";
    default:
      return stage;
  }
}

function stageColor(stage: string): string {
  switch (stage) {
    case "TELEFONATA_1":
      return "text-orange-500";
    case "TELEFONATA_2":
      return "text-amber-500";
    case "TELEFONATA_3":
      return "text-red-500";
    default:
      return "text-gray-500";
  }
}

function TelefonataCard({
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
        CALL_SCHEDULED: "Call fissata!",
        NEXT_CALL: "Avanzato alla prossima telefonata",
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

  return (
    <Card className="card-hover">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <Link href={`/leads/${lead.id}`}>
              <h3 className="font-semibold text-sm truncate hover:underline">
                {lead.name}
              </h3>
            </Link>
            <p className="text-xs text-muted-foreground">
              {lead.category}
              {lead.opportunityScore && ` · Score: ${lead.opportunityScore}`}
            </p>
            {lead.phone && (
              <a
                href={`tel:${lead.phone}`}
                className="flex items-center gap-1 mt-1.5 text-xs text-green-500 hover:text-green-400"
              >
                <Phone className="h-3 w-3" />
                {lead.phone}
              </a>
            )}
          </div>
          <Badge variant="secondary" className="text-xs flex-shrink-0">
            {stageLabel(lead.pipelineStage)}
          </Badge>
        </div>

        <div className="flex gap-2 mt-3 pt-3 border-t">
          <Button
            onClick={() => handleAction("CALL_SCHEDULED")}
            disabled={!!loading}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            size="sm"
          >
            {loading === "CALL_SCHEDULED" ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Calendar className="h-4 w-4 mr-2" />
            )}
            Call Fissata
          </Button>

          {lead.pipelineStage !== "TELEFONATA_3" && (
            <Button
              onClick={() => handleAction("NEXT_CALL")}
              disabled={!!loading}
              variant="outline"
              size="sm"
            >
              {loading === "NEXT_CALL" ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ArrowRight className="h-4 w-4 mr-2" />
              )}
              Prossima
            </Button>
          )}

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

export default function TelefonatePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        "/api/leads?stages=TELEFONATA_1,TELEFONATA_2,TELEFONATA_3&pageSize=100"
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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const tel1 = leads.filter((l) => l.pipelineStage === "TELEFONATA_1");
  const tel2 = leads.filter((l) => l.pipelineStage === "TELEFONATA_2");
  const tel3 = leads.filter((l) => l.pipelineStage === "TELEFONATA_3");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Telefonate</h1>
          <p className="text-sm text-muted-foreground">
            Lead da chiamare per fissare un appuntamento
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{leads.length} lead</Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
          >
            <RefreshCw
              className={cn("h-4 w-4 mr-2", loading && "animate-spin")}
            />
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
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : leads.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <PhoneCall className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">
              Nessuna telefonata in coda
            </h3>
            <p className="text-sm text-muted-foreground">
              I lead da chiamare appariranno qui.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {[
            { leads: tel1, label: "Telefonata 1", color: "text-orange-500" },
            { leads: tel2, label: "Telefonata 2", color: "text-amber-500" },
            { leads: tel3, label: "Telefonata 3", color: "text-red-500" },
          ].map(
            (section) =>
              section.leads.length > 0 && (
                <div key={section.label}>
                  <div className="flex items-center gap-2 mb-3">
                    <MessageCircle
                      className={cn("h-4 w-4", section.color)}
                    />
                    <h2 className="font-semibold text-sm">{section.label}</h2>
                    <Badge variant="secondary" className="text-xs">
                      {section.leads.length}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {section.leads.map((lead) => (
                      <TelefonataCard
                        key={lead.id}
                        lead={lead}
                        onAction={fetchData}
                      />
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
