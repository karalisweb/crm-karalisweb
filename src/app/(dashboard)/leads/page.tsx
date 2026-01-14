import { Suspense } from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PIPELINE_STAGES, AUDIT_STATUSES, getScoreCategory } from "@/types";
import { ExternalLink, Phone, Globe } from "lucide-react";

interface LeadsPageProps {
  searchParams: Promise<{
    stage?: string;
    audit?: string;
    page?: string;
  }>;
}

async function LeadsTable({ searchParams }: { searchParams: LeadsPageProps["searchParams"] }) {
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
      orderBy: [
        { opportunityScore: "desc" },
        { createdAt: "desc" },
      ],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.lead.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  if (leads.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Nessun lead trovato</p>
        <Link href="/search">
          <Button className="mt-4">Avvia una ricerca</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Audit</TableHead>
            <TableHead>Rating</TableHead>
            <TableHead className="text-right">Azioni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => {
            const scoreInfo = getScoreCategory(lead.opportunityScore);
            const stageInfo = PIPELINE_STAGES[lead.pipelineStage as keyof typeof PIPELINE_STAGES];
            const auditInfo = AUDIT_STATUSES[lead.auditStatus as keyof typeof AUDIT_STATUSES];

            return (
              <TableRow key={lead.id}>
                <TableCell>
                  <Link
                    href={`/leads/${lead.id}`}
                    className="font-medium hover:underline"
                  >
                    {lead.name}
                  </Link>
                  {lead.address && (
                    <p className="text-sm text-muted-foreground truncate max-w-xs">
                      {lead.address}
                    </p>
                  )}
                </TableCell>
                <TableCell>{lead.category || "-"}</TableCell>
                <TableCell>
                  {lead.opportunityScore !== null ? (
                    <Badge
                      variant={
                        scoreInfo.color === "red"
                          ? "destructive"
                          : scoreInfo.color === "green"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {lead.opportunityScore}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{stageInfo.label}</Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      auditInfo.color === "green"
                        ? "default"
                        : auditInfo.color === "red"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {auditInfo.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  {lead.googleRating ? (
                    <span>
                      {Number(lead.googleRating).toFixed(1)} ({lead.googleReviewsCount})
                    </span>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {lead.phone && (
                      <Button variant="ghost" size="icon" asChild>
                        <a href={`tel:${lead.phone}`}>
                          <Phone className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    {lead.website && (
                      <Button variant="ghost" size="icon" asChild>
                        <a
                          href={lead.website}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Globe className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    {lead.googleMapsUrl && (
                      <Button variant="ghost" size="icon" asChild>
                        <a
                          href={lead.googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Pagina {page} di {totalPages} ({total} lead totali)
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={`/leads?page=${page - 1}`}>
                <Button variant="outline" size="sm">
                  Precedente
                </Button>
              </Link>
            )}
            {page < totalPages && (
              <Link href={`/leads?page=${page + 1}`}>
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

function TableSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(10)].map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

export default function LeadsPage(props: LeadsPageProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Lead</h1>
        <Link href="/search">
          <Button>Nuova Ricerca</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Link href="/leads">
          <Badge variant="outline" className="cursor-pointer hover:bg-accent">
            Tutti
          </Badge>
        </Link>
        {Object.entries(PIPELINE_STAGES).map(([key, value]) => (
          <Link key={key} href={`/leads?stage=${key}`}>
            <Badge variant="outline" className="cursor-pointer hover:bg-accent">
              {value.label}
            </Badge>
          </Link>
        ))}
      </div>

      <Suspense fallback={<TableSkeleton />}>
        <LeadsTable searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
