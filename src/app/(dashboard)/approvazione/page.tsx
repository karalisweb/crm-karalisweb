"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ClipboardCheck, Globe, ExternalLink, RefreshCw, ChevronDown, ChevronUp,
  Loader2, Send, XCircle, AlertTriangle, Mail,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { detectFranchise } from "@/lib/franchise-brands";
import { parsePausedSegments, getSegmentLabel } from "@/lib/segments";
import { useSidebar } from "@/components/layout/sidebar-context";

interface GeminiAnalysis {
  primary_error_pattern?: string;
  strategic_note?: string;
  ads_override?: { googleAds?: boolean | null; metaAds?: boolean | null; verifiedAt?: string };
}
interface Lead {
  id: string;
  name: string;
  category: string | null;
  segment: string | null;
  website: string | null;
  googleRating: string | null;
  opportunityScore: number | null;
  geminiAnalysis: GeminiAnalysis | null;
  puntoDoloreBreve: string | null;
  email: string | null;
  optInSentAt: string | null;
  outreachApprovedAt: string | null;
  respondedAt: string | null;
  unsubscribed: boolean;
  hasActiveGoogleAds: boolean;
  hasActiveMetaAds: boolean;
  adsVerifiedManually: boolean;
  googleAdsActive: boolean | null;
  metaAdsActive: boolean | null;
}

const DEFAULT_THRESHOLD = 60;

function scoreColor(s: number | null): string {
  if (!s) return "bg-gray-500";
  if (s >= 80) return "bg-red-500";
  if (s >= 60) return "bg-orange-500";
  return "bg-yellow-600";
}

function AdsRow({ label, confirmed, confirmedValue, suggestion, busy, onSet, href, linkLabel }: {
  label: string; confirmed: boolean; confirmedValue: boolean; suggestion: boolean | null;
  busy: boolean; onSet: (v: boolean) => void; href?: string; linkLabel?: string;
}) {
  const showHint = !confirmed && suggestion !== null;
  return (
    <div className="py-1.5 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium flex-shrink-0">{label}</span>
          {confirmed ? (
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-bold flex-shrink-0",
              confirmedValue ? "bg-emerald-500/20 text-emerald-400" : "bg-gray-500/20 text-gray-400")}>
              {confirmedValue ? "SÌ" : "NO"}
            </span>
          ) : showHint ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 truncate">
              ipotesi: {suggestion ? "SÌ" : "NO"} · da confermare
            </span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-gray-500/10 text-gray-500 flex-shrink-0">da verificare</span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button onClick={() => onSet(true)} disabled={busy} size="sm" variant="outline"
            className={cn("h-7 px-3 text-xs",
              confirmed && confirmedValue ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
              : showHint && suggestion === true ? "border-amber-500/50 text-amber-400"
              : "border-gray-500/30 text-gray-400 hover:border-emerald-500/50 hover:text-emerald-400")}>Sì</Button>
          <Button onClick={() => onSet(false)} disabled={busy} size="sm" variant="outline"
            className={cn("h-7 px-3 text-xs",
              confirmed && !confirmedValue ? "border-red-500/50 bg-red-500/10 text-red-400"
              : showHint && suggestion === false ? "border-amber-500/50 text-amber-400"
              : "border-gray-500/30 text-gray-400 hover:border-red-500/50 hover:text-red-400")}>No</Button>
        </div>
      </div>
      {href && (
        <a href={href} target="_blank" rel="noopener noreferrer" title={linkLabel}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 hover:text-amber-300 hover:underline">
          <ExternalLink className="h-3 w-3 flex-shrink-0" /> {linkLabel || "Verifica"}
        </a>
      )}
    </div>
  );
}

function ApprovalCard({ lead, index, onAction }: { lead: Lead; index: number; onAction: () => void }) {
  const { refreshBadges } = useSidebar();
  const [expanded, setExpanded] = useState(index === 0);
  const [loading, setLoading] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [questionnaireConfigured, setQuestionnaireConfigured] = useState(true);
  // Verifica ads PER-PIATTAFORMA: confermare Google non deve toccare Meta (e viceversa).
  // Lo stato "confermato" di ciascuna piattaforma vive in geminiAnalysis.ads_override
  // (null = non ancora confermata); adsVerifiedManually è solo "toccato almeno una volta".
  const adsOverride = lead.geminiAnalysis?.ads_override;
  const [googleConfirmed, setGoogleConfirmed] = useState(adsOverride?.googleAds != null);
  const [metaConfirmed, setMetaConfirmed] = useState(adsOverride?.metaAds != null);
  const [googleAds, setGoogleAds] = useState(lead.hasActiveGoogleAds);
  const [metaAds, setMetaAds] = useState(lead.hasActiveMetaAds);
  const [adsBusy, setAdsBusy] = useState<"google" | "meta" | null>(null);

  // Email: può mancare (l'estrazione durante l'audit non sempre la trova). `persistedEmail`
  // è ciò che è salvato sul lead; `email` è il valore nel campo (modificabile a mano).
  const [persistedEmail, setPersistedEmail] = useState(lead.email || "");
  const [email, setEmail] = useState(lead.email || "");
  const [emailBusy, setEmailBusy] = useState<"find" | "save" | null>(null);

  const pattern = lead.geminiAnalysis?.primary_error_pattern || null;
  const pain = lead.puntoDoloreBreve || lead.geminiAnalysis?.strategic_note || null;

  const loadDraft = useCallback(async () => {
    if (draftLoaded || draftLoading) return;
    setDraftLoading(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/first-touch-draft`);
      if (!res.ok) throw new Error();
      const j = await res.json();
      setSubject(j.subject || "");
      setBody(j.body || "");
      setQuestionnaireConfigured(!!j.questionnaireConfigured);
      setDraftLoaded(true);
    } catch {
      toast.error("Errore nel generare la mail");
    } finally {
      setDraftLoading(false);
    }
  }, [lead.id, draftLoaded, draftLoading]);

  useEffect(() => { if (expanded) loadDraft(); }, [expanded, loadDraft]);

  // Rigenera la mail da zero (bypassa la bozza cachata) e sovrascrive subject/body.
  const regenerate = useCallback(async () => {
    if (draftLoading) return;
    setDraftLoading(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/first-touch-draft?regenerate=1`);
      if (!res.ok) throw new Error();
      const j = await res.json();
      setSubject(j.subject || "");
      setBody(j.body || "");
      setQuestionnaireConfigured(!!j.questionnaireConfigured);
      setDraftLoaded(true);
      toast.success("Mail rigenerata");
    } catch {
      toast.error("Errore nel rigenerare la mail");
    } finally {
      setDraftLoading(false);
    }
  }, [lead.id, draftLoading]);

  const setAds = async (platform: "google" | "meta", value: boolean) => {
    setAdsBusy(platform);
    try {
      const res = await fetch(`/api/leads/${lead.id}/ads-override`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(platform === "google" ? { googleAds: value } : { metaAds: value }),
      });
      if (!res.ok) throw new Error();
      // Conferma SOLO la piattaforma cliccata, lascia l'altra com'è.
      if (platform === "google") { setGoogleAds(value); setGoogleConfirmed(true); }
      else { setMetaAds(value); setMetaConfirmed(true); }
    } catch { toast.error("Errore verifica ads"); } finally { setAdsBusy(null); }
  };

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

  // Cerca l'email sul momento (homepage → /contatti → /contattaci) e la salva.
  const findEmail = async () => {
    setEmailBusy("find");
    try {
      const res = await fetch(`/api/leads/${lead.id}/find-email`, { method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Errore");
      if (j.email) {
        setEmail(j.email); setPersistedEmail(j.email);
        toast.success(`Email trovata: ${j.email}`);
      } else {
        toast.warning("Nessuna email trovata sul sito — inseriscila a mano");
      }
    } catch (e) { toast.error(e instanceof Error ? e.message : "Errore nella ricerca email"); }
    finally { setEmailBusy(null); }
  };

  // Salva l'email digitata a mano sul lead.
  const saveEmail = async () => {
    const e = email.trim();
    if (!isValidEmail(e)) { toast.error("Email non valida"); return; }
    setEmailBusy("save");
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e }),
      });
      if (!res.ok) throw new Error();
      setPersistedEmail(e);
      toast.success("Email salvata");
    } catch { toast.error("Errore nel salvare l'email"); } finally { setEmailBusy(null); }
  };

  const approve = async () => {
    // Se l'email digitata non è ancora salvata, salvala prima di inviare.
    const e = email.trim();
    if (e && e !== persistedEmail) {
      if (!isValidEmail(e)) { toast.error("Email non valida"); return; }
      await saveEmail();
    }
    setLoading("approve");
    try {
      const res = await fetch(`/api/leads/${lead.id}/approve-outreach`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Errore");
      }
      toast.success(`${lead.name}: approvato — in coda di invio`);
      refreshBadges(); onAction();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Errore nell'approvazione"); }
    finally { setLoading(null); }
  };

  const discard = async () => {
    setLoading("discard");
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipelineStage: "NON_TARGET" }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${lead.name} scartato (Non Target)`);
      refreshBadges(); onAction();
    } catch { toast.error("Errore nello scarto"); } finally { setLoading(null); }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className={cn("px-4 py-3 flex items-center justify-between cursor-pointer text-white", scoreColor(lead.opportunityScore))}
          onClick={() => setExpanded(!expanded)}>
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl font-black w-10 text-center flex-shrink-0">{lead.opportunityScore ?? "?"}</span>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{lead.name}</p>
              <p className="text-xs opacity-80 truncate">
                {lead.segment ? lead.segment.replace(/_/g, " ") : lead.category}
                {lead.googleRating && ` · ★ ${lead.googleRating}`}
              </p>
            </div>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 flex-shrink-0" />}
        </div>

        {!expanded && (
          <div className="px-4 py-2 flex items-center gap-2 text-xs text-muted-foreground">
            {pattern ? (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-red-900/30 text-red-300 border border-red-800/40 font-medium">{pattern}</span>
            ) : <span className="italic">Nessun pattern</span>}
            {!persistedEmail && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-900/30 text-amber-300 border border-amber-800/40 font-medium">
                <AlertTriangle className="h-3 w-3" /> manca email
              </span>
            )}
            <span className="ml-auto">{googleConfirmed && metaConfirmed ? "Ads ✓" : "Ads da confermare"}</span>
          </div>
        )}

        {expanded && (
          <div className="p-4 space-y-4">
            {lead.website && (
              <a href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg text-primary hover:bg-primary/20 transition-colors text-sm">
                <Globe className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{lead.website.replace(/^https?:\/\//, "").replace(/\/.*$/, "")}</span>
                <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-60 ml-auto" />
              </a>
            )}

            <div className="rounded-lg border border-red-500/30 bg-red-950/20 p-3 space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-red-400">Pattern & dolore</p>
              {pattern && <p className="text-base font-bold text-red-300">{pattern}</p>}
              <p className="text-sm text-gray-300">
                {pain || <span className="italic text-muted-foreground">Nessun gancio estratto — la mail usa un fallback neutro.</span>}
              </p>
            </div>

            <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-1">Verdetto Ads</p>
              <AdsRow label="Google Ads" confirmed={googleConfirmed} confirmedValue={googleAds} suggestion={lead.googleAdsActive} busy={adsBusy === "google"} onSet={(v) => setAds("google", v)}
                href={lead.website
                  ? `https://adstransparency.google.com/?domain=${encodeURIComponent(lead.website.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0])}&region=IT`
                  : `https://adstransparency.google.com/?region=IT&query=${encodeURIComponent(lead.name)}`}
                linkLabel="Verifica su Google Ads Transparency" />
              <AdsRow label="Meta Ads" confirmed={metaConfirmed} confirmedValue={metaAds} suggestion={lead.metaAdsActive} busy={adsBusy === "meta"} onSet={(v) => setAds("meta", v)}
                href={`https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=IT&q=${encodeURIComponent(lead.name)}&search_type=keyword_unordered`}
                linkLabel="Verifica su Meta Ad Library" />
            </div>

            <div className={cn("rounded-lg border p-3 space-y-2",
              persistedEmail ? "border-border bg-muted/20" : "border-amber-500/40 bg-amber-950/20")}>
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" /> Email destinatario
                </p>
                <button
                  type="button"
                  onClick={findEmail}
                  disabled={!!emailBusy || !lead.website}
                  title={lead.website ? "Cerca l'email sul sito (home, /contatti)" : "Nessun sito da cui cercare"}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 hover:text-amber-300 disabled:opacity-50 transition-colors"
                >
                  {emailBusy === "find" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Cerca email
                </button>
              </div>
              {!persistedEmail && (
                <p className="text-[11px] text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 flex-shrink-0" /> Email non trovata in automatico: cercala o inseriscila per poter inviare.
                </p>
              )}
              <div className="flex items-center gap-2">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@azienda.it"
                  className="flex-1 min-w-0 text-sm rounded-md border border-border bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary" />
                <Button onClick={saveEmail} disabled={!!emailBusy || !email.trim() || email.trim() === persistedEmail}
                  size="sm" variant="outline" className="flex-shrink-0 h-9">
                  {emailBusy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salva"}
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> Mail primo tocco</p>
                <button
                  type="button"
                  onClick={regenerate}
                  disabled={draftLoading || !!loading}
                  title="Rigenera la mail da zero"
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary disabled:opacity-50 transition-colors"
                >
                  {draftLoading
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <RefreshCw className="h-3.5 w-3.5" />}
                  Rigenera
                </button>
              </div>
              {!questionnaireConfigured && (
                <p className="text-[11px] text-amber-400 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Link questionario non impostato (Impostazioni)</p>
              )}
              <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Oggetto..."
                className="w-full text-sm font-medium rounded-md border border-border bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary" />
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10} placeholder={draftLoading ? "Generazione..." : "Corpo email..."}
                className="w-full text-sm rounded-md border border-border bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary resize-y leading-relaxed" />
            </div>

            <div className="flex gap-2">
              <Button onClick={approve} disabled={!!loading || !!emailBusy || !draftLoaded || !questionnaireConfigured || !isValidEmail(email)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" size="sm">
                {loading === "approve" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Approva (in coda)
              </Button>
              <Button onClick={discard} disabled={!!loading} variant="outline" size="sm" className="border-gray-500/50 text-gray-400 hover:bg-gray-500/10">
                {loading === "discard" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                Scarta
              </Button>
              <Button asChild variant="ghost" size="sm"><Link href={`/leads/${lead.id}`}>Dettaglio</Link></Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ApprovazionePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [hiddenBelow, setHiddenBelow] = useState(0);
  const [hiddenFranchise, setHiddenFranchise] = useState(0);
  const [pausedLabels, setPausedLabels] = useState<string[]>([]);
  const [hiddenPaused, setHiddenPaused] = useState(0);
  const [sent, setSent] = useState<{
    total: number; cap: number; configuredCap: number; remaining: number; inWarmup: boolean; queued: number;
    byType: { first: number; followup1: number; followup2: number; breakup: number };
  } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let thr = DEFAULT_THRESHOLD;
      let pausedKeys: string[] = [];
      try {
        const sres = await fetch("/api/settings/outreach-mail");
        if (sres.ok) {
          const s = await sres.json();
          const v = s?.settings?.outreachApprovalMinScore;
          if (typeof v === "number") thr = v;
          pausedKeys = parsePausedSegments(s?.settings?.pausedSegments);
        }
      } catch { /* default */ }
      setThreshold(thr);
      setPausedLabels(pausedKeys.map((k) => getSegmentLabel(k)));

      try {
        const cres = await fetch("/api/outreach/sent-today");
        if (cres.ok) setSent(await cres.json());
      } catch { /* contatore non critico */ }

      // Solo HOT (score≥80): sono quelli che richiedono la tua approvazione.
      // I WARM partono in autonomia (drip), non passano da qui.
      const res = await fetch("/api/leads?stages=HOT_LEAD&notContacted=true&pageSize=200");
      if (!res.ok) throw new Error("Errore nel caricamento");
      const json = await res.json();
      const base: Lead[] = (json.leads || []).filter(
        (l: Lead) => !l.unsubscribed && !l.respondedAt && !l.optInSentAt && !l.outreachApprovedAt
      );
      // Rete di sicurezza: nascondi i franchising eventualmente sfuggiti al blocco a monte.
      const noFranchise = base.filter((l) => !detectFranchise(l.name, l.website));
      setHiddenFranchise(base.length - noFranchise.length);
      // Settori in pausa: escludili dalla coda finché restano in pausa.
      const pausedSet = new Set(pausedKeys);
      const all = pausedSet.size > 0 ? noFranchise.filter((l) => !l.segment || !pausedSet.has(l.segment)) : noFranchise;
      setHiddenPaused(noFranchise.length - all.length);
      const above = all.filter((l) => (l.opportunityScore ?? 0) >= thr);
      setLeads(above);
      setHiddenBelow(all.length - above.length);
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
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-emerald-400" /> Approvazione
          </h1>
          <p className="text-sm text-muted-foreground">
            Solo HOT (score≥80). Approvi → vanno in coda e il sistema li invia diluiti nella giornata. I WARM partono da soli.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {sent && (
            <span
              title={`Oggi: ${sent.byType.first} mail 1 · ${sent.byType.followup1} follow-up · ${sent.byType.followup2} follow-up 2 · ${sent.byType.breakup} break-up${sent.inWarmup ? `\nWarmup attivo: oggi il sistema invia al massimo ${sent.cap} (sale gradualmente fino a ${sent.configuredCap})` : ""}`}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border",
                sent.remaining <= 0
                  ? "bg-red-500/15 text-red-400 border-red-500/40"
                  : sent.total >= sent.cap * 0.8
                  ? "bg-amber-500/15 text-amber-400 border-amber-500/40"
                  : "bg-emerald-500/15 text-emerald-400 border-emerald-500/40"
              )}
            >
              <Mail className="h-3.5 w-3.5" />
              {sent.total}/{sent.configuredCap} oggi
              {sent.inWarmup ? ` · oggi max ${sent.cap} (warmup)` : sent.remaining <= 0 ? " · cap raggiunto" : ` · ne restano ${sent.remaining}`}
            </span>
          )}
          {sent && sent.queued > 0 && (
            <span
              title="HOT approvati da te, in coda: il sistema li invia diluiti nei prossimi giorni"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border bg-sky-500/15 text-sky-400 border-sky-500/40"
            >
              <Send className="h-3.5 w-3.5" />
              {sent.queued} in coda
            </span>
          )}
          <Badge variant="secondary">{leads.length} da approvare</Badge>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} /> Aggiorna
          </Button>
        </div>
      </div>

      {hiddenBelow > 0 && (
        <p className="text-xs text-muted-foreground">{hiddenBelow} lead sotto soglia (score &lt; {threshold}) lasciati da parte.</p>
      )}
      {hiddenFranchise > 0 && (
        <p className="text-xs text-muted-foreground">{hiddenFranchise} franchising/catene nascosti (fuori target).</p>
      )}
      {pausedLabels.length > 0 && (
        <p className="text-xs text-amber-500/90">
          ⏸ Settori in pausa: {pausedLabels.join(", ")}
          {hiddenPaused > 0 ? ` — ${hiddenPaused} lead nascosti.` : "."} Riattivali in Impostazioni → Outreach.
        </p>
      )}

      {error && (
        <Card className="border-red-500"><CardContent className="p-4 text-center text-red-500">
          <AlertTriangle className="h-5 w-5 inline mr-2" />{error}
        </CardContent></Card>
      )}

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}><CardContent className="p-0">
              <Skeleton className="h-14 w-full" />
              <div className="p-4 space-y-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-32 w-full" /></div>
            </CardContent></Card>
          ))}
        </div>
      ) : leads.length === 0 ? (
        <Card><CardContent className="p-8 text-center">
          <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">Niente da approvare</h3>
          <p className="text-sm text-muted-foreground">I lead analizzati sopra soglia appariranno qui, con la mail già pronta.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {leads.map((lead, index) => (
            <ApprovalCard key={lead.id} lead={lead} index={index} onAction={fetchData} />
          ))}
        </div>
      )}
    </div>
  );
}
