"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Search, Pen, Video, Globe, Send,
  Lock, Check, ChevronDown, ChevronUp,
  Loader2, RefreshCw, Pencil, Copy,
  ExternalLink, MessageCircle, Mail,
  AlertTriangle, Target,
} from "lucide-react";
import type { AnalystOutput, AnalystPainPoint } from "@/lib/gemini-analyst";

// ==========================================
// TYPES
// ==========================================

interface StepperProps {
  leadId: string;
  leadName: string;
  website: string | null;
  // Step 1
  analystOutput: AnalystOutput | null;
  analystApprovedAt: string | null;
  // Step 2
  geminiAnalysis: { teleprompter_script?: { atto_1: string; atto_2: string; atto_3: string; atto_4: string }; strategic_note?: string } | null;
  scriptApprovedAt: string | null;
  puntoDoloreBreve: string | null;
  puntoDoloreLungo: string | null;
  // Step 3
  videoYoutubeUrl: string | null;
  // Step 4
  videoLandingUrl: string | null;
  videoTrackingToken: string | null;
  // Step 5
  videoSentAt: string | null;
  outreachChannel: string | null;
  whatsappNumber: string | null;
  email: string | null;
  phone: string | null;
  // Tracking
  videoViewsCount: number;
  videoFirstPlayAt: string | null;
  videoMaxWatchPercent: number | null;
  videoCompletedAt: string | null;
  // Callback to refresh lead data
  onRefresh: () => void;
}

type StepStatus = "locked" | "active" | "completed";

// ==========================================
// STEP CONFIG
// ==========================================

const STEPS = [
  { id: 1, title: "Analisi Sito", icon: Search, color: "text-blue-600" },
  { id: 2, title: "Script & Punto di Dolore", icon: Pen, color: "text-purple-600" },
  { id: 3, title: "Video YouTube", icon: Video, color: "text-red-600" },
  { id: 4, title: "Landing Page", icon: Globe, color: "text-green-600" },
  { id: 5, title: "Invia Messaggio", icon: Send, color: "text-orange-600" },
];

// ==========================================
// MAIN COMPONENT
// ==========================================

export function VideoOutreachStepper(props: StepperProps) {
  const {
    leadId, leadName, website,
    analystOutput, analystApprovedAt,
    geminiAnalysis, scriptApprovedAt,
    puntoDoloreBreve, puntoDoloreLungo,
    videoYoutubeUrl, videoLandingUrl, videoTrackingToken,
    videoSentAt, outreachChannel,
    whatsappNumber, email, phone,
    videoViewsCount, videoFirstPlayAt, videoMaxWatchPercent, videoCompletedAt,
    onRefresh,
  } = props;

  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  // Calculate step statuses
  const stepStatuses: StepStatus[] = [
    analystApprovedAt ? "completed" : "active",
    !analystApprovedAt ? "locked" : scriptApprovedAt ? "completed" : "active",
    !scriptApprovedAt ? "locked" : videoYoutubeUrl ? "completed" : "active",
    !videoYoutubeUrl ? "locked" : videoLandingUrl ? "completed" : "active",
    !videoLandingUrl ? "locked" : videoSentAt ? "completed" : "active",
  ];

  // Auto-expand first active step
  const activeStep = stepStatuses.findIndex(s => s === "active") + 1;
  const visibleStep = expandedStep ?? activeStep;

  return (
    <div className="space-y-0">
      {STEPS.map((step, idx) => {
        const status = stepStatuses[idx];
        const isExpanded = visibleStep === step.id;
        const StepIcon = step.icon;

        return (
          <div key={step.id} className="relative">
            {/* Connecting line */}
            {idx < STEPS.length - 1 && (
              <div className={`absolute left-5 top-12 bottom-0 w-0.5 ${
                status === "completed" ? "bg-green-300" : "bg-border"
              }`} />
            )}

            {/* Step header */}
            <button
              onClick={() => status !== "locked" && setExpandedStep(isExpanded ? null : step.id)}
              disabled={status === "locked"}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                status === "locked"
                  ? "opacity-40 cursor-not-allowed"
                  : "hover:bg-muted/50 cursor-pointer"
              }`}
            >
              {/* Circle */}
              <div className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 shrink-0 ${
                status === "completed"
                  ? "border-green-500 bg-green-50 dark:bg-green-950"
                  : status === "active"
                    ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                    : "border-muted-foreground/30 bg-muted"
              }`}>
                {status === "completed" ? (
                  <Check className="h-5 w-5 text-green-600" />
                ) : status === "locked" ? (
                  <Lock className="h-4 w-4 text-muted-foreground/50" />
                ) : (
                  <StepIcon className={`h-5 w-5 ${step.color}`} />
                )}
              </div>

              {/* Title + status */}
              <div className="flex-1 text-left">
                <div className="font-medium text-sm">{step.title}</div>
                {status === "completed" && (
                  <div className="text-xs text-green-600">Completato</div>
                )}
                {status === "locked" && (
                  <div className="text-xs text-muted-foreground">Completa lo step precedente</div>
                )}
              </div>

              {/* Expand icon */}
              {status !== "locked" && (
                isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {/* Step content */}
            {isExpanded && status !== "locked" && (
              <div className="ml-[52px] pb-6 pr-2">
                {step.id === 1 && (
                  <Step1Content
                    leadId={leadId}
                    website={website}
                    analystOutput={analystOutput}
                    analystApprovedAt={analystApprovedAt}
                    onRefresh={onRefresh}
                  />
                )}
                {step.id === 2 && (
                  <Step2Content
                    leadId={leadId}
                    geminiAnalysis={geminiAnalysis}
                    scriptApprovedAt={scriptApprovedAt}
                    puntoDoloreBreve={puntoDoloreBreve}
                    puntoDoloreLungo={puntoDoloreLungo}
                    onRefresh={onRefresh}
                  />
                )}
                {step.id === 3 && (
                  <Step3Content
                    leadId={leadId}
                    videoYoutubeUrl={videoYoutubeUrl}
                    onRefresh={onRefresh}
                  />
                )}
                {step.id === 4 && (
                  <Step4Content
                    leadId={leadId}
                    puntoDoloreLungo={puntoDoloreLungo}
                    videoLandingUrl={videoLandingUrl}
                    videoTrackingToken={videoTrackingToken}
                    onRefresh={onRefresh}
                  />
                )}
                {step.id === 5 && (
                  <Step5Content
                    leadId={leadId}
                    leadName={leadName}
                    videoLandingUrl={videoLandingUrl}
                    whatsappNumber={whatsappNumber}
                    email={email}
                    phone={phone}
                    videoSentAt={videoSentAt}
                    outreachChannel={outreachChannel}
                    videoViewsCount={videoViewsCount}
                    videoFirstPlayAt={videoFirstPlayAt}
                    videoMaxWatchPercent={videoMaxWatchPercent}
                    videoCompletedAt={videoCompletedAt}
                    onRefresh={onRefresh}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ==========================================
// STEP 1: Analisi Sito
// ==========================================

function Step1Content({
  leadId, website, analystOutput, analystApprovedAt, onRefresh,
}: {
  leadId: string;
  website: string | null;
  analystOutput: AnalystOutput | null;
  analystApprovedAt: string | null;
  onRefresh: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showRegenNotes, setShowRegenNotes] = useState(false);
  const [regenNotes, setRegenNotes] = useState("");
  const [editData, setEditData] = useState<AnalystOutput | null>(null);

  const runAnalyst = useCallback(async (notes?: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/run-analyst`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Analisi completata");
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore durante l'analisi");
    } finally {
      setLoading(false);
      setShowRegenNotes(false);
      setRegenNotes("");
    }
  }, [leadId, onRefresh]);

  const approve = useCallback(async (action: "approve" | "edit", data?: AnalystOutput) => {
    try {
      const res = await fetch(`/api/leads/${leadId}/approve-analyst`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, analystOutput: data }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      toast.success("Output approvato");
      setEditing(false);
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore");
    }
  }, [leadId, onRefresh]);

  if (!website) {
    return (
      <div className="text-sm text-muted-foreground flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        Lead senza sito web — analisi non disponibile
      </div>
    );
  }

  // No output yet — show generate button
  if (!analystOutput) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Scrapa il sito e analizza la comunicazione per trovare punti di dolore concreti.
        </p>
        <Button onClick={() => runAnalyst()} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analisi in corso...
            </>
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Analizza Sito
            </>
          )}
        </Button>
      </div>
    );
  }

  const output = editing ? editData || analystOutput : analystOutput;

  return (
    <div className="space-y-4">
      {/* Approved badge */}
      {analystApprovedAt && !editing && (
        <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
          <Check className="h-3 w-3 mr-1" />
          Approvato il {new Date(analystApprovedAt).toLocaleDateString("it-IT")}
        </Badge>
      )}

      {/* Pattern + Score */}
      <div className="flex flex-wrap gap-2">
        <Badge variant={output.primary_pattern !== "NESSUNO" ? "destructive" : "secondary"}>
          {output.primary_pattern}
        </Badge>
        <Badge variant="outline">
          Brand Score: {output.brand_positioning_score}/10
        </Badge>
      </div>

      {/* Cliché */}
      {output.cliche_found && output.cliche_found !== "NESSUNA_CLICHE_TROVATA" && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">Clich&eacute; trovato:</p>
          <p className="text-sm italic">&ldquo;{output.cliche_found}&rdquo;</p>
        </div>
      )}

      {/* Communication weakness */}
      <div className="text-sm text-muted-foreground">
        <strong>Debolezza:</strong> {output.communication_weakness}
      </div>

      {/* Pain points */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Pain Points ({output.pain_points?.length || 0}):</p>
        {output.pain_points?.map((pp: AnalystPainPoint, i: number) => (
          <Card key={i} className="bg-muted/30">
            <CardContent className="p-3 space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant={pp.severity === "high" ? "destructive" : pp.severity === "medium" ? "default" : "secondary"} className="text-xs">
                  {pp.severity}
                </Badge>
                <span className="text-xs font-medium">{pp.area}</span>
              </div>
              <p className="text-sm">{pp.finding}</p>
              {pp.evidence && (
                <p className="text-xs italic text-muted-foreground">&ldquo;{pp.evidence}&rdquo;</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Punto di dolore preview */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <Target className="h-3 w-3" /> Punto di Dolore
        </p>
        <div className="grid gap-2">
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">Breve (WhatsApp):</p>
            {editing ? (
              <Textarea
                value={editData?.punto_dolore_breve || ""}
                onChange={(e) => setEditData(prev => prev ? { ...prev, punto_dolore_breve: e.target.value } : prev)}
                rows={2}
                className="text-sm"
              />
            ) : (
              <p className="text-sm">{output.punto_dolore_breve}</p>
            )}
          </div>
          <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
            <p className="text-xs font-medium text-purple-700 dark:text-purple-400 mb-1">Lungo (Landing Page):</p>
            {editing ? (
              <Textarea
                value={editData?.punto_dolore_lungo || ""}
                onChange={(e) => setEditData(prev => prev ? { ...prev, punto_dolore_lungo: e.target.value } : prev)}
                rows={4}
                className="text-sm"
              />
            ) : (
              <p className="text-sm">{output.punto_dolore_lungo}</p>
            )}
          </div>
        </div>
      </div>

      {/* Evidence metadata */}
      <div className="flex gap-3 text-xs text-muted-foreground">
        <span>Home: {output.home_text_length} chars</span>
        <span>About: {output.about_text_length} chars</span>
        <span>Servizi: {output.services_text_length} chars</span>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 pt-2">
        {editing ? (
          <>
            <Button size="sm" onClick={() => approve("edit", editData!)}>
              <Check className="h-3.5 w-3.5 mr-1.5" />
              Salva e Approva
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setEditing(false); setEditData(null); }}>
              Annulla
            </Button>
          </>
        ) : (
          <>
            {!analystApprovedAt && (
              <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => approve("approve")}>
                <Check className="h-3.5 w-3.5 mr-1.5" />
                Approva
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => { setEditing(true); setEditData({ ...analystOutput }); }}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Modifica
            </Button>
            {showRegenNotes ? (
              <div className="w-full space-y-2 mt-2">
                <Textarea
                  placeholder="Note per la rigenerazione (es. 'concentrati più sul blog morto')"
                  value={regenNotes}
                  onChange={(e) => setRegenNotes(e.target.value)}
                  rows={2}
                  className="text-sm"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => runAnalyst(regenNotes)} disabled={loading}>
                    {loading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
                    Rigenera con note
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowRegenNotes(false); setRegenNotes(""); }}>
                    Annulla
                  </Button>
                </div>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setShowRegenNotes(true)} disabled={loading}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Rigenera
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ==========================================
// STEP 2: Script & Punto di Dolore
// ==========================================

function Step2Content({
  leadId, geminiAnalysis, scriptApprovedAt, puntoDoloreBreve, puntoDoloreLungo, onRefresh,
}: {
  leadId: string;
  geminiAnalysis: StepperProps["geminiAnalysis"];
  scriptApprovedAt: string | null;
  puntoDoloreBreve: string | null;
  puntoDoloreLungo: string | null;
  onRefresh: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [showRegenNotes, setShowRegenNotes] = useState(false);
  const [regenNotes, setRegenNotes] = useState("");
  const [editing, setEditing] = useState(false);
  const [editBreve, setEditBreve] = useState(puntoDoloreBreve || "");
  const [editLungo, setEditLungo] = useState(puntoDoloreLungo || "");

  const runScript = useCallback(async (notes?: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/run-scriptwriter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Script generato");
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore");
    } finally {
      setLoading(false);
      setShowRegenNotes(false);
      setRegenNotes("");
    }
  }, [leadId, onRefresh]);

  const approve = useCallback(async (action: "approve" | "edit") => {
    try {
      const body: Record<string, unknown> = { action };
      if (action === "edit") {
        body.puntoDoloreBreve = editBreve;
        body.puntoDoloreLungo = editLungo;
      }
      const res = await fetch(`/api/leads/${leadId}/approve-script`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Script approvato");
      setEditing(false);
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore");
    }
  }, [leadId, editBreve, editLungo, onRefresh]);

  const script = geminiAnalysis?.teleprompter_script;

  if (!script) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Genera lo script video a 4 atti basato sull&apos;analisi approvata.
        </p>
        <Button onClick={() => runScript()} disabled={loading}>
          {loading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generazione in corso...</>
          ) : (
            <><Pen className="h-4 w-4 mr-2" />Genera Script</>
          )}
        </Button>
      </div>
    );
  }

  const acts = [
    { num: 1, title: "Ghiaccio e Metafora", text: script.atto_1 },
    { num: 2, title: "La Scena del Crimine", text: script.atto_2 },
    { num: 3, title: "I Soldi", text: script.atto_3 },
    { num: 4, title: "La Soluzione", text: script.atto_4 },
  ];

  return (
    <div className="space-y-4">
      {scriptApprovedAt && !editing && (
        <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
          <Check className="h-3 w-3 mr-1" />
          Approvato il {new Date(scriptApprovedAt).toLocaleDateString("it-IT")}
        </Badge>
      )}

      {/* 4 Acts */}
      {acts.map(act => (
        <Card key={act.num}>
          <CardHeader className="pb-2 pt-3 px-4">
            <div className="flex items-center gap-2">
              <Badge className="text-xs">{act.num}</Badge>
              <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">
                Atto {act.num} — {act.title}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-sm leading-relaxed">{act.text}</p>
          </CardContent>
        </Card>
      ))}

      {/* Strategic note */}
      {geminiAnalysis?.strategic_note && (
        <div className="border-dashed border rounded-lg p-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">Nota Strategica (interna):</p>
          <p className="text-sm text-muted-foreground">{geminiAnalysis.strategic_note}</p>
        </div>
      )}

      {/* Punto di dolore */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <Target className="h-3 w-3" /> Punto di Dolore
        </p>
        <div className="grid gap-2">
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">Breve (WhatsApp):</p>
            {editing ? (
              <Textarea value={editBreve} onChange={(e) => setEditBreve(e.target.value)} rows={2} className="text-sm" />
            ) : (
              <p className="text-sm">{puntoDoloreBreve || "—"}</p>
            )}
          </div>
          <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
            <p className="text-xs font-medium text-purple-700 dark:text-purple-400 mb-1">Lungo (Landing Page):</p>
            {editing ? (
              <Textarea value={editLungo} onChange={(e) => setEditLungo(e.target.value)} rows={4} className="text-sm" />
            ) : (
              <p className="text-sm">{puntoDoloreLungo || "—"}</p>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-2">
        {editing ? (
          <>
            <Button size="sm" onClick={() => approve("edit")}>
              <Check className="h-3.5 w-3.5 mr-1.5" />Salva e Approva
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Annulla</Button>
          </>
        ) : (
          <>
            {!scriptApprovedAt && (
              <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => approve("approve")}>
                <Check className="h-3.5 w-3.5 mr-1.5" />Approva
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => {
              setEditing(true);
              setEditBreve(puntoDoloreBreve || "");
              setEditLungo(puntoDoloreLungo || "");
            }}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" />Modifica
            </Button>
            {showRegenNotes ? (
              <div className="w-full space-y-2 mt-2">
                <Textarea placeholder="Note per rigenerazione..." value={regenNotes} onChange={(e) => setRegenNotes(e.target.value)} rows={2} className="text-sm" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => runScript(regenNotes)} disabled={loading}>
                    {loading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
                    Rigenera con note
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowRegenNotes(false); setRegenNotes(""); }}>Annulla</Button>
                </div>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setShowRegenNotes(true)} disabled={loading}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Rigenera
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ==========================================
// STEP 3: Video YouTube
// ==========================================

function Step3Content({
  leadId, videoYoutubeUrl, onRefresh,
}: {
  leadId: string;
  videoYoutubeUrl: string | null;
  onRefresh: () => void;
}) {
  const [url, setUrl] = useState(videoYoutubeUrl || "");
  const [saving, setSaving] = useState(false);

  const saveUrl = useCallback(async () => {
    if (!url.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoYoutubeUrl: url.trim() }),
      });
      if (!res.ok) throw new Error("Errore nel salvataggio");
      toast.success("URL YouTube salvato");
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore");
    } finally {
      setSaving(false);
    }
  }, [leadId, url, onRefresh]);

  if (videoYoutubeUrl) {
    return (
      <div className="space-y-2">
        <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
          <Check className="h-3 w-3 mr-1" />URL salvato
        </Badge>
        <a
          href={videoYoutubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
        >
          {videoYoutubeUrl}
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Registra il video su Tella, caricalo su YouTube in modalit&agrave; non in elenco, e incolla il link qui.
      </p>
      <div className="flex gap-2">
        <Input
          placeholder="https://www.youtube.com/watch?v=..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && saveUrl()}
          className="flex-1"
        />
        <Button onClick={saveUrl} disabled={saving || !url.trim()}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salva"}
        </Button>
      </div>
    </div>
  );
}

// ==========================================
// STEP 4: Landing Page
// ==========================================

function Step4Content({
  leadId, puntoDoloreLungo, videoLandingUrl, videoTrackingToken, onRefresh,
}: {
  leadId: string;
  puntoDoloreLungo: string | null;
  videoLandingUrl: string | null;
  videoTrackingToken: string | null;
  onRefresh: () => void;
}) {
  const [creating, setCreating] = useState(false);

  const createLanding = useCallback(async () => {
    setCreating(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/create-landing`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Landing page creata");
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore");
    } finally {
      setCreating(false);
    }
  }, [leadId, onRefresh]);

  if (videoLandingUrl) {
    return (
      <div className="space-y-3">
        <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
          <Check className="h-3 w-3 mr-1" />Landing creata
        </Badge>
        <a
          href={videoLandingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
        >
          {videoLandingUrl}
          <ExternalLink className="h-3 w-3" />
        </a>
        {videoTrackingToken && (
          <div className="text-xs text-muted-foreground">
            Token: <code className="bg-muted px-1 rounded">{videoTrackingToken}</code>
          </div>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            navigator.clipboard.writeText(videoLandingUrl);
            toast.success("URL copiato");
          }}
        >
          <Copy className="h-3.5 w-3.5 mr-1.5" />Copia URL
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {puntoDoloreLungo && (
        <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
          <p className="text-xs font-medium text-purple-700 dark:text-purple-400 mb-1">Punto di dolore sulla landing:</p>
          <p className="text-sm">{puntoDoloreLungo}</p>
        </div>
      )}
      <Button onClick={createLanding} disabled={creating}>
        {creating ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creazione in corso...</>
        ) : (
          <><Globe className="h-4 w-4 mr-2" />Crea Landing Page</>
        )}
      </Button>
    </div>
  );
}

// ==========================================
// STEP 5: Invia Messaggio
// ==========================================

function Step5Content({
  leadId, leadName, videoLandingUrl,
  whatsappNumber, email, phone,
  videoSentAt, outreachChannel,
  videoViewsCount, videoFirstPlayAt, videoMaxWatchPercent, videoCompletedAt,
  onRefresh,
}: {
  leadId: string;
  leadName: string;
  videoLandingUrl: string | null;
  whatsappNumber: string | null;
  email: string | null;
  phone: string | null;
  videoSentAt: string | null;
  outreachChannel: string | null;
  videoViewsCount: number;
  videoFirstPlayAt: string | null;
  videoMaxWatchPercent: number | null;
  videoCompletedAt: string | null;
  onRefresh: () => void;
}) {
  const hasWA = !!whatsappNumber;
  const defaultChannel = hasWA ? "WA" : "EMAIL";
  const [channel, setChannel] = useState<"WA" | "EMAIL">(
    (outreachChannel as "WA" | "EMAIL") || defaultChannel
  );
  const [leadEmail, setLeadEmail] = useState(email || "");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  const firstName = leadName.split(" ")[0];
  const videoLink = videoLandingUrl || "[link]";

  const message = channel === "WA"
    ? `Ciao ${firstName}, sono Alessio Loi, fondatore di Karalisweb.\n\nHo analizzato il vostro posizionamento digitale e ho preparato un breve video personalizzato con quello che ho trovato. Te lo lascio qui: ${videoLink}\n\nDura meno di 2 minuti. Se vuoi ne parliamo.`
    : `Buongiorno ${firstName},\n\nsono Alessio Loi, fondatore di Karalisweb.\n\nHo analizzato il posizionamento digitale della vostra azienda e ho preparato un breve video personalizzato con le mie osservazioni: ${videoLink}\n\nDura meno di 2 minuti. Sarò felice di approfondire se le farà piacere.\n\nBuona giornata,\nAlessio Loi`;

  const sendViaWA = useCallback(() => {
    const waUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank");
    // Log activity
    fetch(`/api/leads/${leadId}/quick-log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "WHATSAPP_SENT" }),
    }).then(() => onRefresh());
  }, [leadId, whatsappNumber, message, onRefresh]);

  const sendViaEmail = useCallback(async () => {
    if (!leadEmail) {
      toast.error("Inserisci l'email del prospect");
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: leadEmail,
          subject: `${firstName}, ho analizzato il vostro posizionamento digitale`,
          body: message,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Email inviata");
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore invio email");
    } finally {
      setSending(false);
    }
  }, [leadId, leadEmail, firstName, message, onRefresh]);

  if (videoSentAt) {
    return (
      <div className="space-y-3">
        <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
          <Check className="h-3 w-3 mr-1" />
          Inviato il {new Date(videoSentAt).toLocaleDateString("it-IT")} via {outreachChannel || "—"}
        </Badge>

        {/* Video tracking stats */}
        {videoViewsCount > 0 && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-muted/50 rounded p-2">
              <span className="text-muted-foreground">Visualizzazioni:</span>{" "}
              <strong>{videoViewsCount}</strong>
            </div>
            {videoFirstPlayAt && (
              <div className="bg-muted/50 rounded p-2">
                <span className="text-muted-foreground">Primo play:</span>{" "}
                <strong>{new Date(videoFirstPlayAt).toLocaleDateString("it-IT")}</strong>
              </div>
            )}
            {videoMaxWatchPercent !== null && videoMaxWatchPercent > 0 && (
              <div className="bg-muted/50 rounded p-2">
                <span className="text-muted-foreground">Max %:</span>{" "}
                <strong>{videoMaxWatchPercent}%</strong>
              </div>
            )}
            {videoCompletedAt && (
              <div className="bg-green-50 dark:bg-green-950/30 rounded p-2">
                <span className="text-green-600">Completato</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Channel selection */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={channel === "WA" ? "default" : "outline"}
          onClick={() => setChannel("WA")}
          disabled={!hasWA}
        >
          <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
          WhatsApp
        </Button>
        <Button
          size="sm"
          variant={channel === "EMAIL" ? "default" : "outline"}
          onClick={() => setChannel("EMAIL")}
        >
          <Mail className="h-3.5 w-3.5 mr-1.5" />
          Email
        </Button>
      </div>

      {!hasWA && channel === "WA" && (
        <p className="text-xs text-amber-600">Nessun numero WhatsApp disponibile. Usa Email.</p>
      )}

      {channel === "EMAIL" && (
        <Input
          placeholder="info@esempio.it"
          value={leadEmail}
          onChange={(e) => setLeadEmail(e.target.value)}
        />
      )}

      {/* Message preview */}
      <div className="bg-muted/30 rounded-lg p-3">
        <p className="text-xs font-medium text-muted-foreground mb-1">Anteprima messaggio:</p>
        <p className="text-sm whitespace-pre-line">{message}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {channel === "WA" ? (
          <Button onClick={sendViaWA} className="bg-green-600 hover:bg-green-700">
            <ExternalLink className="h-4 w-4 mr-2" />
            Apri WhatsApp
          </Button>
        ) : (
          <Button onClick={sendViaEmail} disabled={sending}>
            {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Invia Email
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() => {
            navigator.clipboard.writeText(message);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
          {copied ? "Copiato" : "Copia"}
        </Button>
      </div>
    </div>
  );
}
