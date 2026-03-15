import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Snowflake, ExternalLink, Globe } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface GeminiAnalysis {
  cliche_found?: string;
  primary_error_pattern?: string;
}

export default async function ColdLeadsPage() {
  const leads = await db.lead.findMany({
    where: {
      pipelineStage: "COLD_LEAD",
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
          <Snowflake className="h-7 w-7 text-blue-400" />
          Cold Leads
        </h1>
        <p className="text-muted-foreground mt-1">
          {leads.length} lead con score &lt;50 — basso potenziale
        </p>
      </div>

      {leads.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Snowflake className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">
              Nessun cold lead al momento.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {leads.map((lead) => {
            const analysis = lead.geminiAnalysis as unknown as GeminiAnalysis | null;
            const errorPattern = analysis?.primary_error_pattern;

            return (
              <Link key={lead.id} href={`/leads/${lead.id}`}>
                <Card className="hover:border-blue-400/40 transition-colors">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{lead.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {lead.opportunityScore}
                          </Badge>
                          {errorPattern && (
                            <Badge variant="outline" className="text-[10px]">
                              {errorPattern}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span>{lead.category || "—"}</span>
                          {lead.website && (
                            <span className="flex items-center gap-0.5 text-blue-400">
                              <Globe className="h-3 w-3" />
                              {lead.website.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}
                              <ExternalLink className="h-2.5 w-2.5" />
                            </span>
                          )}
                        </div>
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
