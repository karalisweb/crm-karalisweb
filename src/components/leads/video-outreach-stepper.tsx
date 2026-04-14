"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
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
  AlertTriangle, Target, FileText, Trash2,
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
  geminiAnalysis: { teleprompter_script?: { atto_1: string; atto_2: string; atto_3: string; atto_4: string; atto_5?: string }; strategic_note?: string; readingScript?: string } | null;
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
  const [regenAllLoading, setRegenAllLoading] = useState(false);

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

  // "Rifai tutto": rilancia analista + scriptwriter con auto-approvazione
  const handleRegenerateAll = useCallback(async () => {
    if (!confirm("Rigenerare analisi + script da zero? Le versioni attuali verranno sostituite.")) return;
    setRegenAllLoading(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/regenerate-video-script`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Analisi e script rigenerati");
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore durante la rigenerazione");
    } finally {
      setRegenAllLoading(false);
    }
  }, [leadId, onRefresh]);

  // Mostra il bottone solo se c'è già qualcosa da rifare
  const hasGenerated = !!(analystOutput || analystApprovedAt || scriptApprovedAt);

  return (
    <div className="space-y-0">
      {hasGenerated && (
        <div className="flex justify-end mb-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerateAll}
            disabled={regenAllLoading}
          >
            {regenAllLoading ? (
              <Loader2 className="h-3 w-3 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-2" />
            )}
            Rifai tutto
          </Button>
        </div>
      )}
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
      {/* Generated badge */}
      {analystApprovedAt && !editing && (
        <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
          <Check className="h-3 w-3 mr-1" />
          Generato il {new Date(analystApprovedAt).toLocaleDateString("it-IT")}
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
              Salva
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setEditing(false); setEditData(null); }}>
              Annulla
            </Button>
          </>
        ) : (
          <>
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

  // Editable acts
  const script = geminiAnalysis?.teleprompter_script;
  const [editAtto1, setEditAtto1] = useState(script?.atto_1 || "");
  const [editAtto2, setEditAtto2] = useState(script?.atto_2 || "");
  const [editAtto3, setEditAtto3] = useState(script?.atto_3 || "");
  const [editAtto4, setEditAtto4] = useState(script?.atto_4 || "");
  const [editAtto5, setEditAtto5] = useState(script?.atto_5 || "");

  // Reading script (Script per Tella)
  const [readingScript, setReadingScript] = useState(geminiAnalysis?.readingScript || "");
  const [readingLoading, setReadingLoading] = useState(false);
  const [readingCopied, setReadingCopied] = useState(false);
  const [readingInstructions, setReadingInstructions] = useState("");

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
        // Save modified acts into geminiAnalysis
        if (geminiAnalysis) {
          body.geminiAnalysis = {
            ...geminiAnalysis,
            teleprompter_script: {
              atto_1: editAtto1,
              atto_2: editAtto2,
              atto_3: editAtto3,
              atto_4: editAtto4,
              atto_5: editAtto5,
            },
          };
        }
      }
      const res = await fetch(`/api/leads/${leadId}/approve-script`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Modifiche salvate e approvate");
      setEditing(false);
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore");
    }
  }, [leadId, editBreve, editLungo, editAtto1, editAtto2, editAtto3, editAtto4, geminiAnalysis, onRefresh]);

  // Generate reading script for Tella
  const generateReadingScript = useCallback(async () => {
    setReadingLoading(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/reading-script`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customInstructions: readingInstructions.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReadingScript(data.script);
      toast.success("Script per Tella generato!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore nella generazione");
    } finally {
      setReadingLoading(false);
    }
  }, [leadId, readingInstructions]);

  const copyReadingScript = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(readingScript);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = readingScript;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setReadingCopied(true);
    setTimeout(() => setReadingCopied(false), 2000);
    toast.success("Testo copiato — pronto per Tella!");
  }, [readingScript]);

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
    { num: 1, title: "Introduzione", text: script.atto_1, value: editAtto1, setter: setEditAtto1 },
    { num: 2, title: "La Scena del Crimine", text: script.atto_2, value: editAtto2, setter: setEditAtto2 },
    { num: 3, title: "I Soldi", text: script.atto_3, value: editAtto3, setter: setEditAtto3 },
    { num: 4, title: "La Soluzione", text: script.atto_4, value: editAtto4, setter: setEditAtto4 },
    { num: 5, title: "Chiusura e Contatto", text: script.atto_5 || "", value: editAtto5, setter: setEditAtto5 },
  ];

  return (
    <div className="space-y-4">
      {/* Status badges */}
      {!editing && (
        <div className="flex items-center gap-2 flex-wrap">
          {scriptApprovedAt && (
            <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
              <Check className="h-3 w-3 mr-1" />
              Generato il {new Date(scriptApprovedAt).toLocaleDateString("it-IT")}
            </Badge>
          )}
          {readingScript ? (
            <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50">
              <FileText className="h-3 w-3 mr-1" />
              Script Tella pronto
            </Badge>
          ) : (
            <Badge variant="outline" className="text-gray-500 border-gray-300 bg-gray-50">
              <FileText className="h-3 w-3 mr-1" />
              Script Tella da generare
            </Badge>
          )}
        </div>
      )}

      {/* 5 Atti — compatto */}
      <div className="border rounded-lg divide-y overflow-hidden">
        {acts.map(act => (
          <div key={act.num} className="px-3 py-2">
            <div className="flex items-start gap-2">
              <Badge variant="secondary" className="text-[10px] h-5 min-w-5 px-1.5 shrink-0 mt-0.5">
                {act.num}
              </Badge>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
                  {act.title}
                </div>
                {editing ? (
                  <Textarea
                    value={act.value}
                    onChange={(e) => act.setter(e.target.value)}
                    rows={3}
                    className="text-sm mt-1"
                  />
                ) : (
                  <p className="text-sm leading-snug">{act.text}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

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
              <Check className="h-3.5 w-3.5 mr-1.5" />Salva
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Annulla</Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="outline" onClick={() => {
              setEditing(true);
              setEditAtto1(script.atto_1);
              setEditAtto2(script.atto_2);
              setEditAtto3(script.atto_3);
              setEditAtto4(script.atto_4);
              setEditAtto5(script.atto_5 || "");
              setEditBreve(puntoDoloreBreve || "");
              setEditLungo(puntoDoloreLungo || "");
            }}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" />Modifica
            </Button>
            {showRegenNotes ? (
              <div className="w-full space-y-2 mt-2">
                <Textarea placeholder="Istruzioni per rigenerazione (es. 'Più aggressivo', 'Usa metafora del ristorante')..." value={regenNotes} onChange={(e) => setRegenNotes(e.target.value)} rows={2} className="text-sm" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => runScript(regenNotes)} disabled={loading}>
                    {loading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
                    Rigenera con istruzioni
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

      {/* ================================================ */}
      {/* Script per Tella — testo fluido per teleprompter  */}
      {/* ================================================ */}
      <div className="border-t pt-4 mt-4">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="h-4 w-4 text-orange-500" />
          <h4 className="text-sm font-semibold">Script per Tella</h4>
          <span className="text-xs text-muted-foreground">(testo da leggere nel video)</span>
        </div>

        {readingScript ? (
          <div className="space-y-3">
            {/* Script text */}
            <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto">
              {readingScript}
            </div>

            {/* Copy button — prominent */}
            <Button
              onClick={copyReadingScript}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white"
              size="sm"
            >
              {readingCopied ? (
                <><Check className="h-4 w-4 mr-2" />Copiato — incolla in Tella!</>
              ) : (
                <><Copy className="h-4 w-4 mr-2" />Copia Testo per Tella</>
              )}
            </Button>

            {/* Rigenera con istruzioni */}
            <div className="space-y-2">
              <Input
                value={readingInstructions}
                onChange={(e) => setReadingInstructions(e.target.value)}
                placeholder='Istruzioni per rigenerazione (es. "Più colloquiale", "Aggiungi esempio concreto")'
                className="text-sm h-8"
              />
              <Button
                onClick={generateReadingScript}
                variant="outline"
                size="sm"
                disabled={readingLoading}
              >
                {readingLoading ? (
                  <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Rigenerazione...</>
                ) : (
                  <><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Rigenera Script Tella</>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Genera il testo fluido da leggere nel video. Prende i 4 atti e li trasforma in un copione naturale.
            </p>
            <Input
              value={readingInstructions}
              onChange={(e) => setReadingInstructions(e.target.value)}
              placeholder='Istruzioni opzionali (es. "Tono amichevole", "Max 60 secondi")'
              className="text-sm h-8"
            />
            <Button
              onClick={generateReadingScript}
              disabled={readingLoading}
              className="w-full"
              size="sm"
            >
              {readingLoading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generazione in corso...</>
              ) : (
                <><FileText className="h-4 w-4 mr-2" />Genera Script per Tella</>
              )}
            </Button>
          </div>
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
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const router = useRouter();

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
      toast.success("URL YouTube salvato (landing aggiornata se esistente)");
      setEditing(false);
      onRefresh();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore");
    } finally {
      setSaving(false);
    }
  }, [leadId, url, onRefresh, router]);

  const removeUrl = useCallback(async () => {
    setRemoving(true);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoYoutubeUrl: null, videoYoutubeId: null }),
      });
      if (!res.ok) throw new Error("Errore nella rimozione");
      toast.success("URL YouTube rimosso");
      setUrl("");
      setEditing(false);
      onRefresh();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore");
    } finally {
      setRemoving(false);
    }
  }, [leadId, onRefresh, router]);

  if (videoYoutubeUrl && !editing) {
    return (
      <div className="space-y-3">
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
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setUrl(videoYoutubeUrl); setEditing(true); }}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Modifica
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={removeUrl}
            disabled={removing}
          >
            {removing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 mr-1.5" />}
            Rimuovi
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {editing ? "Modifica l'URL YouTube:" : "Registra il video su Tella, caricalo su YouTube in modalità non in elenco, e incolla il link qui."}
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
        {editing && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
            Annulla
          </Button>
        )}
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
  const [resyncing, setResyncing] = useState(false);
  const router = useRouter();

  const createLanding = useCallback(async () => {
    setCreating(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/create-landing`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Landing page creata");
      onRefresh();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore");
    } finally {
      setCreating(false);
    }
  }, [leadId, onRefresh, router]);

  const resyncLanding = useCallback(async () => {
    setResyncing(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/resync-landing`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Landing risincronizzata con i dati attuali");
      onRefresh();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore");
    } finally {
      setResyncing(false);
    }
  }, [leadId, onRefresh, router]);

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
        <div className="flex gap-2">
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
          <Button
            size="sm"
            variant="outline"
            onClick={resyncLanding}
            disabled={resyncing}
            title="Forza l'aggiornamento della landing WordPress con il video YouTube e il punto di dolore correnti del CRM"
          >
            {resyncing ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            )}
            Risincronizza
          </Button>
        </div>
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
// STEP 5: Invia Messaggio → Redirect a tab Messaggi
// ==========================================

function Step5Content({
  leadId,
  videoSentAt,
  outreachChannel,
  videoViewsCount,
  videoFirstPlayAt,
  videoMaxWatchPercent,
  videoCompletedAt,
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
  if (videoSentAt) {
    return (
      <div className="space-y-3">
        <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
          <Check className="h-3 w-3 mr-1" />
          Inviato il {new Date(videoSentAt).toLocaleDateString("it-IT")} via {outreachChannel || "—"}
        </Badge>

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
    <div className="space-y-3 text-center py-4">
      <p className="text-sm text-muted-foreground">
        Per inviare il messaggio, vai alla tab dedicata.
      </p>
      <a href={`/leads/${leadId}?tab=messaggi`}>
        <Button>
          <Send className="h-4 w-4 mr-2" />
          Vai a Tab Messaggi
        </Button>
      </a>
    </div>
  );
}
