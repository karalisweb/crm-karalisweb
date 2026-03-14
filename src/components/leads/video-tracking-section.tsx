"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Copy,
  Check,
  Video,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

interface VideoTrackingSectionProps {
  leadId: string;
  videoTrackingToken: string | null;
  videoViewsCount: number;
  videoViewedAt: string | null;
}

export function VideoTrackingSection({
  leadId,
  videoTrackingToken,
  videoViewsCount,
  videoViewedAt,
}: VideoTrackingSectionProps) {
  const [token, setToken] = useState(videoTrackingToken);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateToken = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/tracking-token`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToken(data.token);
      toast.success("Token generato!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore");
    } finally {
      setGenerating(false);
    }
  };

  const copyToken = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = token;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
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

        {token ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-muted px-3 py-2 rounded-md font-mono truncate">
                {token}
              </code>
              <Button onClick={copyToken} variant="outline" size="sm">
                {copied ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Usa questo token nella tua sales page per tracciare le visualizzazioni video di questo lead.
            </p>
          </div>
        ) : (
          <Button
            onClick={generateToken}
            variant="outline"
            size="sm"
            disabled={generating}
          >
            {generating ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Video className="mr-2 h-3.5 w-3.5" />
            )}
            Genera Token Tracking
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
