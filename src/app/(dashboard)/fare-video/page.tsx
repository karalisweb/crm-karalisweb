"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Video, RefreshCw, AlertTriangle, ChevronRight, Search, Pen, Globe, Send, FileText } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface FareVideoLead {
  id: string;
  name: string;
  category: string | null;
  website: string | null;
  opportunityScore: number | null;
  analystApprovedAt: string | null;
  scriptApprovedAt: string | null;
  videoYoutubeUrl: string | null;
  videoLandingUrl: string | null;
  videoSentAt: string | null;
  scriptRegeneratedAt: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  geminiAnalysis: any;
}

function calculateStep(lead: FareVideoLead): number {
  if (lead.videoSentAt) return 5;
  if (lead.videoLandingUrl) return 4;
  if (lead.videoYoutubeUrl) return 3;
  if (lead.scriptApprovedAt) return 2;
  if (lead.analystApprovedAt) return 1;
  return 0;
}

const STEP_ICONS = [Search, Search, Pen, Video, Globe, Send];
const STEP_LABELS = ["Da analizzare", "Analisi approvata", "Script approvato", "Video pronto", "Landing creata", "Inviato"];

export default function VideoDaFarePage() {
  const [leads, setLeads] = useState<FareVideoLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/leads?stage=FARE_VIDEO&pageSize=50");
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

  // Sort: least steps completed first
  const sortedLeads = [...leads].sort((a, b) => calculateStep(a) - calculateStep(b));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Video da Fare</h1>
          <p className="text-sm text-muted-foreground">
            Workspace di Alessio — Video personalizzati da registrare
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {leads.filter(l => l.videoSentAt).length}/{total} completati
          </Badge>
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
          {[...Array(3)].map((_, i) => (
            <Card key={i}><CardContent className="p-4">
              <Skeleton className="h-14 w-full" />
            </CardContent></Card>
          ))}
        </div>
      ) : leads.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Nessun video da fare</h3>
            <p className="text-sm text-muted-foreground mb-4">
              I lead analizzati appariranno qui quando spostati nello stage &quot;Fare Video&quot;.
            </p>
            <Button asChild><Link href="/da-analizzare">Vai a Da Analizzare</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {sortedLeads.map((lead) => {
            const step = calculateStep(lead);
            const StepIcon = STEP_ICONS[step];

            return (
              <Link
                key={lead.id}
                href={`/leads/${lead.id}?tab=video-outreach`}
                className="block"
              >
                <Card className="hover:bg-muted/30 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Lead info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium truncate">{lead.name}</h3>
                          {lead.opportunityScore && (
                            <Badge variant={lead.opportunityScore >= 80 ? "destructive" : lead.opportunityScore >= 50 ? "default" : "secondary"} className="text-xs shrink-0">
                              {lead.opportunityScore}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {lead.category || "—"}
                        </p>
                      </div>

                      {/* Step progress dots */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <div
                            key={s}
                            className={`w-2 h-2 rounded-full ${
                              s <= step
                                ? "bg-green-500"
                                : s === step + 1
                                  ? "bg-primary animate-pulse"
                                  : "bg-muted-foreground/20"
                            }`}
                          />
                        ))}
                      </div>

                      {/* Current step label + Tella status */}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0 w-32">
                        <StepIcon className="h-3.5 w-3.5" />
                        <span className="truncate">{STEP_LABELS[step]}</span>
                      </div>

                      {/* Tella script status */}
                      {lead.geminiAnalysis?.readingScript ? (
                        <Badge variant="outline" className="text-xs shrink-0 text-orange-600 border-orange-300 bg-orange-50 gap-1">
                          <FileText className="h-3 w-3" />Tella
                        </Badge>
                      ) : step >= 2 ? (
                        <Badge variant="outline" className="text-xs shrink-0 text-gray-400 border-gray-300 gap-1">
                          <FileText className="h-3 w-3" />No Tella
                        </Badge>
                      ) : null}

                      {/* Step count */}
                      <Badge variant="outline" className="text-xs shrink-0">
                        {step}/5
                      </Badge>

                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
