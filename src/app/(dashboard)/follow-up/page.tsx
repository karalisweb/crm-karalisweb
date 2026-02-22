"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Mail,
  Linkedin,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  Globe,
  Repeat,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Lead {
  id: string;
  name: string;
  website: string | null;
  category: string | null;
  opportunityScore: number | null;
  pipelineStage: string;
  videoSentAt: string | null;
  letterSentAt: string | null;
  linkedinSentAt: string | null;
  respondedAt: string | null;
}

type FollowUpSection = "letter" | "linkedin" | "waiting";

function daysSince(date: string | null): number | null {
  if (!date) return null;
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

function FollowUpCard({
  lead,
  section,
  onAction,
}: {
  lead: Lead;
  section: FollowUpSection;
  onAction: () => void;
}) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleAction = async (action: string) => {
    setLoading(action);
    try {
      const res = await fetch(`/api/leads/${lead.id}/quick-log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("Errore");
      const labels: Record<string, string> = {
        LETTER_SENT: "Lettera marcata come inviata",
        LINKEDIN_SENT: "LinkedIn marcato come inviato",
        RESPONSE_RECEIVED: "Risposta registrata",
        MARK_6M: "Lead parcheggiato per 6 mesi",
      };
      toast.success(labels[action] || "Azione completata");
      onAction();
    } catch {
      toast.error("Errore nell'azione");
    } finally {
      setLoading(null);
    }
  };

  const videoAge = daysSince(lead.videoSentAt);
  const letterAge = daysSince(lead.letterSentAt);

  return (
    <Card className="card-hover">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <Link href={`/leads/${lead.id}`}>
              <h3 className="font-semibold text-sm truncate hover:underline">{lead.name}</h3>
            </Link>
            <p className="text-xs text-muted-foreground">
              {lead.category}
              {lead.opportunityScore && ` · Score: ${lead.opportunityScore}`}
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              {lead.videoSentAt && (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-purple-400" />
                  Video {videoAge}g fa
                </span>
              )}
              {lead.letterSentAt && (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-cyan-400" />
                  Lettera {letterAge}g fa
                </span>
              )}
              {lead.linkedinSentAt && (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-sky-400" />
                  LinkedIn {daysSince(lead.linkedinSentAt)}g fa
                </span>
              )}
            </div>
          </div>
          <Badge variant="outline" className="text-xs flex-shrink-0">
            {lead.pipelineStage === "VIDEO_INVIATO" && "Video inviato"}
            {lead.pipelineStage === "LETTERA_INVIATA" && "Lettera inviata"}
            {lead.pipelineStage === "FOLLOW_UP_LINKEDIN" && "LinkedIn"}
          </Badge>
        </div>

        {/* Actions based on section */}
        <div className="flex gap-2 mt-3 pt-3 border-t">
          {section === "letter" && (
            <>
              <Button
                onClick={() => handleAction("LETTER_SENT")}
                disabled={!!loading}
                className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white"
                size="sm"
              >
                {loading === "LETTER_SENT" ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Mail className="h-4 w-4 mr-2" />
                )}
                Lettera Inviata
              </Button>
              <Button
                onClick={() => handleAction("RESPONSE_RECEIVED")}
                disabled={!!loading}
                variant="outline"
                className="border-green-500/50 text-green-500 hover:bg-green-500/10"
                size="sm"
              >
                {loading === "RESPONSE_RECEIVED" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MessageCircle className="h-4 w-4" />
                )}
              </Button>
            </>
          )}

          {section === "linkedin" && (
            <>
              <Button
                onClick={() => handleAction("LINKEDIN_SENT")}
                disabled={!!loading}
                className="flex-1 bg-sky-600 hover:bg-sky-700 text-white"
                size="sm"
              >
                {loading === "LINKEDIN_SENT" ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Linkedin className="h-4 w-4 mr-2" />
                )}
                LinkedIn Inviato
              </Button>
              <Button
                onClick={() => handleAction("RESPONSE_RECEIVED")}
                disabled={!!loading}
                variant="outline"
                className="border-green-500/50 text-green-500 hover:bg-green-500/10"
                size="sm"
              >
                {loading === "RESPONSE_RECEIVED" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MessageCircle className="h-4 w-4" />
                )}
              </Button>
            </>
          )}

          {section === "waiting" && (
            <>
              <Button
                onClick={() => handleAction("RESPONSE_RECEIVED")}
                disabled={!!loading}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                size="sm"
              >
                {loading === "RESPONSE_RECEIVED" ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <MessageCircle className="h-4 w-4 mr-2" />
                )}
                Ha Risposto!
              </Button>
              <Button
                onClick={() => handleAction("MARK_6M")}
                disabled={!!loading}
                variant="outline"
                className="border-orange-500/50 text-orange-500 hover:bg-orange-500/10"
                size="sm"
              >
                {loading === "MARK_6M" ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Clock className="h-4 w-4 mr-2" />
                )}
                6 mesi
              </Button>
            </>
          )}

          <Button asChild variant="ghost" size="sm">
            <Link href={`/leads/${lead.id}`}>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function FollowUpPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        "/api/leads?stages=VIDEO_INVIATO,LETTERA_INVIATA,FOLLOW_UP_LINKEDIN&pageSize=100"
      );
      if (!res.ok) throw new Error("Errore nel caricamento");
      const json = await res.json();
      setLeads(json.leads || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Categorize leads into sections
  const now = Date.now();
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

  const needsLetter = leads.filter(
    (l) => l.pipelineStage === "VIDEO_INVIATO" && !l.letterSentAt
  );

  const needsLinkedin = leads.filter(
    (l) => l.pipelineStage === "LETTERA_INVIATA" && !l.linkedinSentAt
  );

  const waiting = leads.filter(
    (l) =>
      l.pipelineStage === "FOLLOW_UP_LINKEDIN" ||
      (l.pipelineStage === "VIDEO_INVIATO" && l.letterSentAt) ||
      (l.pipelineStage === "LETTERA_INVIATA" && l.linkedinSentAt)
  );

  const totalCount = needsLetter.length + needsLinkedin.length + waiting.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Follow-up</h1>
          <p className="text-sm text-muted-foreground">
            Touchpoint successivi al video
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{totalCount} lead</Badge>
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
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : totalCount === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Repeat className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Nessun follow-up</h3>
            <p className="text-sm text-muted-foreground">
              I lead con video inviato appariranno qui per i prossimi touchpoint.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Section: Mandare lettera */}
          {needsLetter.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Mail className="h-4 w-4 text-cyan-500" />
                <h2 className="font-semibold text-sm">Mandare lettera</h2>
                <Badge variant="secondary" className="text-xs">{needsLetter.length}</Badge>
              </div>
              <div className="space-y-2">
                {needsLetter.map((lead) => (
                  <FollowUpCard key={lead.id} lead={lead} section="letter" onAction={fetchData} />
                ))}
              </div>
            </div>
          )}

          {/* Section: Contattare LinkedIn */}
          {needsLinkedin.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Linkedin className="h-4 w-4 text-sky-500" />
                <h2 className="font-semibold text-sm">Contattare LinkedIn</h2>
                <Badge variant="secondary" className="text-xs">{needsLinkedin.length}</Badge>
              </div>
              <div className="space-y-2">
                {needsLinkedin.map((lead) => (
                  <FollowUpCard key={lead.id} lead={lead} section="linkedin" onAction={fetchData} />
                ))}
              </div>
            </div>
          )}

          {/* Section: In attesa risposta */}
          {waiting.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-orange-500" />
                <h2 className="font-semibold text-sm">In attesa risposta</h2>
                <Badge variant="secondary" className="text-xs">{waiting.length}</Badge>
              </div>
              <div className="space-y-2">
                {waiting.map((lead) => (
                  <FollowUpCard key={lead.id} lead={lead} section="waiting" onAction={fetchData} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
