"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  Check,
  Video,
  Eye,
  Youtube,
  Globe,
  ExternalLink,
  Play,
  Clock,
  Send,
} from "lucide-react";
import { toast } from "sonner";

interface VideoTrackingSectionProps {
  leadId: string;
  leadName: string;
  videoTrackingToken: string | null;
  videoViewsCount: number;
  videoViewedAt: string | null;
  videoYoutubeUrl: string | null;
  videoLandingUrl: string | null;
  videoLandingSlug: string | null;
  videoSentAt: string | null;
  videoFirstPlayAt?: string | null;
  videoMaxWatchPercent?: number | null;
  videoCompletedAt?: string | null;
  landingPuntoDolore?: string | null;
}

export function VideoTrackingSection({
  videoViewsCount,
  videoViewedAt,
  videoYoutubeUrl,
  videoLandingUrl,
  videoSentAt,
  videoFirstPlayAt,
  videoMaxWatchPercent,
  videoCompletedAt,
}: VideoTrackingSectionProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = useCallback(async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast.success("Copiato!");
  }, []);

  const hasVideo = !!videoYoutubeUrl;
  const hasLanding = !!videoLandingUrl;
  const hasAnyData = hasVideo || hasLanding || videoViewsCount > 0;

  if (!hasAnyData) {
    return (
      <Card className="opacity-60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Video className="h-4 w-4" />
            Video Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nessun video configurato. Usa il tab Video Outreach per iniziare.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Engagement label
  const getEngagementBadge = () => {
    if (videoCompletedAt) {
      return <Badge className="bg-green-600 text-white">COMPLETO</Badge>;
    }
    if (videoMaxWatchPercent && videoMaxWatchPercent >= 50) {
      return <Badge className="bg-yellow-600 text-white">{videoMaxWatchPercent}%</Badge>;
    }
    if (videoFirstPlayAt) {
      return <Badge className="bg-blue-600 text-white">PLAY</Badge>;
    }
    return null;
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  const clientUrl = hasLanding
    ? videoLandingUrl + (videoLandingUrl!.includes("?") ? "&" : "?") + "utm=client"
    : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Video className="h-4 w-4" />
          Video Tracking
          {videoViewsCount > 0 && (
            <Badge className="bg-green-600 text-white ml-2">
              <Eye className="mr-1 h-3 w-3" />
              VISTO ({videoViewsCount}x)
            </Badge>
          )}
          {getEngagementBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Engagement stats */}
        {(videoViewedAt || videoFirstPlayAt || videoSentAt) && (
          <div className="grid grid-cols-2 gap-2 text-sm">
            {videoSentAt && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Send className="h-3 w-3" />
                Inviato: {formatDate(videoSentAt)}
              </div>
            )}
            {videoFirstPlayAt && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Play className="h-3 w-3" />
                Play: {formatDate(videoFirstPlayAt)}
              </div>
            )}
            {videoMaxWatchPercent != null && videoMaxWatchPercent > 0 && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-3 w-3" />
                Guardato: {videoMaxWatchPercent}%
              </div>
            )}
            {videoCompletedAt && (
              <div className="flex items-center gap-1.5 text-green-600 font-medium">
                <Check className="h-3 w-3" />
                Completato: {formatDate(videoCompletedAt)}
              </div>
            )}
          </div>
        )}

        {/* Link rapidi */}
        <div className="space-y-2">
          {/* YouTube */}
          {hasVideo && (
            <div className="flex items-center gap-2">
              <Youtube className="h-4 w-4 text-red-600 flex-shrink-0" />
              <a
                href={videoYoutubeUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline truncate flex items-center gap-1"
              >
                {videoYoutubeUrl}
                <ExternalLink className="h-3 w-3 flex-shrink-0" />
              </a>
            </div>
          )}

          {/* Landing */}
          {hasLanding && (
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <a
                href={videoLandingUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline truncate flex items-center gap-1"
              >
                {videoLandingUrl}
                <ExternalLink className="h-3 w-3 flex-shrink-0" />
              </a>
            </div>
          )}
        </div>

        {/* Copia URL per il cliente */}
        {clientUrl && (
          <Button
            onClick={() => copyToClipboard(clientUrl, "cliente")}
            size="sm"
            className="w-full bg-orange-600 hover:bg-orange-700 text-white"
          >
            {copiedField === "cliente" ? (
              <><Check className="mr-1.5 h-3.5 w-3.5" />Copiato!</>
            ) : (
              <><Copy className="mr-1.5 h-3.5 w-3.5" />Copia URL per il cliente</>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
