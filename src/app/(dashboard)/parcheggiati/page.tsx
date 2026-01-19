import { Suspense } from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  MapPin,
  Star,
  Phone,
  ExternalLink,
  PackageX,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface ParcheggiatiPageProps {
  searchParams: Promise<{
    page?: string;
  }>;
}

async function ParcheggiatiList({
  searchParams,
}: {
  searchParams: ParcheggiatiPageProps["searchParams"];
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const pageSize = 30;

  // Lead senza sito web (auditStatus = NO_WEBSITE)
  const [leads, total] = await Promise.all([
    db.lead.findMany({
      where: {
        auditStatus: "NO_WEBSITE",
      },
      orderBy: [{ googleRating: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        category: true,
        googleRating: true,
        googleReviewsCount: true,
        googleMapsUrl: true,
        createdAt: true,
      },
    }),
    db.lead.count({
      where: {
        auditStatus: "NO_WEBSITE",
      },
    }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="p-4 rounded-full bg-secondary mb-4">
          <PackageX className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold mb-1">Nessun contatto parcheggiato</h3>
        <p className="text-sm text-muted-foreground mb-4">
          I contatti senza sito web appariranno qui
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
        {total} contatti senza sito web
      </p>

      {/* Lead cards */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {leads.map((lead) => (
          <Card key={lead.id} className="card-hover">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm truncate flex-1">
                    {lead.name}
                  </h3>
                  {lead.googleRating && (
                    <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {Number(lead.googleRating).toFixed(1)}
                    </Badge>
                  )}
                </div>

                {lead.category && (
                  <p className="text-xs text-muted-foreground truncate">
                    {lead.category}
                  </p>
                )}

                {lead.address && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{lead.address.split(",")[0]}</span>
                  </p>
                )}

                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  {lead.phone && (
                    <a
                      href={`tel:${lead.phone}`}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-500 rounded text-xs hover:bg-green-500/20 transition-colors"
                    >
                      <Phone className="h-3 w-3" />
                      Chiama
                    </a>
                  )}
                  {lead.googleMapsUrl && (
                    <a
                      href={lead.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/10 text-blue-500 rounded text-xs hover:bg-blue-500/20 transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Maps
                    </a>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
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
                href={`/parcheggiati?page=${page - 1}`}
                className="inline-flex items-center justify-center px-3 py-1.5 text-sm rounded-md border border-input hover:bg-accent"
              >
                Precedente
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/parcheggiati?page=${page + 1}`}
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

function ParcheggiatiListSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-5 w-48" />
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(9)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2 mb-2" />
              <Skeleton className="h-3 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function ParcheggiatiPage(props: ParcheggiatiPageProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-3xl font-bold">Parcheggiati</h1>
          <p className="text-sm text-muted-foreground hidden md:block">
            Contatti senza sito web - non chiamabili per servizi digitali
          </p>
        </div>
      </div>

      {/* Info banner */}
      <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
        Questi contatti non hanno un sito web, quindi non sono candidati per servizi di web design, SEO o digital marketing.
        Puoi comunque contattarli per altri servizi.
      </div>

      {/* Lista */}
      <Suspense fallback={<ParcheggiatiListSkeleton />}>
        <ParcheggiatiList searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
