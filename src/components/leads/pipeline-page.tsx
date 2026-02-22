"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Phone,
  Globe,
  MapPin,
  Star,
  ChevronRight,
  RefreshCw,
  Inbox,
} from "lucide-react";
import Link from "next/link";
import { PIPELINE_STAGES, getScoreCategory } from "@/types";

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
  commercialTag: string | null;
  commercialTagReason: string | null;
  appointmentAt: string | null;
  offerSentAt: string | null;
  lastContactedAt: string | null;
  nextFollowupAt: string | null;
  lostReason: string | null;
  lostReasonNotes: string | null;
  callAttempts: number;
}

interface PipelinePageProps {
  title: string;
  subtitle: string;
  emptyIcon: React.ReactNode;
  emptyTitle: string;
  emptySubtitle: string;
  stages: string[];
  showAppointment?: boolean;
  showOfferSent?: boolean;
  showLostReason?: boolean;
  hideHeader?: boolean;
}

function LeadCard({
  lead,
  showAppointment,
  showOfferSent,
  showLostReason,
}: {
  lead: Lead;
  showAppointment?: boolean;
  showOfferSent?: boolean;
  showLostReason?: boolean;
}) {
  const scoreInfo = getScoreCategory(lead.opportunityScore);
  const stageInfo = PIPELINE_STAGES[lead.pipelineStage as keyof typeof PIPELINE_STAGES];

  return (
    <Card className="card-hover">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <Link href={`/leads/${lead.id}`}>
              <h3 className="font-semibold truncate hover:underline">{lead.name}</h3>
            </Link>
            {lead.category && (
              <p className="text-sm text-muted-foreground truncate">
                {lead.category}
              </p>
            )}

            <div className="flex items-center gap-3 mt-2 text-sm">
              {lead.googleRating && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  {Number(lead.googleRating).toFixed(1)}
                </span>
              )}
              {lead.address && (
                <span className="text-muted-foreground truncate text-xs flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {lead.address.split(",")[0]}
                </span>
              )}
            </div>

            {/* Info specifiche per tipo pagina */}
            {showAppointment && lead.appointmentAt && (
              <p className="text-sm text-primary mt-2">
                Call: {new Date(lead.appointmentAt).toLocaleDateString("it-IT", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}

            {showOfferSent && lead.offerSentAt && (
              <p className="text-sm text-muted-foreground mt-2">
                Offerta inviata: {new Date(lead.offerSentAt).toLocaleDateString("it-IT")}
              </p>
            )}

            {showLostReason && lead.lostReason && (
              <p className="text-sm text-red-500 mt-2">
                Motivo: {lead.lostReason}
                {lead.lostReasonNotes && ` - ${lead.lostReasonNotes}`}
              </p>
            )}

            {/* Tag commerciale */}
            {lead.commercialTagReason && (
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                {lead.commercialTagReason}
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            <Badge variant="outline" className="text-xs whitespace-nowrap">
              {stageInfo?.label || lead.pipelineStage}
            </Badge>

            {lead.opportunityScore !== null && (
              <Badge
                variant={
                  scoreInfo.color === "red"
                    ? "destructive"
                    : scoreInfo.color === "green"
                    ? "default"
                    : "secondary"
                }
                className="text-xs"
              >
                Score: {lead.opportunityScore}
              </Badge>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-3 pt-3 border-t">
          {lead.phone && (
            <Button asChild size="sm" variant="outline" className="flex-1">
              <a href={`tel:${lead.phone}`}>
                <Phone className="h-4 w-4 mr-2" />
                Chiama
              </a>
            </Button>
          )}
          {lead.website && (
            <Button asChild size="sm" variant="ghost">
              <a
                href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Globe className="h-4 w-4" />
              </a>
            </Button>
          )}
          <Button asChild size="sm" variant="ghost">
            <Link href={`/leads/${lead.id}`}>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
            <div className="flex gap-2 mt-3 pt-3 border-t">
              <Skeleton className="h-9 flex-1" />
              <Skeleton className="h-9 w-9" />
              <Skeleton className="h-9 w-9" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function PipelinePage({
  title,
  subtitle,
  emptyIcon,
  emptyTitle,
  emptySubtitle,
  stages,
  showAppointment,
  showOfferSent,
  showLostReason,
  hideHeader,
}: PipelinePageProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("stages", stages.join(","));
      params.set("pageSize", "50");

      const res = await fetch(`/api/leads?${params.toString()}`);
      if (!res.ok) throw new Error("Errore nel caricamento");
      const json = await res.json();
      setLeads(json.leads || []);
      setTotal(json.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto");
    } finally {
      setLoading(false);
    }
  }, [stages]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-4">
      {/* Header */}
      {!hideHeader && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{total} lead</Badge>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Aggiorna
            </Button>
          </div>
        </div>
      )}

      {/* Errore */}
      {error && (
        <Card className="border-red-500">
          <CardContent className="p-4 text-center text-red-500">
            {error}
          </CardContent>
        </Card>
      )}

      {/* Lista */}
      {loading ? (
        <LoadingSkeleton />
      ) : leads.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="h-12 w-12 mx-auto text-muted-foreground mb-4 flex items-center justify-center">
              {emptyIcon}
            </div>
            <h3 className="font-semibold text-lg mb-2">{emptyTitle}</h3>
            <p className="text-sm text-muted-foreground">{emptySubtitle}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              showAppointment={showAppointment}
              showOfferSent={showOfferSent}
              showLostReason={showLostReason}
            />
          ))}
        </div>
      )}
    </div>
  );
}
