import { Suspense } from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { PIPELINE_STAGES } from "@/types";
import { Search, Plus } from "lucide-react";
import { LeadCard } from "@/components/leads/lead-card";

export const dynamic = "force-dynamic";

interface LeadsPageProps {
  searchParams: Promise<{
    stage?: string;
    audit?: string;
    page?: string;
  }>;
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
        <Link
          href="/search"
          className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Search className="h-4 w-4 mr-2" />
          Nuova Ricerca
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
                className="inline-flex items-center justify-center px-3 py-1.5 text-sm rounded-md border border-input hover:bg-accent"
              >
                Precedente
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/leads?${new URLSearchParams({
                  ...(params.stage && { stage: params.stage }),
                  page: String(page + 1),
                }).toString()}`}
                className="inline-flex items-center justify-center px-3 py-1.5 text-sm rounded-md border border-input hover:bg-accent"
              >
                Successiva
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
        <Link
          href="/search"
          className="inline-flex items-center justify-center h-9 px-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium"
        >
          <Plus className="h-4 w-4 md:mr-2" />
          <span className="hidden md:inline">Nuova Ricerca</span>
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
