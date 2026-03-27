"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Copy,
  Check,
  Video,
  Eye,
  Youtube,
  Globe,
  ExternalLink,
  Rocket,
  Upload,
  Play,
  Clock,
  Target,
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
  leadId,
  leadName,
  videoTrackingToken,
  videoViewsCount,
  videoViewedAt,
  videoYoutubeUrl,
  videoLandingUrl,
  videoLandingSlug,
  videoSentAt,
  videoFirstPlayAt,
  videoMaxWatchPercent,
  videoCompletedAt,
  landingPuntoDolore,
}: VideoTrackingSectionProps) {
  const [token, setToken] = useState(videoTrackingToken);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState(videoYoutubeUrl || "");
  const [savingYoutube, setSavingYoutube] = useState(false);
  const [landingUrl, setLandingUrl] = useState(videoLandingUrl || "");
  const [landingSlug, setLandingSlug] = useState(videoLandingSlug || "");
  const [creatingLanding, setCreatingLanding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [puntoDolore, setPuntoDolore] = useState(landingPuntoDolore || "");
  const [savingPuntoDolore, setSavingPuntoDolore] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const landingCreated = !!landingUrl;
  const hasYoutubeUrl = !!youtubeUrl;

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
  }, []);

  const savePuntoDolore = async () => {
    setSavingPuntoDolore(true);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ landingPuntoDolore: puntoDolore.trim() }),
      });
      if (!res.ok) throw new Error("Errore salvataggio");
      toast.success("Punto di dolore salvato");
    } catch {
      toast.error("Errore nel salvataggio");
    } finally {
      setSavingPuntoDolore(false);
    }
  };

  const saveYoutubeUrl = async () => {
    if (!youtubeUrl.trim()) return;
    setSavingYoutube(true);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoYoutubeUrl: youtubeUrl.trim() }),
      });
      if (!res.ok) throw new Error("Errore salvataggio");
      toast.success("YouTube URL salvato");
    } catch {
      toast.error("Errore nel salvataggio YouTube URL");
    } finally {
      setSavingYoutube(false);
    }
  };

  const handleUploadVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast.error("Seleziona un file video (MP4, MOV, ecc.)");
      return;
    }

    // Limite 100MB
    if (file.size > 100 * 1024 * 1024) {
      toast.error("File troppo grande (max 100MB)");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("video", file);

      const res = await fetch(`/api/leads/${leadId}/upload-youtube`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Errore upload");
      }

      setYoutubeUrl(data.url);
      toast.success(`Video caricato su YouTube! ID: ${data.videoId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore upload YouTube");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const createLandingPage = async () => {
    if (!youtubeUrl.trim()) {
      toast.error("Inserisci prima il YouTube URL o carica un video");
      return;
    }

    setCreatingLanding(true);
    try {
      // Salva YouTube URL prima (nel caso non sia stato salvato)
      await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoYoutubeUrl: youtubeUrl.trim() }),
      });

      // Crea landing page su WordPress
      const res = await fetch(`/api/leads/${leadId}/create-landing`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Errore creazione landing");
      }

      setToken(data.token);
      setLandingSlug(data.slug);
      setLandingUrl(data.url);
      toast.success("Landing page creata su WordPress!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore creazione landing");
    } finally {
      setCreatingLanding(false);
    }
  };


  // Calcola engagement label
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
        {(videoViewedAt || videoFirstPlayAt) && (
          <div className="grid grid-cols-2 gap-2 text-sm">
            {videoViewedAt && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Eye className="h-3 w-3" />
                {new Date(videoViewedAt).toLocaleDateString("it-IT", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            )}
            {videoFirstPlayAt && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Play className="h-3 w-3" />
                Play: {new Date(videoFirstPlayAt).toLocaleDateString("it-IT", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
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
                Completato
              </div>
            )}
          </div>
        )}

        {/* Step 1: YouTube URL (manuale o upload) */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium flex items-center gap-1.5">
            <Youtube className="h-3.5 w-3.5 text-red-600" />
            YouTube Video
            {hasYoutubeUrl && <Check className="h-3 w-3 text-green-600" />}
          </Label>

          {!hasYoutubeUrl && !landingCreated && (
            <>
              {/* Upload diretto */}
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleUploadVideo}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                variant="outline"
                size="sm"
                className="w-full"
              >
                {uploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                {uploading ? "Caricamento su YouTube..." : "Carica video da file"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">oppure incolla URL</p>
            </>
          )}

          <div className="flex gap-2">
            <Input
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              onBlur={saveYoutubeUrl}
              onKeyDown={(e) => e.key === "Enter" && saveYoutubeUrl()}
              placeholder="https://youtu.be/..."
              className="text-sm h-8"
              disabled={landingCreated || uploading}
            />
            {savingYoutube && <Loader2 className="h-4 w-4 animate-spin mt-2" />}
          </div>
        </div>

        {/* Punto di dolore */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5 text-orange-500" />
            Punto di dolore
            {puntoDolore.trim() && <Check className="h-3 w-3 text-green-600" />}
          </Label>
          <Textarea
            value={puntoDolore}
            onChange={(e) => setPuntoDolore(e.target.value)}
            onBlur={savePuntoDolore}
            placeholder="Es: Il vostro sito non comunica cosa vi rende diversi dai competitor..."
            className="text-sm min-h-[60px] resize-y"
            disabled={landingCreated}
          />
          {savingPuntoDolore && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Salvataggio...
            </div>
          )}
        </div>

        {/* Step 2: Crea Landing Page (o mostra risultato) */}
        {!landingCreated ? (
          <Button
            onClick={createLandingPage}
            disabled={creatingLanding || !youtubeUrl.trim() || uploading}
            className="w-full"
            size="sm"
          >
            {creatingLanding ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Rocket className="mr-2 h-4 w-4" />
            )}
            {creatingLanding ? "Creazione in corso..." : "Crea Landing Page"}
          </Button>
        ) : (
          <>
            {/* Landing page creata — mostra URL */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-blue-600" />
                Landing Page
                <Check className="h-3 w-3 text-green-600" />
              </Label>
              <div className="flex items-center gap-2">
                <a
                  href={landingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                >
                  {landingUrl}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            {/* Token (solo visualizzazione) */}
            {token && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Token Tracking
                </Label>
                <code className="block text-xs bg-muted px-3 py-2 rounded-md font-mono truncate">
                  {token}
                </code>
              </div>
            )}

            {/* Azioni rapide */}
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <Button
                onClick={() => copyToClipboard(landingUrl, "landing")}
                variant="outline"
                size="sm"
                className="text-xs h-8"
              >
                {copiedField === "landing" ? (
                  <Check className="mr-1.5 h-3 w-3" />
                ) : (
                  <Copy className="mr-1.5 h-3 w-3" />
                )}
                Copia URL
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
