"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Copy,
  Check,
  Video,
  Eye,
  Youtube,
  Globe,
  MessageSquare,
  ExternalLink,
  Rocket,
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
}: VideoTrackingSectionProps) {
  const [token, setToken] = useState(videoTrackingToken);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState(videoYoutubeUrl || "");
  const [savingYoutube, setSavingYoutube] = useState(false);
  const [landingUrl, setLandingUrl] = useState(videoLandingUrl || "");
  const [landingSlug, setLandingSlug] = useState(videoLandingSlug || "");
  const [creatingLanding, setCreatingLanding] = useState(false);

  const landingCreated = !!landingUrl;

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

  const createLandingPage = async () => {
    if (!youtubeUrl.trim()) {
      toast.error("Inserisci prima il YouTube URL");
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

  const followUpMessage = `Ciao ${leadName.split(" ")[0]}, qualche giorno fa ti avevo inviato un'analisi personalizzata del tuo sito. Magari ti è sfuggita — eccola qui: ${landingUrl}\nFammi sapere se hai 10 minuti per vederla insieme!`;

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
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {videoViewedAt && (
          <p className="text-sm text-muted-foreground">
            Ultimo view:{" "}
            {new Date(videoViewedAt).toLocaleDateString("it-IT", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}

        {/* Step 1: YouTube URL */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium flex items-center gap-1.5">
            <Youtube className="h-3.5 w-3.5 text-red-600" />
            YouTube URL
            {youtubeUrl && <Check className="h-3 w-3 text-green-600" />}
          </Label>
          <div className="flex gap-2">
            <Input
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              onBlur={saveYoutubeUrl}
              onKeyDown={(e) => e.key === "Enter" && saveYoutubeUrl()}
              placeholder="https://youtu.be/..."
              className="text-sm h-8"
              disabled={landingCreated}
            />
            {savingYoutube && <Loader2 className="h-4 w-4 animate-spin mt-2" />}
          </div>
        </div>

        {/* Step 2: Crea Landing Page (o mostra risultato) */}
        {!landingCreated ? (
          <Button
            onClick={createLandingPage}
            disabled={creatingLanding || !youtubeUrl.trim()}
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
              <Button
                onClick={() => copyToClipboard(followUpMessage, "followup")}
                variant="outline"
                size="sm"
                className="text-xs h-8"
              >
                {copiedField === "followup" ? (
                  <Check className="mr-1.5 h-3 w-3" />
                ) : (
                  <MessageSquare className="mr-1.5 h-3 w-3" />
                )}
                Copia Follow-up WA
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
