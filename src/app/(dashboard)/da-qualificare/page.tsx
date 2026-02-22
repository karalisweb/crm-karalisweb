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
  Shield,
  BarChart3,
  Smartphone,
  Share2,
  Tag,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { AuditData } from "@/types";

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
  auditData: AuditData | null;
  commercialTag: string | null;
  commercialPriority: number | null;
  pipelineStage: string;
  danielaNotes: string | null;
}

function getScoreColor(score: number | null): string {
  if (!score) return "bg-gray-500";
  if (score >= 80) return "bg-red-500";
  if (score >= 60) return "bg-orange-500";
  if (score >= 40) return "bg-yellow-600";
  return "bg-blue-500";
}

function getScoreLabel(score: number | null): string {
  if (!score) return "N/D";
  if (score >= 80) return "HOT";
  if (score >= 60) return "BUONO";
  if (score >= 40) return "MEDIO";
  return "BASSO";
}

function getCommercialTagLabel(tag: string | null): string {
  switch (tag) {
    case "ADS_ATTIVE_CONTROLLO_ASSENTE": return "Ads attive, controllo assente";
    case "TRAFFICO_SENZA_DIREZIONE": return "Traffico senza direzione";
    case "STRUTTURA_OK_NON_PRIORITIZZATA": return "Struttura OK, non prioritizzata";
    case "DA_APPROFONDIRE": return "Da approfondire";
    case "NON_TARGET": return "Non target";
    default: return tag || "N/D";
  }
}

function getCommercialTagColor(tag: string | null): string {
  switch (tag) {
    case "ADS_ATTIVE_CONTROLLO_ASSENTE": return "bg-red-500/10 text-red-500 border-red-500/20";
    case "TRAFFICO_SENZA_DIREZIONE": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
    case "STRUTTURA_OK_NON_PRIORITIZZATA": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    case "DA_APPROFONDIRE": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    default: return "bg-gray-500/10 text-gray-400 border-gray-500/20";
  }
}

function AuditSummary({ auditData }: { auditData: AuditData }) {
  const { tracking, website, social, trust } = auditData;
  const hasAnyTracking = tracking.hasGA4 || tracking.hasGoogleAnalytics || tracking.hasGTM;
  const hasAnyAds = tracking.hasFacebookPixel || tracking.hasGoogleAdsTag;
  const socialCount = [
    social.facebook?.linkedFromSite,
    social.instagram?.linkedFromSite,
    social.linkedin?.linkedFromSite,
    social.youtube?.linkedFromSite,
    social.tiktok?.linkedFromSite,
  ].filter(Boolean).length;

  return (
    <div className="grid grid-cols-2 gap-2">
      <div className={cn(
        "flex items-center gap-2 p-2 rounded-lg border text-xs",
        hasAnyTracking
          ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-500"
          : "bg-red-500/5 border-red-500/20 text-red-400"
      )}>
        <BarChart3 className="h-3.5 w-3.5 flex-shrink-0" />
        <span>{hasAnyTracking ? "Tracking presente" : "No tracking"}</span>
      </div>
      <div className={cn(
        "flex items-center gap-2 p-2 rounded-lg border text-xs",
        hasAnyAds
          ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-500"
          : "bg-amber-500/5 border-amber-500/20 text-amber-500"
      )}>
        <Tag className="h-3.5 w-3.5 flex-shrink-0" />
        <span>{hasAnyAds ? "Ads tracking OK" : "No ads tracking"}</span>
      </div>
      <div className={cn(
        "flex items-center gap-2 p-2 rounded-lg border text-xs",
        website.performance >= 60
          ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-500"
          : website.performance >= 40
          ? "bg-amber-500/5 border-amber-500/20 text-amber-500"
          : "bg-red-500/5 border-red-500/20 text-red-400"
      )}>
        <BarChart3 className="h-3.5 w-3.5 flex-shrink-0" />
        <span>Perf: {website.performance}/100</span>
      </div>
      <div className={cn(
        "flex items-center gap-2 p-2 rounded-lg border text-xs",
        website.mobile
          ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-500"
          : "bg-red-500/5 border-red-500/20 text-red-400"
      )}>
        <Smartphone className="h-3.5 w-3.5 flex-shrink-0" />
        <span>{website.mobile ? "Mobile OK" : "Non mobile"}</span>
      </div>
      <div className={cn(
        "flex items-center gap-2 p-2 rounded-lg border text-xs",
        socialCount >= 2
          ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-500"
          : socialCount >= 1
          ? "bg-amber-500/5 border-amber-500/20 text-amber-500"
          : "bg-red-500/5 border-red-500/20 text-red-400"
      )}>
        <Share2 className="h-3.5 w-3.5 flex-shrink-0" />
        <span>{socialCount} social collegati</span>
      </div>
      <div className={cn(
        "flex items-center gap-2 p-2 rounded-lg border text-xs",
        trust.hasCookieBanner && trust.hasPrivacyPolicy
          ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-500"
          : "bg-red-500/5 border-red-500/20 text-red-400"
      )}>
        <Shield className="h-3.5 w-3.5 flex-shrink-0" />
        <span>
          {trust.hasCookieBanner && trust.hasPrivacyPolicy
            ? "GDPR OK"
            : !trust.hasCookieBanner && !trust.hasPrivacyPolicy
            ? "No GDPR"
            : !trust.hasCookieBanner
            ? "No cookie banner"
            : "No privacy policy"}
        </span>
      </div>
    </div>
  );
}

function QualificaCard({
  lead,
  index,
  onAction,
}: {
  lead: Lead;
  index: number;
  onAction: () => void;
}) {
  const [expanded, setExpanded] = useState(index === 0);
  const [notes, setNotes] = useState(lead.danielaNotes || "");
  const [loading, setLoading] = useState<string | null>(null);

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

  return (
    <Card className="card-hover overflow-hidden">
      <CardContent className="p-0">
        <div
          className={cn(
            "px-4 py-3 flex items-center justify-between cursor-pointer text-white",
            getScoreColor(lead.opportunityScore)
          )}
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black">
              {lead.opportunityScore || "?"}
            </span>
            <div>
              <p className="font-semibold text-sm">{lead.name}</p>
              <p className="text-xs opacity-80">
                {lead.category}
                {lead.googleRating && ` · ★ ${lead.googleRating}`}
                {lead.googleReviewsCount ? ` (${lead.googleReviewsCount})` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-white/20 text-white text-xs">
              {getScoreLabel(lead.opportunityScore)}
            </Badge>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>

        {expanded && (
          <div className="space-y-0">
            {lead.website && (
              <a
                href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mx-4 mt-3 flex items-center gap-2 px-3 py-2.5 bg-primary/10 border border-primary/20 rounded-lg text-primary hover:bg-primary/20 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Globe className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm font-medium truncate">
                  {lead.website.replace(/^https?:\/\//, "").replace(/\/.*$/, "")}
                </span>
                <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 opacity-60 ml-auto" />
              </a>
            )}

            <div className="p-4 space-y-4">
              {lead.auditData && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Riepilogo Audit
                  </p>
                  <AuditSummary auditData={lead.auditData} />
                </div>
              )}

              {lead.commercialTag && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Segnali Commerciali
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border",
                      getCommercialTagColor(lead.commercialTag)
                    )}>
                      <Tag className="h-3 w-3" />
                      {getCommercialTagLabel(lead.commercialTag)}
                    </span>
                    {lead.commercialPriority && (
                      <Badge variant="outline" className="text-xs">
                        Priorita: {lead.commercialPriority === 1 ? "Alta" : lead.commercialPriority === 2 ? "Media" : "Bassa"}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label
                  htmlFor={`notes-${lead.id}`}
                  className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block"
                >
                  Note di Daniela
                </label>
                <textarea
                  id={`notes-${lead.id}`}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Scrivi qui le tue osservazioni sul lead..."
                  rows={3}
                  className="w-full text-sm rounded-md border border-border bg-background px-3 py-2 placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

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
                  Non Target
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/leads/${lead.id}`}>
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}

        {!expanded && (
          <div className="px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {lead.commercialTag && (
                <span className={cn(
                  "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border flex-shrink-0",
                  getCommercialTagColor(lead.commercialTag)
                )}>
                  {getCommercialTagLabel(lead.commercialTag)}
                </span>
              )}
              {lead.auditData && (
                <p className="text-xs text-muted-foreground truncate">
                  Perf: {lead.auditData.website.performance} ·{" "}
                  {lead.auditData.tracking.hasGA4 || lead.auditData.tracking.hasGoogleAnalytics
                    ? "Analytics OK"
                    : "No Analytics"}
                </p>
              )}
            </div>
            {lead.website && (
              <Button asChild size="sm" variant="outline" className="h-7 px-2 ml-2">
                <a
                  href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Globe className="h-3.5 w-3.5" />
                </a>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

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
                <div className="grid grid-cols-2 gap-2">
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                </div>
                <Skeleton className="h-20 w-full" />
                <div className="flex gap-2"><Skeleton className="h-9 flex-1" /><Skeleton className="h-9 w-24" /></div>
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
              I lead con audit completato appariranno qui per la revisione.
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
