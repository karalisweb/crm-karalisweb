"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Phone,
  Globe,
  MapPin,
  Star,
  ChevronRight,
  RefreshCw,
  MessageSquare,
  Lightbulb,
  ArrowUp,
  Archive,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { QuickCallButtons } from "@/components/leads/quick-call-logger";
import { toast } from "sonner";
import { generateMSDTalkingPoints } from "@/lib/audit/talking-points";
import type { AuditData } from "@/types";
import type { CommercialSignals } from "@/types/commercial";

// Tipi
interface Lead {
  id: string;
  name: string;
  phone: string | null;
  website: string | null;
  category: string | null;
  address: string | null;
  googleRating: string | null;
  googleReviewsCount: number | null;
  googleMapsUrl: string | null;
  commercialTag: string | null;
  commercialTagReason: string | null;
  commercialPriority: number | null;
  commercialSignals: CommercialSignals | null;
  isCallable: boolean;
  opportunityScore: number | null;
  auditData: AuditData | null;
  talkingPoints: string[] | null;
  auditCompletedAt: string | null;
  pipelineStage: string;
  lastContactedAt: string | null;
  notes: string | null;
}

interface ApiResponse {
  daChiamare: Lead[];
  daVerificare: Lead[];
  counts: {
    daChiamare: number;
    daVerificare: number;
    archiviati: number;
  };
}

// Genera script e talking points dal audit data
function getLeadScript(lead: Lead): { script: string; observations: string[]; questions: string[] } {
  if (lead.auditData && lead.commercialSignals) {
    try {
      const msd = generateMSDTalkingPoints(lead.commercialSignals, lead.auditData);
      const script = `Buongiorno, parlo con ${lead.name.split(" ")[0]}? Sono Alessio di Karalisweb. Ho dato un'occhiata al vostro sito e mi sono posto una domanda: ${msd.mainHook} Avete due minuti per parlarne?`;
      return {
        script,
        observations: msd.observations.slice(0, 5),
        questions: msd.strategicQuestions,
      };
    } catch {
      // Fallback
    }
  }

  // Fallback se non ci sono dati audit
  if (lead.talkingPoints && lead.talkingPoints.length > 0) {
    return {
      script: `Buongiorno, parlo con ${lead.name.split(" ")[0]}? Sono Alessio di Karalisweb. Ho dato un'occhiata al vostro sito e ho notato alcune cose interessanti. Avete due minuti per parlarne?`,
      observations: lead.talkingPoints.slice(0, 5),
      questions: [],
    };
  }

  return {
    script: `Buongiorno, parlo con ${lead.name.split(" ")[0]}? Sono Alessio di Karalisweb. Ho analizzato la vostra presenza online e mi piacerebbe condividere alcune osservazioni. Avete due minuti?`,
    observations: [],
    questions: [],
  };
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

// === CARD LEAD DA CHIAMARE ===
function LeadCallCard({
  lead,
  index,
  onCallLogged,
}: {
  lead: Lead;
  index: number;
  onCallLogged: () => void;
}) {
  const [expanded, setExpanded] = useState(index === 0); // Primo sempre espanso
  const { script, observations, questions } = getLeadScript(lead);

  return (
    <Card className="card-hover overflow-hidden">
      <CardContent className="p-0">
        {/* Header: Score grande + nome */}
        <div
          className={`px-4 py-3 flex items-center justify-between cursor-pointer ${getScoreColor(
            lead.opportunityScore
          )} text-white`}
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
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </div>

        {/* Contenuto espanso */}
        {expanded && (
          <div className="p-4 space-y-4">
            {/* SCRIPT DI APERTURA - la cosa più importante */}
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-semibold text-blue-400 uppercase tracking-wide">
                  Script di apertura
                </span>
              </div>
              <p className="text-sm leading-relaxed text-foreground">
                {script}
              </p>
            </div>

            {/* PERCHÉ CHIAMARLO - observations */}
            {observations.length > 0 && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-amber-400" />
                  <span className="text-sm font-semibold text-amber-400 uppercase tracking-wide">
                    Perche chiamarlo
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {observations.map((obs, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-amber-400 mt-0.5">•</span>
                      <span>{obs}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Domande strategiche */}
            {questions.length > 0 && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  Domande da fare
                </p>
                <ul className="space-y-1">
                  {questions.map((q, i) => (
                    <li key={i} className="text-sm text-muted-foreground">
                      {i + 1}. {q}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Info azienda */}
            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              {lead.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {lead.address}
                </span>
              )}
            </div>

            {/* Azioni */}
            <div className="flex gap-2">
              {lead.phone && (
                <Button asChild className="flex-1" size="sm">
                  <a href={`tel:${lead.phone}`}>
                    <Phone className="h-4 w-4 mr-2" />
                    Chiama
                  </a>
                </Button>
              )}
              {lead.website && (
                <Button asChild variant="outline" size="sm">
                  <a
                    href={
                      lead.website.startsWith("http")
                        ? lead.website
                        : `https://${lead.website}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Globe className="h-4 w-4" />
                  </a>
                </Button>
              )}
              <Button asChild variant="ghost" size="sm">
                <Link href={`/leads/${lead.id}`}>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            {/* Esito rapido */}
            <div className="flex items-center justify-between pt-3 border-t">
              <span className="text-xs text-muted-foreground">Esito chiamata:</span>
              <QuickCallButtons leadId={lead.id} onSuccess={onCallLogged} />
            </div>
          </div>
        )}

        {/* Riga compatta quando chiuso */}
        {!expanded && (
          <div className="px-4 py-2 flex items-center justify-between">
            <p className="text-xs text-muted-foreground truncate flex-1">
              {observations.length > 0 ? observations[0] : (lead.talkingPoints?.[0] || "")}
            </p>
            <div className="flex gap-1 ml-2">
              {lead.phone && (
                <Button asChild size="sm" variant="outline" className="h-7 px-2">
                  <a href={`tel:${lead.phone}`}>
                    <Phone className="h-3.5 w-3.5" />
                  </a>
                </Button>
              )}
              <QuickCallButtons leadId={lead.id} onSuccess={onCallLogged} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// === CARD LEAD DA VERIFICARE ===
function VerificaCard({
  lead,
  onAction,
}: {
  lead: Lead;
  onAction: () => void;
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const { observations } = getLeadScript(lead);

  const moveTo = async (stage: string) => {
    setLoading(stage);
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipelineStage: stage }),
      });
      if (!res.ok) throw new Error("Errore");
      toast.success(
        stage === "DA_CHIAMARE"
          ? `${lead.name} spostato in Da Chiamare`
          : `${lead.name} archiviato`
      );
      onAction();
    } catch {
      toast.error("Errore nello spostamento");
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card className="card-hover border-amber-500/30">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-semibold text-sm truncate">{lead.name}</p>
              {lead.opportunityScore && (
                <Badge variant="secondary" className="text-xs">
                  {lead.opportunityScore}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              {lead.category}
              {lead.googleRating && ` · ★ ${lead.googleRating}`}
            </p>
            {observations.length > 0 && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {observations[0]}
              </p>
            )}
          </div>
          <div className="flex gap-1.5 flex-shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2 border-green-500/50 text-green-500 hover:bg-green-500/10"
              onClick={() => moveTo("DA_CHIAMARE")}
              disabled={!!loading}
              title="Sposta in Da Chiamare"
            >
              {loading === "DA_CHIAMARE" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2 border-gray-500/50 text-gray-400 hover:bg-gray-500/10"
              onClick={() => moveTo("NON_TARGET")}
              disabled={!!loading}
              title="Archivia"
            >
              {loading === "NON_TARGET" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Archive className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// === SKELETON ===
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-0">
            <Skeleton className="h-14 w-full" />
            <div className="p-4 space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-16 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-9 flex-1" />
                <Skeleton className="h-9 w-9" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// === PAGINA PRINCIPALE ===
export default function DaChiamarePage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showVerifica, setShowVerifica] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/da-chiamare?includeVerifica=true`);
      if (!res.ok) throw new Error("Errore nel caricamento");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Da Chiamare</h1>
          <p className="text-sm text-muted-foreground">
            {data ? `${data.counts.daChiamare} lead pronti` : "Caricamento..."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Aggiorna
        </Button>
      </div>

      {/* Stats compatte */}
      {data && (
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-primary">
                {data.counts.daChiamare}
              </p>
              <p className="text-xs text-muted-foreground">Da chiamare</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-amber-500">
                {data.counts.daVerificare}
              </p>
              <p className="text-xs text-muted-foreground">Da verificare</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-gray-400">
                {data.counts.archiviati}
              </p>
              <p className="text-xs text-muted-foreground">Archiviati</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Errore */}
      {error && (
        <Card className="border-red-500">
          <CardContent className="p-4 text-center text-red-500">{error}</CardContent>
        </Card>
      )}

      {/* Lista DA_CHIAMARE */}
      {loading ? (
        <LoadingSkeleton />
      ) : data?.daChiamare.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Phone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Nessun lead da chiamare</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Avvia una nuova ricerca per trovare lead.
            </p>
            <Button asChild>
              <Link href="/search">Nuova Ricerca</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data?.daChiamare.map((lead, index) => (
            <LeadCallCard
              key={lead.id}
              lead={lead}
              index={index}
              onCallLogged={fetchData}
            />
          ))}
        </div>
      )}

      {/* Sezione DA_VERIFICARE */}
      {data && data.daVerificare.length > 0 && (
        <div className="mt-8">
          <button
            className="flex items-center gap-2 w-full text-left"
            onClick={() => setShowVerifica(!showVerifica)}
          >
            <h2 className="text-lg font-semibold text-amber-500">
              Da verificare ({data.daVerificare.length})
            </h2>
            <p className="text-xs text-muted-foreground flex-1">
              Lead da controllare prima di chiamare
            </p>
            {showVerifica ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {showVerifica && (
            <div className="space-y-2 mt-3">
              {data.daVerificare.map((lead) => (
                <VerificaCard key={lead.id} lead={lead} onAction={fetchData} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
