"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Search,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface AdsInvestigationButtonProps {
  leadId: string;
  leadName: string;
  website: string | null;
  hasActiveGoogleAds: boolean;
  hasActiveMetaAds: boolean;
  adsCheckedAt: string | null;
  adsCoherenceWarning: string | null;
  googleAdsCopy: string | null;
  metaAdsCopy: string | null;
  // Per check pixel-presente-ma-no-ads
  auditHasGoogleAdsTag: boolean;
  auditHasFacebookPixel: boolean;
}

export function AdsInvestigationButton({
  leadId,
  leadName,
  website,
  hasActiveGoogleAds,
  hasActiveMetaAds,
  adsCheckedAt,
  adsCoherenceWarning,
  googleAdsCopy,
  metaAdsCopy,
  auditHasGoogleAdsTag,
  auditHasFacebookPixel,
}: AdsInvestigationButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [canaryChecking, setCanaryChecking] = useState(false);
  const [canaryFailed, setCanaryFailed] = useState(false);
  const [canaryReason, setCanaryReason] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const domain = website
    ?.replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0] || "";

  const metaLibraryUrl = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=IT&search_type=keyword_unordered&q=${encodeURIComponent(leadName)}`;
  const googleTransparencyUrl = `https://adstransparency.google.com/?domain=${encodeURIComponent(domain)}&region=IT`;

  const handleInvestigate = async () => {
    setError(null);
    setCanaryFailed(false);

    // Step 1: Canary test
    setCanaryChecking(true);
    try {
      const canaryRes = await fetch("/api/ads-canary");
      const canaryData = await canaryRes.json();

      if (!canaryData.available) {
        setCanaryFailed(true);
        setCanaryReason(canaryData.reason || "Apify non disponibile");
        setCanaryChecking(false);
        return;
      }
    } catch {
      setCanaryFailed(true);
      setCanaryReason("Errore nel test di connessione");
      setCanaryChecking(false);
      return;
    }
    setCanaryChecking(false);

    // Step 2: Avvia investigazione
    setIsLoading(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/ads-check`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Errore investigazione");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto");
    } finally {
      setIsLoading(false);
    }
  };

  // Pixel presente ma no ads attive
  const pixelPresentNoAds =
    adsCheckedAt &&
    !hasActiveGoogleAds &&
    !hasActiveMetaAds &&
    (auditHasGoogleAdsTag || auditHasFacebookPixel);

  return (
    <div className="space-y-3">
      {/* Bottone principale o stato */}
      {!adsCheckedAt ? (
        <Card>
          <CardContent className="py-6 text-center space-y-3">
            <Search className="h-8 w-8 mx-auto text-blue-500" />
            <div>
              <p className="font-medium">Investigazione Ads Profonda</p>
              <p className="text-sm text-muted-foreground mt-1">
                Cerca annunci Google Ads e Meta Ads attivi tramite Apify
              </p>
            </div>
            <Button
              onClick={handleInvestigate}
              disabled={isLoading || canaryChecking}
            >
              {canaryChecking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Test connessione...
                </>
              ) : isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Investigazione in corso...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Avvia Investigazione Ads
                </>
              )}
            </Button>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>
      ) : (
        /* Risultati investigazione */
        <Card>
          <CardContent className="pt-4 pb-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Risultati Ads Intelligence
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {new Date(adsCheckedAt).toLocaleDateString("it-IT", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <Button
                  onClick={handleInvestigate}
                  variant="ghost"
                  size="sm"
                  disabled={isLoading || canaryChecking}
                >
                  {isLoading || canaryChecking ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Search className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>

            {/* Badges Google + Meta */}
            <div className="flex flex-wrap gap-2">
              {hasActiveGoogleAds ? (
                <Badge className="bg-green-600 text-white">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Google Ads Attive
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <XCircle className="mr-1 h-3 w-3 opacity-50" />
                  No Google Ads
                </Badge>
              )}
              {hasActiveMetaAds ? (
                <Badge className="bg-green-600 text-white">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Meta Ads Attive
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <XCircle className="mr-1 h-3 w-3 opacity-50" />
                  No Meta Ads
                </Badge>
              )}
            </div>

            {/* Copy degli annunci */}
            {googleAdsCopy && (
              <div className="text-sm bg-muted/30 rounded-lg p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Google Ad Copy</p>
                <p className="text-sm">{googleAdsCopy}</p>
              </div>
            )}
            {metaAdsCopy && (
              <div className="text-sm bg-muted/30 rounded-lg p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Meta Ad Copy</p>
                <p className="text-sm">{metaAdsCopy}</p>
              </div>
            )}

            {/* Coherence warning */}
            {adsCoherenceWarning && (
              <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-400">{adsCoherenceWarning}</p>
              </div>
            )}

            {/* Pixel presente ma no ads */}
            {pixelPresentNoAds && (
              <div className="flex items-start gap-2 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                <Eye className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-yellow-400">Pixel presente, nessuna Ad attiva</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {auditHasGoogleAdsTag && "Google Ads tag rilevato. "}
                    {auditHasFacebookPixel && "Facebook Pixel rilevato. "}
                    Hanno il tracking installato ma nessun annuncio attivo al momento.
                  </p>
                </div>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>
      )}

      {/* Canary fallito → bottoni manuali */}
      {canaryFailed && (
        <Card className="border-amber-500/30">
          <CardContent className="pt-4 pb-3 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-400">
                  Automazione non disponibile
                </p>
                <p className="text-xs text-muted-foreground">
                  {canaryReason}. Usa i link manuali qui sotto.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <a href={metaLibraryUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-3.5 w-3.5" />
                  Meta Ad Library
                </a>
              </Button>
              <Button asChild variant="outline" size="sm">
                <a href={googleTransparencyUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-3.5 w-3.5" />
                  Google Ads Transparency
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Link manuali sempre visibili (sotto i risultati) */}
      {adsCheckedAt && (
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="ghost" size="sm">
            <a href={metaLibraryUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1.5 h-3 w-3" />
              Meta Ad Library
            </a>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <a href={googleTransparencyUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1.5 h-3 w-3" />
              Google Transparency
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}
