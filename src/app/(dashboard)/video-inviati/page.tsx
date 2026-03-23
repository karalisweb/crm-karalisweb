"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Send,
  RefreshCw,
  AlertTriangle,
  Eye,
  Play,
  Clock,
  Check,
  ExternalLink,
  Globe,
  Phone,
  MessageCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface VideoLead {
  id: string;
  name: string;
  category: string | null;
  phone: string | null;
  whatsappNumber: string | null;
  videoLandingUrl: string | null;
  videoSentAt: string | null;
  videoViewsCount: number;
  videoViewedAt: string | null;
  videoFirstPlayAt: string | null;
  videoMaxWatchPercent: number | null;
  videoCompletedAt: string | null;
  opportunityScore: number | null;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function VideoLeadCard({ lead }: { lead: VideoLead }) {
  const [expanded, setExpanded] = useState(false);
  const viewed = lead.videoViewsCount > 0;
  const played = !!lead.videoFirstPlayAt;
  const completed = !!lead.videoCompletedAt;

  return (
    <Card className={cn("overflow-hidden", viewed && "border-green-500/30")}>
      <CardContent className="p-0">
        <div
          className="px-4 py-3 flex items-center justify-between cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm truncate">{lead.name}</p>
                {viewed && (
                  <Badge className="bg-green-600 text-white text-[10px]">
                    <Eye className="mr-1 h-3 w-3" />
                    VISTO {lead.videoViewsCount > 1 ? `(${lead.videoViewsCount}x)` : ""}
                  </Badge>
                )}
                {completed && (
                  <Badge className="bg-emerald-600 text-white text-[10px]">
                    <Check className="mr-1 h-3 w-3" />
                    COMPLETO
                  </Badge>
                )}
                {played && !completed && lead.videoMaxWatchPercent && lead.videoMaxWatchPercent > 0 && (
                  <Badge className="bg-yellow-600 text-white text-[10px]">
                    <Play className="mr-1 h-3 w-3" />
                    {lead.videoMaxWatchPercent}%
                  </Badge>
                )}
                {!viewed && (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">
                    In attesa
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {lead.category}
                {lead.videoSentAt && ` · Inviato ${formatDate(lead.videoSentAt)}`}
              </p>
            </div>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>

        {expanded && (
          <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
            {/* Tracking details */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              {lead.videoSentAt && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Send className="h-3 w-3" />
                  Inviato: {formatDate(lead.videoSentAt)}
                </div>
              )}
              {lead.videoViewedAt && (
                <div className="flex items-center gap-1.5 text-green-500">
                  <Eye className="h-3 w-3" />
                  Aperto: {formatDate(lead.videoViewedAt)}
                </div>
              )}
              {lead.videoFirstPlayAt && (
                <div className="flex items-center gap-1.5 text-blue-500">
                  <Play className="h-3 w-3" />
                  Play: {formatDate(lead.videoFirstPlayAt)}
                </div>
              )}
              {lead.videoMaxWatchPercent != null && lead.videoMaxWatchPercent > 0 && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Guardato: {lead.videoMaxWatchPercent}%
                </div>
              )}
              {lead.videoCompletedAt && (
                <div className="flex items-center gap-1.5 text-emerald-500 font-medium">
                  <Check className="h-3 w-3" />
                  Completato: {formatDate(lead.videoCompletedAt)}
                </div>
              )}
            </div>

            {/* Landing URL */}
            {lead.videoLandingUrl && (
              <div className="flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 text-blue-500" />
                <a
                  href={lead.videoLandingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-500 hover:underline flex items-center gap-1"
                >
                  {lead.videoLandingUrl}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              {lead.phone && (
                <Button asChild variant="outline" size="sm" className="text-xs">
                  <a href={`tel:${lead.phone}`}>
                    <Phone className="h-3 w-3 mr-1" />
                    Chiama
                  </a>
                </Button>
              )}
              {lead.whatsappNumber && (
                <Button asChild variant="outline" size="sm" className="text-xs">
                  <a
                    href={`https://wa.me/${lead.whatsappNumber.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="h-3 w-3 mr-1" />
                    WhatsApp
                  </a>
                </Button>
              )}
              <Button asChild variant="outline" size="sm" className="text-xs">
                <Link href={`/leads/${lead.id}`}>
                  Dettaglio
                </Link>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function VideoInviatiPage() {
  const [leads, setLeads] = useState<VideoLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/leads?stage=VIDEO_INVIATO&pageSize=100");
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

  const viewedCount = leads.filter(l => l.videoViewsCount > 0).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Video Inviati</h1>
          <p className="text-sm text-muted-foreground">
            Lead a cui è stato inviato il video personalizzato
          </p>
        </div>
        <div className="flex items-center gap-2">
          {leads.length > 0 && (
            <Badge variant="secondary">
              {viewedCount}/{leads.length} visti
            </Badge>
          )}
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
          {[...Array(3)].map((_, i) => (
            <Card key={i}><CardContent className="p-0">
              <Skeleton className="h-14 w-full" />
            </CardContent></Card>
          ))}
        </div>
      ) : leads.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Send className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Nessun video inviato</h3>
            <p className="text-sm text-muted-foreground">
              I video inviati appariranno qui con il tracking in tempo reale.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => (
            <VideoLeadCard key={lead.id} lead={lead} />
          ))}
        </div>
      )}
    </div>
  );
}
