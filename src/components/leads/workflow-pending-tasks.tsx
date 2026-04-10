"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Mail,
  MessageSquare,
  Send,
  SkipForward,
  Check,
  Clock,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  GitBranch,
  Loader2,
} from "lucide-react";

interface Execution {
  id: string;
  stepId: string;
  stepName: string;
  stepNumber: number;
  channel: string;
  status: string;
  sentAt: string | null;
}

interface NextStep {
  id: string;
  stepNumber: number;
  channel: string;
  name: string;
  mode: string;
  condition: string;
  variantLabel: string;
  delayDays: number;
}

interface AllStep {
  id: string;
  stepNumber: number;
  channel: string;
  name: string;
  mode: string;
  variantLabel: string;
  executed: boolean;
}

interface WorkflowStatus {
  lead: {
    id: string;
    name: string;
    pipelineStage: string;
    outreachChannel: string;
    videoWatched: boolean;
    unsubscribed: boolean;
  };
  executions: Execution[];
  nextStep: NextStep | null;
  allSteps: AllStep[];
}

interface Props {
  leadId: string;
  onStageChange?: () => void;
}

export function WorkflowPendingTasks({ leadId, onStageChange }: Props) {
  const [status, setStatus] = useState<WorkflowStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [preview, setPreview] = useState<{ subject: string | null; body: string } | null>(null);
  const [editedBody, setEditedBody] = useState("");
  const [editedSubject, setEditedSubject] = useState("");
  const [sending, setSending] = useState(false);
  const [skipping, setSkipping] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/leads/${leadId}/workflow-status`);
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch {
      // silenzioso
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  // Carica anteprima quando c'è un nextStep
  useEffect(() => {
    if (!status?.nextStep) return;
    fetch(`/api/leads/${leadId}/workflow-preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stepId: status.nextStep.id }),
    })
      .then((r) => r.json())
      .then((data) => {
        setPreview(data);
        setEditedBody(data.body || "");
        setEditedSubject(data.subject || "");
      })
      .catch(() => {});
  }, [status?.nextStep, leadId]);

  async function handleSend() {
    if (!status?.nextStep) return;
    setSending(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/workflow-send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stepId: status.nextStep.id,
          body: editedBody !== preview?.body ? editedBody : undefined,
          subject: editedSubject !== preview?.subject ? editedSubject : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Errore invio");
        return;
      }
      if (data.channel === "whatsapp" && data.waUrl) {
        window.open(data.waUrl, "_blank");
      }
      toast.success(data.channel === "email" ? "Email inviata" : "WhatsApp aperto");
      setPreview(null);
      fetchStatus();
      onStageChange?.();
    } catch {
      toast.error("Errore invio");
    } finally {
      setSending(false);
    }
  }

  async function handleSkip() {
    if (!status?.nextStep) return;
    setSkipping(true);
    try {
      // Crea una execution con status "skipped"
      await fetch(`/api/leads/${leadId}/workflow-send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepId: status.nextStep.id, skip: true }),
      });
      toast.success("Step saltato");
      fetchStatus();
    } catch {
      toast.error("Errore");
    } finally {
      setSkipping(false);
    }
  }

  // Non mostrare niente se non ci sono dati o non c'è nextStep
  if (loading) return null;
  if (!status || (status.allSteps.length === 0 && !status.nextStep)) return null;

  const RELEVANT_STAGES = ["VIDEO_INVIATO", "FOLLOW_UP_1", "FOLLOW_UP_2", "FOLLOW_UP_3"];
  if (!RELEVANT_STAGES.includes(status.lead.pipelineStage)) return null;

  return (
    <Card className="border-purple-200 bg-purple-50/30">
      <CardHeader
        className="cursor-pointer flex flex-row items-center justify-between pb-3"
        onClick={() => setExpanded(!expanded)}
      >
        <CardTitle className="text-sm flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-purple-600" />
          Workflow Outreach
          {status.nextStep && (
            <Badge variant="outline" className="text-xs text-purple-600 border-purple-300">
              Prossimo: Step {status.nextStep.stepNumber}
            </Badge>
          )}
        </CardTitle>
        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-3">
          {/* Timeline mini */}
          <div className="flex items-center gap-1">
            {status.allSteps.map((s, i) => (
              <div key={s.id} className="flex items-center gap-1">
                {i > 0 && <div className="w-4 h-px bg-border" />}
                <div
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                    s.executed
                      ? "bg-green-100 text-green-700"
                      : status.nextStep?.id === s.id
                        ? "bg-purple-100 text-purple-700 ring-1 ring-purple-300"
                        : "bg-muted text-muted-foreground"
                  }`}
                  title={s.name}
                >
                  {s.executed ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                  {s.stepNumber}
                  {s.channel === "email" ? <Mail className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
                </div>
              </div>
            ))}
          </div>

          {/* Prossimo step da inviare */}
          {status.nextStep && preview && (
            <div className="border rounded-lg p-3 space-y-3 bg-background">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  {status.nextStep.channel === "email" ? (
                    <Mail className="h-4 w-4 text-blue-600" />
                  ) : (
                    <MessageSquare className="h-4 w-4 text-green-600" />
                  )}
                  <span className="font-medium text-sm">{status.nextStep.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {status.nextStep.mode === "auto" ? "Auto" : "Manuale"}
                  </Badge>
                  {status.nextStep.condition === "video_watched" && (
                    <Badge className="text-xs bg-green-100 text-green-700 gap-1">
                      <Eye className="h-3 w-3" /> Video visto
                    </Badge>
                  )}
                  {status.nextStep.condition === "video_not_watched" && (
                    <Badge className="text-xs bg-orange-100 text-orange-700 gap-1">
                      <EyeOff className="h-3 w-3" /> Video non visto
                    </Badge>
                  )}
                </div>
              </div>

              {/* Oggetto (solo email) */}
              {status.nextStep.channel === "email" && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Oggetto</label>
                  <Input
                    value={editedSubject}
                    onChange={(e) => setEditedSubject(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              )}

              {/* Body */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Messaggio</label>
                <Textarea
                  value={editedBody}
                  onChange={(e) => setEditedBody(e.target.value)}
                  rows={8}
                  className="text-sm"
                />
              </div>

              {/* Azioni */}
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSkip}
                  disabled={skipping}
                  className="gap-1.5 text-xs"
                >
                  {skipping ? <Loader2 className="h-3 w-3 animate-spin" /> : <SkipForward className="h-3 w-3" />}
                  Salta
                </Button>
                <Button
                  size="sm"
                  onClick={handleSend}
                  disabled={sending || status.lead.unsubscribed}
                  className="gap-1.5 text-xs bg-purple-600 hover:bg-purple-700"
                >
                  {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                  {status.nextStep.channel === "email" ? "Invia Email" : "Apri WhatsApp"}
                </Button>
              </div>

              {status.lead.unsubscribed && (
                <p className="text-xs text-destructive">Lead disiscritto — invio bloccato</p>
              )}
            </div>
          )}

          {/* Tutto completato */}
          {!status.nextStep && status.executions.length > 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">
              Tutti gli step del workflow sono stati completati
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
