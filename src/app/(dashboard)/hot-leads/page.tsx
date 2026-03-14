import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, ExternalLink, Globe } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface GeminiAnalysis {
  cliche_found?: string;
  primary_error_pattern?: string;
  strategic_note?: string;
}

export default async function HotLeadsPage() {
  const leads = await db.lead.findMany({
    where: {
      pipelineStage: { in: ["DA_QUALIFICARE", "QUALIFICATO", "VIDEO_DA_FARE"] },
      geminiAnalysis: { not: Prisma.DbNull },
      opportunityScore: { gte: 80 },
    },
    orderBy: { opportunityScore: "desc" },
    select: {
      id: true,
      name: true,
      category: true,
      website: true,
      opportunityScore: true,
      geminiAnalysis: true,
      pipelineStage: true,
      phone: true,
      googleRating: true,
      googleReviewsCount: true,
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Flame className="h-7 w-7 text-red-500" />
          Hot Leads
        </h1>
        <p className="text-muted-foreground mt-1">
          {leads.length} lead con score &ge;80 e analisi completata
        </p>
      </div>

      {leads.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Flame className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">
              Nessun hot lead al momento. Lancia le analisi Gemini per scoprire opportunit&agrave;.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => {
            const analysis = lead.geminiAnalysis as unknown as GeminiAnalysis | null;
            const cliche = analysis?.cliche_found;
            const errorPattern = analysis?.primary_error_pattern;

            return (
              <Link key={lead.id} href={`/leads/${lead.id}`}>
                <Card className="hover:border-red-500/40 transition-colors border-l-4 border-l-red-500/60">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-base">{lead.name}</span>
                          <Badge variant="destructive" className="text-xs">
                            <Flame className="h-3 w-3 mr-0.5" />
                            {lead.opportunityScore}
                          </Badge>
                          {errorPattern && (
                            <Badge variant="outline" className="text-[10px]">
                              {errorPattern}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                          <span>{lead.category || "—"}</span>
                          {lead.phone && <span>{lead.phone}</span>}
                          {lead.googleRating && (
                            <span>{String(lead.googleRating)}★ ({lead.googleReviewsCount})</span>
                          )}
                          {lead.website && (
                            <span className="flex items-center gap-0.5 text-blue-400">
                              <Globe className="h-3 w-3" />
                              {lead.website.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}
                              <ExternalLink className="h-2.5 w-2.5" />
                            </span>
                          )}
                        </div>

                        {cliche && (
                          <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-2.5">
                            <p className="text-[11px] font-medium text-amber-600 uppercase tracking-wide mb-0.5">
                              Gancio di Vendita
                            </p>
                            <p className="text-base font-bold text-amber-400 leading-snug">
                              &ldquo;{cliche}&rdquo;
                            </p>
                          </div>
                        )}
                      </div>
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
