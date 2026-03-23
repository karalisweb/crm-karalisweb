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
  Info,
  MessageCircle,
  ArrowLeft,
  Search,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/layout/sidebar-context";
import { VideoOutreachInline } from "@/components/leads/video-outreach-inline";
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

interface AdsOverride {
  googleAds?: boolean | null;
  metaAds?: boolean | null;
  verifiedAt?: string;
  // Legacy
  overriddenAt?: string;
  overriddenTo?: boolean;
  reason?: string;
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
  ads_override?: AdsOverride | null;
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
  // Ads (DB)
  hasActiveGoogleAds: boolean;
  hasActiveMetaAds: boolean;
  googleAdsCopy: string | null;
  metaAdsCopy: string | null;
  landingPageUrl: string | null;
  landingPageText: string | null;
  adsCheckedAt: string | null;
  adsVerifiedManually?: boolean;
  // WhatsApp
  whatsappNumber?: string | null;
  whatsappSource?: string | null;
  // Video
  videoScriptData?: unknown;
  scriptRegeneratedAt?: string | null;
  // Video outreach
  videoYoutubeUrl?: string | null;
  videoLandingUrl?: string | null;
  videoLandingSlug?: string | null;
  videoTrackingToken?: string | null;
  landingPuntoDolore?: string | null;
  videoSentAt?: string | null;
  videoViewsCount?: number;
  videoViewedAt?: string | null;
  videoMaxWatchPercent?: number | null;
  // Contact
  email?: string | null;
  outreachChannel?: string | null;
  // Tier override
  tierOverride?: string | null;
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

/** Segnali Ads: tool di tracking trovati nel DOM che suggeriscono attivita ads */
function getAdsSignals(lead: UnifiedLead): string[] {
  const networks = getAdsNetworks(lead);
  const adsRelated = [
    "meta pixel", "google ads", "google tag manager",
    "linkedin insight", "tiktok pixel",
  ];
  return networks.filter(n =>
    adsRelated.some(t => n.toLowerCase().includes(t))
  );
}

/** Stato verifica manuale ads — SOLO adsVerifiedManually conta */
function getManualAdsState(lead: UnifiedLead): {
  googleVerified: boolean;
  metaVerified: boolean;
  googleAds: boolean;
  metaAds: boolean;
} {
  if (lead.adsVerifiedManually) {
    return {
      googleVerified: true,
      metaVerified: true,
      googleAds: lead.hasActiveGoogleAds,
      metaAds: lead.hasActiveMetaAds,
    };
  }
  return {
    googleVerified: false,
    metaVerified: false,
    googleAds: false,
    metaAds: false,
  };
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
// TIER SELECTOR COMPONENT
// ==========================================

const TIER_OPTIONS = [
  { value: "high_ticket", label: "High-Ticket", color: "border-orange-500/50 bg-orange-500/10 text-orange-400" },
  { value: "standard", label: "Standard", color: "border-yellow-500/50 bg-yellow-500/10 text-yellow-400" },
  { value: "low_ticket", label: "Low-Ticket", color: "border-gray-500/50 bg-gray-500/10 text-gray-400" },
] as const;

function TierSelector({
  currentTier,
  onSelect,
  disabled,
}: {
  currentTier: string;
  onSelect: (tier: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[9px] text-muted-foreground mr-1">Settore:</span>
      {TIER_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={(e) => { e.stopPropagation(); onSelect(opt.value); }}
          disabled={disabled}
          className={cn(
            "px-1.5 py-0.5 rounded text-[9px] font-bold border transition-all",
            currentTier === opt.value
              ? opt.color
              : "border-transparent text-muted-foreground/50 hover:text-muted-foreground hover:border-muted-foreground/30",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ==========================================
// SCORE BREAKDOWN COMPONENT
// ==========================================

/** Solo le pill dei punteggi + bottone recalc */
function ScoreBreakdownPills({
  data,
  score,
  onRecalc,
  recalcLoading,
}: {
  data: ScoreBreakdownData | null;
  score: number | null;
  onRecalc: () => void;
  recalcLoading: boolean;
}) {
  if (!data && score === null) return null;

  const breakdown = data?.breakdown || [];

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
      <button
        onClick={(e) => { e.stopPropagation(); onRecalc(); }}
        disabled={recalcLoading}
        className="inline-flex items-center px-1 py-0.5 rounded text-[10px] text-muted-foreground hover:text-primary transition-colors"
        title="Ricalcola score"
      >
        <RefreshCw className={cn("h-3 w-3", recalcLoading && "animate-spin")} />
      </button>
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
  const { refreshBadges } = useSidebar();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [notes, setNotes] = useState(lead.danielaNotes || "");
  const [loading, setLoading] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [overridingAds, setOverridingAds] = useState(false);
  const [scriptModalOpen, setScriptModalOpen] = useState(false);
  const [whatsappInput, setWhatsappInput] = useState(lead.whatsappNumber || "");
  const [savingWA, setSavingWA] = useState(false);
  const [tierLoading, setTierLoading] = useState(false);
  const [recalcLoading, setRecalcLoading] = useState(false);

  // Local state per aggiornamenti in-place (no collapse)
  const [localScore, setLocalScore] = useState<number | null>(lead.opportunityScore);
  const [localBreakdown, setLocalBreakdown] = useState<ScoreBreakdownData | null>(lead.scoreBreakdown);
  const [localTier, setLocalTier] = useState<string>(
    lead.tierOverride || lead.scoreBreakdown?.tier || "standard"
  );
  const [localManualAds, setLocalManualAds] = useState(() => getManualAdsState(lead));
  const [localAnalysis, setLocalAnalysis] = useState<GeminiAnalysis | null>(lead.geminiAnalysis);

  const [scriptRegenerated, setScriptRegenerated] = useState(!!lead.scriptRegeneratedAt);

  const analysis = localAnalysis;
  const isAnalyzed = !!(analysis?.teleprompter_script && analysis?.primary_error_pattern);
  const pixelOk = hasTrackingPixel(lead);
  const errorPattern = analysis?.primary_error_pattern || null;
  const adsSignals = getAdsSignals(lead);

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
      refreshBadges();
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
      refreshBadges();
      onAction();
    } catch {
      toast.error("Errore nello spostamento");
    } finally {
      setLoading(null);
    }
  };

  const handleMoveBack = async () => {
    setLoading("move_back");
    try {
      const res = await fetch(`/api/leads/${lead.id}/quick-log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "MOVE_BACK" }),
      });
      if (!res.ok) throw new Error("Errore");
      const data = await res.json();
      const stageLabels: Record<string, string> = {
        HOT_LEAD: "Hot Lead",
        WARM_LEAD: "Warm Lead",
        COLD_LEAD: "Cold Lead",
      };
      const label = stageLabels[data.lead?.pipelineStage] || data.lead?.pipelineStage;
      toast.success(`${lead.name} → ${label}`);
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
      refreshBadges();
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
      const data = await res.json();
      // Aggiorna localmente analysis e score (card resta aperta)
      if (data.analysis) {
        setLocalAnalysis(data.analysis);
      }
      // In variante video: segna che lo script è stato rigenerato con dati verificati
      if (variant === "video") {
        setScriptRegenerated(true);
        refreshBadges(); // Aggiorna X/Y nella sidebar
      }
      toast.success(variant === "video"
        ? `Script rigenerato per ${lead.name}`
        : `Analisi generata per ${lead.name}`
      );
      // Solo in varianti non-video: refresh lista (il lead cambia lista)
      if (variant !== "video") {
        onAction();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore nell'analisi");
    } finally {
      setGeneratingAI(false);
    }
  };

  // v3.4: Ads toggle — aggiorna localmente, NON chiama onAction()
  const handleAdsToggle = async (platform: "google" | "meta", value: boolean) => {
    setOverridingAds(true);
    try {
      const body = platform === "google"
        ? { googleAds: value }
        : { metaAds: value };
      const res = await fetch(`/api/leads/${lead.id}/ads-override`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Errore");
      }
      const data = await res.json();
      const label = platform === "google" ? "Google Ads" : "Meta Ads";
      toast.success(
        `${lead.name}: ${label} = ${value ? "SI" : "NO"}, score ${data.oldScore} -> ${data.newScore}`
      );
      if (data.oldStage !== data.newStage) {
        toast.info(`Spostato da ${data.oldStage} a ${data.newStage}`);
      }
      // Aggiorna stato locale (card resta aperta)
      setLocalScore(data.newScore);
      setLocalBreakdown({
        score: data.newScore,
        tier: data.tier || localTier,
        breakdown: data.breakdown || [],
        calculatedAt: new Date().toISOString(),
      });
      if (data.tier) setLocalTier(data.tier);
      // Aggiorna manual ads state
      setLocalManualAds(prev => ({
        ...prev,
        ...(platform === "google" ? { googleVerified: true, googleAds: value } : {}),
        ...(platform === "meta" ? { metaVerified: true, metaAds: value } : {}),
      }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore override Ads");
    } finally {
      setOverridingAds(false);
    }
  };

  // v3.4: Tier override — aggiorna localmente
  const handleTierOverride = async (tier: string) => {
    if (tier === localTier) return; // Stesso tier, skip
    setTierLoading(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/tier-override`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Errore");
      }
      const data = await res.json();
      toast.success(
        `${lead.name}: Settore → ${tier.replace("_", "-")}, score ${data.oldScore} -> ${data.newScore}`
      );
      if (data.oldStage !== data.newStage) {
        toast.info(`Spostato da ${data.oldStage} a ${data.newStage}`);
      }
      setLocalScore(data.newScore);
      setLocalTier(data.tier);
      setLocalBreakdown({
        score: data.newScore,
        tier: data.tier,
        breakdown: data.breakdown || [],
        calculatedAt: new Date().toISOString(),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore cambio tier");
    } finally {
      setTierLoading(false);
    }
  };

  // v3.4: Recalc score — aggiorna localmente
  const handleRecalcScore = async () => {
    setRecalcLoading(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/recalc-score`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Errore");
      }
      const data = await res.json();
      toast.success(
        `${lead.name}: score ${data.oldScore} -> ${data.newScore}`
      );
      if (data.oldStage !== data.newStage) {
        toast.info(`Spostato da ${data.oldStage} a ${data.newStage}`);
      }
      setLocalScore(data.newScore);
      setLocalTier(data.tier || localTier);
      setLocalBreakdown({
        score: data.newScore,
        tier: data.tier || localTier,
        breakdown: data.breakdown || [],
        calculatedAt: new Date().toISOString(),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore recalc");
    } finally {
      setRecalcLoading(false);
    }
  };

  const handleSaveWhatsApp = async () => {
    setSavingWA(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whatsappNumber: whatsappInput.trim() || null,
          whatsappSource: whatsappInput.trim() ? "manual" : null,
        }),
      });
      if (!res.ok) throw new Error("Errore");
      toast.success(`WhatsApp salvato per ${lead.name}`);
    } catch {
      toast.error("Errore nel salvataggio WhatsApp");
    } finally {
      setSavingWA(false);
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

  // Format whatsapp number for wa.me link
  const waLink = whatsappInput.trim()
    ? `https://wa.me/${whatsappInput.trim().replace(/[^0-9]/g, "")}`
    : null;

  // ---- Variant-specific actions ----
  // Blocca "Passa a Video" se anche solo un canale ads non è verificato
  const adsNotVerified = !localManualAds.googleVerified || !localManualAds.metaVerified;

  const getActionButtons = () => {
    switch (variant) {
      case "analisi":
        return (
          <div className="flex gap-2">
            <Button
              onClick={handleApprove}
              disabled={!!loading || adsNotVerified}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40"
              size="sm"
              title={adsNotVerified ? "Verifica prima le Ads (Google/Meta)" : undefined}
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
              disabled={!!loading || adsNotVerified}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40"
              size="sm"
              title={adsNotVerified ? "Verifica prima le Ads (Google/Meta)" : undefined}
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
          <div className="space-y-2">
            {/* Badge: Script rigenerato con dati verificati */}
            {scriptRegenerated && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/25">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-[11px] font-semibold text-emerald-400">
                  Script Tella generato — pronto per registrare
                </span>
              </div>
            )}
            {/* Riga 1: Script + Video Inviato + Info */}
            <div className="flex gap-2">
              {isAnalyzed && analysis?.teleprompter_script && (
                <>
                  <Button
                    onClick={() => setScriptModalOpen(true)}
                    variant="outline"
                    size="sm"
                    className="flex-1 border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Script Tella
                  </Button>
                  <Button
                    onClick={handleGenerateAI}
                    disabled={generatingAI || !lead.website}
                    variant="outline"
                    size="sm"
                    className="border-violet-500/50 text-violet-400 hover:bg-violet-500/10"
                    title="Rigenera lo script con i dati validati"
                  >
                    {generatingAI ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                </>
              )}
              {!isAnalyzed && (
                <Button
                  onClick={handleGenerateAI}
                  disabled={generatingAI || !lead.website}
                  size="sm"
                  className="flex-1 bg-violet-600 hover:bg-violet-700"
                >
                  {generatingAI ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Genera Testo Tella
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
            {/* Riga 2: Rimanda indietro + Non Target */}
            <div className="flex gap-2">
              <Button
                onClick={handleMoveBack}
                disabled={!!loading}
                variant="outline"
                size="sm"
                className="flex-1 border-gray-500/40 text-gray-300 hover:bg-gray-500/10 text-xs"
              >
                {loading === "move_back" ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <ArrowLeft className="h-3 w-3 mr-1" />
                )}
                Rimanda indietro
              </Button>
              <Button
                onClick={handleNonTarget}
                disabled={!!loading}
                variant="outline"
                size="sm"
                className="flex-1 border-gray-500/40 text-gray-400 hover:bg-gray-500/10 text-xs"
              >
                {loading === "non_target" ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <XCircle className="h-3 w-3 mr-1" />
                )}
                Non Target
              </Button>
            </div>
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
              getScoreHeaderColor(localScore)
            )}
            onClick={() => setExpanded(!expanded)}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <span className="text-2xl font-black tabular-nums w-10 text-center flex-shrink-0">
                {localScore ?? "?"}
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
              <Badge className={cn("text-xs font-bold px-2 py-0.5", getScoreBadgeColor(localScore))}>
                {getScoreLabel(localScore)}
              </Badge>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </div>

          {/* ---- COLLAPSED: Dati + Punteggi + Settore ---- */}
          {!expanded && (
            <div className="px-4 py-2.5 space-y-1.5">
              {/* Riga 1: DATI (valori trovati) */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 flex-wrap flex-1 text-[11px]">
                  {/* Segnali */}
                  <span className="text-muted-foreground">
                    Segnali:{" "}
                    <span className={adsSignals.length > 0 ? "text-amber-400 font-semibold" : "text-gray-500"}>
                      {adsSignals.length > 0 ? adsSignals.join(", ") : "no"}
                    </span>
                  </span>
                  <span className="text-gray-600">|</span>
                  {/* Google Ads */}
                  <span className="text-muted-foreground">
                    Google:{" "}
                    <span className={cn(
                      "font-semibold",
                      !localManualAds.googleVerified ? "text-gray-500" :
                      localManualAds.googleAds ? "text-emerald-400" : "text-gray-400"
                    )}>
                      {!localManualAds.googleVerified ? "nd" : localManualAds.googleAds ? "sì" : "no"}
                    </span>
                  </span>
                  <span className="text-gray-600">|</span>
                  {/* Meta Ads */}
                  <span className="text-muted-foreground">
                    Meta:{" "}
                    <span className={cn(
                      "font-semibold",
                      !localManualAds.metaVerified ? "text-gray-500" :
                      localManualAds.metaAds ? "text-emerald-400" : "text-gray-400"
                    )}>
                      {!localManualAds.metaVerified ? "nd" : localManualAds.metaAds ? "sì" : "no"}
                    </span>
                  </span>
                  <span className="text-gray-600">|</span>
                  {/* Sindrome / Errore strategico */}
                  <span className="text-muted-foreground">
                    Sindrome:{" "}
                    <span className={cn(
                      "font-semibold",
                      errorPattern ? "text-red-400" : "text-gray-500"
                    )}>
                      {errorPattern || "—"}
                    </span>
                  </span>
                  <span className="text-gray-600">|</span>
                  {/* Pixel */}
                  <span className="text-muted-foreground">
                    Pixel:{" "}
                    <span className={cn(
                      "font-semibold",
                      !isAnalyzed ? "text-gray-500" :
                      pixelOk ? "text-emerald-400" : "text-red-400"
                    )}>
                      {!isAnalyzed ? "nd" : pixelOk ? "OK" : "no"}
                    </span>
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {!isAnalyzed && variant !== "video" ? (
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

              {/* Riga 2: PUNTEGGI (score breakdown) */}
              <ScoreBreakdownPills
                data={localBreakdown}
                score={localScore}
                onRecalc={handleRecalcScore}
                recalcLoading={recalcLoading}
              />

              {/* Riga 3: SETTORE */}
              <TierSelector currentTier={localTier} onSelect={handleTierOverride} disabled={tierLoading} />

              {/* Riga 4: Passa a Video (solo se tutto verificato) */}
              {variant !== "video" && localManualAds.googleVerified && localManualAds.metaVerified && isAnalyzed && (
                <div className="pt-1">
                  <Button
                    onClick={(e) => { e.stopPropagation(); handleApprove(); }}
                    disabled={!!loading}
                    size="sm"
                    className="h-7 px-3 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {loading === "approve" ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                    )}
                    Passa a Video
                  </Button>
                </div>
              )}

              {/* Riga 4 (video): Badge script rigenerato */}
              {variant === "video" && scriptRegenerated && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/25">
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                  <span className="text-[10px] font-semibold text-emerald-400">
                    Script Tella generato — pronto per registrare
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ==========================================
              EXPANDED VIEW
              ========================================== */}
          {expanded && (
            <div className="p-4">
              {/* Score Breakdown + Tier Selector anche in expanded */}
              <div className="mb-3 pb-3 border-b border-border/50">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                  Composizione Score
                </p>
                <ScoreBreakdownPills
                  data={localBreakdown}
                  score={localScore}
                  onRecalc={handleRecalcScore}
                  recalcLoading={recalcLoading}
                />
                <div className="mt-1">
                  <TierSelector currentTier={localTier} onSelect={handleTierOverride} disabled={tierLoading} />
                </div>
              </div>

              {/* Layout: 2 colonne solo per video con script, altrimenti 1 colonna */}
              <div className={cn(
                "grid gap-4",
                variant === "video" && isAnalyzed && analysis?.teleprompter_script
                  ? "grid-cols-1 lg:grid-cols-12"
                  : "grid-cols-1"
              )}>

                {/* ---- COLONNA SINISTRA: Dati + Gancio di Vendita ---- */}
                <div className={cn(
                  variant === "video" && isAnalyzed && analysis?.teleprompter_script
                    ? "lg:col-span-7"
                    : "",
                  "space-y-4"
                )}>

                  {/* Dati base + WhatsApp */}
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

                    {/* WhatsApp editabile */}
                    <div
                      className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MessageCircle className="h-4 w-4 flex-shrink-0 text-green-400" />
                      <input
                        type="text"
                        value={whatsappInput}
                        onChange={(e) => setWhatsappInput(e.target.value)}
                        placeholder="Numero WhatsApp (es. 393401234567)"
                        className="flex-1 bg-transparent text-sm text-green-400 placeholder:text-green-400/40 focus:outline-none"
                      />
                      {whatsappInput.trim() && waLink && (
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-400 hover:text-green-300"
                          title="Apri WhatsApp"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <Button
                        onClick={handleSaveWhatsApp}
                        disabled={savingWA}
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-[10px] text-green-400 hover:text-green-300 hover:bg-green-500/10"
                      >
                        {savingWA ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Check className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Tag Strategici */}
                  <div className="flex flex-wrap gap-1.5">
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

                  {/* ============================================
                      BOX SEGNALI ADS + VERIFICA MANUALE
                      ============================================ */}
                  <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-4 space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
                      Segnali Ads & Verifica Manuale
                    </p>

                    {/* Segnali trovati nel DOM */}
                    {adsSignals.length > 0 ? (
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                          Tool trovati nel sito (possibili segnali ads)
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {adsSignals.map((signal, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/25"
                            >
                              {signal}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        Nessun segnale ads trovato nel sito (no Meta Pixel, no Google Ads Tag, etc.)
                      </p>
                    )}

                    {/* Tutti i tracking tools */}
                    {getAdsNetworks(lead).length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                          Tutti i tracking tools
                        </p>
                        <p className="text-xs text-gray-400">
                          {getAdsNetworks(lead).join(" · ")}
                        </p>
                      </div>
                    )}

                    {/* Verifica Manuale Google Ads */}
                    <div className="flex items-center justify-between py-2 border-t border-amber-500/20">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-300">Google Ads</span>
                        {localManualAds.googleVerified ? (
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded font-bold",
                            localManualAds.googleAds
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-gray-500/20 text-gray-400"
                          )}>
                            {localManualAds.googleAds ? "SI" : "NO"}
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-gray-500/10 text-gray-500">
                            Da verificare
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          onClick={(e) => { e.stopPropagation(); handleAdsToggle("google", true); }}
                          disabled={overridingAds}
                          size="sm"
                          variant="outline"
                          className={cn(
                            "h-6 px-2.5 text-[10px]",
                            localManualAds.googleVerified && localManualAds.googleAds
                              ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                              : "border-gray-500/30 text-gray-400 hover:border-emerald-500/50 hover:text-emerald-400"
                          )}
                        >
                          SI
                        </Button>
                        <Button
                          onClick={(e) => { e.stopPropagation(); handleAdsToggle("google", false); }}
                          disabled={overridingAds}
                          size="sm"
                          variant="outline"
                          className={cn(
                            "h-6 px-2.5 text-[10px]",
                            localManualAds.googleVerified && !localManualAds.googleAds
                              ? "border-red-500/50 bg-red-500/10 text-red-400"
                              : "border-gray-500/30 text-gray-400 hover:border-red-500/50 hover:text-red-400"
                          )}
                        >
                          NO
                        </Button>
                        <a
                          href={`https://adstransparency.google.com/?domain=${encodeURIComponent((lead.website || "").replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0])}&region=IT`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center h-6 px-2 rounded text-[10px] font-semibold bg-orange-600/20 text-orange-400 border border-orange-500/30 hover:bg-orange-600/30 transition-colors ml-1"
                          onClick={(e) => e.stopPropagation()}
                          title="Verifica su Google Ads Transparency"
                        >
                          <ExternalLink className="h-2.5 w-2.5 mr-1" />
                          Verifica
                        </a>
                      </div>
                    </div>

                    {/* Verifica Manuale Meta Ads */}
                    <div className="flex items-center justify-between py-2 border-t border-amber-500/20">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-300">Meta Ads</span>
                        {localManualAds.metaVerified ? (
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded font-bold",
                            localManualAds.metaAds
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-gray-500/20 text-gray-400"
                          )}>
                            {localManualAds.metaAds ? "SI" : "NO"}
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-gray-500/10 text-gray-500">
                            Da verificare
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          onClick={(e) => { e.stopPropagation(); handleAdsToggle("meta", true); }}
                          disabled={overridingAds}
                          size="sm"
                          variant="outline"
                          className={cn(
                            "h-6 px-2.5 text-[10px]",
                            localManualAds.metaVerified && localManualAds.metaAds
                              ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                              : "border-gray-500/30 text-gray-400 hover:border-emerald-500/50 hover:text-emerald-400"
                          )}
                        >
                          SI
                        </Button>
                        <Button
                          onClick={(e) => { e.stopPropagation(); handleAdsToggle("meta", false); }}
                          disabled={overridingAds}
                          size="sm"
                          variant="outline"
                          className={cn(
                            "h-6 px-2.5 text-[10px]",
                            localManualAds.metaVerified && !localManualAds.metaAds
                              ? "border-red-500/50 bg-red-500/10 text-red-400"
                              : "border-gray-500/30 text-gray-400 hover:border-red-500/50 hover:text-red-400"
                          )}
                        >
                          NO
                        </Button>
                        <a
                          href={`https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=IT&q=${encodeURIComponent(lead.name)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center h-6 px-2 rounded text-[10px] font-semibold bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 transition-colors ml-1"
                          onClick={(e) => e.stopPropagation()}
                          title="Verifica su Meta Ad Library"
                        >
                          <ExternalLink className="h-2.5 w-2.5 mr-1" />
                          Verifica
                        </a>
                      </div>
                    </div>

                    {overridingAds && (
                      <div className="flex items-center gap-2 justify-center py-1">
                        <Loader2 className="h-3 w-3 animate-spin text-amber-400" />
                        <span className="text-[10px] text-amber-400">Ricalcolo score...</span>
                      </div>
                    )}
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

                  {/* Sezione Completa e Invia (solo variant video) */}
                  {variant === "video" && (
                    <VideoOutreachInline
                      leadId={lead.id}
                      leadName={lead.name}
                      phone={lead.phone}
                      whatsappNumber={lead.whatsappNumber ?? null}
                      email={lead.email ?? null}
                      videoYoutubeUrl={lead.videoYoutubeUrl ?? null}
                      videoLandingUrl={lead.videoLandingUrl ?? null}
                      landingPuntoDolore={lead.landingPuntoDolore ?? null}
                      onVideoSent={onAction}
                    />
                  )}

                  {/* Bottoni operativi */}
                  {getActionButtons()}
                </div>

                {/* ---- COLONNA DESTRA: Script Tella (SOLO in variante video) ---- */}
                {variant === "video" && isAnalyzed && analysis?.teleprompter_script && (
                  <div className="lg:col-span-5">
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
                  </div>
                )}

                {/* Per variante video senza script: bottone genera */}
                {variant === "video" && !isAnalyzed && (
                  <div className="lg:col-span-5">
                    <div className="flex flex-col items-center justify-center py-12 text-center bg-muted/20 rounded-lg border border-dashed border-muted-foreground/20">
                      <Sparkles className="h-10 w-10 text-muted-foreground/30 mb-4" />
                      <p className="font-medium text-muted-foreground mb-2">
                        Script non ancora generato
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
                            Genera Testo Tella
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
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
