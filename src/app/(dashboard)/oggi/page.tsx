"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Target,
  AlertTriangle,
  Zap,
  Ban,
} from "lucide-react";
import Link from "next/link";
import { QuickCallButtons, QuickCallLogger } from "@/components/leads/quick-call-logger";

// Tipi
interface Lead {
  id: string;
  name: string;
  phone: string | null;
  website: string | null;
  category: string | null;
  address: string | null;
  googleRating: string | null;
  googleReviewsCount: number | null;
  googleMapsUrl: string | null;
  commercialTag: string | null;
  commercialTagReason: string | null;
  commercialPriority: number | null;
  commercialSignals: {
    adsEvidence: string;
    adsEvidenceReason: string;
    trackingPresent: boolean;
    consentModeV2: string;
    ctaClear: boolean;
    offerFocused: boolean;
  } | null;
  opportunityScore: number | null;
  auditCompletedAt: string | null;
  pipelineStage: string;
  lastContactedAt: string | null;
  notes: string | null;
}

interface ApiResponse {
  leads: Lead[];
  meta: {
    returned: number;
    limit: number;
    totalCallable: number;
    tagBreakdown: Record<string, number>;
  };
}

// Configurazione tag
const TAG_CONFIG: Record<
  string,
  { label: string; color: string; icon: typeof Target; description: string }
> = {
  ADS_ATTIVE_CONTROLLO_ASSENTE: {
    label: "Ads senza controllo",
    color: "bg-red-500",
    icon: AlertTriangle,
    description: "Spendono in ads ma non misurano i risultati",
  },
  TRAFFICO_SENZA_DIREZIONE: {
    label: "Traffico senza CTA",
    color: "bg-orange-500",
    icon: Zap,
    description: "Portano traffico ma non lo convertono",
  },
  STRUTTURA_OK_NON_PRIORITIZZATA: {
    label: "Da ottimizzare",
    color: "bg-yellow-500",
    icon: Target,
    description: "Struttura OK ma messaggio generico",
  },
  NON_TARGET: {
    label: "Non target",
    color: "bg-gray-400",
    icon: Ban,
    description: "Non investono in advertising",
  },
};

function LeadCard({
  lead,
  index,
  onCallLogged,
}: {
  lead: Lead;
  index: number;
  onCallLogged?: () => void;
}) {
  const tagConfig = lead.commercialTag
    ? TAG_CONFIG[lead.commercialTag]
    : null;
  const TagIcon = tagConfig?.icon || Target;

  return (
    <Card className="card-hover overflow-hidden">
      <CardContent className="p-0">
        {/* Header con numero e tag */}
        <div
          className={`px-4 py-2 flex items-center justify-between ${
            tagConfig?.color || "bg-gray-500"
          } text-white`}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">#{index + 1}</span>
            <TagIcon className="h-4 w-4" />
            <span className="text-sm font-medium">
              {tagConfig?.label || lead.commercialTag}
            </span>
          </div>
          {lead.opportunityScore && (
            <Badge variant="secondary" className="bg-white/20 text-white">
              Score: {lead.opportunityScore}
            </Badge>
          )}
        </div>

        {/* Contenuto principale */}
        <div className="p-4">
          {/* Nome e categoria */}
          <div className="mb-3">
            <h3 className="font-semibold text-lg">{lead.name}</h3>
            {lead.category && (
              <p className="text-sm text-muted-foreground">{lead.category}</p>
            )}
          </div>

          {/* Motivo del tag (gancio commerciale) */}
          {lead.commercialTagReason && (
            <div className="mb-4 p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium text-foreground">
                Gancio commerciale:
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {lead.commercialTagReason.split(". ").slice(0, 2).join(". ")}
              </p>
            </div>
          )}

          {/* Info rapide */}
          <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
            {lead.googleRating && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Star className="h-4 w-4 text-yellow-500" />
                <span>
                  {lead.googleRating}{" "}
                  {lead.googleReviewsCount && `(${lead.googleReviewsCount})`}
                </span>
              </div>
            )}
            {lead.address && (
              <div className="flex items-center gap-1 text-muted-foreground truncate">
                <MapPin className="h-4 w-4" />
                <span className="truncate">{lead.address}</span>
              </div>
            )}
          </div>

          {/* Segnali commerciali */}
          {lead.commercialSignals && (
            <div className="flex flex-wrap gap-1 mb-4">
              <Badge
                variant={
                  lead.commercialSignals.adsEvidence === "strong"
                    ? "destructive"
                    : lead.commercialSignals.adsEvidence === "medium"
                    ? "default"
                    : "secondary"
                }
                className="text-xs"
              >
                Ads: {lead.commercialSignals.adsEvidence}
              </Badge>
              <Badge
                variant={
                  lead.commercialSignals.trackingPresent
                    ? "default"
                    : "destructive"
                }
                className="text-xs"
              >
                Tracking: {lead.commercialSignals.trackingPresent ? "Si" : "No"}
              </Badge>
              <Badge
                variant={
                  lead.commercialSignals.ctaClear ? "default" : "secondary"
                }
                className="text-xs"
              >
                CTA: {lead.commercialSignals.ctaClear ? "Si" : "No"}
              </Badge>
            </div>
          )}

          {/* Azioni principali */}
          <div className="flex gap-2 mb-3">
            {lead.phone && (
              <Button asChild className="flex-1" size="sm">
                <a href={`tel:${lead.phone}`}>
                  <Phone className="h-4 w-4 mr-2" />
                  Chiama
                </a>
              </Button>
            )}
            {lead.website && (
              <Button asChild variant="outline" size="sm">
                <a
                  href={
                    lead.website.startsWith("http")
                      ? lead.website
                      : `https://${lead.website}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Globe className="h-4 w-4" />
                </a>
              </Button>
            )}
            <Button asChild variant="ghost" size="sm">
              <Link href={`/leads/${lead.id}`}>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {/* Quick call logging */}
          <div className="flex items-center justify-between pt-3 border-t">
            <span className="text-xs text-muted-foreground">Esito rapido:</span>
            <QuickCallButtons leadId={lead.id} onSuccess={onCallLogged} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-0">
            <Skeleton className="h-10 w-full" />
            <div className="p-4 space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-20 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-9 flex-1" />
                <Skeleton className="h-9 w-9" />
                <Skeleton className="h-9 w-9" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function ChiamabiliOggiPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(5);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/callable-today?limit=${limit}`);
      if (!res.ok) throw new Error("Errore nel caricamento");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto");
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Chiamabili oggi</h1>
          <p className="text-sm text-muted-foreground">
            I {limit} lead prioritari per oggi
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Aggiorna
        </Button>
      </div>

      {/* Stats */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-primary">
                {data.meta.returned}
              </p>
              <p className="text-xs text-muted-foreground">Selezionati</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">
                {data.meta.totalCallable}
              </p>
              <p className="text-xs text-muted-foreground">Tot. chiamabili</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-red-500">
                {data.meta.tagBreakdown?.ADS_ATTIVE_CONTROLLO_ASSENTE || 0}
              </p>
              <p className="text-xs text-muted-foreground">Ads no tracking</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-orange-500">
                {data.meta.tagBreakdown?.TRAFFICO_SENZA_DIREZIONE || 0}
              </p>
              <p className="text-xs text-muted-foreground">No CTA</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Limite selector */}
      <div className="flex gap-2">
        {[5, 10].map((n) => (
          <Button
            key={n}
            variant={limit === n ? "default" : "outline"}
            size="sm"
            onClick={() => setLimit(n)}
          >
            {n} lead
          </Button>
        ))}
      </div>

      {/* Errore */}
      {error && (
        <Card className="border-red-500">
          <CardContent className="p-4 text-center text-red-500">
            {error}
          </CardContent>
        </Card>
      )}

      {/* Lista lead */}
      {loading ? (
        <LoadingSkeleton />
      ) : data?.leads.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Nessun lead da chiamare</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Non ci sono lead pronti per essere chiamati oggi.
            </p>
            <Button asChild>
              <Link href="/search">Avvia una nuova ricerca</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data?.leads.map((lead, index) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              index={index}
              onCallLogged={fetchData}
            />
          ))}
        </div>
      )}

      {/* Footer hint */}
      {data && data.leads.length > 0 && (
        <Card className="bg-muted/50">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Obiettivo: 5 chiamate al giorno.{" "}
              <Link href="/leads" className="text-primary hover:underline">
                Vedi tutti i lead
              </Link>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
