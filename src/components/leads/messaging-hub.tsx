"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  Mail,
  Send,
  Check,
  Loader2,
  AlertTriangle,
  Eye,
  Clock,
  Target,
} from "lucide-react";
import { toast } from "sonner";

interface MessagingHubProps {
  leadId: string;
  leadName: string;
  outreachChannel: string | null;
  landingPuntoDolore: string | null;
  videoViewsCount: number;
  videoFirstPlayAt: string | null;
  videoMaxWatchPercent: number | null;
  videoCompletedAt: string | null;
  unsubscribed: boolean;
  activities: Array<{
    id: string;
    type: string;
    notes: string | null;
    createdAt: string;
  }>;
}

// Filtra solo activity legate a messaggi
const MESSAGE_ACTIVITY_TYPES = [
  "EMAIL_OUTREACH",
  "WHATSAPP_SENT",
  "VIDEO_SENT",
  "FOLLOW_UP",
  "FOLLOW_UP_1",
  "FOLLOW_UP_2",
  "FOLLOW_UP_3",
  "LINKEDIN_SENT",
];

function ResponseTracker({ leadId, leadName }: { leadId: string; leadName: string }) {
  const [loading, setLoading] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);

  const channels = [
    { key: "whatsapp", label: "WhatsApp", icon: MessageCircle, color: "bg-green-600 hover:bg-green-700" },
    { key: "email", label: "Email", icon: Mail, color: "bg-blue-600 hover:bg-blue-700" },
    { key: "telefono", label: "Telefono", icon: Target, color: "bg-purple-600 hover:bg-purple-700" },
  ];

  const handleResponse = async (via: string) => {
    setLoading(true);
    setSelectedChannel(via);
    try {
      const res = await fetch(`/api/leads/${leadId}/quick-log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RESPONSE_RECEIVED", respondedVia: via }),
      });
      if (!res.ok) throw new Error("Errore");
      toast.success(`${leadName} segnato come "ha risposto" via ${via}`);
      window.location.reload();
    } catch {
      toast.error("Errore nel salvataggio");
    } finally {
      setLoading(false);
      setSelectedChannel(null);
    }
  };

  return (
    <Card className="border-green-500/30 bg-green-500/5">
      <CardContent className="p-4">
        <p className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Check className="h-4 w-4 text-green-500" />
          Segna come &quot;Ha risposto&quot;
        </p>
        <div className="flex gap-2">
          {channels.map(({ key, label, icon: Icon, color }) => (
            <Button
              key={key}
              size="sm"
              disabled={loading}
              className={`flex-1 text-white ${color}`}
              onClick={() => handleResponse(key)}
            >
              {loading && selectedChannel === key ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Icon className="h-4 w-4 mr-1" />
              )}
              {label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function MessagingHub({
  leadId,
  leadName,
  outreachChannel,
  landingPuntoDolore,
  videoViewsCount,
  videoFirstPlayAt,
  videoMaxWatchPercent,
  videoCompletedAt,
  unsubscribed,
  activities,
}: MessagingHubProps) {
  const messageActivities = activities.filter((a) =>
    MESSAGE_ACTIVITY_TYPES.includes(a.type)
  );

  return (
    <div className="space-y-4">
      {/* Unsubscribed warning */}
      {unsubscribed && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium text-sm">
                Questo lead si è disiscritto e non desidera ricevere comunicazioni email.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Riepilogo compatto */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {outreachChannel && (
              <Badge variant="outline">
                {outreachChannel === "WA" ? (
                  <><MessageCircle className="h-3 w-3 mr-1" /> WhatsApp</>
                ) : (
                  <><Mail className="h-3 w-3 mr-1" /> Email</>
                )}
              </Badge>
            )}
            {videoViewsCount > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Eye className="h-3 w-3" />
                {videoCompletedAt
                  ? "Video completato"
                  : videoMaxWatchPercent
                    ? `Video ${videoMaxWatchPercent}%`
                    : "Video visto"}
              </Badge>
            )}
            {videoFirstPlayAt && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Play: {new Date(videoFirstPlayAt).toLocaleDateString("it-IT")}
              </span>
            )}
            {landingPuntoDolore && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Target className="h-3 w-3" />
                {landingPuntoDolore.length > 60
                  ? landingPuntoDolore.slice(0, 60) + "..."
                  : landingPuntoDolore}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Segna risposta */}
      <ResponseTracker leadId={leadId} leadName={leadName} />

      {/* Storico messaggi */}
      {messageActivities.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Storico Messaggi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {messageActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 pb-3 border-b last:border-0"
                >
                  <div className="mt-0.5">
                    {activity.type.includes("WHATSAPP") || activity.type === "VIDEO_SENT" ? (
                      <MessageCircle className="h-3.5 w-3.5 text-green-600" />
                    ) : activity.type.includes("EMAIL") ? (
                      <Mail className="h-3.5 w-3.5 text-blue-600" />
                    ) : (
                      <Send className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {activity.type.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(activity.createdAt).toLocaleDateString("it-IT", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {activity.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {activity.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
