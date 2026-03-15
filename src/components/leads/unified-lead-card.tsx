"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Globe,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
  XCircle,
  Sparkles,
  Copy,
  Check,
  Phone,
  Star,
  RefreshCw,
  Info,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  landing_page_url?: string | null;
  landing_page_text?: string | null;
  google_ad_copy?: string | null;
  meta_ads_copy?: string[];
  ad_library_url?: string | null;
  google_ads_transparency_url?: string | null;
  ads_override?: {
    overriddenAt: string;
    overriddenTo: boolean;
    reason: string;
  } | null;
}

interface ScoreBreakdownData {
  score: number;
  tier: string;
  breakdown: string[];
  calculatedAt: string;
}

export interface UnifiedLead {
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
  scoreBreakdown: ScoreBreakdownData | null;
  // Ads Intelligence (DB)
  hasActiveGoogleAds: boolean;
  hasActiveMetaAds: boolean;
  googleAdsCopy: string | null;
  metaAdsCopy: string | null;
  landingPageUrl: string | null;
  landingPageText: string | null;
  adsCheckedAt: string | null;
  // Video
  videoScriptData?: unknown;
}

export type CardVariant = "analisi" | "hot" | "warm" | "cold" | "video";

// ==========================================
// SCORE HELPERS
// ==========================================

function getScoreBadgeColor(score: number | null): string {
  if (score === null) return "bg-gray-600 text-gray-200";
  if (score >= 80) return "bg-red-600 text-white";
  if (score >= 50) return "bg-yellow-600 text-white";
  return "bg-blue-600 text-white";
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
  return "bg-blue-900";
}

// ==========================================
// STRATEGIC TAG HELPERS
// ==========================================

function hasAnalysis(lead: UnifiedLead): boolean {
  return !!(
    lead.geminiAnalysis &&
    typeof lead.geminiAnalysis === "object" &&
    "teleprompter_script" in lead.geminiAnalysis &&
    lead.geminiAnalysis.teleprompter_script
  );
}

function getAdsNetworks(lead: UnifiedLead): string[] {
  if (!lead.geminiAnalysis) return [];
  return lead.geminiAnalysis.ads_networks_found || [];
}

function hasTrackingPixel(lead: UnifiedLead): boolean {
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
// SCORE BREAKDOWN COMPONENT
// ==========================================

function ScoreBreakdown({ data, score }: { data: ScoreBreakdownData | null; score: number | null }) {
  if (!data && score === null) return null;

  const breakdown = data?.breakdown || [];
  const tier = data?.tier || "standard";

  const tierLabel: Record<string, string> = {
    high_ticket: "High-Ticket",
    low_ticket: "Low-Ticket",
    standard: "Standard",
  };

  // Parse breakdown items to get individual scores
  const items = breakdown.map(item => {
    const match = item.match(/:\s*\+(\d+)$/);
    const points = match ? parseInt(match[1]) : 0;
    const label = item.replace(/:\s*\+\d+$/, "").trim();
    return { label, points };
  });

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {items.map((item, i) => (
        <span
          key={i}
          className={cn(
            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold",
            item.points >= 40
              ? "bg-red-500/15 text-red-400 border border-red-500/25"
              : item.points >= 20
              ? "bg-orange-500/15 text-orange-400 border border-orange-500/25"
              : item.points >= 10
              ? "bg-yellow-500/15 text-yellow-400 border border-yellow-500/25"
              : "bg-gray-500/15 text-gray-400 border border-gray-500/25"
          )}
        >
          {item.label}
          <span className="font-black">+{item.points}</span>
        </span>
      ))}
      <span className="text-[9px] text-muted-foreground ml-1">
        {tierLabel[tier] || tier}
      </span>
    </div>
  );
}

// ==========================================
// UNIFIED LEAD CARD
// ==========================================

export function UnifiedLeadCard({
  lead,
  variant,
  onAction,
  defaultExpanded = false,
}: {
  lead: UnifiedLead;
  variant: CardVariant;
  onAction: () => void;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [notes, setNotes] = useState(lead.danielaNotes || "");
  const [loading, setLoading] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [checkingAds, setCheckingAds] = useState(false);
  const [overridingAds, setOverridingAds] = useState(false);
  const [scriptModalOpen, setScriptModalOpen] = useState(false);
  const [adsData, setAdsData] = useState({
    hasGoogle: lead.hasActiveGoogleAds,
    hasMeta: lead.hasActiveMetaAds,
    googleCopy: lead.googleAdsCopy,
    metaCopy: lead.metaAdsCopy,
    lpUrl: lead.landingPageUrl,
    lpText: lead.landingPageText,
    checkedAt: lead.adsCheckedAt,
  });

  const analysis = lead.geminiAnalysis;
  const isAnalyzed = hasAnalysis(lead);
  const adsOn = analysis?.has_active_ads === true || adsData.hasGoogle || adsData.hasMeta;
  const pixelOk = hasTrackingPixel(lead);
  const errorPattern = analysis?.primary_error_pattern || null;

  // ---- Actions ----

  const handleApprove = async () => {
    setLoading("approve");
    try {
      const res = await fetch(`/api/leads/${lead.id}/quick-log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "MOVE_TO_VIDEO",
          notes: notes || null,
        }),
      });
      if (!res.ok) throw new Error("Errore nello spostamento");
      toast.success(`${lead.name} spostato in Fare Video!`);
      onAction();
    } catch {
      toast.error("Errore nello spostamento");
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

  const handleVideoSent = async () => {
    setLoading("video_sent");
    try {
      const res = await fetch(`/api/leads/${lead.id}/quick-log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "VIDEO_SENT" }),
      });
      if (!res.ok) throw new Error("Errore");
      toast.success(`Video per ${lead.name} marcato come inviato!`);
      onAction();
    } catch {
      toast.error("Errore nel salvataggio");
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

  const handleCheckAds = async () => {
    setCheckingAds(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/ads-check`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Errore");
      }
      const { data } = await res.json();
      setAdsData({
        hasGoogle: data.hasActiveGoogleAds,
        hasMeta: data.hasActiveMetaAds,
        googleCopy: data.googleAdsCopy,
        metaCopy: data.metaAdsCopy,
        lpUrl: data.landingPageUrl,
        lpText: data.landingPageText,
        checkedAt: new Date().toISOString(),
      });
      const found = data.hasActiveGoogleAds || data.hasActiveMetaAds;
      toast.success(found ? `Ads trovate per ${lead.name}!` : `Nessuna ad trovata per ${lead.name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore check Ads");
    } finally {
      setCheckingAds(false);
    }
  };

  const handleAdsOverride = async (hasActiveAds: boolean) => {
    setOverridingAds(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/ads-override`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hasActiveAds }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Errore");
      }
      const data = await res.json();
      toast.success(
        `${lead.name}: Ads → ${hasActiveAds ? "SI" : "NO"}, score ${data.oldScore} → ${data.newScore}`
      );
      // Se lo stage è cambiato, ricarica la lista
      if (data.oldStage !== data.newStage) {
        toast.info(`Spostato da ${data.oldStage} a ${data.newStage}`);
      }
      onAction(); // Refresh lista
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore override Ads");
    } finally {
      setOverridingAds(false);
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

  // ---- Variant-specific actions ----
  const getActionButtons = () => {
    switch (variant) {
      case "analisi":
        return (
          <div className="flex gap-2">
            <Button
              onClick={handleApprove}
              disabled={!!loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              size="sm"
            >
              {loading === "approve" ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Passa a Video
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
              Non Target
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/leads/${lead.id}`}>
                <Info className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        );
      case "hot":
      case "warm":
        return (
          <div className="flex gap-2">
            <Button
              onClick={handleApprove}
              disabled={!!loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              size="sm"
            >
              {loading === "approve" ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Passa a Video
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
              Non Target
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/leads/${lead.id}`}>
                <Info className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        );
      case "cold":
        return (
          <div className="flex gap-2">
            <Button asChild variant="ghost" size="sm" className="flex-1">
              <Link href={`/leads/${lead.id}`}>
                Dettaglio
              </Link>
            </Button>
          </div>
        );
      case "video":
        return (
          <div className="flex gap-2">
            {isAnalyzed && analysis?.teleprompter_script && (
              <Button
                onClick={() => setScriptModalOpen(true)}
                variant="outline"
                size="sm"
                className="flex-1 border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
              >
                <Copy className="h-4 w-4 mr-2" />
                Script Tella
              </Button>
            )}
            <Button
              onClick={handleVideoSent}
              disabled={!!loading}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
              size="sm"
            >
              {loading === "video_sent" ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Video Inviato
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/leads/${lead.id}`}>
                <Info className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        );
    }
  };

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <>
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

          {/* ---- COLLAPSED: Tags + Score Breakdown ---- */}
          {!expanded && (
            <div className="px-4 py-2.5 space-y-1.5">
              {/* Riga 1: Tag strategici */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap flex-1">
                  <span className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold",
                    adsOn
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                      : "bg-gray-500/15 text-gray-400 border border-gray-500/25"
                  )}>
                    Ads: {adsOn ? "ON" : "OFF"}
                  </span>

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

                  {errorPattern && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-red-900/30 text-red-300 border border-red-800/40">
                      {errorPattern}
                    </span>
                  )}
                </div>

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

              {/* Riga 2: Score Breakdown */}
              <ScoreBreakdown data={lead.scoreBreakdown} score={lead.opportunityScore} />
            </div>
          )}

          {/* ==========================================
              EXPANDED VIEW — 2 colonne
              ========================================== */}
          {expanded && (
            <div className="p-4">
              {/* Score Breakdown anche in expanded */}
              <div className="mb-3 pb-3 border-b border-border/50">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                  Composizione Score
                </p>
                <ScoreBreakdown data={lead.scoreBreakdown} score={lead.opportunityScore} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

                {/* ---- COLONNA SINISTRA: Dati + Gancio di Vendita ---- */}
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

                  {/* Tag Strategici */}
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

                  {/* Box Ads Intelligence */}
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                        Ads Intelligence
                      </p>
                      <div className="flex items-center gap-2">
                        {adsData.checkedAt && (
                          <span className="text-[9px] text-muted-foreground">
                            {new Date(adsData.checkedAt).toLocaleDateString("it-IT")}
                          </span>
                        )}
                        <Button
                          onClick={(e) => { e.stopPropagation(); handleCheckAds(); }}
                          disabled={checkingAds || !lead.website}
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-[10px] border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                        >
                          {checkingAds ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              Analisi Ads...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Check Ads
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {checkingAds && (
                      <div className="flex items-center gap-2 py-3 justify-center">
                        <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                        <span className="text-sm text-emerald-400/80">Analisi Ads in corso via Apify...</span>
                      </div>
                    )}

                    {adsData.lpUrl && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Landing Page</p>
                        <a
                          href={adsData.lpUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-emerald-400 hover:text-emerald-300 underline break-all"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {adsData.lpUrl.replace(/^https?:\/\//, "").substring(0, 60)}
                        </a>
                      </div>
                    )}

                    {adsData.googleCopy && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Google Ad Copy</p>
                        <p className="text-sm italic text-gray-300">&ldquo;{adsData.googleCopy}&rdquo;</p>
                      </div>
                    )}

                    {adsData.metaCopy && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Meta Ads Copy</p>
                        <p className="text-sm italic text-gray-300">&ldquo;{adsData.metaCopy}&rdquo;</p>
                      </div>
                    )}

                    {adsData.checkedAt && !checkingAds && (
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-[10px] px-2 py-0.5 rounded font-semibold",
                          adsData.hasGoogle
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                            : "bg-gray-500/10 text-gray-500 border border-gray-500/20"
                        )}>
                          Google Ads: {adsData.hasGoogle ? "SI" : "NO"}
                        </span>
                        <span className={cn(
                          "text-[10px] px-2 py-0.5 rounded font-semibold",
                          adsData.hasMeta
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                            : "bg-gray-500/10 text-gray-500 border border-gray-500/20"
                        )}>
                          Meta Ads: {adsData.hasMeta ? "SI" : "NO"}
                        </span>
                      </div>
                    )}

                    {/* Override manuale Ads — per correggere dati automatici */}
                    {adsOn && (
                      <div className="pt-1 pb-1">
                        <Button
                          onClick={(e) => { e.stopPropagation(); handleAdsOverride(false); }}
                          disabled={overridingAds}
                          size="sm"
                          variant="outline"
                          className="h-7 px-3 text-[11px] border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                        >
                          {overridingAds ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              Ricalcolo...
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3 mr-1" />
                              Ho verificato: nessuna Ad trovata
                            </>
                          )}
                        </Button>
                      </div>
                    )}

                    {/* Se override è stato applicato (ads disattivate manualmente) */}
                    {!adsOn && analysis?.ads_override && (
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/25">
                          Ads corrette manualmente
                        </span>
                        <Button
                          onClick={(e) => { e.stopPropagation(); handleAdsOverride(true); }}
                          disabled={overridingAds}
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[10px] text-muted-foreground hover:text-amber-400"
                        >
                          Ripristina
                        </Button>
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <a
                        href={`https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=IT&q=${encodeURIComponent(lead.name)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-2.5 py-1.5 rounded text-[11px] font-semibold bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Meta Ads Library
                      </a>
                      <a
                        href={`https://adstransparency.google.com/?domain=${encodeURIComponent((lead.website || "").replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0])}&region=IT`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-2.5 py-1.5 rounded text-[11px] font-semibold bg-orange-600/20 text-orange-400 border border-orange-500/30 hover:bg-orange-600/30 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Google Ads Transparency
                      </a>
                    </div>
                  </div>

                  {/* Box Gancio di Vendita */}
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
                  {(variant === "analisi" || variant === "hot" || variant === "warm") && (
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
                  )}

                  {/* Note Daniela (read-only per video) */}
                  {variant === "video" && lead.danielaNotes && (
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                        Note di Daniela
                      </p>
                      <p className="text-sm">{lead.danielaNotes}</p>
                    </div>
                  )}

                  {/* Bottoni operativi */}
                  {getActionButtons()}
                </div>

                {/* ---- COLONNA DESTRA: Teleprompter ---- */}
                <div className="lg:col-span-5">
                  {isAnalyzed && analysis?.teleprompter_script ? (
                    <div className="bg-gray-900 text-white rounded-lg shadow-inner relative">
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
                        Analisi non ancora generata
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

      {/* ---- MODAL SCRIPT TELLA (per variant=video) ---- */}
      {variant === "video" && (
        <Dialog open={scriptModalOpen} onOpenChange={setScriptModalOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Script Tella — {lead.name}</span>
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
                      Copia
                    </>
                  )}
                </Button>
              </DialogTitle>
            </DialogHeader>
            {analysis?.teleprompter_script && (
              <div className="space-y-4 mt-4">
                {ATTO_LABELS.map((atto, i) => (
                  <div key={atto.key} className="p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                        {i + 1}
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        {atto.label} — {atto.subtitle}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed">
                      {analysis.teleprompter_script![atto.key]}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
