"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ClipboardCheck,
  Globe,
  ExternalLink,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  Copy,
  Check,
  Phone,
  Star,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ==========================================
// TYPES
// ==========================================

interface TeleprompterScript {
  atto_1: string;
  atto_2: string;
  atto_3: string;
  atto_4: string;
}

interface GeminiAnalysis {
  cliche_found?: string;
  primary_error_pattern?: string;
  teleprompter_script?: TeleprompterScript;
  strategic_note?: string;
  has_active_ads?: boolean;
  ads_networks_found?: string[];
  analysisVersion?: string;
}

interface Lead {
  id: string;
  name: string;
  phone: string | null;
  website: string | null;
  category: string | null;
  address: string | null;
  googleRating: string | null;
  googleReviewsCount: number | null;
  opportunityScore: number | null;
  auditData: unknown;
  commercialTag: string | null;
  commercialPriority: number | null;
  pipelineStage: string;
  danielaNotes: string | null;
  geminiAnalysis: GeminiAnalysis | null;
  geminiAnalyzedAt: string | null;
}

// ==========================================
// SCORE HELPERS
// ==========================================

function getScoreBadgeColor(score: number | null): string {
  if (score === null) return "bg-gray-600 text-gray-200";
  if (score >= 80) return "bg-red-600 text-white";
  if (score >= 50) return "bg-yellow-600 text-white";
  return "bg-gray-600 text-gray-200";
}

function getScoreLabel(score: number | null): string {
  if (score === null) return "N/D";
  if (score >= 80) return "HOT";
  if (score >= 50) return "WARM";
  return "COLD";
}

function getScoreHeaderColor(score: number | null): string {
  if (score === null) return "bg-gray-800";
  if (score >= 80) return "bg-red-600";
  if (score >= 50) return "bg-yellow-700";
  return "bg-gray-700";
}

// ==========================================
// STRATEGIC TAG HELPERS
// ==========================================

function hasAnalysis(lead: Lead): boolean {
  return !!(
    lead.geminiAnalysis &&
    typeof lead.geminiAnalysis === "object" &&
    "teleprompter_script" in lead.geminiAnalysis &&
    lead.geminiAnalysis.teleprompter_script
  );
}

function getAdsNetworks(lead: Lead): string[] {
  if (!lead.geminiAnalysis) return [];
  return lead.geminiAnalysis.ads_networks_found || [];
}

function hasTrackingPixel(lead: Lead): boolean {
  const networks = getAdsNetworks(lead);
  const trackingNames = [
    "meta pixel", "google analytics", "google tag manager",
    "google ads", "linkedin insight", "tiktok pixel",
    "microsoft clarity", "hotjar",
  ];
  return networks.some(n =>
    trackingNames.some(t => n.toLowerCase().includes(t))
  );
}

// ==========================================
// ATTO LABELS for Teleprompter
// ==========================================

const ATTO_LABELS = [
  { key: "atto_1" as const, label: "ATTO 1", subtitle: "Ghiaccio e Metafora" },
  { key: "atto_2" as const, label: "ATTO 2", subtitle: "La Scena del Crimine" },
  { key: "atto_3" as const, label: "ATTO 3", subtitle: "I Soldi" },
  { key: "atto_4" as const, label: "ATTO 4", subtitle: "La Soluzione" },
];

// ==========================================
// QUALIFICA CARD COMPONENT
// ==========================================

function QualificaCard({
  lead,
  index,
  onAction,
}: {
  lead: Lead;
  index: number;
  onAction: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(lead.danielaNotes || "");
  const [loading, setLoading] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);

  const analysis = lead.geminiAnalysis;
  const isAnalyzed = hasAnalysis(lead);
  const adsOn = analysis?.has_active_ads === true;
  const pixelOk = hasTrackingPixel(lead);
  const errorPattern = analysis?.primary_error_pattern || null;

  // ---- Actions ----

  const handleQualify = async () => {
    setLoading("qualify");
    try {
      const res = await fetch(`/api/leads/${lead.id}/quick-log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "QUALIFY",
          danielaNotes: notes || null,
          qualifiedBy: "Daniela",
        }),
      });
      if (!res.ok) throw new Error("Errore nella qualificazione");
      toast.success(`${lead.name} qualificato!`);
      onAction();
    } catch {
      toast.error("Errore nella qualificazione");
    } finally {
      setLoading(null);
    }
  };

  const handleNonTarget = async () => {
    setLoading("non_target");
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipelineStage: "NON_TARGET" }),
      });
      if (!res.ok) throw new Error("Errore");
      toast.success(`${lead.name} spostato in Non Target`);
      onAction();
    } catch {
      toast.error("Errore nello spostamento");
    } finally {
      setLoading(null);
    }
  };

  const handleGenerateAI = async () => {
    setGeneratingAI(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/gemini-analysis`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Errore");
      }
      toast.success(`Analisi generata per ${lead.name}`);
      onAction();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore nell'analisi");
    } finally {
      setGeneratingAI(false);
    }
  };

  const copyFullScript = async () => {
    if (!analysis?.teleprompter_script) return;
    const script = ATTO_LABELS.map(
      (a) => `[${a.label} - ${a.subtitle}]\n${analysis.teleprompter_script![a.key]}`
    ).join("\n\n");

    try {
      await navigator.clipboard.writeText(script);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = script;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ==========================================
  // COLLAPSED VIEW (Overview veloce)
  // ==========================================
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* ---- HEADER BAR (sempre visibile) ---- */}
        <div
          className={cn(
            "px-4 py-3 flex items-center justify-between cursor-pointer text-white",
            getScoreHeaderColor(lead.opportunityScore)
          )}
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Score number */}
            <span className="text-2xl font-black tabular-nums w-10 text-center flex-shrink-0">
              {lead.opportunityScore ?? "?"}
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{lead.name}</p>
              <p className="text-xs opacity-80 truncate">
                {lead.category}
                {lead.googleRating && (
                  <span className="ml-1">
                    · <Star className="h-2.5 w-2.5 inline fill-yellow-300 text-yellow-300" />{" "}
                    {Number(lead.googleRating).toFixed(1)}
                    {lead.googleReviewsCount ? ` (${lead.googleReviewsCount})` : ""}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge className={cn("text-xs font-bold px-2 py-0.5", getScoreBadgeColor(lead.opportunityScore))}>
              {getScoreLabel(lead.opportunityScore)}
            </Badge>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>

        {/* ---- COLLAPSED TAGS (quando chiuso) ---- */}
        {!expanded && (
          <div className="px-4 py-2.5 flex items-center justify-between gap-2">
            {/* 3 Tag Strategici */}
            <div className="flex items-center gap-1.5 flex-wrap flex-1">
              {/* Tag 1: Ads */}
              <span className={cn(
                "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold",
                adsOn
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                  : "bg-gray-500/15 text-gray-400 border border-gray-500/25"
              )}>
                Ads: {adsOn ? "ON" : "OFF"}
              </span>

              {/* Tag 2: Pixel */}
              {isAnalyzed && (
                <span className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold",
                  pixelOk
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                    : "bg-red-500/15 text-red-400 border border-red-500/25"
                )}>
                  Pixel: {pixelOk ? "OK" : "MANCANTE"}
                </span>
              )}

              {/* Tag 3: Error Pattern */}
              {errorPattern && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-red-900/30 text-red-300 border border-red-800/40">
                  {errorPattern}
                </span>
              )}

              {/* Badge v2.0 */}
              {analysis?.analysisVersion && (
                <span className="text-[10px] font-mono text-blue-400 opacity-60">
                  v{analysis.analysisVersion}
                </span>
              )}
            </div>

            {/* Azioni collapsed */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {!isAnalyzed ? (
                <Button
                  onClick={(e) => { e.stopPropagation(); handleGenerateAI(); }}
                  disabled={generatingAI}
                  size="sm"
                  className="h-7 px-2.5 text-[11px] bg-violet-600 hover:bg-violet-700"
                >
                  {generatingAI ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3 mr-1" />
                      Genera AI
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ==========================================
            EXPANDED VIEW — 2 colonne
            ========================================== */}
        {expanded && (
          <div className="p-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

              {/* ---- COLONNA SINISTRA: Dati + Gancio di Vendita (FOCUS) ---- */}
              <div className="lg:col-span-7 space-y-4">

                {/* Dati base */}
                <div className="space-y-2">
                  {lead.website && (
                    <a
                      href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg text-primary hover:bg-primary/20 transition-colors text-sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Globe className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{lead.website.replace(/^https?:\/\//, "").replace(/\/.*$/, "")}</span>
                      <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-60 ml-auto" />
                    </a>
                  )}
                  {lead.phone && (
                    <a
                      href={`tel:${lead.phone}`}
                      className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 hover:bg-green-500/20 transition-colors text-sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Phone className="h-4 w-4 flex-shrink-0" />
                      <span>{lead.phone}</span>
                    </a>
                  )}
                </div>

                {/* 3 Tag Strategici (anche nell'expanded) */}
                <div className="flex flex-wrap gap-1.5">
                  <span className={cn(
                    "inline-flex items-center px-2 py-1 rounded text-xs font-semibold",
                    adsOn
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                      : "bg-gray-500/15 text-gray-400 border border-gray-500/25"
                  )}>
                    Ads: {adsOn ? "ON" : "OFF"}
                    {adsOn && analysis?.ads_networks_found && analysis.ads_networks_found.length > 0 && (
                      <span className="ml-1 opacity-70 font-normal">
                        ({analysis.ads_networks_found.join(", ")})
                      </span>
                    )}
                  </span>
                  {isAnalyzed && (
                    <span className={cn(
                      "inline-flex items-center px-2 py-1 rounded text-xs font-semibold",
                      pixelOk
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                        : "bg-red-500/15 text-red-400 border border-red-500/25"
                    )}>
                      Pixel: {pixelOk ? "OK" : "MANCANTE"}
                    </span>
                  )}
                  {errorPattern && (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-red-900/30 text-red-300 border border-red-800/40">
                      {errorPattern}
                    </span>
                  )}
                </div>

                {/* Box Diagnosi AI — GANCIO DI VENDITA (Focus principale) */}
                {isAnalyzed && analysis?.cliche_found && (
                  <div className="rounded-xl border-2 border-red-500/40 bg-red-950/30 p-5 space-y-4">
                    <p className="text-xs font-black uppercase tracking-widest text-red-400">
                      Gancio di Vendita
                    </p>
                    {analysis.primary_error_pattern && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Pattern Errore</p>
                        <p className="text-lg font-bold text-red-300">
                          {analysis.primary_error_pattern}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Frase Cliche Trovata</p>
                      <p className="text-xl font-bold italic text-yellow-400 leading-relaxed">
                        &ldquo;{analysis.cliche_found}&rdquo;
                      </p>
                    </div>
                    {analysis.strategic_note && (
                      <div className="pt-2 border-t border-red-500/20">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">Nota Strategica</p>
                        <p className="text-base leading-relaxed text-gray-300">
                          {analysis.strategic_note}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Note Daniela */}
                <div>
                  <label
                    htmlFor={`notes-${lead.id}`}
                    className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block"
                  >
                    Note di Daniela
                  </label>
                  <textarea
                    id={`notes-${lead.id}`}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Osservazioni..."
                    rows={2}
                    className="w-full text-sm rounded-md border border-border bg-background px-3 py-2 placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  />
                </div>

                {/* Bottoni operativi */}
                <div className="flex gap-2">
                  <Button
                    onClick={handleQualify}
                    disabled={!!loading}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    size="sm"
                  >
                    {loading === "qualify" ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    )}
                    Qualifica
                  </Button>
                  <Button
                    onClick={handleNonTarget}
                    disabled={!!loading}
                    variant="outline"
                    className="border-gray-500/50 text-gray-400 hover:bg-gray-500/10"
                    size="sm"
                  >
                    {loading === "non_target" ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    Squalifica
                  </Button>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/leads/${lead.id}`}>
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>

              {/* ---- COLONNA DESTRA: Teleprompter (compatto, scroll) ---- */}
              <div className="lg:col-span-5">
                {isAnalyzed && analysis?.teleprompter_script ? (
                  <div className="bg-gray-900 text-white rounded-lg shadow-inner relative">
                    {/* Header fisso con bottone Copia */}
                    <div className="flex items-center justify-between p-4 pb-3 border-b border-gray-700/50">
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                        Script
                      </p>
                      <Button
                        onClick={copyFullScript}
                        size="sm"
                        className="h-8 px-4 text-xs bg-white text-gray-900 hover:bg-gray-200 font-semibold"
                      >
                        {copied ? (
                          <>
                            <Check className="h-3.5 w-3.5 mr-1.5" />
                            Copiato!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5 mr-1.5" />
                            Copia per Tella
                          </>
                        )}
                      </Button>
                    </div>

                    {/* 4 Atti — Scrollabile, font standard */}
                    <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
                      {ATTO_LABELS.map((atto, i) => (
                        <div key={atto.key}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="bg-white text-gray-900 rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                              {i + 1}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
                              {atto.label} — {atto.subtitle}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed text-gray-200">
                            {analysis.teleprompter_script![atto.key]}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center bg-muted/20 rounded-lg border border-dashed border-muted-foreground/20">
                    <Sparkles className="h-10 w-10 text-muted-foreground/30 mb-4" />
                    <p className="font-medium text-muted-foreground mb-2">
                      Analisi Strategica non ancora generata
                    </p>
                    <p className="text-sm text-muted-foreground/60 mb-4">
                      Genera l&apos;analisi AI per vedere il copione teleprompter
                    </p>
                    <Button
                      onClick={handleGenerateAI}
                      disabled={generatingAI || !lead.website}
                      className="bg-violet-600 hover:bg-violet-700"
                    >
                      {generatingAI ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Generando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Genera Analisi AI
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ==========================================
// PAGE COMPONENT
// ==========================================

export default function DaQualificarePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/leads?stage=DA_QUALIFICARE&pageSize=50");
      if (!res.ok) throw new Error("Errore nel caricamento");
      const json = await res.json();
      setLeads(json.leads || []);
      setTotal(json.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Da Qualificare</h1>
          <p className="text-sm text-muted-foreground">
            Workspace di Daniela — Revisione lead prima dell&apos;outreach
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{total} lead</Badge>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Aggiorna
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-500">
          <CardContent className="p-4 text-center text-red-500">
            <AlertTriangle className="h-5 w-5 inline mr-2" />
            {error}
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}><CardContent className="p-0">
              <Skeleton className="h-14 w-full" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            </CardContent></Card>
          ))}
        </div>
      ) : leads.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Nessun lead da qualificare</h3>
            <p className="text-sm text-muted-foreground mb-4">
              I lead appariranno qui per la revisione.
            </p>
            <Button asChild><Link href="/search">Nuova Ricerca</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {leads.map((lead, index) => (
            <QualificaCard key={lead.id} lead={lead} index={index} onAction={fetchData} />
          ))}
        </div>
      )}
    </div>
  );
}
