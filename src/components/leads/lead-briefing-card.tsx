import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  Megaphone,
  Activity,
  AlertTriangle,
  Gauge,
  Quote,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface LeadBriefingCardProps {
  googleRating: number | string | null;
  googleReviewsCount: number | null;
  category: string | null;
  tierOverride: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scoreBreakdown: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  geminiAnalysis: any;
  hasActiveGoogleAds: boolean | null;
  hasActiveMetaAds: boolean | null;
  googleAdsCopy: string | null;
  metaAdsCopy: string | null;
  adsVerifiedManually: boolean | null;
  adsCheckedAt: Date | string | null;
}

const TIER_LABELS: Record<string, { label: string; color: string }> = {
  high_ticket: { label: "HIGH TICKET", color: "border-emerald-500/40 text-emerald-500 bg-emerald-500/10" },
  standard: { label: "STANDARD", color: "border-blue-500/40 text-blue-500 bg-blue-500/10" },
  low_ticket: { label: "LOW TICKET", color: "border-muted-foreground/40 text-muted-foreground" },
};

export function LeadBriefingCard(props: LeadBriefingCardProps) {
  const {
    googleRating,
    googleReviewsCount,
    tierOverride,
    scoreBreakdown,
    geminiAnalysis,
    hasActiveGoogleAds,
    hasActiveMetaAds,
    googleAdsCopy,
    metaAdsCopy,
    adsVerifiedManually,
    adsCheckedAt,
  } = props;

  const tier: string | null =
    tierOverride || (scoreBreakdown && typeof scoreBreakdown === "object" ? scoreBreakdown.tier : null);
  const tierInfo = tier ? TIER_LABELS[tier] : null;

  const rating = googleRating ? Number(googleRating) : null;
  const reviews = googleReviewsCount ?? 0;
  const ratingColor =
    rating === null
      ? "text-muted-foreground"
      : rating >= 4.5
      ? "text-emerald-500"
      : rating >= 4.0
      ? "text-yellow-500"
      : "text-red-500";

  const primaryError: string | null = geminiAnalysis?.primary_error_pattern || null;
  const cliche: string | null =
    geminiAnalysis?.cliche_found && geminiAnalysis.cliche_found !== "NESSUNA_CLICHE_TROVATA"
      ? geminiAnalysis.cliche_found
      : null;
  const trackingTools: string[] = Array.isArray(geminiAnalysis?.ads_networks_found)
    ? geminiAnalysis.ads_networks_found
    : [];

  const anyAds = !!(hasActiveGoogleAds || hasActiveMetaAds);
  const adsStatus: "CONFIRMED" | "NOT_FOUND" | "PENDING" = adsVerifiedManually
    ? anyAds
      ? "CONFIRMED"
      : "NOT_FOUND"
    : "PENDING";

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Gauge className="h-4 w-4 text-primary" />
          Briefing Lead — Dati per il video
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {/* Riga 1: Recensioni + Tier + Errore strategico */}
        <div className="grid gap-3 sm:grid-cols-3">
          {/* Recensioni Google */}
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
              <Star className="h-3 w-3" />
              Recensioni Google
            </div>
            {rating !== null ? (
              <div>
                <div className={`flex items-baseline gap-1 ${ratingColor}`}>
                  <span className="text-xl font-bold">{rating.toFixed(1)}</span>
                  <Star className="h-3.5 w-3.5 fill-current" />
                </div>
                <p className="text-xs text-muted-foreground">{reviews} recensioni</p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">Nessun dato</p>
            )}
          </div>

          {/* Tier settore */}
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
              <Activity className="h-3 w-3" />
              Tier Settore
            </div>
            {tierInfo ? (
              <Badge variant="outline" className={`text-xs font-semibold ${tierInfo.color}`}>
                {tierInfo.label}
              </Badge>
            ) : (
              <p className="text-xs text-muted-foreground italic">Non classificato</p>
            )}
            {tierOverride && (
              <p className="text-[10px] text-muted-foreground mt-1">override manuale</p>
            )}
          </div>

          {/* Errore strategico */}
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
              <AlertTriangle className="h-3 w-3" />
              Errore Strategico
            </div>
            {primaryError && primaryError !== "NESSUNO" ? (
              <Badge variant="outline" className="text-xs border-red-500/40 text-red-500 bg-red-500/10">
                {primaryError}
              </Badge>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                {primaryError === "NESSUNO" ? "Nessun pattern rilevato" : "Analisi non eseguita"}
              </p>
            )}
          </div>
        </div>

        {/* Ads attive + canali */}
        <div className="rounded-md border bg-muted/30 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
              <Megaphone className="h-3 w-3" />
              Ads Attive
            </div>
            {adsStatus === "CONFIRMED" && (
              <Badge variant="outline" className="text-xs border-emerald-500/40 text-emerald-500 bg-emerald-500/10">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Confermate
              </Badge>
            )}
            {adsStatus === "NOT_FOUND" && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                <XCircle className="h-3 w-3 mr-1" /> Nessuna Ads
              </Badge>
            )}
            {adsStatus === "PENDING" && (
              <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-500 bg-amber-500/10">
                Non verificato
              </Badge>
            )}
          </div>
          {anyAds && (
            <div className="flex flex-wrap gap-1.5">
              {hasActiveGoogleAds && (
                <Badge variant="secondary" className="text-[10px]">Google Ads</Badge>
              )}
              {hasActiveMetaAds && (
                <Badge variant="secondary" className="text-[10px]">Meta Ads</Badge>
              )}
            </div>
          )}
          {(googleAdsCopy || metaAdsCopy) && (
            <div className="space-y-1 pt-1">
              {googleAdsCopy && (
                <div className="text-xs">
                  <span className="text-muted-foreground">Google: </span>
                  <span className="italic">&ldquo;{googleAdsCopy.slice(0, 140)}{googleAdsCopy.length > 140 ? "…" : ""}&rdquo;</span>
                </div>
              )}
              {metaAdsCopy && (
                <div className="text-xs">
                  <span className="text-muted-foreground">Meta: </span>
                  <span className="italic">&ldquo;{metaAdsCopy.slice(0, 140)}{metaAdsCopy.length > 140 ? "…" : ""}&rdquo;</span>
                </div>
              )}
            </div>
          )}
          {adsCheckedAt && (
            <p className="text-[10px] text-muted-foreground">
              Verificato il {new Date(adsCheckedAt).toLocaleDateString("it-IT")}
            </p>
          )}
        </div>

        {/* Segnali di tracciamento */}
        <div className="rounded-md border bg-muted/30 p-3">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
            <Activity className="h-3 w-3" />
            Segnali di Tracciamento
          </div>
          {trackingTools.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {trackingTools.map((t) => (
                <Badge key={t} variant="secondary" className="text-[10px]">
                  {t}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              {geminiAnalysis
                ? "Nessun pixel/analytics rilevato"
                : "Esegui l'analisi strategica per rilevare tracking"}
            </p>
          )}
        </div>

        {/* Cliché */}
        {cliche && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-amber-500 mb-1">
              <Quote className="h-3 w-3" />
              Frase Cliché sul sito
            </div>
            <p className="text-sm italic">&ldquo;{cliche}&rdquo;</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
