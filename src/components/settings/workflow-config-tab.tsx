"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronRight,
  Mail,
  MessageSquare,
  Save,
  Info,
  Zap,
  Clock,
  Eye,
  EyeOff,
} from "lucide-react";
import { AVAILABLE_PLACEHOLDERS } from "@/lib/workflow-templates";

interface WorkflowStep {
  id: string;
  stepNumber: number;
  channel: string;
  name: string;
  variantLabel: string;
  subject: string | null;
  body: string;
  delayDays: number;
  condition: string;
  mode: string;
  active: boolean;
  fromName: string | null;
  fromEmail: string | null;
  triggerStage: string | null;
  nextStage: string | null;
}

interface WorkflowSettings {
  workflowEnabled?: boolean;
  bookingUrl?: string | null;
  signatureAlessio?: string | null;
  signatureFrancesca?: string | null;
  caseStudiesBlock?: string | null;
}

const CONDITION_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  always: { label: "Sempre", icon: <Zap className="h-3 w-3" />, color: "bg-blue-100 text-blue-700" },
  video_watched: { label: "Video visto", icon: <Eye className="h-3 w-3" />, color: "bg-green-100 text-green-700" },
  video_not_watched: { label: "Video NON visto", icon: <EyeOff className="h-3 w-3" />, color: "bg-orange-100 text-orange-700" },
};

export function WorkflowConfigTab() {
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [settings, setSettings] = useState<WorkflowSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [showVariables, setShowVariables] = useState(false);
  const [dirty, setDirty] = useState<Set<string>>(new Set()); // Step IDs modificati

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/workflow-steps");
      if (res.ok) {
        const data = await res.json();
        setSteps(data.steps || []);
        setSettings(data.settings || {});
      }
    } catch {
      toast.error("Errore caricamento workflow");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function toggleExpand(key: string) {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function updateStep(id: string, field: string, value: unknown) {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
    setDirty((prev) => new Set(prev).add(id));
  }

  async function saveSettings(data: Partial<WorkflowSettings>) {
    const res = await fetch("/api/settings/workflow-steps", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "settings", ...data }),
    });
    if (!res.ok) throw new Error("Errore salvataggio settings");
    setSettings((prev) => ({ ...prev, ...data }));
  }

  async function saveStep(step: WorkflowStep) {
    const res = await fetch("/api/settings/workflow-steps", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: step.id,
        name: step.name,
        subject: step.subject,
        body: step.body,
        delayDays: step.delayDays,
        mode: step.mode,
        active: step.active,
        fromName: step.fromName,
        fromEmail: step.fromEmail,
      }),
    });
    if (!res.ok) throw new Error("Errore salvataggio step");
  }

  async function saveAll() {
    setSaving(true);
    try {
      // Salva settings
      await saveSettings({
        bookingUrl: settings.bookingUrl,
        signatureAlessio: settings.signatureAlessio,
        signatureFrancesca: settings.signatureFrancesca,
        caseStudiesBlock: settings.caseStudiesBlock,
      });

      // Salva step modificati
      for (const id of dirty) {
        const step = steps.find((s) => s.id === id);
        if (step) await saveStep(step);
      }

      setDirty(new Set());
      toast.success("Workflow salvato");
    } catch {
      toast.error("Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  }

  // Raggruppa per stepNumber
  const stepGroups = [1, 2, 3].map((num) => ({
    stepNumber: num,
    steps: steps.filter((s) => s.stepNumber === num),
  }));

  if (loading) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground">Caricamento workflow...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header con switch globale */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Workflow Automazione
            </CardTitle>
            <CardDescription>Gestisci il flusso email/WhatsApp con invio automatico o manuale per ogni step</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={settings.workflowEnabled ? "default" : "secondary"} className={settings.workflowEnabled ? "bg-green-600" : ""}>
              {settings.workflowEnabled ? "Attivo" : "Disattivato"}
            </Badge>
            <Switch
              checked={settings.workflowEnabled || false}
              onCheckedChange={async (v) => {
                setSettings((prev) => ({ ...prev, workflowEnabled: v }));
                await saveSettings({ workflowEnabled: v });
                toast.success(v ? "Workflow attivato" : "Workflow disattivato");
              }}
            />
          </div>
        </CardHeader>
      </Card>

      {/* Variabili & Firme */}
      <Card>
        <CardHeader
          className="cursor-pointer flex flex-row items-center justify-between pb-3"
          onClick={() => setShowVariables(!showVariables)}
        >
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4" />
            Variabili, Firme & Casi Studio
          </CardTitle>
          {showVariables ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </CardHeader>
        {showVariables && (
          <CardContent className="space-y-4">
            {/* Placeholder legend */}
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-2 block">Placeholder disponibili</Label>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_PLACEHOLDERS.map((p) => (
                  <Badge key={p.key} variant="outline" className="text-xs cursor-help" title={p.description}>
                    {p.key}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Link Prenotazione (Google Calendar)</Label>
                <Input
                  value={settings.bookingUrl || ""}
                  onChange={(e) => setSettings((p) => ({ ...p, bookingUrl: e.target.value }))}
                  placeholder="https://calendar.app.google/..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Firma Alessio</Label>
                <Textarea
                  value={settings.signatureAlessio || ""}
                  onChange={(e) => setSettings((p) => ({ ...p, signatureAlessio: e.target.value }))}
                  placeholder="Alessio Loi&#10;Karalisweb"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Firma Francesca</Label>
                <Textarea
                  value={settings.signatureFrancesca || ""}
                  onChange={(e) => setSettings((p) => ({ ...p, signatureFrancesca: e.target.value }))}
                  placeholder="Francesca&#10;Karalisweb"
                  rows={3}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Casi Studio (blocco riutilizzabile)</Label>
              <Textarea
                value={settings.caseStudiesBlock || ""}
                onChange={(e) => setSettings((p) => ({ ...p, caseStudiesBlock: e.target.value }))}
                placeholder="Inserisci qui i casi studio da includere nelle email con {casiStudio}..."
                rows={4}
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Step del workflow */}
      {stepGroups.map(({ stepNumber, steps: groupSteps }) => {
        if (groupSteps.length === 0) return null;
        const stepKey = `step_${stepNumber}`;
        const isExpanded = expandedSteps.has(stepKey);
        const delay = groupSteps[0]?.delayDays || 0;

        return (
          <Card key={stepKey}>
            <CardHeader
              className="cursor-pointer flex flex-row items-center justify-between pb-3"
              onClick={() => toggleExpand(stepKey)}
            >
              <div className="flex items-center gap-3">
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <CardTitle className="text-base">Step {stepNumber}</CardTitle>
                {delay > 0 && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <Clock className="h-3 w-3" />
                    dopo {delay} giorni
                  </Badge>
                )}
              </div>
              <div className="flex gap-1.5">
                {groupSteps.some((s) => s.channel === "email") && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Mail className="h-3 w-3" /> Email
                  </Badge>
                )}
                {groupSteps.some((s) => s.channel === "whatsapp") && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <MessageSquare className="h-3 w-3" /> WA
                  </Badge>
                )}
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="space-y-4">
                {groupSteps.map((step) => {
                  const condInfo = CONDITION_LABELS[step.condition] || CONDITION_LABELS.always;
                  const isDirty = dirty.has(step.id);

                  return (
                    <div key={step.id} className={`border rounded-lg p-4 space-y-3 ${!step.active ? "opacity-50" : ""}`}>
                      {/* Header step */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          {step.channel === "email" ? (
                            <Mail className="h-4 w-4 text-blue-600" />
                          ) : (
                            <MessageSquare className="h-4 w-4 text-green-600" />
                          )}
                          <span className="font-medium text-sm">{step.name}</span>
                          {step.variantLabel && (
                            <Badge variant="outline" className="text-xs">
                              Variante {step.variantLabel}
                            </Badge>
                          )}
                          <Badge className={`text-xs gap-1 ${condInfo.color}`}>
                            {condInfo.icon} {condInfo.label}
                          </Badge>
                          {isDirty && <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">Modificato</Badge>}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground">Attivo</Label>
                            <Switch
                              checked={step.active}
                              onCheckedChange={(v) => updateStep(step.id, "active", v)}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground">
                              {step.mode === "auto" ? "Auto" : "Manuale"}
                            </Label>
                            <Switch
                              checked={step.mode === "auto"}
                              onCheckedChange={(v) => updateStep(step.id, "mode", v ? "auto" : "manual")}
                            />
                          </div>
                        </div>
                      </div>

                      {/* From (solo email) */}
                      {step.channel === "email" && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Da (nome)</Label>
                            <Input
                              value={step.fromName || ""}
                              onChange={(e) => updateStep(step.id, "fromName", e.target.value || null)}
                              placeholder="Default da impostazioni"
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Da (email)</Label>
                            <Input
                              value={step.fromEmail || ""}
                              onChange={(e) => updateStep(step.id, "fromEmail", e.target.value || null)}
                              placeholder="Default da impostazioni"
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                      )}

                      {/* Oggetto (solo email) */}
                      {step.channel === "email" && (
                        <div className="space-y-1">
                          <Label className="text-xs">Oggetto</Label>
                          <Input
                            value={step.subject || ""}
                            onChange={(e) => updateStep(step.id, "subject", e.target.value)}
                            placeholder="Oggetto email..."
                            className="h-8 text-sm"
                          />
                        </div>
                      )}

                      {/* Body */}
                      <div className="space-y-1">
                        <Label className="text-xs">Messaggio</Label>
                        <Textarea
                          value={step.body}
                          onChange={(e) => updateStep(step.id, "body", e.target.value)}
                          rows={8}
                          className="text-sm font-mono"
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Salva */}
      <div className="flex justify-end">
        <Button onClick={saveAll} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? "Salvataggio..." : "Salva tutto"}
        </Button>
      </div>
    </div>
  );
}
