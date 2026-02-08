import { Suspense } from "react";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Phone,
  Search,
  ChevronRight,
  Flame,
  Clock,
  AlertCircle,
  Archive,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function DashboardStats() {
  const [countDaChiamare, countDaVerificare, countArchiviati, recentSearches, topLeads] =
    await Promise.all([
      db.lead.count({ where: { pipelineStage: "DA_CHIAMARE" } }),
      db.lead.count({ where: { pipelineStage: "DA_VERIFICARE" } }),
      db.lead.count({
        where: {
          pipelineStage: { in: ["NON_TARGET", "SENZA_SITO", "PERSO"] },
        },
      }),
      db.search.findMany({
        take: 3,
        orderBy: { createdAt: "desc" },
      }),
      // Lead prioritari: top 5 da chiamare per score
      db.lead.findMany({
        where: {
          pipelineStage: "DA_CHIAMARE",
          opportunityScore: { not: null },
        },
        orderBy: { opportunityScore: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          category: true,
          opportunityScore: true,
          talkingPoints: true,
          commercialTag: true,
        },
      }),
    ]);

  return (
    <>
      {/* Stats - I numeri corrispondono ESATTAMENTE alle pagine */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <Link href="/da-chiamare">
          <Card className="card-hover cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10">
                  <Phone className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-500">{countDaChiamare}</p>
                  <p className="text-xs text-muted-foreground">Da chiamare</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/da-chiamare">
          <Card className="card-hover cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-500">{countDaVerificare}</p>
                  <p className="text-xs text-muted-foreground">Da verificare</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/archivio">
          <Card className="card-hover cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gray-500/10">
                  <Archive className="h-5 w-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-400">{countArchiviati}</p>
                  <p className="text-xs text-muted-foreground">Archiviati</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Azioni rapide */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-3">Azioni rapide</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/search">
            <Card className="card-hover cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary">
                  <Search className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-medium text-sm">Nuova Ricerca</p>
                  <p className="text-xs text-muted-foreground">Google Maps</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/da-chiamare">
            <Card className="card-hover cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-3 rounded-xl bg-blue-500">
                  <Phone className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-sm">Da chiamare</p>
                  <p className="text-xs text-muted-foreground">
                    {countDaChiamare} lead
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Top Leads con talking point visibile */}
      {topLeads.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Lead prioritari</h2>
            <Link
              href="/da-chiamare"
              className="text-sm text-primary hover:underline flex items-center"
            >
              Vedi tutti
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </div>

          <div className="space-y-2">
            {topLeads.map((lead) => (
              <Link key={lead.id} href={`/leads/${lead.id}`}>
                <Card className="card-hover">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">
                            {lead.name}
                          </p>
                          {lead.opportunityScore && lead.opportunityScore >= 80 && (
                            <Flame className="h-4 w-4 text-red-500 flex-shrink-0" />
                          )}
                        </div>
                        {/* Primo talking point come sottotitolo */}
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {lead.talkingPoints && lead.talkingPoints.length > 0
                            ? lead.talkingPoints[0]
                            : lead.category || "Nessuna categoria"}
                        </p>
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
                          className="text-xs"
                        >
                          {lead.opportunityScore || "-"}
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Ricerche recenti */}
      {recentSearches.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Ricerche recenti</h2>
          </div>

          <div className="space-y-2">
            {recentSearches.map((search) => (
              <Card key={search.id} className="card-hover">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-secondary">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {search.query} - {search.location}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {search.leadsFound} lead trovati
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        search.status === "COMPLETED"
                          ? "default"
                          : search.status === "FAILED"
                          ? "destructive"
                          : "secondary"
                      }
                      className="text-xs"
                    >
                      {search.status === "COMPLETED"
                        ? "OK"
                        : search.status === "FAILED"
                        ? "Errore"
                        : "..."}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6">
        <Skeleton className="h-6 w-32 mb-3" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>

      <div className="mt-6">
        <Skeleton className="h-6 w-32 mb-3" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    </>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-2">
      {/* Welcome message - only on mobile */}
      <div className="md:hidden mb-4">
        <h1 className="text-xl font-bold">Buongiorno!</h1>
        <p className="text-sm text-muted-foreground">
          Ecco il riepilogo di oggi
        </p>
      </div>

      {/* Desktop title */}
      <div className="hidden md:block mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Panoramica del tuo CRM
        </p>
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardStats />
      </Suspense>
    </div>
  );
}
