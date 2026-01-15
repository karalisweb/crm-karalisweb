import { Suspense } from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { PIPELINE_STAGES, AUDIT_STATUSES, getScoreCategory } from "@/types";
import {
  Phone,
  Globe,
  MapPin,
  Star,
  ChevronRight,
  Flame,
  Search,
  Filter,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface LeadsPageProps {
  searchParams: Promise<{
    stage?: string;
    audit?: string;
    page?: string;
  }>;
}

// Lead Card Component - Mobile optimized
function LeadCard({ lead }: { lead: {
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
}}) {
  const scoreInfo = getScoreCategory(lead.opportunityScore);
  const stageInfo = PIPELINE_STAGES[lead.pipelineStage as keyof typeof PIPELINE_STAGES];
  const isHot = lead.opportunityScore && lead.opportunityScore >= 80;

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
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  asChild
                  onClick={(e) => e.stopPropagation()}
                >
                  <a href={`tel:${lead.phone}`}>
                    <Phone className="h-4 w-4 text-green-500" />
                  </a>
                </Button>
              )}
              {lead.website && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  asChild
                  onClick={(e) => e.stopPropagation()}
                >
                  <a href={lead.website} target="_blank" rel="noopener noreferrer">
                    <Globe className="h-4 w-4 text-blue-500" />
                  </a>
                </Button>
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground ml-1" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

async function LeadsList({
  searchParams,
}: {
  searchParams: LeadsPageProps["searchParams"];
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const pageSize = 20;

  const where: Record<string, unknown> = {};
  if (params.stage) {
    where.pipelineStage = params.stage;
  }
  if (params.audit) {
    where.auditStatus = params.audit;
  }

  const [leads, total] = await Promise.all([
    db.lead.findMany({
      where,
      orderBy: [{ opportunityScore: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        website: true,
        category: true,
        googleRating: true,
        googleReviewsCount: true,
        opportunityScore: true,
        pipelineStage: true,
        auditStatus: true,
      },
    }),
    db.lead.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="p-4 rounded-full bg-secondary mb-4">
          <Search className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold mb-1">Nessun lead trovato</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Inizia una nuova ricerca per trovare potenziali clienti
        </p>
        <Link href="/search">
          <Button>
            <Search className="h-4 w-4 mr-2" />
            Nuova Ricerca
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {total} lead trovati
        {params.stage && ` - ${PIPELINE_STAGES[params.stage as keyof typeof PIPELINE_STAGES]?.label}`}
      </p>

      {/* Lead cards */}
      <div className="space-y-3">
        {leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={{
              ...lead,
              googleRating: lead.googleRating ? Number(lead.googleRating) : null,
            }}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-muted-foreground">
            Pagina {page} di {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/leads?${new URLSearchParams({
                  ...(params.stage && { stage: params.stage }),
                  page: String(page - 1),
                }).toString()}`}
              >
                <Button variant="outline" size="sm">
                  Precedente
                </Button>
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/leads?${new URLSearchParams({
                  ...(params.stage && { stage: params.stage }),
                  page: String(page + 1),
                }).toString()}`}
              >
                <Button variant="outline" size="sm">
                  Successiva
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function LeadsListSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(6)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <Skeleton className="h-5 w-3/4 mb-2" />
            <Skeleton className="h-3 w-1/2 mb-3" />
            <div className="flex justify-between">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-8 w-24" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function LeadsPage(props: LeadsPageProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-3xl font-bold">Lead</h1>
          <p className="text-sm text-muted-foreground hidden md:block">
            Gestisci i tuoi potenziali clienti
          </p>
        </div>
        <Link href="/search">
          <Button size="sm" className="md:hidden">
            <Search className="h-4 w-4" />
          </Button>
          <Button className="hidden md:flex">
            <Search className="h-4 w-4 mr-2" />
            Nuova Ricerca
          </Button>
        </Link>
      </div>

      {/* Filter chips - Horizontal scroll on mobile */}
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-2 pb-2">
          <Link href="/leads">
            <Badge
              variant="outline"
              className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors px-3 py-1"
            >
              Tutti
            </Badge>
          </Link>
          {Object.entries(PIPELINE_STAGES).map(([key, value]) => (
            <Link key={key} href={`/leads?stage=${key}`}>
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors px-3 py-1 whitespace-nowrap"
              >
                {value.label}
              </Badge>
            </Link>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Leads list */}
      <Suspense fallback={<LeadsListSkeleton />}>
        <LeadsList searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
