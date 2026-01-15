"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PIPELINE_STAGES, getScoreCategory } from "@/types";
import {
  Phone,
  Globe,
  MapPin,
  Star,
  ChevronRight,
  Flame,
} from "lucide-react";

interface LeadCardProps {
  lead: {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    website: string | null;
    category: string | null;
    googleRating: number | null;
    googleReviewsCount: number | null;
    opportunityScore: number | null;
    pipelineStage: string;
    auditStatus: string;
  };
}

export function LeadCard({ lead }: LeadCardProps) {
  const stageInfo = PIPELINE_STAGES[lead.pipelineStage as keyof typeof PIPELINE_STAGES];
  const isHot = lead.opportunityScore && lead.opportunityScore >= 80;

  const handleQuickAction = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <Link href={`/leads/${lead.id}`}>
      <Card className="card-hover">
        <CardContent className="p-4">
          {/* Header with name and score */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm truncate">{lead.name}</h3>
                {isHot && <Flame className="h-4 w-4 text-red-500 flex-shrink-0" />}
              </div>
              {lead.category && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {lead.category}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 ml-2">
              <Badge
                variant={
                  lead.opportunityScore && lead.opportunityScore >= 80
                    ? "destructive"
                    : lead.opportunityScore && lead.opportunityScore >= 60
                    ? "default"
                    : "secondary"
                }
                className="text-xs font-bold"
              >
                {lead.opportunityScore || "-"}
              </Badge>
            </div>
          </div>

          {/* Info row */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
            {lead.googleRating && (
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                <span>{Number(lead.googleRating).toFixed(1)}</span>
                {lead.googleReviewsCount && (
                  <span className="text-muted-foreground/60">
                    ({lead.googleReviewsCount})
                  </span>
                )}
              </div>
            )}
            {lead.address && (
              <div className="flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{lead.address.split(",")[0]}</span>
              </div>
            )}
          </div>

          {/* Stage badge and quick actions */}
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-xs">
              {stageInfo?.label || lead.pipelineStage}
            </Badge>

            {/* Quick action buttons */}
            <div className="flex items-center gap-1">
              {lead.phone && (
                <a
                  href={`tel:${lead.phone}`}
                  onClick={handleQuickAction}
                  className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent"
                >
                  <Phone className="h-4 w-4 text-green-500" />
                </a>
              )}
              {lead.website && (
                <a
                  href={lead.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleQuickAction}
                  className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent"
                >
                  <Globe className="h-4 w-4 text-blue-500" />
                </a>
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground ml-1" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
