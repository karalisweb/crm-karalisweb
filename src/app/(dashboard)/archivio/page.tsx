"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowUp,
  RefreshCw,
  XCircle,
  Globe,
  Phone,
  Loader2,
  Archive,
} from "lucide-react";
import { toast } from "sonner";

interface Lead {
  id: string;
  name: string;
  phone: string | null;
  website: string | null;
  category: string | null;
  address: string | null;
  googleRating: string | null;
  googleReviewsCount: number | null;
  opportunityScore: number | null;
  pipelineStage: string;
  commercialTagReason: string | null;
  lostReason: string | null;
  lostReasonNotes: string | null;
}

const TABS = [
  { key: "NON_TARGET", label: "Non Target", description: "Nessun segnale ads" },
  { key: "SENZA_SITO", label: "Senza Sito", description: "Niente da analizzare" },
  { key: "PERSO", label: "Persi", description: "Chiamati, non interessati" },
] as const;

function LeadArchiveCard({
  lead,
  onRestore,
}: {
  lead: Lead;
  onRestore: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const restore = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipelineStage: "DA_CHIAMARE" }),
      });
      if (!res.ok) throw new Error("Errore");
      toast.success(`${lead.name} spostato in Da Chiamare`);
      onRestore();
    } catch {
      toast.error("Errore nel ripristino");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="card-hover">
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{lead.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {lead.category || "Nessuna categoria"}
              {lead.googleRating && ` · ★ ${lead.googleRating}`}
            </p>
            {lead.lostReason && (
              <p className="text-xs text-red-400 mt-1">
                Motivo: {lead.lostReasonNotes || lead.lostReason}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {lead.opportunityScore && (
              <Badge variant="secondary" className="text-xs">
                {lead.opportunityScore}
              </Badge>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2 border-green-500/50 text-green-500 hover:bg-green-500/10"
              onClick={restore}
              disabled={loading}
              title="Ripristina in Da Chiamare"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ArchivioPage() {
  const [activeTab, setActiveTab] = useState<string>("NON_TARGET");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch leads per il tab attivo
      const res = await fetch(
        `/api/leads?stage=${activeTab}&pageSize=100`
      );
      const json = await res.json();
      setLeads(json.leads || []);

      // Fetch conteggi per tutti i tab
      const countPromises = TABS.map(async (tab) => {
        const r = await fetch(`/api/leads?stage=${tab.key}&pageSize=1`);
        const j = await r.json();
        return { key: tab.key, count: j.total || 0 };
      });
      const countResults = await Promise.all(countPromises);
      const newCounts: Record<string, number> = {};
      for (const c of countResults) {
        newCounts[c.key] = c.count;
      }
      setCounts(newCounts);
    } catch {
      toast.error("Errore nel caricamento");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalArchived = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Archivio</h1>
          <p className="text-sm text-muted-foreground">
            {totalArchived} lead archiviati
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Aggiorna
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {TABS.map((tab) => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            {counts[tab.key] !== undefined && (
              <Badge
                variant="secondary"
                className="ml-2 text-xs h-5 px-1.5"
              >
                {counts[tab.key]}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Descrizione tab */}
      <p className="text-xs text-muted-foreground">
        {TABS.find((t) => t.key === activeTab)?.description}
        {" · "}
        Clicca <ArrowUp className="h-3 w-3 inline text-green-500" /> per
        ripristinare un lead in Da Chiamare
      </p>

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : leads.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Archive className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Nessun lead</h3>
            <p className="text-sm text-muted-foreground">
              Non ci sono lead in questa categoria.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {leads.map((lead) => (
            <LeadArchiveCard key={lead.id} lead={lead} onRestore={fetchData} />
          ))}
        </div>
      )}
    </div>
  );
}
