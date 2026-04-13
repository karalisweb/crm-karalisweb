"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MessageCircle,
  Mail,
  Send,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Eye,
  Clock,
  Target,
} from "lucide-react";
import { toast } from "sonner";

interface MessagingHubProps {
  leadId: string;
  leadName: string;
  whatsappNumber: string | null;
  email: string | null;
  outreachChannel: string | null;
  landingUrl: string | null;
  phone: string | null;
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

type MessageType = "first" | "followup1" | "followup2" | "followup3";

const MESSAGE_TYPE_LABELS: Record<MessageType, string> = {
  first: "Step 1 — Primo contatto",
  followup1: "Step 2 — Casi studio",
  followup2: "Step 3 — Chiusura ciclo",
  followup3: "Follow-up extra",
};

// Mappa tipo messaggio → (stepNumber, variantLabel) nel workflow
// Per step 3 la variante viene scelta automaticamente basandosi su videoViewed
function getStepFilter(type: MessageType, channel: string, videoWatched: boolean) {
  switch (type) {
    case "first":
      return { stepNumber: 1, channel, variantLabel: "" };
    case "followup1":
      return { stepNumber: 2, channel, variantLabel: "" };
    case "followup2":
      return { stepNumber: 3, channel, variantLabel: videoWatched ? "A" : "B" };
    case "followup3":
      return null; // Non c'è step 4 nel workflow
  }
}

interface WorkflowStep {
  id: string;
  stepNumber: number;
  channel: string;
  name: string;
  variantLabel: string;
  subject: string | null;
  body: string;
  fromName: string | null;
  fromEmail: string | null;
  condition: string;
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

export function MessagingHub({
  leadId,
  leadName,
  whatsappNumber,
  email,
  outreachChannel,
  landingUrl,
  phone,
  landingPuntoDolore,
  videoViewsCount,
  videoFirstPlayAt,
  videoMaxWatchPercent,
  videoCompletedAt,
  unsubscribed,
  activities,
}: MessagingHubProps) {
  const [channel, setChannel] = useState<"WA" | "EMAIL">(
    (outreachChannel as "WA" | "EMAIL") || (whatsappNumber ? "WA" : "EMAIL")
  );
  const [messageType, setMessageType] = useState<MessageType>("first");
  const [message, setMessage] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [leadEmail, setLeadEmail] = useState(email || "");
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [sending, setSending] = useState(false);
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [currentStepId, setCurrentStepId] = useState<string | null>(null);

  const waNumber = whatsappNumber || phone;
  const canWA = !!waNumber;
  const canEmail = !!leadEmail.trim();
  const videoWatched = videoViewsCount > 0 || (videoMaxWatchPercent ?? 0) > 0;

  // Carica workflow steps
  useEffect(() => {
    fetch("/api/settings/workflow-steps")
      .then((r) => r.json())
      .then((data) => {
        setWorkflowSteps(data.steps || []);
      })
      .catch(() => {});
  }, []);

  // Carica preview renderizzata dallo step workflow
  const loadPreview = useCallback(
    async (ch: "WA" | "EMAIL", type: MessageType) => {
      const wfChannel = ch === "WA" ? "whatsapp" : "email";
      const filter = getStepFilter(type, wfChannel, videoWatched);

      if (!filter) {
        // Nessuno step workflow per followup3, usa fallback
        const firstName = leadName.split(" ")[0];
        setMessage(
          ch === "WA"
            ? `Ciao ${firstName}, se in futuro avessi bisogno di supporto per il sito o il marketing digitale, sono qui.\n\nBuon lavoro!\nAlessio`
            : `Buongiorno ${firstName},\n\nSe in futuro avesse bisogno di supporto per il sito o il marketing digitale, sarò felice di aiutarla.\n\nCordiali saluti,\nAlessio Loi\nKaralisweb`,
        );
        setEmailSubject(`Re: Analisi per ${leadName}`);
        setCurrentStepId(null);
        return;
      }

      // Trova lo step nel workflow
      const step = workflowSteps.find(
        (s) =>
          s.stepNumber === filter.stepNumber &&
          s.channel === filter.channel &&
          s.variantLabel === filter.variantLabel,
      );

      if (!step) {
        // Fallback se step non trovato
        setMessage("[Template non configurato. Vai a Impostazioni > Workflow per configurare.]");
        setEmailSubject(`Analisi per ${leadName}`);
        setCurrentStepId(null);
        return;
      }

      setCurrentStepId(step.id);

      // Chiama preview API per renderizzare con dati reali del lead
      try {
        const res = await fetch(`/api/leads/${leadId}/workflow-preview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stepId: step.id }),
        });
        if (res.ok) {
          const data = await res.json();
          setMessage(data.body || "");
          setEmailSubject(data.subject || `Analisi per ${leadName}`);
        }
      } catch {
        // Fallback: mostra template non renderizzato
        setMessage(step.body);
        setEmailSubject(step.subject || `Analisi per ${leadName}`);
      }
    },
    [leadId, leadName, workflowSteps, videoWatched],
  );

  // Rigenera quando cambiano steps/canale/tipo o landingUrl
  useEffect(() => {
    if (workflowSteps.length > 0) {
      loadPreview(channel, messageType);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowSteps, landingUrl]);

  const handleChannelChange = (ch: "WA" | "EMAIL") => {
    setChannel(ch);
    loadPreview(ch, messageType);
  };

  const handleTypeChange = (type: MessageType) => {
    setMessageType(type);
    loadPreview(channel, type);
  };

  const handleSendWA = async () => {
    if (!waNumber) return;
    const cleanNumber = waNumber.replace(/[\s\-\(\)\.]/g, "").replace(/^\+?/, "");
    const waUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;

    setSending(true);
    try {
      // Se c'è uno step workflow, usa workflow-send per tracking coerente
      if (currentStepId) {
        await fetch(`/api/leads/${leadId}/workflow-send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stepId: currentStepId, body: message }),
        });
      } else {
        await fetch(`/api/leads/${leadId}/quick-log`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "WHATSAPP_SENT",
            notes: `Messaggio WA ${MESSAGE_TYPE_LABELS[messageType]} inviato`,
          }),
        });
      }

      if (!outreachChannel) {
        await fetch(`/api/leads/${leadId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ outreachChannel: "WA" }),
        });
      }

      window.open(waUrl, "_blank");
      toast.success("WhatsApp aperto");
    } catch {
      toast.error("Errore nel logging");
    } finally {
      setSending(false);
    }
  };

  const handleSendEmail = async () => {
    if (!leadEmail.trim()) {
      toast.error("Inserisci l'email del prospect");
      return;
    }

    setSending(true);
    try {
      // Se c'è uno step workflow, usa workflow-send per tracking + fromName coerente
      if (currentStepId) {
        const res = await fetch(`/api/leads/${leadId}/workflow-send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stepId: currentStepId,
            body: message,
            subject: emailSubject,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Errore invio email");
        }
      } else {
        const res = await fetch(`/api/leads/${leadId}/send-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: leadEmail.trim(),
            subject: emailSubject || `Analisi personalizzata per ${leadName}`,
            body: message,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Errore invio email");
        }
      }

      if (!email) {
        await fetch(`/api/leads/${leadId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: leadEmail.trim(), outreachChannel: "EMAIL" }),
        });
      }

      toast.success("Email inviata con successo!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore invio");
    } finally {
      setSending(false);
    }
  };

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = message;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2000);
    toast.success("Messaggio copiato!");
  };

  const messageActivities = activities.filter((a) =>
    MESSAGE_ACTIVITY_TYPES.includes(a.type)
  );

  // Trova info step corrente per mostrare variante
  const currentStep = workflowSteps.find((s) => s.id === currentStepId);

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

      {/* Composer */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Send className="h-4 w-4" />
            Componi Messaggio
            {currentStep && (
              <Badge variant="outline" className="text-xs font-normal ml-auto">
                {currentStep.name}
                {currentStep.variantLabel && ` (${currentStep.condition === "video_watched" ? "video visto" : "video non visto"})`}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Canale */}
          <div className="flex items-center gap-2">
            <Button
              variant={channel === "WA" ? "default" : "outline"}
              size="sm"
              onClick={() => handleChannelChange("WA")}
              disabled={!canWA}
              className="flex-1"
            >
              <MessageCircle className="h-4 w-4 mr-1.5" />
              WhatsApp
              {!canWA && <AlertCircle className="h-3 w-3 ml-1 text-muted-foreground" />}
            </Button>
            <Button
              variant={channel === "EMAIL" ? "default" : "outline"}
              size="sm"
              onClick={() => handleChannelChange("EMAIL")}
              className="flex-1"
            >
              <Mail className="h-4 w-4 mr-1.5" />
              Email
            </Button>
          </div>

          {/* Tipo messaggio */}
          <div className="flex gap-1.5 flex-wrap">
            {(Object.keys(MESSAGE_TYPE_LABELS) as MessageType[]).map((type) => (
              <Button
                key={type}
                variant={messageType === type ? "secondary" : "ghost"}
                size="sm"
                className="text-xs"
                onClick={() => handleTypeChange(type)}
              >
                {MESSAGE_TYPE_LABELS[type]}
              </Button>
            ))}
          </div>

          {/* Email fields */}
          {channel === "EMAIL" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Email destinatario</Label>
                <Input
                  type="email"
                  value={leadEmail}
                  onChange={(e) => setLeadEmail(e.target.value)}
                  placeholder="info@esempio.it"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Oggetto</Label>
                <Input
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Oggetto email"
                  className="h-8 text-sm"
                />
              </div>
            </div>
          )}

          {/* Messaggio */}
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={10}
            className="text-sm resize-y"
          />

          {/* Landing URL preview */}
          {landingUrl && (
            <p className="text-xs text-muted-foreground truncate">
              Landing: {landingUrl}
            </p>
          )}

          {/* Azioni */}
          <div className="flex gap-2">
            {channel === "WA" ? (
              <Button
                onClick={handleSendWA}
                disabled={sending || !canWA}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <MessageCircle className="h-4 w-4 mr-2" />
                )}
                Apri WhatsApp
                <ExternalLink className="h-3 w-3 ml-1.5" />
              </Button>
            ) : (
              <Button
                onClick={handleSendEmail}
                disabled={sending || !canEmail || unsubscribed}
                className="flex-1"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4 mr-2" />
                )}
                Invia Email
              </Button>
            )}
            <Button variant="outline" onClick={copyMessage}>
              {copiedMsg ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          {channel === "WA" && !canWA && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Nessun numero WA trovato. Usa il canale Email.
            </p>
          )}
        </CardContent>
      </Card>

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
